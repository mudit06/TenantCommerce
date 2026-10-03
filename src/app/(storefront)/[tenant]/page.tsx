import type { Metadata } from 'next'
import Link from 'next/link'

import { getProductList } from '@/lib/data/catalog'
import { getBanners, getPublishedPage } from '@/lib/data/content'
import { getStoreContext } from '@/storefront/context'
import { RenderBlocks } from '@/storefront/kit/blocks/RenderBlocks'
import { linkHref } from '@/storefront/kit/links'
import { Img } from '@/storefront/kit/media'
import { ProductGrid } from '@/storefront/kit/product/ProductCard'
import { ButtonLink, Container, SectionHeading } from '@/storefront/kit/ui'

type Props = { params: Promise<{ tenant: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ctx = await getStoreContext((await params).tenant)
  const page = await getPublishedPage(ctx.store.tenantId, 'home')
  return {
    description: page?.seo?.description || undefined,
    alternates: { canonical: '/' },
  }
}

/** Home page: the store's published "home" page, or a default one built from its catalog. */
export default async function HomePage({ params }: Props) {
  const ctx = await getStoreContext((await params).tenant)
  const page = await getPublishedPage(ctx.store.tenantId, 'home')
  if (page?.layout?.length) return <RenderBlocks blocks={page.layout} ctx={ctx} />

  const [banners, newest] = await Promise.all([
    getBanners(ctx.store.tenantId, 'home-hero'),
    getProductList(ctx.store.tenantId, 'newest', 8),
  ])
  const name = ctx.settings?.storeName ?? ctx.store.name
  const hero = banners[0]
  const target = linkHref(hero?.link)
  return (
    <>
      <section className="relative bg-dark text-white">
        {hero ? (
          <Img
            className="absolute inset-0 size-full object-cover opacity-60"
            media={hero.image}
            priority
            sizes="100vw"
          />
        ) : null}
        <Container className="relative py-20 sm:py-28">
          <h1 className="max-w-2xl font-heading text-4xl font-bold [text-transform:var(--heading-transform)] sm:text-5xl">
            {name}
          </h1>
          {ctx.ui.tagline ? <p className="mt-3 text-lg text-white/85">{ctx.ui.tagline}</p> : null}
          <ButtonLink
            className="mt-8"
            href={target?.href ?? ctx.categories.roots[0]?.path ?? '/search'}
          >
            Explore products
          </ButtonLink>
        </Container>
      </section>
      {ctx.categories.roots.length > 0 ? (
        <Container className="my-12">
          <SectionHeading>Shop by category</SectionHeading>
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {ctx.categories.roots.map((category) => (
              <li key={category.id}>
                <Link className="group block" href={category.path}>
                  <div className="aspect-[4/3] overflow-hidden rounded-card bg-surface-alt">
                    <Img
                      className="size-full object-cover transition group-hover:scale-105"
                      media={category.image}
                    />
                  </div>
                  <p className="mt-2 font-semibold">{category.name}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      ) : null}
      {newest.length > 0 ? (
        <Container className="my-12">
          <SectionHeading>New arrivals</SectionHeading>
          <ProductGrid products={newest} />
        </Container>
      ) : null}
    </>
  )
}
