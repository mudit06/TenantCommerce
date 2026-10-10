import type { Metadata } from 'next'
import Link from 'next/link'

import { getStoreContext } from '@/storefront/context'
import { Breadcrumbs } from '@/storefront/kit/Breadcrumbs'
import { Img } from '@/storefront/kit/media'
import { Container } from '@/storefront/kit/ui'

type Props = { params: Promise<{ tenant: string }> }

export const metadata: Metadata = { title: 'Shop by category', alternates: { canonical: '/c' } }

/** Every category, for the phone's "Shop" tab: each top category with its subcategories. */
export default async function CategoriesPage({ params }: Props) {
  const ctx = await getStoreContext((await params).tenant)
  return (
    <Container className="py-6">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Shop', href: '/c' },
        ]}
      />
      <h1 className="mt-3 font-heading text-3xl font-bold [text-transform:var(--heading-transform)]">
        Shop by category
      </h1>
      {ctx.categories.roots.length === 0 ? (
        <p className="mt-6 text-ink-soft">Products are on their way. Please check back soon.</p>
      ) : null}
      <div className="mt-8 space-y-12">
        {ctx.categories.roots.map((root) => {
          const tiles = root.children.length ? root.children : [root]
          return (
            <section aria-labelledby={`cat-${root.id}`} key={root.id}>
              <div className="mb-4 flex items-baseline justify-between gap-4">
                <h2
                  className="font-heading text-xl font-semibold [text-transform:var(--heading-transform)]"
                  id={`cat-${root.id}`}
                >
                  {root.name}
                </h2>
                <Link className="text-sm font-semibold text-accent hover:underline" href={root.path}>
                  View all
                </Link>
              </div>
              <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
                {tiles.map((category) => (
                  <li key={category.id}>
                    <Link className="group block" href={category.path}>
                      <div className="aspect-[4/3] overflow-hidden rounded-card bg-surface-alt">
                        <Img
                          className="size-full object-cover transition duration-300 group-hover:scale-105"
                          media={category.image}
                          sizes="(min-width: 1024px) 25vw, 50vw"
                        />
                      </div>
                      <p className="mt-2 text-center text-sm font-semibold text-ink group-hover:text-accent sm:text-base">
                        {category.name}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </Container>
  )
}
