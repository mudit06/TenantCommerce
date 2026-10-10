import type { Payload, Where } from 'payload'

import { idOf } from '@/access'
import type { Media, Product, Variant } from '@/payload-types'

// The Products screen (docs/screens/vendor-cms.md `cms-products`): its filters as a query, and
// each row's category, finishes, price range and stock. Shared by the screen, its bulk actions
// and the CSV export, so all three see the same products. Every read is scoped to one store.

export type ProductFilters = {
  tab: string
  q: string
  category: string
  stock: string
}

export const productFiltersFrom = (params: URLSearchParams): ProductFilters => ({
  tab: params.get('tab') ?? 'all',
  q: (params.get('q') ?? '').trim(),
  category: params.get('category') ?? '',
  stock: params.get('stock') ?? '',
})

type CategoryNode = { id: string; name: string; parent: string | null }

export async function storeCategories(payload: Payload, tenantId: string) {
  const { docs } = await payload.find({
    collection: 'categories',
    where: { tenant: { equals: tenantId } },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { name: true, parent: true, sortOrder: true },
    sort: 'sortOrder',
  })
  const nodes: CategoryNode[] = docs.map((c) => ({
    id: String(c.id),
    name: c.name,
    parent: idOf(c.parent) ?? null,
  }))
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const pathOf = (id: string): string[] => {
    const parts: string[] = []
    for (let node = byId.get(id), guard = 0; node && guard < 10; guard += 1) {
      parts.unshift(node.name)
      node = node.parent ? byId.get(node.parent) : undefined
    }
    return parts
  }
  const descendants = (id: string): string[] => [
    id,
    ...nodes.filter((n) => n.parent === id).flatMap((n) => descendants(n.id)),
  ]
  return { nodes, byId, pathOf, descendants }
}

type VariantStock = Pick<Variant, 'product' | 'stockQty' | 'lowStockThreshold' | 'status'>

/** Variants' stock by product: total in stock, and whether one is low or out. */
async function stockByProduct(payload: Payload, tenantId: string, productIds?: string[]) {
  const { docs } = await payload.find({
    collection: 'variants',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { status: { not_equals: 'archived' } },
        ...(productIds ? [{ product: { in: productIds } }] : []),
      ],
    },
    depth: 0,
    pagination: false,
    limit: 100_000,
    overrideAccess: true,
    select: { product: true, stockQty: true, lowStockThreshold: true, status: true },
  })
  const stock = new Map<string, { qty: number; low: boolean; out: boolean; count: number }>()
  for (const v of docs as VariantStock[]) {
    const key = idOf(v.product)
    if (!key) continue
    const row = stock.get(key) ?? { qty: 0, low: false, out: false, count: 0 }
    const qty = v.stockQty ?? 0
    row.qty += qty
    row.count += 1
    if (qty <= 0) row.out = true
    else if (v.lowStockThreshold && qty <= v.lowStockThreshold) row.low = true
    stock.set(key, row)
  }
  return stock
}

/**
 * The Products screen's filters as a query: status tab; search over title, model number and
 * keywords, with an exact SKU or model number first; a category and everything under it; stock.
 */
export async function productsWhere(
  payload: Payload,
  tenantId: string,
  filters: ProductFilters,
  { ignoreTab = false } = {},
): Promise<Where> {
  const and: Where[] = [{ tenant: { equals: tenantId } }]
  if (!ignoreTab && filters.tab !== 'all') and.push({ status: { equals: filters.tab } })
  if (filters.q) {
    // A dealer types a SKU or model number exactly (cms-products rule 1)
    const { docs: bySku } = await payload.find({
      collection: 'variants',
      where: {
        and: [{ tenant: { equals: tenantId } }, { sku: { equals: filters.q.toUpperCase() } }],
      },
      depth: 0,
      limit: 20,
      overrideAccess: true,
      select: { product: true },
    })
    const skuProducts = bySku.map((v) => idOf(v.product)).filter(Boolean) as string[]
    and.push({
      or: [
        { title: { like: filters.q } },
        { modelNumber: { like: filters.q } },
        { searchKeywords: { like: filters.q } },
        ...(skuProducts.length ? [{ id: { in: skuProducts } }] : []),
      ],
    })
  }
  if (filters.category) {
    const { descendants } = await storeCategories(payload, tenantId)
    const ids = descendants(filters.category)
    and.push({ or: [{ primaryCategory: { in: ids } }, { categories: { in: ids } }] })
  }
  if (filters.stock) {
    const stock = await stockByProduct(payload, tenantId)
    const ids = [...stock.entries()]
      .filter(([, s]) =>
        filters.stock === 'out'
          ? s.qty <= 0
          : filters.stock === 'low'
            ? s.qty > 0 && (s.low || s.out)
            : s.qty > 0,
      )
      .map(([id]) => id)
    and.push({ id: { in: ids.length ? ids : ['000000000000000000000000'] } })
  }
  return { and }
}

export type ProductRow = {
  id: string
  title: string
  modelNumber: string
  thumb: string | null
  category: string
  variants: string
  price: string | null
  enquireOnly: boolean
  stock: { qty: number; note: 'Low' | 'Out of stock' | null } | null
  status: Product['status']
  updatedAt: string
}

const rupees = (minor: number) =>
  `₹${(minor / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

/** Each listed product's category, finishes, price range and stock (cms-products rule 2). */
export async function productRows(
  payload: Payload,
  tenantId: string,
  products: Pick<
    Product,
    | 'id'
    | 'title'
    | 'modelNumber'
    | 'primaryCategory'
    | 'gallery'
    | 'price'
    | 'purchaseMode'
    | 'status'
    | 'updatedAt'
  >[],
): Promise<ProductRow[]> {
  const ids = products.map((p) => String(p.id))
  const [{ pathOf }, stock, { docs: variants }] = await Promise.all([
    storeCategories(payload, tenantId),
    stockByProduct(payload, tenantId, ids),
    payload.find({
      collection: 'variants',
      where: {
        and: [
          { tenant: { equals: tenantId } },
          { product: { in: ids } },
          { status: { not_equals: 'archived' } },
        ],
      },
      depth: 0,
      pagination: false,
      limit: 10_000,
      overrideAccess: true,
      select: { product: true, price: true, options: true },
    }),
  ])
  return products.map((product) => {
    const id = String(product.id)
    const own = variants.filter((v) => idOf(v.product) === id)
    const base = product.price?.amountMinor ?? 0
    const prices = own.length
      ? own.map((v) => v.price?.amountMinor || base).filter((p) => p > 0)
      : base
        ? [base]
        : []
    const low = prices.length ? Math.min(...prices) : 0
    const high = prices.length ? Math.max(...prices) : 0
    const axes = new Set(own.flatMap((v) => Object.keys((v.options ?? {}) as object)))
    const s = stock.get(id)
    const photo = (product.gallery ?? [])[0]
    const media = photo && typeof photo === 'object' ? (photo as Media) : null
    return {
      id,
      title: product.title,
      modelNumber: product.modelNumber,
      thumb: media ? (media.sizes?.thumb?.url ?? media.url ?? null) : null,
      category: pathOf(idOf(product.primaryCategory) ?? '').at(-1) ?? '—',
      variants: own.length
        ? `${own.length} ${axes.has('finish') || axes.size === 0 ? (own.length === 1 ? 'finish' : 'finishes') : own.length === 1 ? 'option' : 'options'}`
        : '1',
      price: prices.length
        ? low === high
          ? rupees(low)
          : `${rupees(low)} – ${rupees(high)}`
        : null,
      enquireOnly: product.purchaseMode === 'enquire',
      stock: s
        ? { qty: s.qty, note: s.qty <= 0 ? 'Out of stock' : s.low || s.out ? 'Low' : null }
        : null,
      status: product.status,
      updatedAt: product.updatedAt,
    }
  })
}
