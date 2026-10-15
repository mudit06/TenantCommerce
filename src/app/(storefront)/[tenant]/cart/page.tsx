import type { Metadata } from 'next'

import { getCartSuggestions } from '@/lib/data/catalog'
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
  // "Complete the look": more from the categories of what's in the cart, not already in it
  const [offers, suggestions] = await Promise.all([
    getStoreOffers(ctx.store.tenantId),
    getCartSuggestions(ctx.store.tenantId, [
      ...new Set(lines.map((line) => String(line.productId))),
    ]),
  ])
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
            <ProductGrid products={suggestions} tenantId={ctx.store.tenantId} withCart />
          </section>
        ) : null}
      </CartView>
    </Container>
  )
}
