import Link from 'next/link'

import type { ProductCardData } from '@/lib/data/catalog'

import { productHref } from '../links'
import { Img } from '../media'

export function ProductCard({
  product,
  priority = false,
}: {
  product: ProductCardData
  priority?: boolean
}) {
  const [main] = product.gallery ?? []
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
        <h3 className="line-clamp-2 text-sm font-semibold text-ink sm:text-base">
          {product.title}
        </h3>
        <p className="mt-auto pt-2 text-xs text-ink-soft">Price on request</p>
      </div>
    </Link>
  )
}

export function ProductGrid({
  products,
  priorityCount = 0,
}: {
  products: ProductCardData[]
  priorityCount?: number
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard priority={index < priorityCount} product={product} />
        </li>
      ))}
    </ul>
  )
}
