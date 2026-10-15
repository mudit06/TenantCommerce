import { unstable_cache } from 'next/cache'
import type { Payload, Where } from 'payload'
import { cache } from 'react'

import { idOf } from '@/access'
import { storefrontTag } from '@/hooks/revalidateStorefront'
import { attributeSetForCategory } from '@/modules/catalog'
import type { AttributeSet, Category, Product, ProductDocument, Variant } from '@/payload-types'

import { rankSearch } from '@/lib/search'

import { getPayloadClient } from './payload'
import { MEDIA_FIELDS } from './populate'

const cached = <T>(tenantId: string, key: unknown[], fn: () => Promise<T>) =>
  unstable_cache(fn, ['catalog', tenantId, ...key.map((part) => JSON.stringify(part))], {
    tags: [storefrontTag(tenantId)],
    revalidate: 3600,
  })()

/** Products shoppers may see: active ones of this store. */
const liveProducts = (tenantId: string, extra?: Where): Where => ({
  and: [
    { tenant: { equals: tenantId } },
    { status: { equals: 'active' } },
    ...(extra ? [extra] : []),
  ],
})

/** What a populated relationship carries in storefront queries: only what pages read from it. */
const LEAN_POPULATE = {
  media: MEDIA_FIELDS,
  tenants: { slug: true },
  'attribute-sets': { name: true },
  categories: { name: true, slug: true, breadcrumbs: true, parent: true },
  products: { title: true, slug: true },
} as const

export type CategoryNode = Category & { children: CategoryNode[]; path: string }

/**
 * The visible categories, flat. The tree is not cached: its JSON repeats every subtree under
 * each ancestor and again in `all`, which passes the data cache's 2 MB entry limit on a large
 * catalogue, and an entry over the limit is never cached (every request would query).
 */
const getCategoryList = (tenantId: string) =>
  cached(tenantId, ['categories'], async () => {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'categories',
      where: { and: [{ tenant: { equals: tenantId } }, { isVisible: { not_equals: false } }] },
      depth: 1,
      populate: LEAN_POPULATE,
      sort: 'sortOrder',
      pagination: false,
      overrideAccess: true,
    })
    return docs
  })

/** The visible category tree, ordered for menus and tiles (built once per request). */
export const getCategoryTree = cache(async (tenantId: string) => {
  const docs = await getCategoryList(tenantId)
  const nodes = new Map<string, CategoryNode>()
  for (const doc of docs) {
    nodes.set(String(doc.id), {
      ...doc,
      children: [],
      path: doc.breadcrumbs?.at(-1)?.url ?? `/c/${doc.slug}`,
    })
  }
  const roots: CategoryNode[] = []
  for (const node of nodes.values()) {
    const parent = node.parent ? nodes.get(idOf(node.parent) ?? '') : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return { roots, all: [...nodes.values()] }
})

/** The attribute set a category's filters come from (its own, else the nearest parent's). */
export const getCategoryAttributeSet = (tenantId: string, categoryId: string) =>
  cached(tenantId, ['attribute-set', categoryId], async () =>
    attributeSetForCategory(await getPayloadClient(), categoryId),
  )

/** A category and every category under it, for listings. */
export function withDescendants(node: CategoryNode): string[] {
  return [String(node.id), ...node.children.flatMap(withDescendants)]
}

export type ProductCardData = Pick<
  Product,
  | 'id'
  | 'title'
  | 'slug'
  | 'modelNumber'
  | 'gallery'
  | 'attributes'
  | 'isFeatured'
  | 'createdAt'
  | 'purchaseMode'
  | 'price'
  | 'compareAtPrice'
  | 'rating'
> & {
  primaryCategory: string | null
  /** Main category first, then "also show in": what a scheme on a category covers */
  categoryIds: string[]
  /**
   * For the card's Add to cart and the stock filter: how many finishes or sizes it is sold in,
   * the one variant when there is only one, and pieces left (null when stock isn't tracked)
   */
  buy: { options: number; variantId: string | null; available: number | null }
}

const CARD_SELECT = {
  title: true,
  slug: true,
  modelNumber: true,
  gallery: true,
  attributes: true,
  isFeatured: true,
  updatedAt: true,
  createdAt: true,
  purchaseMode: true,
  price: true,
  compareAtPrice: true,
  rating: true,
  primaryCategory: true,
  categories: true,
} as const

/** A card without its photos: the cached category lists (`getProductsInCategories`). */
const LIST_SELECT = Object.fromEntries(
  Object.entries(CARD_SELECT).filter(([field]) => field !== 'gallery'),
) as Omit<typeof CARD_SELECT, 'gallery'>

const toCard = (doc: Product, buy?: ProductCardData['buy']): ProductCardData => ({
  id: doc.id,
  title: doc.title,
  slug: doc.slug,
  modelNumber: doc.modelNumber,
  gallery: (doc.gallery ?? []).slice(0, 2),
  attributes: doc.attributes,
  isFeatured: doc.isFeatured,
  createdAt: doc.createdAt,
  purchaseMode: doc.purchaseMode,
  price: doc.price,
  compareAtPrice: doc.compareAtPrice,
  rating: doc.rating,
  primaryCategory: idOf(doc.primaryCategory),
  categoryIds: [idOf(doc.primaryCategory), ...(doc.categories ?? []).map((c) => idOf(c))].filter(
    (id): id is string => Boolean(id),
  ),
  buy: buy ?? { options: 0, variantId: null, available: null },
})

/** Cards with their variants' stock (one query for the whole list). */
async function toCards(payload: Payload, tenantId: string, docs: Product[]) {
  if (docs.length === 0) return []
  const { docs: variants } = await payload.find({
    collection: 'variants',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { product: { in: docs.map((doc) => doc.id) } },
        { status: { equals: 'active' } },
      ],
    },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { product: true, stockQty: true, reservedQty: true, allowBackorder: true },
  })
  const byProduct = new Map<string, ProductCardData['buy']>()
  for (const variant of variants) {
    const productId = idOf(variant.product)!
    const current = byProduct.get(productId) ?? { options: 0, variantId: null, available: 0 }
    const left = variant.allowBackorder
      ? null
      : Math.max(0, (variant.stockQty ?? 0) - (variant.reservedQty ?? 0))
    byProduct.set(productId, {
      options: current.options + 1,
      variantId: current.options === 0 ? String(variant.id) : null,
      available: current.available === null || left === null ? null : current.available + left,
    })
  }
  return docs.map((doc) => toCard(doc, byProduct.get(String(doc.id))))
}

/**
 * Every live product in these categories (main or "also show in"), newest first, for filters,
 * facets and sorting. Cached without photos, which are most of a card's size: a large category
 * stays under the data cache's 2 MB entry limit and each request parses half as much. The page
 * of cards on screen gets its photos from `withGalleries`.
 */
export const getProductsInCategories = (tenantId: string, categoryIds: string[]) =>
  cached(tenantId, ['in', [...categoryIds].sort()], async () => {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'products',
      where: liveProducts(tenantId, {
        or: [{ primaryCategory: { in: categoryIds } }, { categories: { in: categoryIds } }],
      }),
      depth: 0,
      sort: '-createdAt',
      pagination: false,
      overrideAccess: true,
      select: LIST_SELECT,
    })
    return toCards(payload, tenantId, docs as Product[])
  })

/** The first two photos of these products, by product id (cached per set of products). */
const getGalleries = (tenantId: string, ids: string[]) =>
  cached(tenantId, ['galleries', [...ids].sort()], async () => {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'products',
      where: liveProducts(tenantId, { id: { in: ids } }),
      depth: 1,
      populate: LEAN_POPULATE,
      pagination: false,
      overrideAccess: true,
      select: { gallery: true },
    })
    return Object.fromEntries(
      docs.map((doc) => [String(doc.id), (doc.gallery ?? []).slice(0, 2)]),
    ) as Record<string, ProductCardData['gallery']>
  })

/** Cards from a photo-less list (`getProductsInCategories`) with their photos, for the screen. */
export async function withGalleries<T extends ProductCardData>(
  tenantId: string,
  cards: T[],
): Promise<T[]> {
  const missing = cards.filter((card) => !card.gallery?.length).map((card) => String(card.id))
  if (missing.length === 0) return cards
  const galleries = await getGalleries(tenantId, missing)
  return cards.map((card) =>
    card.gallery?.length ? card : { ...card, gallery: galleries[String(card.id)] ?? [] },
  )
}

/** Cards for these products, in the order given (search results, cart suggestions). */
const getCardsByIds = async (tenantId: string, ids: string[]): Promise<ProductCardData[]> => {
  if (ids.length === 0) return []
  const cards = await cached(tenantId, ['cards', [...ids].sort()], async () => {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'products',
      where: liveProducts(tenantId, { id: { in: ids } }),
      depth: 1,
      populate: LEAN_POPULATE,
      pagination: false,
      overrideAccess: true,
      select: CARD_SELECT,
    })
    return toCards(payload, tenantId, docs as Product[])
  })
  const byId = new Map(cards.map((card) => [String(card.id), card]))
  return ids.flatMap((id) => byId.get(id) ?? [])
}

export const getProductList = (
  tenantId: string,
  source: 'featured' | 'newest' | 'bestsellers' | 'category',
  limit: number,
  categoryIds?: string[],
) =>
  cached(tenantId, ['list', source, limit, categoryIds ?? []], async () => {
    const payload = await getPayloadClient()
    const extra: Where | undefined =
      source === 'featured'
        ? { isFeatured: { equals: true } }
        : source === 'category' && categoryIds?.length
          ? { or: [{ primaryCategory: { in: categoryIds } }, { categories: { in: categoryIds } }] }
          : undefined
    const { docs } = await payload.find({
      collection: 'products',
      where: liveProducts(tenantId, extra),
      depth: 1,
      populate: LEAN_POPULATE,
      // Bestsellers need order stats (stage B); newest until then
      sort: '-createdAt',
      limit,
      overrideAccess: true,
      select: CARD_SELECT,
    })
    return toCards(payload, tenantId, docs as Product[])
  })

/**
 * Every live product's search fields only (title, model number, keywords), ranked in memory by
 * `rankSearch`; Atlas Search replaces this when catalogues grow (docs/12). Kept this small so
 * a store with thousands of products still fits one cache entry: cards are read for the best
 * matches only, not for the whole catalogue on every keystroke.
 */
const getSearchIndex = (tenantId: string) =>
  cached(tenantId, ['search-index'], async () => {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'products',
      where: liveProducts(tenantId),
      depth: 0,
      sort: '-isFeatured,-createdAt',
      pagination: false,
      overrideAccess: true,
      select: { title: true, modelNumber: true, searchKeywords: true },
    })
    return docs.map((doc) => ({
      id: String(doc.id),
      title: doc.title,
      modelNumber: doc.modelNumber,
      searchKeywords: doc.searchKeywords ?? null,
    }))
  })

/** Search by model number, title or keywords, best match first, small typos allowed. */
export const searchProducts = async (tenantId: string, query: string, limit = 48) => {
  const term = query.trim().slice(0, 80)
  if (term.length < 2) return []
  const ranked = rankSearch(await getSearchIndex(tenantId), term).slice(0, limit)
  return getCardsByIds(
    tenantId,
    ranked.map((row) => row.id),
  )
}

/**
 * "Complete the look" in the cart: more from the categories of what's in it, not already in it,
 * sold online with a price. Reads the cart's products and a few candidates, not the catalogue.
 */
export const getCartSuggestions = async (tenantId: string, productIds: string[], limit = 4) => {
  if (productIds.length === 0) return []
  const inCart = await getCardsByIds(tenantId, productIds)
  const categoryIds = [...new Set(inCart.flatMap((card) => card.categoryIds))]
  if (categoryIds.length === 0) return []
  const candidates = await getProductsFor(
    tenantId,
    { categoryIds, excludeIds: productIds },
    limit * 3,
  )
  return candidates.filter((card) => card.price?.amountMinor).slice(0, limit)
}

export type ProductPageData = {
  product: Product
  variants: Variant[]
  attributeSet: AttributeSet | null
  category: Category | null
  documents: ProductDocument[]
}

export const getProductBySlug = (tenantId: string, slug: string) =>
  cached(tenantId, ['product', slug], async (): Promise<ProductPageData | null> => {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'products',
      where: liveProducts(tenantId, { slug: { equals: slug } }),
      depth: 2,
      populate: LEAN_POPULATE,
      limit: 1,
      overrideAccess: true,
    })
    const product = docs[0]
    if (!product) return null
    const [variants, attributeSet] = await Promise.all([
      payload
        .find({
          collection: 'variants',
          where: {
            and: [
              { tenant: { equals: tenantId } },
              { product: { equals: product.id } },
              { status: { equals: 'active' } },
            ],
          },
          depth: 1,
          populate: LEAN_POPULATE,
          sort: 'sortOrder',
          pagination: false,
          overrideAccess: true,
        })
        .then((r) => r.docs),
      attributeSetForCategory(payload, idOf(product.primaryCategory)),
    ])
    const category = typeof product.primaryCategory === 'object' ? product.primaryCategory : null
    const documents = (product.documents ?? []).filter(
      (doc): doc is ProductDocument => typeof doc === 'object' && idOf(doc.tenant) === tenantId,
    )
    return { product, variants, attributeSet, category, documents }
  })

/** Documents shown on the Downloads block and page. */
export const getDownloads = (tenantId: string, type?: string | null, limit = 24) =>
  cached(tenantId, ['downloads', type ?? 'all', limit], async () => {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'product-documents',
      where: {
        and: [
          { tenant: { equals: tenantId } },
          { showOnDownloadsPage: { not_equals: false } },
          ...(type ? [{ type: { equals: type } }] : []),
        ],
      },
      depth: 1,
      limit,
      overrideAccess: true,
    })
    return docs
  })

export type DownloadRow = {
  id: string
  title: string
  type: string
  url: string
  sizeBytes: number | null
  updatedAt: string
  /** Product names and model numbers it belongs to, for search */
  products: string[]
}

/** Every document on the Downloads page, with the products it belongs to (`st-downloads`). */
export const getDownloadsPage = (tenantId: string): Promise<DownloadRow[]> =>
  cached(tenantId, ['downloads-page'], async () => {
    const payload = await getPayloadClient()
    const [{ docs }, { docs: products }] = await Promise.all([
      payload.find({
        collection: 'product-documents',
        where: {
          and: [{ tenant: { equals: tenantId } }, { showOnDownloadsPage: { not_equals: false } }],
        },
        sort: '-updatedAt',
        depth: 1,
        limit: 1000,
        pagination: false,
        overrideAccess: true,
      }),
      payload.find({
        collection: 'products',
        where: liveProducts(tenantId, { documents: { exists: true } }),
        depth: 0,
        limit: 5000,
        pagination: false,
        overrideAccess: true,
        select: { title: true, modelNumber: true, documents: true },
      }),
    ])
    const productsOf = new Map<string, string[]>()
    for (const p of products) {
      for (const d of p.documents ?? []) {
        const id = String(idOf(d))
        productsOf.set(id, [
          ...(productsOf.get(id) ?? []),
          [p.title, p.modelNumber].filter(Boolean).join(' '),
        ])
      }
    }
    return docs.flatMap((doc) => {
      const file = typeof doc.file === 'object' ? doc.file : null
      if (!file?.url) return []
      return [
        {
          id: String(doc.id),
          title: doc.title,
          type: doc.type,
          url: file.url,
          sizeBytes: file.filesize ?? null,
          updatedAt: file.updatedAt ?? doc.updatedAt,
          products: productsOf.get(String(doc.id)) ?? [],
        },
      ]
    })
  })

/** Live products by id or category, for an offer's landing page (docs/screens Offers page). */
export const getProductsFor = (
  tenantId: string,
  filter: { productIds?: string[]; categoryIds?: string[]; excludeIds?: string[] },
  limit = 48,
) =>
  cached(tenantId, ['for', filter, limit], async () => {
    const payload = await getPayloadClient()
    const and: Where[] = [{ purchaseMode: { not_equals: 'enquire' } }]
    if (filter.productIds) and.push({ id: { in: filter.productIds } })
    if (filter.categoryIds) {
      and.push({
        or: [
          { primaryCategory: { in: filter.categoryIds } },
          { categories: { in: filter.categoryIds } },
        ],
      })
    }
    if (filter.excludeIds?.length) and.push({ id: { not_in: filter.excludeIds } })
    const { docs } = await payload.find({
      collection: 'products',
      where: liveProducts(tenantId, { and }),
      depth: 1,
      populate: LEAN_POPULATE,
      sort: '-createdAt',
      limit,
      overrideAccess: true,
      select: CARD_SELECT,
    })
    return toCards(payload, tenantId, docs as Product[])
  })

/**
 * "Goes well with" on a product page: the vendor's picks in their order, else the newest from
 * its main category. Only these few cards are read, never the whole catalogue or category.
 */
export const getRelatedProducts = (
  tenantId: string,
  productId: string,
  pickedIds: string[],
  categoryId: string | null,
  limit = 4,
) =>
  cached(tenantId, ['related', productId, pickedIds, categoryId, limit], async () => {
    const payload = await getPayloadClient()
    const find = (extra: Where, sort?: string) =>
      payload
        .find({
          collection: 'products',
          where: liveProducts(tenantId, { and: [extra, { id: { not_equals: productId } }] }),
          depth: 1,
          populate: LEAN_POPULATE,
          sort,
          limit,
          overrideAccess: true,
          select: CARD_SELECT,
        })
        .then((r) => r.docs as Product[])
    if (pickedIds.length) {
      const docs = await find({ id: { in: pickedIds } })
      if (docs.length) {
        const order = new Map(pickedIds.map((id, i) => [id, i]))
        docs.sort((a, b) => (order.get(String(a.id)) ?? 0) - (order.get(String(b.id)) ?? 0))
        return { picked: true, cards: await toCards(payload, tenantId, docs) }
      }
    }
    if (!categoryId) return { picked: false, cards: [] }
    const docs = await find(
      { or: [{ primaryCategory: { equals: categoryId } }, { categories: { equals: categoryId } }] },
      '-createdAt',
    )
    return { picked: false, cards: await toCards(payload, tenantId, docs) }
  })

export type PublicReview = {
  id: string
  rating: number
  title: string | null
  body: string | null
  displayName: string
  variantLabel: string | null
  at: string
  photos: { url: string; alt: string }[]
  reply: string | null
}

/** A product's published reviews, newest first, with the bars (docs/screens Product page rule 11). */
export const getProductReviews = (tenantId: string, productId: string) =>
  cached(tenantId, ['reviews', productId], async () => {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'reviews',
      where: {
        and: [
          { tenant: { equals: tenantId } },
          { product: { equals: productId } },
          { status: { equals: 'published' } },
        ],
      },
      sort: '-publishedAt',
      depth: 1,
      populate: LEAN_POPULATE,
      limit: 200,
      pagination: false,
      overrideAccess: true,
    })
    const bars = [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: docs.filter((r) => r.rating === stars).length,
    }))
    const reviews: PublicReview[] = docs.map((r) => ({
      id: String(r.id),
      rating: r.rating,
      title: r.title ?? null,
      body: r.body ?? null,
      displayName: r.displayName,
      variantLabel: r.variantLabel ?? null,
      at: r.publishedAt ?? r.createdAt,
      photos: (r.photos ?? [])
        .map((p) =>
          typeof p === 'object' && p?.url
            ? { url: p.sizes?.card?.url ?? p.url, alt: p.alt ?? '' }
            : null,
        )
        .filter((p): p is { url: string; alt: string } => p !== null),
      reply: r.reply?.text ?? null,
    }))
    return { reviews, bars, count: docs.length }
  })

export type StoreReview = PublicReview & { productTitle: string; productSlug: string | null }

/** The store's latest published reviews at or above a rating, for the Reviews block. */
export const getStoreReviews = (tenantId: string, minRating: number, limit: number) =>
  cached(tenantId, ['store-reviews', minRating, limit], async () => {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'reviews',
      where: {
        and: [
          { tenant: { equals: tenantId } },
          { status: { equals: 'published' } },
          { rating: { greater_than_equal: minRating } },
        ],
      },
      sort: '-publishedAt',
      depth: 0,
      limit,
      overrideAccess: true,
    })
    const { docs: products } = await payload.find({
      collection: 'products',
      where: liveProducts(tenantId, { id: { in: docs.map((r) => r.product) } }),
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { slug: true, title: true },
    })
    const productOf = new Map(products.map((p) => [String(p.id), p]))
    return docs.map((r): StoreReview => ({
      id: String(r.id),
      rating: r.rating,
      title: r.title ?? null,
      body: r.body ?? null,
      displayName: r.displayName,
      variantLabel: r.variantLabel ?? null,
      at: r.publishedAt ?? r.createdAt,
      photos: [],
      reply: r.reply?.text ?? null,
      productTitle: r.productTitle ?? productOf.get(r.product)?.title ?? '',
      productSlug: productOf.get(r.product)?.slug ?? null,
    }))
  })
