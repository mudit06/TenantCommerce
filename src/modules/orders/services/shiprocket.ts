import type { PayloadRequest } from 'payload'

import { idOf } from '@/access'
import {
  loadConnector,
  mapShiprocketStatus,
  recordWebhookHealth,
  shiprocketApi,
} from '@/connectors'
import { AppError } from '@/lib/errors'
import { GST_STATES } from '@/lib/gst/gstin'
import type { Shipment } from '@/payload-types'

import { addOrderEvent } from './timeline'
import { moveParcel } from './parcels'
import { loadOrder } from './transition'

// Parcels on Shiprocket (docs/09 "Shiprocket"): booking a packed parcel (AWB, pickup, label),
// and Shiprocket's tracking webhook moving it along the journey. The webhook's own body is never
// trusted to move a parcel: the AWB's tracking is read back from Shiprocket first.

const DEFAULT_BOX = { lengthMm: 300, breadthMm: 200, heightMm: 100 }

/** Books a packed parcel with Shiprocket. The parcel stays packed until the courier picks it up. */
export async function bookWithShiprocket(
  req: PayloadRequest,
  shipmentId: string,
  { courierId, fetchImpl }: { courierId?: string; fetchImpl?: typeof fetch } = {},
): Promise<Shipment> {
  const shipment = await req.payload
    .findByID({ collection: 'shipments', id: shipmentId, depth: 0, overrideAccess: true, req })
    .catch(() => null)
  if (!shipment) throw new AppError('NOT_FOUND', 'Parcel not found', 404)
  if (shipment.status !== 'packed')
    throw new AppError('INVALID_TRANSITION', 'Only packed parcels can be booked.', 409)
  if (shipment.awb)
    throw new AppError('CONFLICT', 'This parcel is already booked with Shiprocket.', 409)
  const tenantId = idOf(shipment.tenant)!
  const ctx = await loadConnector(req.payload, tenantId, 'shiprocket')
  if (!ctx)
    throw new AppError('BUSINESS_RULE', 'Connect Shiprocket on the Shipping screen first.', 422)
  const order = await loadOrder(req, idOf(shipment.order)!)
  const address = order.shippingAddress
  const items = order.items ?? []
  const lines = (shipment.items ?? []).map((line) => {
    const item = items.find((i) => String(i.id) === line.orderItemId)
    return {
      name: line.title ?? item?.title ?? 'Item',
      sku: line.sku ?? item?.sku ?? line.orderItemId,
      units: line.qty,
      sellingPriceMinor: item ? Math.round((item.lineTotalMinor ?? 0) / item.qty) : 0,
      hsn: item?.hsnCode ?? undefined,
      taxRate: item?.gstRate ?? undefined,
    }
  })
  const box = {
    lengthMm:
      shipment.package?.lengthMm ?? (Number(ctx.public.boxLengthMm) || DEFAULT_BOX.lengthMm),
    breadthMm:
      shipment.package?.breadthMm ?? (Number(ctx.public.boxBreadthMm) || DEFAULT_BOX.breadthMm),
    heightMm:
      shipment.package?.heightMm ?? (Number(ctx.public.boxHeightMm) || DEFAULT_BOX.heightMm),
    weightGrams: shipment.package?.weightGrams ?? 500,
  }
  const booking = await shiprocketApi.bookShipment(
    { ...ctx, fetchImpl },
    {
      orderNumber: order.orderNumber,
      parcelRef: String(shipment.id),
      orderDate: new Date(order.placedAt ?? order.createdAt),
      billing: {
        name: address?.name ?? order.contact?.name ?? '',
        phone: address?.phone ?? order.contact?.phone ?? '',
        email: order.contact?.email ?? '',
        line1: [address?.line1, address?.landmark].filter(Boolean).join(', '),
        line2: address?.line2 ?? '',
        city: address?.city ?? '',
        state: address?.stateCode ? GST_STATES[address.stateCode as keyof typeof GST_STATES] : '',
        pincode: address?.pincode ?? '',
      },
      items: lines,
      paymentMethod: order.paymentMethod === 'cod' ? 'cod' : 'prepaid',
      // COD collects the whole order (docs/09: COD orders ship as one parcel)
      subTotalMinor:
        order.paymentMethod === 'cod'
          ? (order.totals?.grandTotalMinor ?? 0)
          : lines.reduce((sum, l) => sum + l.sellingPriceMinor * l.units, 0),
      package: box,
      courierId,
    },
  )
  const updated = await req.payload.update({
    collection: 'shipments',
    id: shipment.id,
    data: {
      provider: 'shiprocket',
      awb: booking.awb ?? undefined,
      trackingNumber: booking.awb ?? undefined,
      trackingUrl: booking.trackingUrl ?? undefined,
      carrier: booking.courierName ?? undefined,
      courierId: booking.courierId ?? undefined,
      providerOrderId: booking.providerOrderId,
      providerShipmentId: booking.providerShipmentId,
      labelUrl: booking.labelUrl ?? undefined,
      pickupScheduledFor: booking.pickupScheduledFor
        ? new Date(booking.pickupScheduledFor).toISOString()
        : undefined,
      package: box,
    },
    overrideAccess: true,
    req,
  })
  await addOrderEvent(req, {
    tenantId,
    orderId: String(order.id),
    type: 'parcel_status_changed',
    text: `Booked with Shiprocket: ${booking.courierName ?? 'courier'} · AWB ${booking.awb}${
      booking.pickupScheduledFor ? ` · pickup ${booking.pickupScheduledFor}` : ''
    }`,
    data: { shipmentId },
  })
  return updated
}

export type CourierWebhook = {
  awb?: string | number
  current_status?: string
  shipment_status?: string
  current_timestamp?: string
  scans?: {
    date?: string
    status?: string
    activity?: string
    location?: string
    'sr-status-label'?: string
  }[]
}

/**
 * Shiprocket's tracking webhook (docs/07 `/api/webhooks/courier/:tenantId`): the per-store token
 * in `x-api-key`, then the AWB's tracking read back from Shiprocket, then one checked parcel move.
 * Returns what happened, for the log; the endpoint always answers 200.
 */
export async function handleCourierWebhook(
  req: PayloadRequest,
  tenantId: string,
  {
    token,
    body,
    fetchImpl,
  }: { token: string | null; body: CourierWebhook; fetchImpl?: typeof fetch },
): Promise<'moved' | 'ignored' | 'bad-token' | 'unknown-awb' | 'not-configured'> {
  const ctx = await loadConnector(req.payload, tenantId, 'shiprocket', { requireAllowed: false })
  if (!ctx) return 'not-configured'
  if (!token || token !== ctx.config.webhookToken) {
    await recordWebhookHealth(req.payload, tenantId, 'shiprocket', {
      ok: false,
      error: 'wrong webhook token',
    })
    return 'bad-token'
  }
  await recordWebhookHealth(req.payload, tenantId, 'shiprocket', { ok: true })
  const awb = String(body.awb ?? '').trim()
  if (!awb) return 'ignored'
  const { docs } = await req.payload.find({
    collection: 'shipments',
    where: { and: [{ tenant: { equals: tenantId } }, { awb: { equals: awb } }] },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  const shipment = docs[0]
  if (!shipment) return 'unknown-awb'
  // Re-read from Shiprocket: a leaked token or a late event can't move a parcel on its own
  const tracking = await shiprocketApi.trackAwb({ ...ctx, fetchImpl }, awb).catch(() => null)
  const status = tracking?.status ?? body.current_status ?? body.shipment_status ?? ''
  const latestScan = tracking?.scans[0]
  return applyTrackedStatus(req, shipment, {
    status,
    activity: latestScan?.activity ?? body.scans?.[0]?.activity ?? '',
    location: latestScan?.location ?? body.scans?.[0]?.location ?? undefined,
    at: latestScan?.at || body.current_timestamp || '',
    expectedDeliveryDate: tracking?.expectedDeliveryDate ?? undefined,
  })
}

async function applyTrackedStatus(
  req: PayloadRequest,
  shipment: Shipment,
  input: {
    status: string
    activity: string
    location?: string
    at: string
    expectedDeliveryDate?: string
  },
): Promise<'moved' | 'ignored'> {
  const mapped = mapShiprocketStatus(input.status, input.activity)
  if (mapped.to === null) {
    if ('alert' in mapped && mapped.alert) {
      await addOrderEvent(req, {
        tenantId: idOf(shipment.tenant)!,
        orderId: idOf(shipment.order)!,
        type: 'note',
        text: mapped.alert,
        byLabel: 'Shiprocket',
      })
    }
    return 'ignored'
  }
  const scanAt = input.at ? new Date(input.at.replace(' ', 'T')) : new Date()
  const { result } = await moveParcel(req, String(shipment.id), {
    to: mapped.to,
    source: 'shiprocket',
    failureReason: 'reason' in mapped ? mapped.reason : undefined,
    note: input.activity || undefined,
    location: input.location,
    expectedDeliveryDate: input.expectedDeliveryDate,
    dedupeKey: `${shipment.awb}:${input.status}:${input.at}`,
    at: Number.isNaN(scanAt.getTime()) ? new Date() : scanAt,
  }).catch((error) => {
    // An impossible move from a confused feed is logged, not fatal
    req.payload.logger.warn({
      msg: 'Shiprocket status not applied',
      awb: shipment.awb,
      status: input.status,
      err: error,
    })
    return { result: 'invalid' as const }
  })
  return result === 'ok' ? 'moved' : 'ignored'
}

/**
 * Every 3 hours: parcels in flight with no news for a day are re-tracked by AWB, in case a
 * webhook was missed (docs/09 "Missed webhooks").
 */
export async function retrackQuietParcels(
  req: PayloadRequest,
  { now = new Date(), fetchImpl }: { now?: Date; fetchImpl?: typeof fetch } = {},
) {
  const { docs } = await req.payload.find({
    collection: 'shipments',
    where: {
      and: [
        { provider: { equals: 'shiprocket' } },
        { awb: { exists: true } },
        {
          status: {
            in: [
              'packed',
              'shipped',
              'in_transit',
              'out_for_delivery',
              'delivery_failed',
              'rto_initiated',
            ],
          },
        },
        { updatedAt: { less_than: new Date(now.getTime() - 86_400_000).toISOString() } },
      ],
    },
    limit: 200,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  let moved = 0
  for (const shipment of docs) {
    const ctx = await loadConnector(req.payload, idOf(shipment.tenant)!, 'shiprocket', {
      requireAllowed: false,
    })
    if (!ctx || !shipment.awb) continue
    const tracking = await shiprocketApi
      .trackAwb({ ...ctx, fetchImpl }, shipment.awb)
      .catch(() => null)
    if (!tracking?.status) continue
    const scan = tracking.scans[0]
    const outcome = await applyTrackedStatus(req, shipment, {
      status: tracking.status,
      activity: scan?.activity ?? '',
      location: scan?.location ?? undefined,
      at: scan?.at ?? '',
      expectedDeliveryDate: tracking.expectedDeliveryDate ?? undefined,
    })
    if (outcome === 'moved') moved += 1
  }
  return { checked: docs.length, moved }
}

/** Cancels a booked, not yet picked up parcel on Shiprocket (frees the AWB). */
export async function cancelShiprocketBooking(
  req: PayloadRequest,
  shipment: Shipment,
  fetchImpl?: typeof fetch,
) {
  if (shipment.provider !== 'shiprocket' || !shipment.providerOrderId) return
  const ctx = await loadConnector(req.payload, idOf(shipment.tenant)!, 'shiprocket', {
    requireAllowed: false,
  })
  if (!ctx) return
  await shiprocketApi.cancelShiprocketOrder({ ...ctx, fetchImpl }, shipment.providerOrderId)
}
