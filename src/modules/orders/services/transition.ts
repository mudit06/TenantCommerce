import type { PayloadRequest } from 'payload'

import { idOf } from '@/access'
import { emit } from '@/lib/events'
import { AppError } from '@/lib/errors'
import { formatINR } from '@/lib/money'
import {
  releaseStock,
  reserveStock,
  restock,
  sellReservedStock,
  stockLinesOf,
} from '@/modules/inventory'
import type { Order } from '@/payload-types'

import { label, ORDER_STATUSES, type OrderStatus } from '../constants'
import { addOrderEvent } from './timeline'

// The one door for order status changes (docs/11 "Order lifecycle"): each move is checked,
// written to the timeline, and announced as an event. Parcel steps go through the shipping
// module's transition service, which rolls the order's delivery status up.

export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'completed', 'cancelled'],
  processing: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

export const canMoveOrder = (from: OrderStatus, to: OrderStatus) =>
  ORDER_TRANSITIONS[from].includes(to)

/** Delivery steps after which an order can no longer simply be cancelled */
const SHIPPED_STATES = new Set([
  'shipped',
  'partially_shipped',
  'out_for_delivery',
  'delivery_failed',
  'delivered',
  'rto',
  'lost',
  'returned',
])

export async function loadOrder(req: PayloadRequest, orderId: string): Promise<Order> {
  const order = await req.payload
    .findByID({ collection: 'orders', id: orderId, depth: 0, overrideAccess: true, req })
    .catch(() => null)
  if (!order) throw new AppError('NOT_FOUND', 'Order not found', 404)
  return order
}

const tenantOf = (order: Order) => {
  const id = idOf(order.tenant)
  if (!id) throw new Error(`Order ${order.id} has no store`)
  return id
}

async function update(req: PayloadRequest, order: Order, data: Partial<Order>): Promise<Order> {
  return req.payload.update({
    collection: 'orders',
    id: order.id,
    data,
    overrideAccess: true,
    req,
  })
}

function assertMove(order: Order, to: OrderStatus) {
  const from = order.status as OrderStatus
  if (!canMoveOrder(from, to)) {
    throw new AppError(
      'INVALID_TRANSITION',
      `This order is ${label(ORDER_STATUSES, from).toLowerCase()}, so it can’t be ${label(ORDER_STATUSES, to).toLowerCase()}.`,
      409,
    )
  }
}

/** Holds stock for a just-placed order (checkout, inside its transaction). */
export async function holdStockForOrder(req: PayloadRequest, order: Order): Promise<Order> {
  const lines = stockLinesOf(order)
  if (!lines.length) return order
  await reserveStock(req, tenantOf(order), String(order.id), lines)
  return update(req, order, { stockState: 'reserved' })
}

/**
 * pending -> confirmed: a COD order once placed, an online order once paid. The stock hold
 * becomes a sale.
 */
export async function confirmOrder(
  req: PayloadRequest,
  orderId: string,
  { byLabel, reason }: { byLabel?: string; reason?: string } = {},
): Promise<Order> {
  const order = await loadOrder(req, orderId)
  if (order.status === 'confirmed') return order
  assertMove(order, 'confirmed')
  const tenantId = tenantOf(order)
  if (order.stockState === 'reserved') {
    await sellReservedStock(req, tenantId, String(order.id), stockLinesOf(order))
  }
  const now = new Date().toISOString()
  const confirmed = await update(req, order, {
    status: 'confirmed',
    confirmedAt: now,
    expiresAt: null,
    stockState: order.stockState === 'reserved' ? 'sold' : order.stockState,
  })
  await addOrderEvent(req, {
    tenantId,
    orderId: String(order.id),
    type: 'status_changed',
    from: order.status,
    to: 'confirmed',
    text: reason ?? 'Order confirmed',
    byLabel,
  })
  await emit('order.confirmed', { tenantId, orderId: String(order.id) }, { req })
  return confirmed
}

/** A payment captured by the provider (verified callback or webhook). Repeats change nothing. */
export async function markOrderPaid(
  req: PayloadRequest,
  orderId: string,
  input: { amountMinor: number; methodLabel: string; byLabel: string },
): Promise<Order> {
  let order = await loadOrder(req, orderId)
  if (order.paymentStatus === 'paid' || order.paymentStatus === 'partially_refunded') return order
  const tenantId = tenantOf(order)
  const now = new Date().toISOString()
  order = await update(req, order, {
    paymentStatus: 'paid',
    paidAt: now,
    totals: { ...order.totals, paidMinor: input.amountMinor },
  })
  await addOrderEvent(req, {
    tenantId,
    orderId: String(order.id),
    type: 'payment_captured',
    text: `${formatINR(input.amountMinor, { decimals: 'always' })} captured by ${input.byLabel} (${input.methodLabel})`,
    byLabel: input.byLabel,
  })
  if (order.status === 'pending') {
    order = await confirmOrder(req, orderId, { byLabel: input.byLabel, reason: 'Paid online' })
  } else if (order.status === 'cancelled') {
    // Paid after it expired: the money must go back (shown on the order as refund due)
    await addOrderEvent(req, {
      tenantId,
      orderId: String(order.id),
      type: 'note',
      text: 'Payment arrived after the order was cancelled. Refund it from the order.',
      byLabel: 'system',
    })
  }
  await emit('order.paid', { tenantId, orderId: String(order.id) }, { req })
  return order
}

/** The online payment failed or was abandoned; the order stays pending until it expires. */
export async function recordPaymentFailure(
  req: PayloadRequest,
  orderId: string,
  reason: string,
): Promise<void> {
  const order = await loadOrder(req, orderId)
  if (order.paymentStatus !== 'pending') return
  await addOrderEvent(req, {
    tenantId: tenantOf(order),
    orderId: String(order.id),
    type: 'payment_failed',
    text: `Payment failed: ${reason}`,
    byLabel: 'Razorpay',
  })
}

/**
 * Cancels an order that hasn't shipped: stock goes back (hold released, or sold stock
 * restocked), and a paid order is marked with the refund it is owed.
 */
export async function cancelOrder(
  req: PayloadRequest,
  orderId: string,
  { reason, byLabel }: { reason: string; byLabel?: string },
): Promise<Order> {
  const order = await loadOrder(req, orderId)
  assertMove(order, 'cancelled')
  // A parcel that came back to the store can be cancelled too (docs/11 rto_delivered)
  if (SHIPPED_STATES.has(order.fulfillmentStatus) && order.fulfillmentStatus !== 'returned') {
    throw new AppError(
      'INVALID_TRANSITION',
      'This order has shipped. Handle it as a return or a failed delivery instead.',
      409,
    )
  }
  const tenantId = tenantOf(order)
  // Packed but not picked up: the parcels are cancelled with the order
  const { docs: packed } = await req.payload.find({
    collection: 'shipments',
    where: { and: [{ order: { equals: order.id } }, { status: { equals: 'packed' } }] },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  for (const parcel of packed) {
    await req.payload.update({
      collection: 'shipments',
      id: parcel.id,
      data: {
        status: 'cancelled',
        events: [
          ...(parcel.events ?? []),
          { status: 'cancelled', at: new Date().toISOString(), source: 'system', note: reason },
        ],
      },
      overrideAccess: true,
      req,
    })
  }
  const lines = stockLinesOf(order)
  let stockState = order.stockState
  if (order.stockState === 'reserved') {
    await releaseStock(req, tenantId, String(order.id), lines)
    stockState = 'released'
  } else if (order.stockState === 'sold') {
    await restock(req, tenantId, String(order.id), lines)
    stockState = 'restocked'
  }
  const refundDueMinor = Math.max(
    0,
    (order.totals?.paidMinor ?? 0) - (order.totals?.refundedMinor ?? 0),
  )
  const cancelled = await update(req, order, {
    status: 'cancelled',
    fulfillmentStatus: 'cancelled',
    cancelReason: reason,
    cancelledAt: new Date().toISOString(),
    expiresAt: null,
    stockState,
    ...(order.paymentStatus === 'pending' ? { paymentStatus: 'failed' as const } : {}),
  })
  await addOrderEvent(req, {
    tenantId,
    orderId: String(order.id),
    type: 'status_changed',
    from: order.status,
    to: 'cancelled',
    text: `Order cancelled: ${reason}${
      refundDueMinor ? ` · refund of ${formatINR(refundDueMinor, { decimals: 'always' })} due` : ''
    }`,
    byLabel,
  })
  await emit('order.cancelled', { tenantId, orderId: String(order.id), refundDueMinor }, { req })
  return cancelled
}
