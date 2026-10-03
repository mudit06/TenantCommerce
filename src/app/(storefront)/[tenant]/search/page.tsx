import type { Metadata } from 'next'

import { searchProducts } from '@/lib/data/catalog'
import { getStoreContext } from '@/storefront/context'
import { SearchIcon } from '@/storefront/kit/icons'
import { ProductGrid } from '@/storefront/kit/product/ProductCard'
import { buttonClass, Container } from '@/storefront/kit/ui'

type Props = { params: Promise<{ tenant: string }>; searchParams: Promise<{ q?: string }> }

export const metadata: Metadata = { title: 'Search', robots: { index: false, follow: true } }

/** Search by product name or model number (docs/12 "Search", regex until Atlas Search). */
export default async function SearchPage({ params, searchParams }: Props) {
  const ctx = await getStoreContext((await params).tenant)
  const q = ((await searchParams).q ?? '').trim()
  const results = q.length >= 2 ? await searchProducts(ctx.store.tenantId, q) : []
  return (
    <Container className="py-8">
      <h1 className="font-heading text-2xl font-bold [text-transform:var(--heading-transform)]">
        Search
      </h1>
      <form action="/search" className="mt-4 flex max-w-xl gap-2" role="search">
        <label className="sr-only" htmlFor="search-q">
          Product name or model number
        </label>
        <input
          autoFocus={!q}
          className="h-11 flex-1 rounded-card border border-line px-4 text-sm outline-none focus:border-ink/50"
          defaultValue={q}
          id="search-q"
          name="q"
          placeholder="Product name or model number, e.g. HOAL-101"
          type="search"
        />
        <button className={buttonClass('dark')} type="submit">
          <SearchIcon /> Search
        </button>
      </form>
      {q.length >= 2 ? (
        <>
          <p className="mt-6 mb-4 text-sm text-ink-soft">
            {results.length} {results.length === 1 ? 'result' : 'results'} for “{q}”
          </p>
          {results.length ? (
            <ProductGrid products={results} />
          ) : (
            <p className="text-ink-soft">
              Try a shorter word or the model number printed in our catalogue.
            </p>
          )}
        </>
      ) : null}
    </Container>
  )
}
