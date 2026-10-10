import Link from 'next/link'

import type { ProductCardData } from '@/lib/data/catalog'
import { getStoreOffers, offerForProduct } from '@/lib/data/offers'
import type { Attribute } from '@/modules/catalog'

import { ChevronIcon } from '../icons'
import { ProductGrid } from '../product/ProductCard'
import {
  applyExtraFilters,
  applyFilters,
  extraFilterCount,
  extraFilters,
  paginate,
  selectedFilters,
  SORTS,
  sortKey,
  sortProducts,
  toggleQuery,
} from './listing'
import { SheetClose } from './SheetClose'

type Query = Record<string, string | string[] | undefined>

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)

/**
 * A list of products with filters, sort and paging, as the category page (docs/screens storefront
 * `st-category`, `st-filters`); search results use the same. Filters from the attribute set, plus
 * price, in stock, on offer (schemes) and rating (reviews); all in the web address.
 */
export async function ProductListing({
  tenantId,
  products: all,
  attributes,
  query,
  basePath,
  priorityCount = 2,
  bestMatch = false,
}: {
  tenantId: string
  products: ProductCardData[]
  attributes: readonly Attribute[]
  query: Query
  /** The page's own address, for Clear all and the price form */
  basePath: string
  priorityCount?: number
  /** Search results: keep the ranked order until the shopper picks a sort */
  bestMatch?: boolean
}) {
  const offers = await getStoreOffers(tenantId)
  const rows = all.map((product) => {
    const offer = offerForProduct(offers, {
      id: product.id,
      categoryIds: product.categoryIds,
      priceMinor: product.price?.amountMinor ?? null,
      purchaseMode: product.purchaseMode,
    })
    const priced = product.purchaseMode !== 'enquire' && product.price?.amountMinor
    return {
      ...product,
      id: String(product.id),
      priceMinor: priced ? (offer?.priceMinor ?? product.price!.amountMinor) : null,
      available: product.buy.available,
      onOffer: Boolean(offer),
    }
  })
  const extra = extraFilters(query)
  const pool = applyExtraFilters(rows, extra)
  const selected = selectedFilters(attributes, query)
  const { products, facets } = applyFilters(pool, attributes, selected)
  const sort = bestMatch && !one(query.sort) ? null : sortKey(one(query.sort))
  const page = paginate(
    sort ? sortProducts(products, sort) : products,
    Number(one(query.page) ?? 1),
    undefined,
    one(query.from) ? Number(one(query.from)) : undefined,
  )

  const withQuery = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams()
    for (const [key, value] of Object.entries(query))
      if (value !== undefined) next.set(key, Array.isArray(value) ? value.join(',') : value)
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key)
      else next.set(key, value)
    }
    const text = next.toString()
    return text ? `?${text}` : basePath
  }
  const toggle = (key: string, value: string) =>
    withQuery({ [key]: one(query[key]) === value ? null : value, page: null, from: null })
  const clearAll = (() => {
    const keep = new URLSearchParams()
    for (const key of ['q', 'sort']) {
      const value = one(query[key])
      if (value) keep.set(key, value)
    }
    const text = keep.toString()
    return text ? `${basePath}?${text}` : basePath
  })()
  const activeCount = Object.values(selected).flat().length + extraFilterCount(extra)
  const ratingCount = (stars: number) =>
    pool.filter((p) => (p.rating?.average ?? 0) >= stars).length
  // Options that would show nothing are left out (st-filters rule 1), unless already chosen
  const ratings = [4, 3].filter((stars) => ratingCount(stars) > 0 || extra.minRating === stars)
  const offerCount = pool.filter((p) => p.onOffer).length
  const showOffer = offers.schemesOn && (offerCount > 0 || extra.onOffer)
  const anyPriced = rows.some((row) => row.priceMinor)
  const anyTracked = rows.some((row) => row.available !== null)

  const optionClass = (on: boolean) =>
    `flex min-h-9 items-center justify-between gap-3 rounded px-2 text-sm ${on ? 'bg-ink text-white' : 'text-ink-soft hover:bg-surface-alt'}`

  const filters = (
    <div className="space-y-6">
      <div className="hidden items-center justify-between lg:flex">
        <p className="font-semibold">Filters</p>
        {activeCount ? (
          <Link className="text-sm font-semibold text-accent underline" href={clearAll}>
            Clear all
          </Link>
        ) : null}
      </div>
      {facets.map((facet) => (
        <fieldset key={facet.code}>
          <legend className="mb-2 text-sm font-semibold">{facet.label}</legend>
          <ul className="space-y-1">
            {facet.options.map((option) => (
              <li key={option.value}>
                <Link
                  aria-current={option.selected ? 'true' : undefined}
                  className={optionClass(option.selected)}
                  href={toggleQuery(query, facet.code, option.value)}
                  rel="nofollow"
                  scroll={false}
                >
                  <span>{option.label}</span>
                  <span className="text-xs opacity-70">{option.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </fieldset>
      ))}
      {anyPriced ? (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Price</legend>
          <form action={basePath} className="flex items-end gap-2">
            {Object.entries(query)
              .filter(([key]) => !['min', 'max', 'page', 'from'].includes(key))
              .map(([key, value]) => (
                <input
                  key={key}
                  name={key}
                  type="hidden"
                  value={Array.isArray(value) ? value.join(',') : (value ?? '')}
                />
              ))}
            <label className="min-w-0 flex-1 text-xs text-ink-soft">
              Min ₹
              <input
                className="mt-1 h-10 w-full rounded-card border border-line px-2 text-sm text-ink"
                defaultValue={extra.minRupees ?? ''}
                inputMode="numeric"
                name="min"
                placeholder="0"
              />
            </label>
            <label className="min-w-0 flex-1 text-xs text-ink-soft">
              Max ₹
              <input
                className="mt-1 h-10 w-full rounded-card border border-line px-2 text-sm text-ink"
                defaultValue={extra.maxRupees ?? ''}
                inputMode="numeric"
                name="max"
                placeholder="Any"
              />
            </label>
            <button
              className="h-10 rounded-card border border-line px-3 text-sm font-semibold hover:border-ink/40"
              type="submit"
            >
              Go
            </button>
          </form>
        </fieldset>
      ) : null}
      {offers.reviewsShown && ratings.length ? (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Rating</legend>
          <ul className="space-y-1">
            {ratings.map((stars) => (
              <li key={stars}>
                <Link
                  aria-current={extra.minRating === stars ? 'true' : undefined}
                  className={optionClass(extra.minRating === stars)}
                  href={toggle('rating', String(stars))}
                  rel="nofollow"
                  scroll={false}
                >
                  <span>{stars} stars and above</span>
                  <span className="text-xs opacity-70">{ratingCount(stars)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </fieldset>
      ) : null}
      {anyPriced && (anyTracked || showOffer) ? (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Stock and offers</legend>
          <ul className="space-y-1">
            {anyTracked ? (
              <li>
                <Link
                  aria-current={extra.inStock ? 'true' : undefined}
                  className={optionClass(extra.inStock)}
                  href={toggle('stock', 'in')}
                  rel="nofollow"
                  scroll={false}
                >
                  <span>In stock only</span>
                  <span aria-hidden>{extra.inStock ? '✓' : ''}</span>
                </Link>
              </li>
            ) : null}
            {showOffer ? (
              <li>
                <Link
                  aria-current={extra.onOffer ? 'true' : undefined}
                  className={optionClass(extra.onOffer)}
                  href={toggle('offer', '1')}
                  rel="nofollow"
                  scroll={false}
                >
                  <span>On offer</span>
                  <span className="text-xs opacity-70">{offerCount}</span>
                </Link>
              </li>
            ) : null}
          </ul>
        </fieldset>
      ) : null}
    </div>
  )

  const sortMenu = (
    <details className="relative">
      <summary className="inline-flex min-h-10 cursor-pointer list-none items-center gap-1.5 rounded-card border border-line px-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
        Sort: {sort ? SORTS[sort] : 'Best match'}
        <ChevronIcon className="rotate-90" height={14} width={14} />
      </summary>
      <ul className="absolute right-0 z-30 mt-1 min-w-52 rounded-card border border-line bg-white p-1 shadow-lg">
        {bestMatch ? (
          <li>
            <Link
              aria-current={sort === null ? 'true' : undefined}
              className={`block rounded px-3 py-2 text-sm ${sort === null ? 'bg-surface-alt font-semibold' : 'hover:bg-surface-alt'}`}
              href={withQuery({ sort: null, page: null, from: null })}
              rel="nofollow"
              scroll={false}
            >
              Best match
            </Link>
          </li>
        ) : null}
        {Object.entries(SORTS)
          .filter(([key]) => anyPriced || !key.startsWith('price'))
          .map(([key, label]) => (
            <li key={key}>
              <Link
                aria-current={sort === key ? 'true' : undefined}
                className={`block rounded px-3 py-2 text-sm ${sort === key ? 'bg-surface-alt font-semibold' : 'hover:bg-surface-alt'}`}
                href={withQuery({
                  sort: key === 'popular' && !bestMatch ? null : key,
                  page: null,
                  from: null,
                })}
                rel="nofollow"
                scroll={false}
              >
                {label}
              </Link>
            </li>
          ))}
      </ul>
    </details>
  )

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
      <aside aria-label="Filters" className="hidden lg:block">
        {filters}
      </aside>
      <div className="min-w-0">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-soft">
            {page.total} {page.total === 1 ? 'product' : 'products'}
          </p>
          <div className="flex items-center gap-2 text-sm">
            <details className="lg:hidden">
              <summary className="inline-flex min-h-10 cursor-pointer list-none items-center rounded-card border border-line px-4 font-medium [&::-webkit-details-marker]:hidden">
                Filter{activeCount ? ` (${activeCount})` : ''}
              </summary>
              <SheetClose className="fixed inset-0 z-40 cursor-default bg-black/40">
                <span className="sr-only">Close filters</span>
              </SheetClose>
              <div
                aria-label="Filters"
                className="fixed inset-x-0 bottom-0 z-50 flex max-h-[80dvh] flex-col rounded-t-2xl border-t border-line bg-white shadow-2xl"
                role="dialog"
              >
                <div className="flex items-center justify-between border-b border-line px-5 py-3">
                  <p className="font-semibold">Filters</p>
                  <SheetClose className="min-h-10 px-2 text-sm font-semibold underline">
                    Close
                  </SheetClose>
                </div>
                <div className="flex-1 overflow-y-auto p-5">{filters}</div>
                <div className="flex gap-2 border-t border-line p-3">
                  <Link
                    className="inline-flex min-h-11 flex-1 items-center justify-center rounded-card border border-line text-sm font-semibold"
                    href={clearAll}
                  >
                    Clear
                  </Link>
                  <SheetClose className="inline-flex min-h-11 flex-[2] items-center justify-center rounded-card bg-ink text-sm font-semibold text-white">
                    Show {page.total} {page.total === 1 ? 'product' : 'products'}
                  </SheetClose>
                </div>
              </div>
            </details>
            {sortMenu}
          </div>
        </div>
        {page.items.length ? (
          <ProductGrid
            headingLevel={2}
            priorityCount={priorityCount}
            products={page.items}
            withCart
          />
        ) : (
          <p className="rounded-card border border-dashed border-line p-10 text-center text-ink-soft">
            No products match these filters.{' '}
            <Link className="text-accent underline" href={clearAll}>
              Clear filters
            </Link>
          </p>
        )}
        {page.page < page.pages ? (
          <div className="mt-8 flex justify-center">
            <Link
              className="inline-flex min-h-11 items-center rounded-card border border-line px-6 text-sm font-semibold hover:border-ink/40"
              href={withQuery({ page: String(page.page + 1), from: String(page.from) })}
              scroll={false}
            >
              Load more
            </Link>
          </div>
        ) : null}
        {page.pages > 1 ? (
          <nav aria-label="Pages" className="mt-6 flex flex-wrap justify-center gap-2">
            {Array.from({ length: page.pages }, (_, i) => i + 1).map((number) => (
              <Link
                aria-current={number === page.page ? 'page' : undefined}
                className={`flex size-10 items-center justify-center rounded-card border text-sm ${number >= page.from && number <= page.page ? 'border-ink bg-ink text-white' : 'border-line hover:border-ink/40'}`}
                href={withQuery({ page: number === 1 ? null : String(number), from: null })}
                key={number}
              >
                {number}
              </Link>
            ))}
          </nav>
        ) : null}
        {anyPriced ? (
          <p className="mt-6 text-center text-xs text-ink-soft">
            Prices include GST · Price on request leads to a quote form
          </p>
        ) : null}
      </div>
    </div>
  )
}
