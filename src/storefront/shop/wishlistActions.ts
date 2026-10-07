'use server'

import { createLocalReq } from 'payload'

import { getStoreOffers, offerForProduct } from '@/lib/data/offers'
import { getPayloadClient } from '@/lib/data/payload'
import { quoteCheckout } from '@/modules/orders'
import { accountWishlist, cleanItems, saveWishlist, type WishItem } from '@/modules/reviews'
import { isFeatureEnabled } from '@/modules/tenancy'

import { mediaUrl } from '../kit/media'
import { signedInShopper } from './account'
import { currentStore } from './server'

/**
 * Keeps a signed-in shopper's wishlist in step with the device (docs/screens Wishlist rule 1):
 * `merge` on a session's first page, `replace` after a heart is pressed. Guests' lists stay on
 * the device: the answer says signedIn false and nothing is stored.
 */
export async function syncWishlist(
  items: unknown,
  mode: 'merge' | 'replace',
): Promise<{ signedIn: boolean; items: WishItem[] }> {
  const local = cleanItems(items)
  try {
    const store = await currentStore()
    if (!store) return { signedIn: false, items: local }
    const payload = await getPayloadClient()
    if (!(await isFeatureEnabled(payload, store.tenantId, 'wishlist'))) {
      return { signedIn: false, items: local }
    }
    const session = await signedInShopper(store.tenantId)
    if (!session) return { signedIn: false, items: local }
    const req = await createLocalReq({}, payload)
    const saved = await saveWishlist(req, store.tenantId, String(session.customer.id), local, {
      merge: mode === 'merge',
    })
    return { signedIn: true, items: saved }
  } catch (error) {
    console.error('[wishlist] sync failed', error)
    return { signedIn: false, items: local }
  }
}

/** The saved products as the wishlist page shows them, read fresh (prices, offers, stock). */
export async function accountWishlistItems(): Promise<WishItem[] | null> {
  const store = await currentStore()
  if (!store) return null
  const session = await signedInShopper(store.tenantId)
  if (!session) return null
  return accountWishlist(await getPayloadClient(), store.tenantId, String(session.customer.id))
}

export type WishlistRow = {
  productId: string
  variantId: string | null
  title: string
  options: string | null
  sku: string | null
  href: string
  image: { url: string; alt: string } | null
  priceMinor: number | null
  mrpMinor: number | null
  offer: { priceMinor: number | null; badge: string | null; until: string | null } | null
  /** Why it can't go in the cart now: sold out, sold on request… */
  problem: string | null
}

/**
 * The wishlist page's rows (docs/screens Wishlist rule 2): today's price, a live scheme's
 * price and real end, and stock, read fresh from the server for the saved products.
 */
export async function wishlistView(items: unknown): Promise<WishlistRow[]> {
  const store = await currentStore()
  if (!store) return []
  const list = cleanItems(items)
  if (!list.length) return []
  const payload = await getPayloadClient()
  const [quote, offers, products] = await Promise.all([
    quoteCheckout(payload, store.tenantId, {
      lines: list.map((i) => ({ productId: i.productId, variantId: i.variantId, qty: 1 })),
      live: null,
    }),
    getStoreOffers(store.tenantId),
    payload.find({
      collection: 'products',
      where: {
        and: [
          { tenant: { equals: store.tenantId } },
          { id: { in: list.map((i) => i.productId) } },
          { status: { equals: 'active' } },
        ],
      },
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: {
        categories: true,
        primaryCategory: true,
        purchaseMode: true,
        title: true,
        slug: true,
      },
    }),
  ])
  const byProduct = new Map(products.docs.map((p) => [String(p.id), p]))
  const rows: WishlistRow[] = []
  for (const item of list) {
    const product = byProduct.get(item.productId)
    if (!product) continue
    const line = quote.lines.find(
      (l) => l.productId === item.productId && (l.variantId ?? null) === (item.variantId ?? null),
    )
    const categoryIds = [product.primaryCategory, ...(product.categories ?? [])]
      .map((c) => (typeof c === 'object' && c ? String(c.id) : c ? String(c) : null))
      .filter((c): c is string => Boolean(c))
    const sellable = line && line.unitMinor > 0
    rows.push({
      productId: item.productId,
      variantId: item.variantId,
      title: line?.title ?? product.title,
      options: line?.options ?? null,
      sku: line?.sku ?? null,
      href: `/products/${line?.slug ?? product.slug}`,
      image: line?.image
        ? { url: mediaUrl(line.image.url) ?? line.image.url, alt: line.image.alt }
        : null,
      priceMinor: sellable ? line.unitMinor : null,
      mrpMinor: line?.mrpMinor ?? null,
      offer: sellable
        ? offerForProduct(offers, {
            id: item.productId,
            variantId: item.variantId,
            categoryIds,
            priceMinor: line.unitMinor,
            purchaseMode: product.purchaseMode,
          })
        : null,
      problem: !line
        ? 'This finish isn’t sold any more.'
        : line.problem === 'Choose a finish or size.'
          ? null
          : line.problem,
    })
  }
  return rows
}
