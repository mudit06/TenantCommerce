import type { Metadata } from 'next'

import { getStoreOffers } from '@/lib/data/offers'
import { quoteCheckout } from '@/modules/orders'
import { getStoreContext } from '@/storefront/context'
import { CartView } from '@/storefront/kit/shop/CartView'
import { Container } from '@/storefront/kit/ui'
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
  const offers = await getStoreOffers(ctx.store.tenantId)
  return (
    <Container className="py-6 sm:py-10">
      <CartView
        coupons={offers.couponsOn ? offers.coupons : null}
        initialPincode={cart?.pincode ?? ''}
        selling={ctx.selling}
        summary={summarize(quote)}
      />
    </Container>
  )
}
