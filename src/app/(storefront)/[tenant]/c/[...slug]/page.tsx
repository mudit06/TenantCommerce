import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'

import { getProductsInCategories, withDescendants } from '@/lib/data/catalog'
import { getPayloadClient } from '@/lib/data/payload'
import { attributeSetForCategory } from '@/modules/catalog'
import { getStoreContext, type StoreContext } from '@/storefront/context'
import { Breadcrumbs } from '@/storefront/kit/Breadcrumbs'
import {
  applyFilters,
  paginate,
  selectedFilters,
  sortProducts,
  toggleQuery,
  type SortKey,
} from '@/storefront/kit/listing/listing'
import { Img } from '@/storefront/kit/media'
import { ProductGrid } from '@/storefront/kit/product/ProductCard'
import { Container } from '@/storefront/kit/ui'

type Props = {
  params: Promise<{ tenant: string; slug: string[] }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

async function findCategory(ctx: StoreContext, slugs: string[]) {
  const node = ctx.categories.all.find((category) => category.slug === slugs.at(-1))
  if (!node) notFound()
  // Old or partial paths go to the category's current address (docs/13 clean URLs)
  if (node.path !== `/c/${slugs.join('/')}`) permanentRedirect(node.path)
  return node
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tenant, slug } = await params
  const ctx = await getStoreContext(tenant)
  const node = ctx.categories.all.find((category) => category.slug === slug.at(-1))
  if (!node) return {}
  return {
    title: node.seo?.title || node.name,
    description: node.seo?.description || node.description || undefined,
    alternates: { canonical: node.path },
  }
}

/** Category listing with filters from the attribute set (docs/screens storefront `st-category`). */
export default async function CategoryPage({ params, searchParams }: Props) {
  const { tenant, slug } = await params
  const query = await searchParams
  const ctx = await getStoreContext(tenant)
  const node = await findCategory(ctx, slug)
  const [all, set] = await Promise.all([
    getProductsInCategories(ctx.store.tenantId, withDescendants(node)),
    attributeSetForCategory(await getPayloadClient(), String(node.id)),
  ])
  const attributes = set?.attributes ?? []
  const selected = selectedFilters(attributes, query)
  const { products, facets } = applyFilters(
    all.map((product) => ({ ...product, id: String(product.id) })),
    attributes,
    selected,
  )
  const sort: SortKey = query.sort === 'name' ? 'name' : 'newest'
  const page = paginate(sortProducts(products, sort), Number(query.page ?? 1))
  const crumbs = (node.breadcrumbs ?? []).map((crumb) => ({
    label: crumb.label ?? '',
    href: crumb.url ?? '#',
  }))
  const withQuery = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams()
    for (const [key, value] of Object.entries(query))
      if (value !== undefined) next.set(key, Array.isArray(value) ? value.join(',') : value)
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key)
      else next.set(key, value)
    }
    const text = next.toString()
    return text ? `?${text}` : node.path
  }
  const activeCount = Object.values(selected).flat().length

  const filters = facets.length ? (
    <div className="space-y-6">
      {facets.map((facet) => (
        <fieldset key={facet.code}>
          <legend className="mb-2 text-sm font-semibold">{facet.label}</legend>
          <ul className="space-y-1">
            {facet.options.map((option) => (
              <li key={option.value}>
                <Link
                  aria-current={option.selected ? 'true' : undefined}
                  className={`flex min-h-9 items-center justify-between gap-3 rounded px-2 text-sm ${option.selected ? 'bg-ink text-white' : 'text-ink-soft hover:bg-surface-alt'}`}
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
      {activeCount ? (
        <Link className="text-sm font-semibold text-accent underline" href={node.path}>
          Clear filters
        </Link>
      ) : null}
    </div>
  ) : null

  return (
    <>
      {node.banner && typeof node.banner === 'object' ? (
        <Img
          className="h-40 w-full object-cover sm:h-56"
          media={node.banner}
          priority
          sizes="100vw"
        />
      ) : null}
      <Container className="py-6">
        <Breadcrumbs items={[{ label: 'Home', href: '/' }, ...crumbs]} />
        <h1 className="mt-3 font-heading text-3xl font-bold [text-transform:var(--heading-transform)]">
          {node.name}
        </h1>
        {node.description ? (
          <p className="mt-2 max-w-3xl text-ink-soft">{node.description}</p>
        ) : null}
        {node.children.length ? (
          <ul className="mt-5 flex flex-wrap gap-2">
            {node.children.map((child) => (
              <li key={child.id}>
                <Link
                  className="inline-flex min-h-10 items-center rounded-full border border-line px-4 text-sm font-medium hover:border-ink/40"
                  href={child.path}
                >
                  {child.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
          {filters ? (
            <aside aria-label="Filters" className="hidden lg:block">
              {filters}
            </aside>
          ) : null}
          <div className={filters ? '' : 'lg:col-span-2'}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ink-soft">
                {page.total} {page.total === 1 ? 'product' : 'products'}
              </p>
              <div className="flex items-center gap-2 text-sm">
                {filters ? (
                  <details className="relative lg:hidden">
                    <summary className="inline-flex min-h-10 cursor-pointer list-none items-center rounded-card border border-line px-4 font-medium [&::-webkit-details-marker]:hidden">
                      Filters{activeCount ? ` (${activeCount})` : ''}
                    </summary>
                    <div className="fixed inset-x-0 bottom-0 z-50 max-h-[75dvh] overflow-y-auto rounded-t-2xl border-t border-line bg-white p-5 pb-8 shadow-2xl">
                      <p className="mb-4 font-semibold">Filters</p>
                      {filters}
                    </div>
                  </details>
                ) : null}
                <span className="text-ink-soft">Sort:</span>
                <Link
                  aria-current={sort === 'newest' ? 'true' : undefined}
                  className={sort === 'newest' ? 'font-semibold' : 'text-ink-soft hover:text-ink'}
                  href={withQuery({ sort: null, page: null })}
                  scroll={false}
                >
                  Newest
                </Link>
                <Link
                  aria-current={sort === 'name' ? 'true' : undefined}
                  className={sort === 'name' ? 'font-semibold' : 'text-ink-soft hover:text-ink'}
                  href={withQuery({ sort: 'name', page: null })}
                  scroll={false}
                >
                  Name
                </Link>
              </div>
            </div>
            {page.items.length ? (
              <ProductGrid priorityCount={4} products={page.items} />
            ) : (
              <p className="rounded-card border border-dashed border-line p-10 text-center text-ink-soft">
                No products match these filters.{' '}
                <Link className="text-accent underline" href={node.path}>
                  Clear filters
                </Link>
              </p>
            )}
            {page.pages > 1 ? (
              <nav aria-label="Pages" className="mt-8 flex justify-center gap-2">
                {Array.from({ length: page.pages }, (_, i) => i + 1).map((number) => (
                  <Link
                    aria-current={number === page.page ? 'page' : undefined}
                    className={`flex size-10 items-center justify-center rounded-card border text-sm ${number === page.page ? 'border-ink bg-ink text-white' : 'border-line hover:border-ink/40'}`}
                    href={withQuery({ page: number === 1 ? null : String(number) })}
                    key={number}
                  >
                    {number}
                  </Link>
                ))}
              </nav>
            ) : null}
          </div>
        </div>
      </Container>
    </>
  )
}
