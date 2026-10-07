import type { PayloadRequest } from 'payload'
import { z } from 'zod'

import { editorName } from '@/fields/editedBy'
import { AppError } from '@/lib/errors'
import { queuePreparedEmail, storeFacts } from '@/modules/notifications'
import type { Review } from '@/payload-types'

import { REJECTION_REASONS } from '../constants'
import { refreshProductRating } from './rating'

// The Reviews screen (docs/screens Reviews): approve whatever the rating, reject only with one
// of the listed reasons, reply in public. Staff never edit the shopper's words.

export const moderateSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('approve'), reply: z.string().trim().max(1000).optional() }),
  z.object({
    action: z.literal('reject'),
    reason: z.enum(REJECTION_REASONS.map((r) => r.value) as [string, ...string[]]),
  }),
  z.object({
    action: z.literal('reply'),
    reply: z.string().trim().min(2, 'Write the reply').max(1000),
  }),
])

async function reviewOf(req: PayloadRequest, tenantId: string, id: string): Promise<Review> {
  const { docs } = await req.payload.find({
    collection: 'reviews',
    where: { and: [{ tenant: { equals: tenantId } }, { id: { equals: id } }] },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  if (!docs[0]) throw new AppError('NOT_FOUND', 'Review not found', 404)
  return docs[0]
}

/** The shopper hears about a public reply (rule 3) at the order's email. */
async function tellShopper(req: PayloadRequest, tenantId: string, review: Review, reply: string) {
  const order = await req.payload
    .findByID({ collection: 'orders', id: review.order, depth: 0, overrideAccess: true, req })
    .catch(() => null)
  const to = order?.contact?.email
  if (!to) return
  const store = await storeFacts(req.payload, tenantId, req)
  const { docs: products } = await req.payload.find({
    collection: 'products',
    where: { and: [{ tenant: { equals: tenantId } }, { id: { equals: review.product } }] },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { slug: true },
    req,
  })
  const slug = products[0]?.slug
  await queuePreparedEmail(req, {
    tenantId,
    kind: 'review',
    milestone: 'review_reply',
    to,
    orderId: review.order,
    dedupeKey: `review_reply:${review.id}:${Date.now()}`,
    email: {
      subject: `${store.storeName} replied to your review`,
      heading: `We replied to your review of ${review.productTitle ?? 'your purchase'}`,
      paragraphs: [reply],
      button: slug
        ? { label: 'See the product', url: `${store.storeOrigin}/products/${slug}` }
        : null,
    },
  })
}

export async function moderateReview(
  req: PayloadRequest,
  tenantId: string,
  id: string,
  input: z.infer<typeof moderateSchema>,
): Promise<Review> {
  const review = await reviewOf(req, tenantId, id)
  const by = editorName(req.user) ?? 'Store team'
  const now = new Date().toISOString()
  let data: Partial<Review>
  switch (input.action) {
    case 'approve':
      if (review.status === 'published')
        throw new AppError('INVALID_TRANSITION', 'Already published', 409)
      data = {
        status: 'published',
        rejectionReason: null,
        publishedAt: now,
        handledBy: by,
        ...(input.reply ? { reply: { text: input.reply, by, at: now } } : {}),
      }
      break
    case 'reject':
      data = {
        status: 'rejected',
        rejectionReason: input.reason as Review['rejectionReason'],
        handledBy: by,
      }
      break
    case 'reply':
      data = { reply: { text: input.reply, by, at: now }, handledBy: by }
      break
  }
  const updated = await req.payload.update({
    collection: 'reviews',
    id: review.id,
    data,
    overrideAccess: true,
    req,
  })
  if (input.action !== 'reply' || review.status === 'published') {
    await refreshProductRating(req, tenantId, review.product)
  }
  const reply = input.action === 'reject' ? null : (input.reply ?? null)
  if (reply) await tellShopper(req, tenantId, updated, reply)
  return updated
}

export const settingsSchema = z.object({
  holdForApproval: z.boolean(),
  showOnProductPages: z.boolean(),
  allowPhotos: z.boolean(),
  requestAfterDays: z.number().int().min(1).max(60),
  requestChannels: z.array(z.enum(['email', 'whatsapp'])).min(1),
})

/** The Reviews screen's Settings card: the store's own reviews feature settings (docs/08). */
export async function saveReviewSettings(
  req: PayloadRequest,
  tenantId: string,
  input: z.infer<typeof settingsSchema>,
) {
  const data = settingsSchema.parse(input)
  const { docs } = await req.payload.find({
    collection: 'feature-flags',
    where: { and: [{ tenant: { equals: tenantId } }, { key: { equals: 'reviews' } }] },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  const flag = docs[0]
  if (!flag) throw new AppError('FEATURE_DISABLED', 'Not found', 404)
  return req.payload.update({
    collection: 'feature-flags',
    id: flag.id,
    data: { config: { ...((flag.config as object) ?? {}), ...data } },
    overrideAccess: false,
    user: req.user,
    req,
  })
}
