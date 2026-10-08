import sharp from 'sharp'
import type { Payload, PayloadRequest } from 'payload'
import { z } from 'zod'

import { idOf } from '@/access'
import { emit } from '@/lib/events'
import { AppError } from '@/lib/errors'
import type { Order, ReturnRequest } from '@/payload-types'

import { OPEN_RETURN, RETURN_REASONS, type ReturnStatus } from '../constants'
import { orderFor } from './permissions'
import { addOrderEvent } from './timeline'

// Returns (docs/11 "Returns and exchanges", docs/screens storefront `st-order` rule 4): a delivered
// order's items can be asked back while the store's return window is open, with a reason and
// photos. Staff approve with pickup instructions (Shiprocket reverse pickup comes later) or
// reject with a reason, mark the parcel received, then refund from the order (a credit note).

const DAY = 86_400_000
const MAX_PHOTOS = 3
const MAX_PHOTO_BYTES = 8 * 1024 * 1024

export type ReturnPhoto = { data: Buffer; name: string; mimetype: string }

async function returnWindowDays(payload: Payload, tenantId: string, req?: PayloadRequest) {
  const { docs } = await payload.find({
    collection: 'site-settings',
    where: { tenant: { equals: tenantId } },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { returns: true },
    req,
  })
  return docs[0]?.returns?.windowDays ?? 7
}

export async function returnsOf(
  payload: Payload,
  tenantId: string,
  orderId: string,
  req?: PayloadRequest,
): Promise<ReturnRequest[]> {
  const { docs } = await payload.find({
    collection: 'return-requests',
    where: { and: [{ tenant: { equals: tenantId } }, { order: { equals: orderId } }] },
    sort: 'createdAt',
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  return docs
}

/** Whether a return is being handled on the order (affiliate commission waits for it). */
export async function hasOpenReturn(payload: Payload, tenantId: string, orderId: string) {
  const { totalDocs } = await payload.count({
    collection: 'return-requests',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { order: { equals: orderId } },
        { status: { in: [...OPEN_RETURN] } },
      ],
    },
    overrideAccess: true,
  })
  return totalDocs > 0
}

export type ReturnOptions = {
  /** The window is open and something is left to return */
  open: boolean
  closesAt: string | null
  windowDays: number
  /** Pieces of each line that can still be asked back */
  items: { orderItemId: string; title: string; options: string | null; qty: number }[]
}

/** What the shopper can still return on the order, and until when. */
export async function returnOptions(
  payload: Payload,
  tenantId: string,
  order: Order,
  now = new Date(),
): Promise<ReturnOptions> {
  const windowDays = await returnWindowDays(payload, tenantId)
  const delivered = order.fulfillmentStatus === 'delivered' && order.completedAt
  const closesAt = delivered
    ? new Date(new Date(order.completedAt!).getTime() + windowDays * DAY).toISOString()
    : null
  const asked = new Map<string, number>()
  for (const r of await returnsOf(payload, tenantId, String(order.id))) {
    if (r.status === 'rejected') continue
    for (const item of r.items ?? []) {
      asked.set(item.orderItemId, (asked.get(item.orderItemId) ?? 0) + item.qty)
    }
  }
  const items = (order.items ?? [])
    .filter((i) => i.id)
    .map((i) => ({
      orderItemId: i.id!,
      title: i.title,
      options: i.options ?? null,
      qty: i.qty - (asked.get(i.id!) ?? 0),
    }))
    .filter((i) => i.qty > 0)
  return {
    open: Boolean(closesAt && now.getTime() <= new Date(closesAt).getTime() && items.length),
    closesAt,
    windowDays,
    items,
  }
}

export const returnInputSchema = z.object({
  items: z
    .array(z.object({ orderItemId: z.string().min(1), qty: z.number().int().min(1).max(999) }))
    .min(1, 'Choose what to return'),
  reason: z.enum(RETURN_REASONS.map((r) => r.value) as [string, ...string[]], {
    message: 'Choose a reason',
  }),
  note: z.string().trim().max(1000).optional(),
})

/** The shopper asks to return items (their own order only; the caller checks that). */
export async function requestReturn(
  req: PayloadRequest,
  tenantId: string,
  order: Order,
  input: z.input<typeof returnInputSchema>,
  { photos = [], customerId }: { photos?: ReturnPhoto[]; customerId?: string | null },
): Promise<ReturnRequest> {
  const data = returnInputSchema.parse(input)
  if (idOf(order.tenant) !== tenantId) throw new AppError('NOT_FOUND', 'Order not found', 404)
  const options = await returnOptions(req.payload, tenantId, order)
  if (!options.open) {
    throw new AppError(
      'BUSINESS_RULE',
      options.closesAt
        ? 'The return window for this order has closed.'
        : 'Returns open once the order is delivered.',
      422,
    )
  }
  const items = data.items.map((wanted) => {
    const left = options.items.find((i) => i.orderItemId === wanted.orderItemId)
    if (!left) throw new AppError('VALIDATION_FAILED', 'That item can’t be returned', 400)
    if (wanted.qty > left.qty) {
      throw new AppError('VALIDATION_FAILED', `Up to ${left.qty} of ${left.title}`, 400)
    }
    const line = (order.items ?? []).find((i) => i.id === wanted.orderItemId)!
    return {
      orderItemId: wanted.orderItemId,
      title: left.title,
      options: left.options,
      qty: wanted.qty,
      amountMinor: Math.round(((line.lineTotalMinor ?? 0) * wanted.qty) / line.qty),
    }
  })
  const photoIds: string[] = []
  for (const photo of photos.slice(0, MAX_PHOTOS)) {
    if (
      photo.data.length > MAX_PHOTO_BYTES ||
      !/^image\/(jpeg|png|webp|heic|heif)$/.test(photo.mimetype)
    ) {
      throw new AppError(
        'VALIDATION_FAILED',
        'Photos must be JPEG, PNG or WebP, up to 8 MB each.',
        400,
      )
    }
    // Rotated upright, at most 1600 px, metadata (location) dropped
    const clean = await sharp(photo.data)
      .rotate()
      .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer()
    const media = await req.payload.create({
      collection: 'media',
      data: { tenant: tenantId, alt: `Return photo for ${order.orderNumber}` },
      file: {
        data: clean,
        mimetype: 'image/webp',
        name: `return-${Date.now()}-${photoIds.length + 1}.webp`,
        size: clean.length,
      },
      overrideAccess: true,
      req,
    })
    photoIds.push(String(media.id))
  }
  const request = await req.payload.create({
    collection: 'return-requests',
    data: {
      tenant: tenantId,
      order: String(order.id),
      orderNumber: order.orderNumber,
      customer: customerId ?? order.customer ?? null,
      items,
      reason: data.reason as ReturnRequest['reason'],
      note: data.note || null,
      photos: photoIds,
      status: 'requested',
    },
    overrideAccess: true,
    req,
  })
  await setOrderReturnStatus(req, order, 'requested')
  await addOrderEvent(req, {
    tenantId,
    orderId: String(order.id),
    type: 'return',
    text: `Return requested: ${items.map((i) => `${i.qty} × ${i.title}`).join(', ')} · ${RETURN_REASONS.find((r) => r.value === data.reason)?.label}`,
    byLabel: 'shopper',
  })
  await emit(
    'return.requested',
    { tenantId, orderId: String(order.id), returnId: String(request.id) },
    { req },
  )
  return request
}

async function setOrderReturnStatus(req: PayloadRequest, order: Order, status: ReturnStatus) {
  await req.payload.update({
    collection: 'orders',
    id: order.id,
    data: { returnStatus: status },
    overrideAccess: true,
    req,
  })
}

export const decideSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('approve'),
    pickupNote: z.string().trim().min(5, 'Tell the shopper how the item comes back').max(600),
  }),
  z.object({
    action: z.literal('reject'),
    reason: z.string().trim().min(3, 'Say why').max(300),
  }),
  z.object({ action: z.literal('received') }),
])

const NEXT: Record<string, { from: ReturnStatus[]; to: ReturnStatus }> = {
  approve: { from: ['requested'], to: 'approved' },
  reject: { from: ['requested'], to: 'rejected' },
  received: { from: ['approved'], to: 'received' },
}

/** Staff: approve (with how it comes back), reject (with why), or mark it received. */
export async function decideReturn(
  req: PayloadRequest,
  orderId: string,
  returnId: string,
  input: z.input<typeof decideSchema>,
): Promise<ReturnRequest> {
  const data = decideSchema.parse(input)
  const order = await orderFor(req, orderId, true)
  const tenantId = idOf(order.tenant)!
  const { docs } = await req.payload.find({
    collection: 'return-requests',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { order: { equals: orderId } },
        { id: { equals: returnId } },
      ],
    },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  const request = docs[0]
  if (!request) throw new AppError('NOT_FOUND', 'Return not found', 404)
  const step = NEXT[data.action]!
  if (!step.from.includes(request.status)) {
    throw new AppError('INVALID_TRANSITION', `This return is already ${request.status}`, 409)
  }
  const now = new Date().toISOString()
  const updated = await req.payload.update({
    collection: 'return-requests',
    id: request.id,
    data: {
      status: step.to,
      ...(data.action === 'approve' ? { pickupNote: data.pickupNote } : {}),
      ...(data.action === 'reject' ? { rejectReason: data.reason } : {}),
      ...(data.action === 'received'
        ? { receivedAt: now }
        : { decidedAt: now, decidedBy: String(req.user?.id ?? '') }),
    },
    overrideAccess: true,
    req,
  })
  await setOrderReturnStatus(req, order, step.to)
  await addOrderEvent(req, {
    tenantId,
    orderId,
    type: 'return',
    text:
      data.action === 'approve'
        ? `Return approved · ${data.pickupNote}`
        : data.action === 'reject'
          ? `Return rejected · ${data.reason}`
          : 'Returned items received; refund from Refund',
  })
  if (data.action !== 'received') {
    await emit(
      data.action === 'approve' ? 'return.approved' : 'return.rejected',
      { tenantId, orderId, returnId: String(request.id) },
      { req },
    )
  }
  return updated
}

/** refund.processed: a received return on the order is now refunded. */
export async function markReturnRefunded(
  req: PayloadRequest,
  tenantId: string,
  orderId: string,
  refundId: string,
) {
  const received = (await returnsOf(req.payload, tenantId, orderId, req)).filter(
    (r) => r.status === 'received',
  )
  if (!received.length) return
  for (const r of received) {
    await req.payload.update({
      collection: 'return-requests',
      id: r.id,
      data: { status: 'refunded', refund: refundId },
      overrideAccess: true,
      req,
    })
  }
  await req.payload.update({
    collection: 'orders',
    id: orderId,
    data: { returnStatus: 'refunded' },
    overrideAccess: true,
    req,
  })
}
