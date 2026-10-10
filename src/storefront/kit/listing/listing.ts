import type { Attribute } from '@/modules/catalog'

// Category page filtering, sorting and paging (docs/12 "Filters"), in memory over the store's
// cached product list for that category. Pure, unit tested. Atlas Search facets replace this
// when catalogues grow past a few thousand products.

export type ListingProduct = {
  id: string
  title: string
  createdAt?: string
  attributes?: unknown
  isFeatured?: boolean | null
  rating?: { average?: number | null; count?: number | null } | null
  /** What one piece costs now (offer price when a scheme gives one), for sorting and the price filter */
  priceMinor?: number | null
  /** Pieces left, or null when stock isn't tracked (always buyable) */
  available?: number | null
  onOffer?: boolean
}
export type Facet = {
  code: string
  label: string
  options: { value: string; label: string; count: number; selected: boolean }[]
}
export const SORTS = {
  popular: 'Popular',
  newest: 'Newest',
  'price-asc': 'Price: low to high',
  'price-desc': 'Price: high to low',
  name: 'Name',
} as const
export type SortKey = keyof typeof SORTS
export const sortKey = (value: unknown): SortKey =>
  typeof value === 'string' && value in SORTS ? (value as SortKey) : 'popular'
export const PAGE_SIZE = 24

const valuesOf = (product: ListingProduct, code: string): string[] => {
  const value = (product.attributes as Record<string, unknown> | null | undefined)?.[code]
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string')
  return typeof value === 'string' ? [value] : []
}

/** Selected filter values from the URL query: ?finish=rose-gold,two-tone&material=brass */
export function selectedFilters(
  attributes: readonly Attribute[],
  query: Record<string, string | string[] | undefined>,
): Record<string, string[]> {
  const selected: Record<string, string[]> = {}
  for (const attribute of attributes) {
    if (!attribute.isFilterable || !attribute.code) continue
    const raw = query[attribute.code]
    const values = (Array.isArray(raw) ? raw.join(',') : (raw ?? '')).split(',').filter(Boolean)
    if (values.length > 0) selected[attribute.code] = values
  }
  return selected
}

const matches = (product: ListingProduct, selected: Record<string, string[]>, skip?: string) =>
  Object.entries(selected).every(
    ([code, values]) =>
      code === skip || valuesOf(product, code).some((value) => values.includes(value)),
  )

/**
 * Products that pass the filters, and each filter's options with counts. A filter's own counts
 * ignore its own selection, so shoppers can widen a choice (OR within a filter, AND across).
 */
export function applyFilters<T extends ListingProduct>(
  products: readonly T[],
  attributes: readonly Attribute[],
  selected: Record<string, string[]>,
): { products: T[]; facets: Facet[] } {
  const facets: Facet[] = []
  for (const attribute of attributes) {
    if (!attribute.isFilterable || !attribute.code) continue
    const pool = products.filter((product) => matches(product, selected, attribute.code!))
    const options = (attribute.options ?? [])
      .filter((option) => option.value)
      .map((option) => ({
        value: option.value!,
        label: option.label,
        count: pool.filter((product) => valuesOf(product, attribute.code!).includes(option.value!))
          .length,
        selected: (selected[attribute.code!] ?? []).includes(option.value!),
      }))
      .filter((option) => option.count > 0 || option.selected)
    if (options.length > 1 || options.some((option) => option.selected)) {
      facets.push({ code: attribute.code, label: attribute.label, options })
    }
  }
  return { products: products.filter((product) => matches(product, selected)), facets }
}

const newest = (a: ListingProduct, b: ListingProduct) =>
  (b.createdAt ?? '').localeCompare(a.createdAt ?? '')

/**
 * Popular: featured first, then the most reviewed, then newest (there are no sales counts on the
 * store yet). Price sorts put products without a price last.
 */
export function sortProducts<T extends ListingProduct>(products: readonly T[], sort: SortKey): T[] {
  const copy = [...products]
  if (sort === 'name')
    return copy.sort((a, b) => a.title.localeCompare(b.title, 'en-IN', { numeric: true }))
  if (sort === 'price-asc' || sort === 'price-desc') {
    const dir = sort === 'price-asc' ? 1 : -1
    return copy.sort((a, b) => {
      if (!a.priceMinor || !b.priceMinor) return (a.priceMinor ? -1 : 1) - (b.priceMinor ? -1 : 1)
      return (a.priceMinor - b.priceMinor) * dir || newest(a, b)
    })
  }
  if (sort === 'popular')
    return copy.sort(
      (a, b) =>
        Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured)) ||
        (b.rating?.count ?? 0) - (a.rating?.count ?? 0) ||
        newest(a, b),
    )
  return copy.sort(newest)
}

export type ExtraFilters = {
  /** Rupees, from the price boxes */
  minRupees: number | null
  maxRupees: number | null
  inStock: boolean
  onOffer: boolean
  /** 4 or 3: that many stars and above */
  minRating: number | null
}

const rupees = (value: unknown) => {
  const n = Math.floor(Number(typeof value === 'string' ? value.replace(/[^\d]/g, '') : NaN))
  return Number.isFinite(n) && n > 0 ? n : null
}

/** The filters every listing has, from the URL: ?min=1000&max=12000&stock=in&offer=1&rating=4 */
export function extraFilters(query: Record<string, string | string[] | undefined>): ExtraFilters {
  const one = (key: string) => {
    const raw = query[key]
    return Array.isArray(raw) ? raw[0] : raw
  }
  const rating = Number(one('rating'))
  return {
    minRupees: rupees(one('min')),
    maxRupees: rupees(one('max')),
    inStock: one('stock') === 'in',
    onOffer: one('offer') === '1',
    minRating: rating === 4 || rating === 3 ? rating : null,
  }
}

/** Products passing the price, stock, offer and rating filters. */
export function applyExtraFilters<T extends ListingProduct>(
  products: readonly T[],
  filters: ExtraFilters,
): T[] {
  return products.filter((product) => {
    const price = product.priceMinor ?? null
    if (filters.minRupees !== null && (price === null || price < filters.minRupees * 100))
      return false
    if (filters.maxRupees !== null && (price === null || price > filters.maxRupees * 100))
      return false
    if (filters.inStock && (!price || product.available === 0)) return false
    if (filters.onOffer && !product.onOffer) return false
    if (filters.minRating !== null && (product.rating?.average ?? 0) < filters.minRating)
      return false
    return true
  })
}

/** How many extra filters are on, for "Filter (2)". */
export const extraFilterCount = (filters: ExtraFilters) =>
  Number(filters.minRupees !== null || filters.maxRupees !== null) +
  Number(filters.inStock) +
  Number(filters.onOffer) +
  Number(filters.minRating !== null)

/**
 * One page of the list. `from` is the first page shown: "Load more" asks for ?page=3&from=1 to show
 * pages 1 to 3 together, while ?page=3 alone (the numbered links search engines follow) shows
 * page 3 only.
 */
export function paginate<T>(items: readonly T[], page: number, size = PAGE_SIZE, from?: number) {
  const pages = Math.max(1, Math.ceil(items.length / size))
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages)
  const first = Math.min(Math.max(1, Math.floor(from ?? current) || current), current)
  return {
    items: items.slice((first - 1) * size, current * size),
    page: current,
    from: first,
    pages,
    total: items.length,
  }
}

/** The query string with one filter value toggled (page reset), for filter links. */
export function toggleQuery(
  query: Record<string, string | string[] | undefined>,
  code: string,
  value: string,
): string {
  const params = new URLSearchParams()
  for (const [key, raw] of Object.entries(query)) {
    if (key === 'page' || key === 'from' || raw === undefined) continue
    params.set(key, Array.isArray(raw) ? raw.join(',') : raw)
  }
  const current = (params.get(code) ?? '').split(',').filter(Boolean)
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
  if (next.length > 0) params.set(code, next.join(','))
  else params.delete(code)
  const text = params.toString()
  return text ? `?${text}` : '?'
}
