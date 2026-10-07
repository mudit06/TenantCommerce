import type { Payload, PayloadRequest } from 'payload'

import type { Wishlist } from '@/payload-types'

import { MAX_WISHLIST } from '../constants'

// A signed-in shopper's wishlist (docs/screens storefront `st-wishlist`). Guests keep theirs on
// the device; signing in merges it here so it follows them to other devices.

export type WishItem = { productId: string; variantId: string | null }

const key = (item: WishItem) => `${item.productId}:${item.variantId ?? ''}`
const ID = /^[a-f0-9]{24}$/i

export function cleanItems(items: unknown): WishItem[] {
  const list = Array.isArray(items) ? items : []
  const seen = new Set<string>()
  const out: WishItem[] = []
  for (const raw of list) {
    const item = raw as { productId?: unknown; variantId?: unknown }
    const productId = String(item?.productId ?? '')
    const variantId = item?.variantId ? String(item.variantId) : null
    if (!ID.test(productId) || (variantId && !ID.test(variantId))) continue
    const clean = { productId, variantId }
    if (seen.has(key(clean))) continue
    seen.add(key(clean))
    out.push(clean)
    if (out.length >= MAX_WISHLIST) break
  }
  return out
}

async function listOf(
  payload: Payload,
  tenantId: string,
  customerId: string,
  req?: PayloadRequest,
) {
  const { docs } = await payload.find({
    collection: 'wishlists',
    where: { and: [{ tenant: { equals: tenantId } }, { customer: { equals: customerId } }] },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  return docs[0] ?? null
}

export async function accountWishlist(payload: Payload, tenantId: string, customerId: string) {
  const doc = await listOf(payload, tenantId, customerId)
  return (doc?.items ?? []).map((i) => ({ productId: i.product, variantId: i.variant ?? null }))
}

/** Saves the account's list as `items` (the device's list merged in when `merge`). */
export async function saveWishlist(
  req: PayloadRequest,
  tenantId: string,
  customerId: string,
  items: WishItem[],
  { merge }: { merge: boolean },
): Promise<WishItem[]> {
  const existing = await listOf(req.payload, tenantId, customerId, req)
  const current = (existing?.items ?? []).map((i) => ({
    productId: i.product,
    variantId: i.variant ?? null,
  }))
  const next = cleanItems(merge ? [...current, ...items] : items)
  const data: Pick<Wishlist, 'items'> = {
    items: next.map((i) => ({
      product: i.productId,
      variant: i.variantId ?? undefined,
      addedAt:
        existing?.items?.find(
          (e) => e.product === i.productId && (e.variant ?? null) === i.variantId,
        )?.addedAt ?? new Date().toISOString(),
    })),
  }
  if (existing) {
    await req.payload.update({
      collection: 'wishlists',
      id: existing.id,
      data,
      overrideAccess: true,
      req,
    })
  } else {
    await req.payload.create({
      collection: 'wishlists',
      data: { tenant: tenantId, customer: customerId, ...data },
      overrideAccess: true,
      req,
    })
  }
  return next
}
