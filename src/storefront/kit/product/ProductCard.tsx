import Link from 'next/link'

import type { ProductCardData } from '@/lib/data/catalog'

import { productHref } from '../links'
import { Img } from '../media'
import { Price } from '../shop/Price'

/** `headingLevel`: 2 where the grid follows the page's h1 (listing, search), 3 under a section heading. */
export function ProductCard({
  product,
  priority = false,
  headingLevel = 3,
}: {
  product: ProductCardData
  priority?: boolean
  headingLevel?: 2 | 3
}) {
  const [main] = product.gallery ?? []
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <Link
      className="group flex flex-col overflow-hidden rounded-card border border-line bg-white transition hover:border-ink/25 hover:shadow-md focus-visible:outline-2 focus-visible:outline-ink"
      href={productHref(product)}
    >
      <div className="aspect-square overflow-hidden bg-surface-alt">
        <Img
          className="size-full object-contain transition duration-300 group-hover:scale-[1.03]"
          media={typeof main === 'object' ? main : null}
          priority={priority}
          sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <p className="text-xs font-semibold tracking-wide text-accent uppercase">
          {product.modelNumber}
        </p>
        <Heading className="line-clamp-2 text-sm font-semibold text-ink sm:text-base">
          {product.title}
        </Heading>
        <div className="mt-auto pt-2">
          {product.purchaseMode !== 'enquire' && product.price?.amountMinor ? (
            <Price
              amountMinor={product.price.amountMinor}
              mrpMinor={product.compareAtPrice?.amountMinor}
              size="sm"
            />
          ) : (
            <p className="text-xs text-ink-soft">Price on request</p>
          )}
        </div>
      </div>
    </Link>
  )
}

export function ProductGrid({
  products,
  priorityCount = 0,
  headingLevel = 3,
}: {
  products: ProductCardData[]
  priorityCount?: number
  headingLevel?: 2 | 3
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard
            headingLevel={headingLevel}
            priority={index < priorityCount}
            product={product}
          />
        </li>
      ))}
    </ul>
  )
}
