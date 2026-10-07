import type { PayloadRequest } from 'payload'

import { atomicSet } from '@/lib/db/atomic'
import { revalidate, tenantTag } from '@/lib/cache'

/**
 * The product's average and count from its published reviews (docs/screens Reviews rule 5),
 * written straight to the product so the product's own checks and hooks don't run, then the
 * store's pages are refreshed.
 */
export async function refreshProductRating(
  req: PayloadRequest,
  tenantId: string,
  productId: string,
) {
  const { docs } = await req.payload.find({
    collection: 'reviews',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { product: { equals: productId } },
        { status: { equals: 'published' } },
      ],
    },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { rating: true },
    req,
  })
  const count = docs.length
  const average = count
    ? Math.round((docs.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
    : null
  await atomicSet(req, {
    collection: 'products',
    filter: { _id: productId, tenant: tenantId },
    set: { rating: { average, count } },
  })
  revalidate(tenantTag(tenantId, 'store'))
  return { average, count }
}
