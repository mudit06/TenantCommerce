import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { quoteCheckout } from '@/modules/orders'
import { getStoreContext } from '@/storefront/context'
import { CheckoutForm } from '@/storefront/kit/shop/CheckoutForm'
import { Container } from '@/storefront/kit/ui'
import { currentCart } from '@/storefront/shop/server'
import { summarize } from '@/storefront/shop/summary'

export const metadata: Metadata = { title: 'Checkout', robots: { index: false, follow: false } }

type Props = { params: Promise<{ tenant: string }> }

/** Checkout (docs/screens storefront `st-checkout`): guests welcome, one page to payment. */
export default async function CheckoutPage({ params }: Props) {
  const ctx = await getStoreContext((await params).tenant)
  const { payload, cart, lines } = await currentCart(ctx.store.tenantId)
  if (!lines.length || !ctx.selling.selling) redirect('/cart')
  const quote = await quoteCheckout(payload, ctx.store.tenantId, {
    lines,
    pincode: cart?.pincode ?? null,
  })
  return (
    <Container className="py-6 sm:py-10">
      <h1 className="mb-6 font-heading text-2xl font-bold">Checkout</h1>
      <CheckoutForm
        initial={summarize(quote)}
        initialPincode={cart?.pincode ?? ''}
        storeName={ctx.settings?.storeName ?? ctx.store.name}
        themeColor={ctx.settings?.themeColor || ctx.ui.theme.brand}
        whatsappDefault
      />
    </Container>
  )
}
