import Link from 'next/link'

import type { ProductCardData } from '@/lib/data/catalog'
import { offerForProduct } from '@/lib/data/offers'

import { requestCardStore, requestSelling, requestStoreOffers } from '../../shop/offers'

import { productHref } from '../links'
import { Img } from '../media'
import { Stars } from '../reviews/Stars'
import { HeartButton } from '../shop/HeartButton'
import { Price } from '../shop/Price'
import { QuickAdd } from '../shop/QuickAdd'

/**
 * `headingLevel`: 2 where the grid follows the page's h1 (listing, search), 3 under a section
 * heading. `withCart`: Add to cart (or Ask for a quote) under the card, as on category and search
 * pages; other cards carry the same quick add on their photo. A second photo shows on hover.
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
  const [main, second] = (product.gallery ?? []).filter(
    (photo) => typeof photo === 'object' && photo !== null,
  )
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  // A live scheme's price and badge (docs/11 "Display"); checkout prices the cart again
  const [offers, selling, store] = await Promise.all([
    requestStoreOffers(),
    requestSelling(),
    requestCardStore(),
  ])
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
  // Quick add: straight to the cart, a picker for finishes and sizes, or a quote request
  const quickMode = buyable
    ? product.buy.options > 1
      ? ('options' as const)
      : ('cart' as const)
    : store?.enquiries
      ? ('quote' as const)
      : null
  const quick = quickMode
    ? {
        mode: quickMode,
        productId: String(product.id),
        variantId: product.buy.variantId,
        available: product.buy.available,
        slug: product.slug ?? '',
        title: product.title,
        modelNumber: product.modelNumber,
        storeName: store?.name ?? '',
      }
    : null
  return (
    <div className="group/card relative flex h-full flex-col overflow-hidden rounded-card border border-line bg-white transition duration-300 hover:border-ink/25 hover:shadow-lg motion-ok:hover:-translate-y-1">
      <Link
        className="flex flex-1 flex-col focus-visible:outline-2 focus-visible:outline-ink"
        href={productHref(product)}
      >
        <div className="relative aspect-square overflow-hidden bg-surface-alt">
          {offer?.badge ? (
            <span className="absolute top-2 left-2 z-10 rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-white">
              {offer.badge}
            </span>
          ) : null}
          <Img
            className={`size-full object-contain transition duration-500 group-hover/card:scale-[1.03] ${second ? 'group-hover/card:opacity-0' : ''}`}
            media={main}
            priority={priority}
            sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw"
          />
          {second ? (
            <Img
              alt=""
              className="absolute inset-0 size-full object-contain opacity-0 transition duration-500 group-hover/card:opacity-100"
              media={second}
              sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 46vw"
            />
          ) : null}
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
      {quick && !withCart ? (
        // Over the photo (the card is as wide as its square photo): on hover with a mouse,
        // always on touch screens
        <div className="pointer-events-none absolute inset-x-0 top-0 flex aspect-square items-end justify-end p-2 transition [@media(hover:hover)]:translate-y-1 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within/card:translate-y-0 [@media(hover:hover)]:group-focus-within/card:opacity-100 [@media(hover:hover)]:group-hover/card:translate-y-0 [@media(hover:hover)]:group-hover/card:opacity-100">
          <QuickAdd {...quick} look="overlay" />
        </div>
      ) : null}
      {withCart ? (
        <div className="px-3 pb-3 sm:px-4 sm:pb-4">
          {quick ? (
            <QuickAdd {...quick} look="button" />
          ) : (
            <Link
              className="inline-flex min-h-10 w-full items-center justify-center rounded-card border border-line px-3 text-xs font-semibold hover:border-ink/40 sm:text-sm"
              href={productHref(product)}
            >
              See details
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
        // Rows below the first screen rise in as they scroll into view (globals.css "Motion")
        <li className="reveal" key={product.id}>
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
