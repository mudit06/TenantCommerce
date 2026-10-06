import type { PayloadRequest } from 'payload'

import { idOf } from '@/access'
import { emit } from '@/lib/events'
import { AppError } from '@/lib/errors'
import { formatINR } from '@/lib/money'
import {
  EWAY_BILL_ABOVE_MINOR,
  FAILURE_REASONS,
  SHIPMENT_STATUSES,
  type FailureReason,
  type ShipmentStatus,
} from '@/modules/shipping'
import type { Order, Shipment } from '@/payload-types'

import { label, type FulfillmentStatus } from '../constants'
import { addOrderEvent } from './timeline'
import { loadOrder } from './transition'

// Parcels and the delivery journey (docs/11 "Parcel journey"). One door for every parcel move,
// by staff or by Shiprocket's tracking: it checks the move, ignores repeats and backward moves
// (webhooks arrive late and out of order), writes the parcel's events and the order's timeline,
// rolls the order's delivery status up and announces `shipment.changed` for messages.
// As built: here in the orders module (it changes orders); the shipping module holds zones,
// rates, the pincode directory and the Shiprocket connector.

const NEXT: Record<ShipmentStatus, readonly ShipmentStatus[]> = {
  packed: [
    'shipped',
    'in_transit',
    'out_for_delivery',
    'delivery_failed',
    'delivered',
    'cancelled',
  ],
  shipped: [
    'in_transit',
    'out_for_delivery',
    'delivery_failed',
    'delivered',
    'rto_initiated',
    'lost',
  ],
  in_transit: ['out_for_delivery', 'delivery_failed', 'delivered', 'rto_initiated', 'lost'],
  out_for_delivery: ['delivered', 'delivery_failed', 'rto_initiated', 'lost'],
  // A re-attempt goes back out for delivery
  delivery_failed: ['out_for_delivery', 'delivered', 'rto_initiated', 'lost'],
  rto_initiated: ['rto_delivered', 'lost'],
  delivered: [],
  rto_delivered: [],
  cancelled: [],
  lost: [],
}

const RANK: Record<ShipmentStatus, number> = {
  packed: 1,
  shipped: 2,
  in_transit: 3,
  out_for_delivery: 4,
  delivery_failed: 4,
  rto_initiated: 5,
  delivered: 6,
  rto_delivered: 7,
  lost: 8,
  cancelled: 9,
}

export type ParcelMove = 'ok' | 'repeat' | 'backward' | 'invalid'

export function parcelMove(from: ShipmentStatus, to: ShipmentStatus): ParcelMove {
  if (from === to) return 'repeat'
  if (NEXT[from].includes(to)) return 'ok'
  return RANK[to] < RANK[from] ? 'backward' : 'invalid'
}

const TO_FULFILLMENT: Record<ShipmentStatus, FulfillmentStatus> = {
  packed: 'packed',
  shipped: 'shipped',
  in_transit: 'shipped',
  out_for_delivery: 'out_for_delivery',
  delivery_failed: 'delivery_failed',
  delivered: 'delivered',
  rto_initiated: 'rto',
  rto_delivered: 'returned',
  lost: 'lost',
  cancelled: 'unfulfilled',
}

type ParcelLike = Pick<Shipment, 'status' | 'items'>

/** Pieces of each order line already in a parcel (cancelled parcels don't count). */
export function packedQuantities(parcels: readonly ParcelLike[]): Map<string, number> {
  const packed = new Map<string, number>()
  for (const parcel of parcels) {
    if (parcel.status === 'cancelled') continue
    for (const item of parcel.items ?? [])
      packed.set(item.orderItemId, (packed.get(item.orderItemId) ?? 0) + item.qty)
  }
  return packed
}

/**
 * The order's delivery status from its parcels (docs/11 "Order roll-up"): the least advanced
 * open parcel decides; partly shipped while some items have no parcel; a parcel coming back or
 * lost shows first, since it needs someone's attention.
 */
export function rollUpFulfillment(
  items: readonly { id?: string | null; qty: number }[],
  parcels: readonly ParcelLike[],
): FulfillmentStatus {
  const live = parcels.filter((parcel) => parcel.status !== 'cancelled')
  if (live.length === 0) return 'unfulfilled'
  const statuses = live.map((parcel) => parcel.status as ShipmentStatus)
  if (statuses.includes('rto_initiated')) return 'rto'
  if (statuses.includes('lost')) return 'lost'
  if (statuses.every((status) => status === 'rto_delivered')) return 'returned'
  const packed = packedQuantities(live)
  const unpacked = items.some((item) => (packed.get(String(item.id)) ?? 0) < item.qty)
  const open = statuses.filter((status) => status !== 'delivered' && status !== 'rto_delivered')
  if (open.length === 0) return unpacked ? 'partially_shipped' : 'delivered'
  const least = open.reduce((a, b) => (RANK[a] <= RANK[b] ? a : b))
  if (unpacked && RANK[least] >= RANK.shipped) return 'partially_shipped'
  return TO_FULFILLMENT[least]
}

async function parcelsOf(req: PayloadRequest, orderId: string) {
  const { docs } = await req.payload.find({
    collection: 'shipments',
    where: { and: [{ order: { equals: orderId } }, { direction: { equals: 'forward' } }] },
    sort: 'createdAt',
    depth: 0,
    limit: 50,
    pagination: false,
    overrideAccess: true,
    req,
  })
  return docs
}

/** Updates the order after a parcel moved: delivery status, processing, completed, COD paid. */
async function rollUpOrder(req: PayloadRequest, order: Order): Promise<Order> {
  const parcels = await parcelsOf(req, String(order.id))
  const fulfillmentStatus = rollUpFulfillment(order.items ?? [], parcels)
  const data: Partial<Order> = { fulfillmentStatus }
  const tenantId = idOf(order.tenant)!
  if (order.status === 'confirmed' && fulfillmentStatus !== 'unfulfilled')
    data.status = 'processing'
  const delivered = fulfillmentStatus === 'delivered'
  if (delivered && order.status !== 'completed') {
    data.status = 'completed'
    data.completedAt = new Date().toISOString()
    if (order.paymentMethod === 'cod' && order.paymentStatus === 'pending') {
      // The courier collected the cash (docs/11 "COD payment")
      data.paymentStatus = 'paid'
      data.paidAt = data.completedAt
      data.totals = { ...order.totals, paidMinor: order.totals?.grandTotalMinor ?? 0 }
    }
  }
  const updated = await req.payload.update({
    collection: 'orders',
    id: order.id,
    data,
    overrideAccess: true,
    req,
  })
  if (data.paymentStatus === 'paid') {
    await addOrderEvent(req, {
      tenantId,
      orderId: String(order.id),
      type: 'payment_captured',
      text: `${formatINR(order.totals?.grandTotalMinor ?? 0, { decimals: 'always' })} collected in cash on delivery`,
      byLabel: 'system',
    })
  }
  if (delivered && order.status !== 'completed') {
    await emit('order.delivered', { tenantId, orderId: String(order.id) }, { req })
  }
  return updated
}

export type PackInput = {
  /** Which lines and how many go in this parcel; empty means everything not packed yet */
  items?: { orderItemId: string; qty: number }[]
  package?: { lengthMm?: number; breadthMm?: number; heightMm?: number; weightGrams?: number }
  ewayBillNo?: string
  provider?: 'manual' | 'shiprocket'
}

/** Packs a parcel (docs/11: always a staff action). COD orders ship as one parcel. */
export async function packParcel(
  req: PayloadRequest,
  orderId: string,
  input: PackInput = {},
): Promise<Shipment> {
  const order = await loadOrder(req, orderId)
  if (order.status !== 'confirmed' && order.status !== 'processing') {
    throw new AppError('INVALID_TRANSITION', 'Only confirmed orders can be packed.', 409)
  }
  const tenantId = idOf(order.tenant)!
  const parcels = await parcelsOf(req, orderId)
  const packed = packedQuantities(parcels)
  const items = order.items ?? []
  const remaining = items
    .map((item) => ({ item, left: item.qty - (packed.get(String(item.id)) ?? 0) }))
    .filter((row) => row.left > 0)
  if (remaining.length === 0)
    throw new AppError('BUSINESS_RULE', 'Everything in this order is already packed.', 409)
  let chosen = remaining.map(({ item, left }) => ({ item, qty: left }))
  if (input.items?.length) {
    if (order.paymentMethod === 'cod') {
      throw new AppError(
        'BUSINESS_RULE',
        'Cash on delivery orders ship as one parcel, with every item.',
        422,
      )
    }
    chosen = input.items.map((pick) => {
      const row = remaining.find(({ item }) => String(item.id) === pick.orderItemId)
      if (!row || pick.qty < 1 || pick.qty > row.left) {
        throw new AppError(
          'VALIDATION_FAILED',
          'Pick items and quantities still waiting to be packed.',
          400,
        )
      }
      return { item: row.item, qty: pick.qty }
    })
  }
  const valueMinor = chosen.reduce(
    (sum, { item, qty }) => sum + Math.round(((item.lineTotalMinor ?? 0) * qty) / item.qty),
    0,
  )
  const ewayBillNo = input.ewayBillNo?.trim() || undefined
  if (valueMinor > EWAY_BILL_ABOVE_MINOR && !ewayBillNo) {
    throw new AppError(
      'VALIDATION_FAILED',
      `This parcel is worth ${formatINR(valueMinor)}: above ₹50,000 it needs an e-way bill number before pickup.`,
      400,
      { ewayBillNo: 'Enter the e-way bill number' },
    )
  }
  const now = new Date().toISOString()
  const weight = chosen.reduce(
    (sum, { item, qty }) => sum + Math.round(((item.weightGrams ?? 0) * qty) / item.qty),
    0,
  )
  const shipment = await req.payload.create({
    collection: 'shipments',
    data: {
      tenant: tenantId,
      order: orderId,
      direction: 'forward',
      status: 'packed',
      provider: input.provider ?? 'manual',
      items: chosen.map(({ item, qty }) => ({
        orderItemId: String(item.id),
        title: item.title,
        sku: item.sku ?? undefined,
        qty,
      })),
      package: { weightGrams: weight || undefined, ...input.package },
      ewayBillNo,
      codAmountMinor: order.paymentMethod === 'cod' ? (order.totals?.grandTotalMinor ?? 0) : 0,
      packedAt: now,
      events: [
        {
          status: 'packed',
          at: now,
          source: 'staff',
          by: req.user?.collection === 'users' ? req.user.id : undefined,
        },
      ],
    },
    overrideAccess: true,
    req,
  })
  await addOrderEvent(req, {
    tenantId,
    orderId,
    type: 'parcel_status_changed',
    to: 'packed',
    text: `Parcel packed: ${chosen.map(({ item, qty }) => `${item.title}${qty > 1 ? ` × ${qty}` : ''}`).join(', ')}`,
    data: { shipmentId: String(shipment.id) },
  })
  await rollUpOrder(req, order)
  await emit(
    'shipment.changed',
    { tenantId, orderId, shipmentId: String(shipment.id), from: null, to: 'packed', attempt: 0 },
    { req },
  )
  return shipment
}

export type MoveInput = {
  to: ShipmentStatus
  carrier?: string
  trackingNumber?: string
  trackingUrl?: string
  expectedDeliveryDate?: string
  failureReason?: FailureReason
  note?: string
  location?: string
  source?: 'staff' | 'shiprocket' | 'import' | 'system'
  /** Shiprocket: AWB + status + scan time; a repeat is ignored */
  dedupeKey?: string
  at?: Date
}

const STAMP: Partial<Record<ShipmentStatus, keyof Shipment>> = {
  shipped: 'shippedAt',
  out_for_delivery: 'outForDeliveryAt',
  delivered: 'deliveredAt',
}

/** Moves one parcel along its journey. Repeats and backward moves change nothing. */
export async function moveParcel(
  req: PayloadRequest,
  shipmentId: string,
  input: MoveInput,
): Promise<{ result: ParcelMove; shipment: Shipment }> {
  const shipment = await req.payload
    .findByID({ collection: 'shipments', id: shipmentId, depth: 0, overrideAccess: true, req })
    .catch(() => null)
  if (!shipment) throw new AppError('NOT_FOUND', 'Parcel not found', 404)
  const from = shipment.status as ShipmentStatus
  if (
    input.dedupeKey &&
    (shipment.events ?? []).some((event) => event.dedupeKey === input.dedupeKey)
  ) {
    return { result: 'repeat', shipment }
  }
  const result = parcelMove(from, input.to)
  const source = input.source ?? 'staff'
  if (result === 'repeat' || result === 'backward') return { result, shipment }
  if (result === 'invalid') {
    throw new AppError(
      'INVALID_TRANSITION',
      `A parcel that is ${label(SHIPMENT_STATUSES, from).toLowerCase()} can’t be marked ${label(SHIPMENT_STATUSES, input.to).toLowerCase()}.`,
      409,
    )
  }
  const carrier = input.carrier?.trim() || shipment.carrier
  const trackingNumber = input.trackingNumber?.trim() || shipment.trackingNumber
  if (
    RANK[input.to] >= RANK.shipped &&
    input.to !== 'cancelled' &&
    shipment.provider === 'manual' &&
    (!carrier || !trackingNumber)
  ) {
    throw new AppError(
      'VALIDATION_FAILED',
      'Enter the courier and the tracking number first.',
      400,
      {
        ...(carrier ? {} : { carrier: 'Enter the courier' }),
        ...(trackingNumber ? {} : { trackingNumber: 'Enter the tracking number' }),
      },
    )
  }
  if (input.to === 'delivery_failed' && !input.failureReason) {
    throw new AppError('VALIDATION_FAILED', 'Say why the delivery failed.', 400, {
      failureReason: 'Choose a reason',
    })
  }
  const at = (input.at ?? new Date()).toISOString()
  const stamp = STAMP[input.to]
  const updated = await req.payload.update({
    collection: 'shipments',
    id: shipment.id,
    data: {
      status: input.to,
      carrier: carrier ?? undefined,
      trackingNumber: trackingNumber ?? undefined,
      trackingUrl: input.trackingUrl?.trim() || shipment.trackingUrl || undefined,
      expectedDeliveryDate:
        input.expectedDeliveryDate || shipment.expectedDeliveryDate || undefined,
      ...(input.to === 'delivery_failed'
        ? { attempts: (shipment.attempts ?? 0) + 1, failureReason: input.failureReason }
        : {}),
      ...(stamp && !shipment[stamp] ? { [stamp]: at } : {}),
      events: [
        ...(shipment.events ?? []),
        {
          status: input.to,
          at,
          source,
          by: source === 'staff' && req.user?.collection === 'users' ? req.user.id : undefined,
          note: input.note,
          location: input.location,
          dedupeKey: input.dedupeKey,
        },
      ],
    },
    overrideAccess: true,
    req,
  })
  const orderId = idOf(shipment.order)!
  const order = await loadOrder(req, orderId)
  const tenantId = idOf(order.tenant)!
  const detail =
    input.to === 'shipped'
      ? ` with ${carrier} · ${trackingNumber}`
      : input.to === 'delivery_failed'
        ? `: ${label(FAILURE_REASONS, input.failureReason)}`
        : ''
  await addOrderEvent(req, {
    tenantId,
    orderId,
    type: 'parcel_status_changed',
    from,
    to: input.to,
    text: `Parcel ${label(SHIPMENT_STATUSES, input.to).toLowerCase()}${detail}${input.note ? ` · ${input.note}` : ''}`,
    byLabel: source === 'shiprocket' ? 'Shiprocket' : source === 'system' ? 'system' : undefined,
    data: { shipmentId },
  })
  await rollUpOrder(req, order)
  await emit(
    'shipment.changed',
    { tenantId, orderId, shipmentId, from, to: input.to, attempt: updated.attempts ?? 0 },
    { req },
  )
  return { result, shipment: updated }
}
