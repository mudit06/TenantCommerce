import type { Metadata } from 'next'

import { getSearchList } from '@/lib/data/catalog'
import { getStoreOffers } from '@/lib/data/offers'
import { quoteCheckout } from '@/modules/orders'
import { getStoreContext } from '@/storefront/context'
import { ProductGrid } from '@/storefront/kit/product/ProductCard'
import { CartView } from '@/storefront/kit/shop/CartView'
import { Container, SectionHeading } from '@/storefront/kit/ui'
import { currentCart } from '@/storefront/shop/server'
import { summarize } from '@/storefront/shop/summary'

export const metadata: Metadata = { title: 'Your cart', robots: { index: false, follow: false } }

type Props = { params: Promise<{ tenant: string }> }

/** Cart (docs/screens storefront `st-cart`): priced by the server on every visit and change. */
export default async function CartPage({ params }: Props) {
  const ctx = await getStoreContext((await params).tenant)
  const { payload, cart, lines } = await currentCart(ctx.store.tenantId)
  const quote = await quoteCheckout(payload, ctx.store.tenantId, {
    lines,
    pincode: cart?.pincode ?? null,
    couponCode: cart?.couponCode ?? null,
  })
  const [offers, everything] = await Promise.all([
    getStoreOffers(ctx.store.tenantId),
    lines.length ? getSearchList(ctx.store.tenantId) : Promise.resolve([]),
  ])
  // "Complete the look": more from the categories of what's in the cart, not already in it
  const inCart = new Set(lines.map((line) => line.productId))
  const cartCategories = new Set(
    everything.filter((p) => inCart.has(String(p.id))).flatMap((p) => p.categoryIds),
  )
  const suggestions = everything
    .filter(
      (p) =>
        !inCart.has(String(p.id)) &&
        p.purchaseMode !== 'enquire' &&
        p.price?.amountMinor &&
        p.categoryIds.some((id) => cartCategories.has(id)),
    )
    .slice(0, 4)
  return (
    <Container className="py-6 sm:py-10">
      <CartView
        coupons={offers.couponsOn ? offers.coupons : null}
        initialPincode={cart?.pincode ?? ''}
        selling={ctx.selling}
        summary={summarize(quote)}
        wishlistOn={offers.wishlistOn}
      >
        {suggestions.length ? (
          <section className="mt-10">
            <SectionHeading>Complete the look</SectionHeading>
            <ProductGrid products={suggestions} withCart />
          </section>
        ) : null}
      </CartView>
    </Container>
  )
}
