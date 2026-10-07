import type { Payload, PayloadRequest } from 'payload'
import sharp from 'sharp'
import { z } from 'zod'

import { AppError } from '@/lib/errors'
import { featureConfig } from '@/modules/tenancy'
import type { Order, Review } from '@/payload-types'

import { MAX_PHOTO_BYTES, MAX_PHOTOS } from '../constants'
import { refreshProductRating } from './rating'

// Writing a review (docs/screens storefront `st-review`): verified purchase only (a delivered
// item of the order), one per item, stars required, up to 4 photos re-encoded without their
// location data, and the shown name chosen by the shopper. Nothing is given for a review.

export type ReviewableItem = {
  orderItemId: string
  productId: string
  variantId: string | null
  title: string
  options: string | null
  sku: string | null
  imageUrl: string | null
  reviewed: boolean
}

type ReviewsConfig = { holdForApproval: boolean; allowPhotos: boolean; showOnProductPages: boolean }

/** Items of the order that were delivered, and whether each already has a review. */
export async function reviewableItems(
  payload: Payload,
  tenantId: string,
  order: Order,
  req?: PayloadRequest,
): Promise<ReviewableItem[]> {
  if (order.status === 'cancelled') return []
  const { docs: parcels } = await payload.find({
    collection: 'shipments',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { order: { equals: order.id } },
        { status: { equals: 'delivered' } },
      ],
    },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  const deliveredItems = new Set(parcels.flatMap((p) => (p.items ?? []).map((i) => i.orderItemId)))
  // A whole order marked delivered counts every item
  const allDelivered = order.fulfillmentStatus === 'delivered'
  const { docs: reviews } = await payload.find({
    collection: 'reviews',
    where: { and: [{ tenant: { equals: tenantId } }, { order: { equals: String(order.id) } }] },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { orderItem: true },
    req,
  })
  const done = new Set(reviews.map((r) => r.orderItem))
  return (order.items ?? [])
    .filter((item) => item.id && item.productId && (allDelivered || deliveredItems.has(item.id)))
    .map((item) => ({
      orderItemId: item.id!,
      productId: item.productId!,
      variantId: item.variantId ?? null,
      title: item.title,
      options: item.options ?? null,
      sku: item.sku ?? null,
      imageUrl: item.imageUrl ?? null,
      reviewed: done.has(item.id!),
    }))
}

/** The names a shopper can show: "Rahul K., Pune", "Rahul K." or "Rahul". */
export function nameChoices(name: string | null | undefined, city: string | null | undefined) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  const first = parts[0] ?? 'A buyer'
  const initial = parts[1] ? ` ${parts[1][0]!.toUpperCase()}.` : ''
  const short = `${first}${initial}`
  return [...new Set([city ? `${short}, ${city}` : null, short, first].filter(Boolean) as string[])]
}

export const reviewInputSchema = z.object({
  orderItemId: z.string().min(1),
  rating: z.number().int().min(1, 'Choose your rating').max(5),
  title: z.string().trim().max(100).optional(),
  body: z.string().trim().max(3000).optional(),
  displayName: z.string().trim().min(1).max(60),
})

export type ReviewPhoto = { data: Buffer; name: string; mimetype: string }

export async function submitReview(
  req: PayloadRequest,
  tenantId: string,
  order: Order,
  input: z.input<typeof reviewInputSchema>,
  {
    photos = [],
    source,
    customerId,
  }: { photos?: ReviewPhoto[]; source: 'account' | 'review-email'; customerId?: string | null },
): Promise<Review> {
  const data = reviewInputSchema.parse(input)
  const config = await featureConfig<ReviewsConfig>(req.payload, tenantId, 'reviews', req)
  if (!config) throw new AppError('FEATURE_DISABLED', 'Not found', 404)
  const items = await reviewableItems(req.payload, tenantId, order, req)
  const item = items.find((i) => i.orderItemId === data.orderItemId)
  if (!item) {
    throw new AppError('BUSINESS_RULE', 'Only delivered items of this order can be reviewed.', 422)
  }
  if (item.reviewed) throw new AppError('CONFLICT', 'You have already reviewed this item.', 409)
  // The shown name must be one of the choices made from the order (never the email or phone)
  const city = order.shippingAddress?.city ?? null
  const choices = nameChoices(order.contact?.name ?? order.shippingAddress?.name, city)
  const displayName = choices.includes(data.displayName) ? data.displayName : choices.at(-1)!

  const photoIds: string[] = []
  if (photos.length) {
    if (!config.allowPhotos)
      throw new AppError('BUSINESS_RULE', 'This store doesn’t take photos.', 422)
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
      // Re-encoded: rotated upright, at most 1600 px, metadata (location) dropped
      const clean = await sharp(photo.data)
        .rotate()
        .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer()
      const media = await req.payload.create({
        collection: 'media',
        data: { tenant: tenantId, alt: `Photo from a review of ${item.title}` },
        file: {
          data: clean,
          mimetype: 'image/webp',
          name: `review-${Date.now()}-${photoIds.length + 1}.webp`,
          size: clean.length,
        },
        overrideAccess: true,
      })
      photoIds.push(String(media.id))
    }
  }

  const published = !config.holdForApproval
  const review = await req.payload.create({
    collection: 'reviews',
    data: {
      tenant: tenantId,
      product: item.productId,
      productTitle: item.title,
      variant: item.variantId ?? undefined,
      variantLabel: item.options ?? undefined,
      order: String(order.id),
      orderNumber: order.orderNumber,
      orderItem: item.orderItemId,
      customer: customerId ?? order.customer ?? undefined,
      displayName,
      city: city ?? undefined,
      rating: data.rating,
      title: data.title || undefined,
      body: data.body || undefined,
      photos: photoIds,
      status: published ? 'published' : 'pending',
      source,
      publishedAt: published ? new Date().toISOString() : undefined,
    },
    overrideAccess: true,
    req,
  })
  if (published) await refreshProductRating(req, tenantId, item.productId)
  return review
}
