import { unstable_cache } from 'next/cache'
import type { Where } from 'payload'

import { idOf } from '@/access'
import { storefrontTag } from '@/hooks/revalidateStorefront'
import { attributeSetForCategory } from '@/modules/catalog'
import type { AttributeSet, Category, Product, ProductDocument, Variant } from '@/payload-types'

import { getPayloadClient } from './payload'

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

export type CategoryNode = Category & { children: CategoryNode[]; path: string }

/** The visible category tree, ordered for menus and tiles. */
export const getCategoryTree = (tenantId: string) =>
  cached(tenantId, ['tree'], async () => {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'categories',
      where: { and: [{ tenant: { equals: tenantId } }, { isVisible: { not_equals: false } }] },
      depth: 1,
      sort: 'sortOrder',
      pagination: false,
      overrideAccess: true,
    })
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

const toCard = (doc: Product): ProductCardData => ({
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
})

/** Every live product in these categories (main or "also show in"), newest first. */
export const getProductsInCategories = (tenantId: string, categoryIds: string[]) =>
  cached(tenantId, ['in', [...categoryIds].sort()], async () => {
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'products',
      where: liveProducts(tenantId, {
        or: [{ primaryCategory: { in: categoryIds } }, { categories: { in: categoryIds } }],
      }),
      depth: 1,
      sort: '-createdAt',
      pagination: false,
      overrideAccess: true,
      select: CARD_SELECT,
    })
    return docs.map((doc) => toCard(doc as Product))
  })

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
      // Bestsellers need order stats (stage B); newest until then
      sort: '-createdAt',
      limit,
      overrideAccess: true,
      select: CARD_SELECT,
    })
    return docs.map((doc) => toCard(doc as Product))
  })

/** Search by title, model number or keywords (Atlas Search replaces this, docs/12). */
export const searchProducts = (tenantId: string, query: string, limit = 48) =>
  cached(tenantId, ['search', query.toLowerCase(), limit], async () => {
    const term = query.trim().slice(0, 80)
    if (term.length < 2) return []
    const payload = await getPayloadClient()
    const { docs } = await payload.find({
      collection: 'products',
      where: liveProducts(tenantId, {
        or: [
          { title: { like: term } },
          { modelNumber: { like: term } },
          { searchKeywords: { like: term } },
        ],
      }),
      depth: 1,
      limit,
      overrideAccess: true,
      select: CARD_SELECT,
    })
    return docs.map((doc) => toCard(doc as Product))
  })

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
      sort: '-createdAt',
      limit,
      overrideAccess: true,
      select: CARD_SELECT,
    })
    return docs.map((doc) => toCard(doc as Product))
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
