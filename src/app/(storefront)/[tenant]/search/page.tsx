import type { Metadata } from 'next'
import Link from 'next/link'

import { searchProducts } from '@/lib/data/catalog'
import { matchCategories } from '@/lib/search'
import { getStoreContext } from '@/storefront/context'
import { ProductListing } from '@/storefront/kit/listing/ProductListing'
import { SearchBox } from '@/storefront/kit/listing/SearchBox'
import { Container } from '@/storefront/kit/ui'

type Props = {
  params: Promise<{ tenant: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export const metadata: Metadata = { title: 'Search', robots: { index: false, follow: true } }

/**
 * Search results (docs/screens storefront `st-search`): model numbers first, small typos
 * forgiven, with the category page's filters and sort.
 */
export default async function SearchPage({ params, searchParams }: Props) {
  const ctx = await getStoreContext((await params).tenant)
  const query = await searchParams
  const raw = query.q
  const q = ((Array.isArray(raw) ? raw[0] : raw) ?? '').trim()
  const results = q.length >= 2 ? await searchProducts(ctx.store.tenantId, q, 200) : []
  const categories = q.length >= 2 ? matchCategories(ctx.categories.all, q).slice(0, 6) : []
  return (
    <Container className="py-8">
      <h1 className="font-heading text-2xl font-bold [text-transform:var(--heading-transform)]">
        {q.length >= 2 ? `Results for “${q}”` : 'Search'}
      </h1>
      <div className="mt-4 max-w-xl">
        <SearchBox autoFocus={!q} defaultValue={q} variant="page" />
      </div>
      {categories.length ? (
        <ul aria-label="Matching categories" className="mt-5 flex flex-wrap gap-2">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                className="inline-flex min-h-10 items-center rounded-full border border-line px-4 text-sm font-medium hover:border-ink/40"
                href={category.path}
              >
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {q.length >= 2 ? (
        results.length ? (
          <ProductListing
            attributes={[]}
            basePath="/search"
            bestMatch
            products={results}
            query={query}
            tenantId={ctx.store.tenantId}
          />
        ) : (
          <p className="mt-8 text-ink-soft">
            Nothing matches “{q}”. Try a shorter word or the model number printed in our catalogue.
          </p>
        )
      ) : null}
    </Container>
  )
}
