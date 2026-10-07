'use server'

import { createLocalReq } from 'payload'
import { ZodError } from 'zod'

import { getPayloadClient } from '@/lib/data/payload'
import { withTransaction } from '@/lib/db/transaction'
import { isAppError } from '@/lib/errors'
import { allow } from '@/lib/rate-limit'
import { readReviewToken, submitReview, type ReviewPhoto } from '@/modules/reviews'
import { isFeatureEnabled } from '@/modules/tenancy'

import { signedInShopper } from './account'
import { currentStore, visitorMeta } from './server'

/**
 * "Submit review" (docs/screens storefront `st-review`): the review link's order, or the
 * signed-in owner's order, proves the purchase; the server checks the item was delivered.
 */
export async function sendReview(
  form: FormData,
): Promise<{ ok: true; data: { published: boolean } } | { ok: false; message: string }> {
  try {
    const store = await currentStore()
    if (!store) return { ok: false, message: 'This store isn’t open at the moment.' }
    const payload = await getPayloadClient()
    if (!(await isFeatureEnabled(payload, store.tenantId, 'reviews'))) {
      return { ok: false, message: 'This store doesn’t take reviews.' }
    }
    const { ip } = await visitorMeta()
    if (!allow(`review:${ip ?? 'local'}`, { max: 20, windowMs: 60 * 60_000 })) {
      return { ok: false, message: 'Too many reviews at once. Please try again later.' }
    }
    const orderId = readReviewToken(String(form.get('token') ?? ''))
    if (!orderId) return { ok: false, message: 'This review link isn’t valid any more.' }
    const { docs } = await payload.find({
      collection: 'orders',
      where: { and: [{ tenant: { equals: store.tenantId } }, { id: { equals: orderId } }] },
      limit: 1,
      depth: 0,
      pagination: false,
      overrideAccess: true,
    })
    const order = docs[0]
    if (!order) return { ok: false, message: 'This review link isn’t valid any more.' }
    const session = await signedInShopper(store.tenantId)
    const photos: ReviewPhoto[] = []
    for (const file of form.getAll('photos')) {
      if (file instanceof File && file.size > 0) {
        photos.push({
          data: Buffer.from(await file.arrayBuffer()),
          name: file.name,
          mimetype: file.type,
        })
      }
    }
    const req = await createLocalReq({}, payload)
    const review = await withTransaction(req, () =>
      submitReview(
        req,
        store.tenantId,
        order,
        {
          orderItemId: String(form.get('orderItemId') ?? ''),
          rating: Number(form.get('rating')),
          title: String(form.get('title') ?? ''),
          body: String(form.get('body') ?? ''),
          displayName: String(form.get('displayName') ?? ''),
        },
        {
          photos,
          source: form.get('source') === 'account' ? 'account' : 'review-email',
          customerId:
            session && order.customer === String(session.customer.id) ? order.customer : null,
        },
      ),
    )
    return { ok: true, data: { published: review.status === 'published' } }
  } catch (error) {
    if (error instanceof ZodError) {
      return { ok: false, message: error.issues[0]?.message ?? 'Please check the form.' }
    }
    if (isAppError(error)) return { ok: false, message: error.message }
    console.error('[reviews] submit failed', error)
    return { ok: false, message: 'Something went wrong. Please try again.' }
  }
}
