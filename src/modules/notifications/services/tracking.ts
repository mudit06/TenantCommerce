import type { Payload, PayloadRequest } from 'payload'

import { AppError } from '@/lib/errors'
import { SHIPMENT_STATUSES } from '@/modules/shipping'
import type { Order, Shipment } from '@/payload-types'

import { indianMobile, maskedPhone } from '../rules'
import { shortDate } from '../variables'
import { preferenceFor, setWhatsAppUpdates, whatsappOptedInFor } from './preferences'

// The tracking page behind every "Track order" link (docs/screens storefront `st-track`): the
// journey, courier and tracking number only. Address, phone and invoice need a login.

export const TRACKING_CODE = /^[A-Za-z0-9]{10}$/

export type TrackingStep = { label: string; at: string | null; done: boolean }

export type TrackingView = {
  orderNumber: string
  headline: string
  cancelled: boolean
  steps: TrackingStep[]
  parcels: {
    id: string
    status: string
    statusLabel: string
    courier: string | null
    trackingNumber: string | null
    trackingUrl: string | null
    items: { title: string; qty: number }[]
  }[]
  /** Items not in a parcel yet */
  waiting: { title: string; options: string | null; qty: number }[]
  phone: string | null
  whatsappOn: boolean
}

async function orderByCode(payload: Payload, tenantId: string, code: string, req?: PayloadRequest) {
  if (!TRACKING_CODE.test(code)) return null
  const { docs } = await payload.find({
    collection: 'orders',
    where: { and: [{ tenant: { equals: tenantId } }, { trackingCode: { equals: code } }] },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  const order = docs[0]
  // An unpaid online order isn't an order yet
  return order && order.status !== 'pending' ? order : null
}

const statusLabel = (status: string) =>
  SHIPMENT_STATUSES.find((s) => s.value === status)?.label ?? status

function headlineOf(order: Order, parcels: Shipment[], eta: string | null): string {
  if (order.status === 'cancelled') return 'Cancelled'
  const live = parcels.filter((p) => p.status !== 'cancelled')
  if (live.length && live.every((p) => p.status === 'delivered')) return 'Delivered'
  if (live.some((p) => p.status === 'out_for_delivery')) return 'Out for delivery today'
  if (live.some((p) => p.status === 'delivery_failed'))
    return 'Delivery attempted: the courier will try again'
  const shipped = live.some((p) => ['shipped', 'in_transit'].includes(p.status))
  if (shipped) return eta ? `Shipped · arriving by ${eta}` : 'Shipped'
  if (live.length) return 'Packed · ships soon'
  return eta ? `Confirmed · arriving by ${eta}` : 'Confirmed'
}

export async function trackingView(
  payload: Payload,
  tenantId: string,
  code: string,
): Promise<TrackingView | null> {
  const order = await orderByCode(payload, tenantId, code)
  if (!order) return null
  const { docs: parcels } = await payload.find({
    collection: 'shipments',
    where: { and: [{ tenant: { equals: tenantId } }, { order: { equals: order.id } }] },
    sort: 'createdAt',
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  const live = parcels.filter((p) => p.status !== 'cancelled')
  const first = <K extends keyof Shipment>(key: K) =>
    live
      .map((p) => p[key] as string | null | undefined)
      .filter((v): v is string => Boolean(v))
      .sort()[0] ?? null
  const expected =
    first('expectedDeliveryDate') ??
    (order.shippingMethod?.etaMaxDays != null
      ? new Date(
          new Date(order.placedAt ?? order.createdAt).getTime() +
            order.shippingMethod.etaMaxDays * 86_400_000,
        ).toISOString()
      : null)
  const eta = shortDate(expected) || null
  const delivered = live.length > 0 && live.every((p) => p.status === 'delivered')
  const deliveredAt = delivered
    ? (live
        .map((p) => p.deliveredAt)
        .filter(Boolean)
        .sort()
        .at(-1) ?? null)
    : null
  const steps: TrackingStep[] =
    order.status === 'cancelled'
      ? [
          { label: 'Placed', at: order.placedAt ?? order.createdAt, done: true },
          { label: 'Cancelled', at: order.cancelledAt ?? null, done: true },
        ]
      : [
          { label: 'Placed', at: order.placedAt ?? order.createdAt, done: true },
          { label: 'Confirmed', at: order.confirmedAt ?? null, done: Boolean(order.confirmedAt) },
          { label: 'Packed', at: first('packedAt'), done: live.length > 0 },
          {
            label: 'Shipped',
            at: first('shippedAt'),
            done: live.some((p) => !['packed'].includes(p.status)),
          },
          {
            label: delivered ? 'Delivered' : eta ? `Delivered by ${eta}` : 'Delivered',
            at: deliveredAt,
            done: delivered,
          },
        ]
  const packed = new Map<string, number>()
  for (const parcel of live)
    for (const item of parcel.items ?? [])
      packed.set(item.orderItemId, (packed.get(item.orderItemId) ?? 0) + item.qty)
  const phone = indianMobile(order.contact?.phone)
  const pref = phone ? await preferenceFor(payload, tenantId, 'phone', phone) : null
  return {
    orderNumber: order.orderNumber,
    headline: headlineOf(order, parcels, eta),
    cancelled: order.status === 'cancelled',
    steps,
    parcels: live.map((p) => ({
      id: String(p.id),
      status: p.status,
      statusLabel: statusLabel(p.status),
      courier: p.carrier ?? null,
      trackingNumber: p.trackingNumber ?? p.awb ?? null,
      trackingUrl: p.trackingUrl && /^https:\/\//.test(p.trackingUrl) ? p.trackingUrl : null,
      items: (p.items ?? []).map((item) => ({ title: item.title ?? 'Item', qty: item.qty })),
    })),
    waiting: (order.items ?? [])
      .map((item) => ({
        title: item.title,
        options: item.options ?? null,
        qty: item.qty - (packed.get(String(item.id)) ?? 0),
      }))
      .filter((item) => item.qty > 0),
    phone: phone ? maskedPhone(phone) : null,
    whatsappOn: Boolean(phone) && whatsappOptedInFor(order, pref),
  }
}

/** "Stop updates" and the WhatsApp switch on the tracking page, for this order's phone only */
export async function setTrackingUpdates(
  req: PayloadRequest,
  tenantId: string,
  code: string,
  whatsapp: boolean,
) {
  const order = await orderByCode(req.payload, tenantId, code, req)
  const phone = indianMobile(order?.contact?.phone)
  if (!order || !phone) throw new AppError('NOT_FOUND', 'This tracking link isn’t valid', 404)
  // Turning it on here also counts for this order, which may have been placed without it
  // (whatsappOptedInFor)
  await setWhatsAppUpdates(req, tenantId, phone, whatsapp, 'tracking-page')
  return { whatsapp }
}
