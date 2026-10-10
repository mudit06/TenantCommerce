import Link from 'next/link'

import type { ProductCardData } from '@/lib/data/catalog'
import { offerForProduct } from '@/lib/data/offers'

import { requestSelling, requestStoreOffers } from '../../shop/offers'

import { productHref } from '../links'
import { Img } from '../media'
import { Stars } from '../reviews/Stars'
import { CardAddToCart } from '../shop/CardAddToCart'
import { HeartButton } from '../shop/HeartButton'
import { Price } from '../shop/Price'

/**
 * `headingLevel`: 2 where the grid follows the page's h1 (listing, search), 3 under a section
 * heading. `withCart`: Add to cart under the card, as on category and search pages.
 */
export async function ProductCard({
  product,
  priority = false,
  headingLevel = 3,
  withCart = false,
}: {
  product: ProductCardData
  priority?: boolean
  headingLevel?: 2 | 3
  withCart?: boolean
}) {
  const [main] = product.gallery ?? []
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  // A live scheme's price and badge (docs/11 "Display"); checkout prices the cart again
  const [offers, selling] = await Promise.all([requestStoreOffers(), requestSelling()])
  const offer = offers
    ? offerForProduct(offers, {
        id: product.id,
        categoryIds: product.categoryIds ?? [],
        priceMinor: product.price?.amountMinor ?? null,
        purchaseMode: product.purchaseMode,
      })
    : null
  const listMinor = product.price?.amountMinor ?? 0
  const rating = offers?.reviewsShown && product.rating?.count ? product.rating : null
  const buyable =
    selling && product.purchaseMode !== 'enquire' && Boolean(product.price?.amountMinor)
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-white transition hover:border-ink/25 hover:shadow-md">
      <Link
        className="group flex flex-1 flex-col focus-visible:outline-2 focus-visible:outline-ink"
        href={productHref(product)}
      >
        <div className="relative aspect-square overflow-hidden bg-surface-alt">
          {offer?.badge ? (
            <span className="absolute top-2 left-2 z-10 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-white">
              {offer.badge}
            </span>
          ) : null}
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
          {rating?.average ? (
            <p className="flex items-center gap-1 text-xs text-ink-soft">
              <Stars size={12} value={rating.average} />
              <span>
                {rating.average.toFixed(1)} ({rating.count})
              </span>
            </p>
          ) : null}
          <div className="mt-auto pt-2">
            {product.purchaseMode !== 'enquire' && product.price?.amountMinor ? (
              <>
                <Price
                  amountMinor={offer?.priceMinor ?? listMinor}
                  mrpMinor={
                    offer?.priceMinor
                      ? (product.compareAtPrice?.amountMinor ?? listMinor)
                      : product.compareAtPrice?.amountMinor
                  }
                  size="sm"
                />
                {offer?.until ? (
                  <p className="mt-0.5 text-[11px] text-ink-soft">
                    {offer.badge ? `${offer.badge} · ` : ''}until {offer.until}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-xs text-ink-soft">Price on request</p>
            )}
            {product.buy.options > 1 ? (
              <p className="mt-0.5 text-[11px] text-ink-soft">{product.buy.options} options</p>
            ) : null}
            {buyable && product.buy.available === 0 ? (
              <p className="mt-0.5 text-[11px] font-semibold text-red-700">Out of stock</p>
            ) : null}
          </div>
        </div>
      </Link>
      {withCart ? (
        <div className="px-3 pb-3 sm:px-4 sm:pb-4">
          {buyable ? (
            <CardAddToCart
              available={product.buy.available}
              href={productHref(product)}
              options={product.buy.options}
              productId={String(product.id)}
              title={product.title}
              variantId={product.buy.variantId}
            />
          ) : (
            <Link
              className="inline-flex min-h-10 w-full items-center justify-center rounded-card border border-line px-3 text-xs font-semibold hover:border-ink/40 sm:text-sm"
              href={`${productHref(product)}#quote`}
            >
              Ask for a quote
            </Link>
          )}
        </div>
      ) : null}
      {offers?.wishlistOn ? (
        <HeartButton
          className="absolute top-2 right-2 z-10 flex size-9 items-center justify-center rounded-full border border-line bg-white/90 shadow-sm"
          label={product.title}
          productId={String(product.id)}
        />
      ) : null}
    </div>
  )
}

export function ProductGrid({
  products,
  priorityCount = 0,
  headingLevel = 3,
  withCart = false,
}: {
  products: ProductCardData[]
  priorityCount?: number
  headingLevel?: 2 | 3
  withCart?: boolean
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
      {products.map((product, index) => (
        <li key={product.id}>
          <ProductCard
            headingLevel={headingLevel}
            priority={index < priorityCount}
            product={product}
            withCart={withCart}
          />
        </li>
      ))}
    </ul>
  )
}
