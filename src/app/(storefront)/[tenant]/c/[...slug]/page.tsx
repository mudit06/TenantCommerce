import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, permanentRedirect } from 'next/navigation'

import { getProductsInCategories, withDescendants } from '@/lib/data/catalog'
import { getPayloadClient } from '@/lib/data/payload'
import { attributeSetForCategory } from '@/modules/catalog'
import { getStoreContext, type StoreContext } from '@/storefront/context'
import { Breadcrumbs } from '@/storefront/kit/Breadcrumbs'
import { ProductListing } from '@/storefront/kit/listing/ProductListing'
import { Img } from '@/storefront/kit/media'
import { Container } from '@/storefront/kit/ui'
import { notFoundOrRedirect } from '@/storefront/notFoundOrRedirect'

type Props = {
  params: Promise<{ tenant: string; slug: string[] }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

async function findCategory(ctx: StoreContext, slugs: string[]) {
  const node = ctx.categories.all.find((category) => category.slug === slugs.at(-1))
  if (!node) {
    await notFoundOrRedirect(ctx.store.tenantId, `/c/${slugs.join('/')}`)
    notFound()
  }
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
  const crumbs = (node.breadcrumbs ?? []).map((crumb) => ({
    label: crumb.label ?? '',
    href: crumb.url ?? '#',
  }))

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
        <ProductListing
          attributes={set?.attributes ?? []}
          basePath={node.path}
          products={all}
          query={query}
          tenantId={ctx.store.tenantId}
        />
      </Container>
    </>
  )
}
