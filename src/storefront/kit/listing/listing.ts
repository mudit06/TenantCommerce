import type { Attribute } from '@/modules/catalog'

// Category page filtering, sorting and paging (docs/12 "Filters"), in memory over the store's
// cached product list for that category. Pure, unit tested. Atlas Search facets replace this
// when catalogues grow past a few thousand products.

export type ListingProduct = { id: string; title: string; createdAt?: string; attributes?: unknown }
export type Facet = {
  code: string
  label: string
  options: { value: string; label: string; count: number; selected: boolean }[]
}
export type SortKey = 'newest' | 'name'
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

export function sortProducts<T extends ListingProduct>(products: readonly T[], sort: SortKey): T[] {
  const copy = [...products]
  if (sort === 'name')
    return copy.sort((a, b) => a.title.localeCompare(b.title, 'en-IN', { numeric: true }))
  return copy.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
}

export function paginate<T>(items: readonly T[], page: number, size = PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(items.length / size))
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages)
  return {
    items: items.slice((current - 1) * size, current * size),
    page: current,
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
    if (key === 'page' || raw === undefined) continue
    params.set(key, Array.isArray(raw) ? raw.join(',') : raw)
  }
  const current = (params.get(code) ?? '').split(',').filter(Boolean)
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
  if (next.length > 0) params.set(code, next.join(','))
  else params.delete(code)
  const text = params.toString()
  return text ? `?${text}` : '?'
}
