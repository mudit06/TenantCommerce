import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { loadSettings } from '@/modules/notifications'
import { quoteCheckout } from '@/modules/orders'
import { getStoreContext } from '@/storefront/context'
import { customerAddresses } from '@/modules/customers'
import { isFeatureEnabled } from '@/modules/tenancy'
import { CheckoutForm, type CheckoutAccount } from '@/storefront/kit/shop/CheckoutForm'
import { Container } from '@/storefront/kit/ui'
import { loginHref, signedInShopper } from '@/storefront/shop/account'
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
    couponCode: cart?.couponCode ?? null,
  })
  // "Send me order updates on WhatsApp" is ticked unless the store chose otherwise (docs/18)
  const { whatsappOptInDefault } = await loadSettings(payload, ctx.store.tenantId)
  // Signed in: the account's details and default address fill the form. Guest checkout is a
  // feature switch; without it, shoppers log in first (docs/08)
  const session = await signedInShopper(ctx.store.tenantId)
  if (!session && !(await isFeatureEnabled(payload, ctx.store.tenantId, 'guest-checkout'))) {
    redirect(loginHref('/checkout'))
  }
  let account: CheckoutAccount | null = null
  if (session) {
    const addresses = await customerAddresses(
      payload,
      ctx.store.tenantId,
      String(session.customer.id),
    )
    const main = addresses.find((a) => a.isDefault) ?? addresses[0]
    account = {
      email: session.customer.email,
      phone: session.customer.phone ?? '',
      name: session.customer.name ?? '',
      savedAddresses: addresses.length,
      address: main?.address
        ? {
            pincode: main.address.pincode ?? '',
            city: main.address.city ?? '',
            stateCode: main.address.stateCode ?? '',
            name: main.address.name ?? '',
            line1: main.address.line1 ?? '',
            line2: main.address.line2 ?? '',
            landmark: main.address.landmark ?? '',
            gstin: main.gstin ?? '',
            legalName: main.legalName ?? '',
          }
        : null,
    }
  }
  return (
    <Container className="py-6 sm:py-10">
      <h1 className="mb-6 font-heading text-2xl font-bold">Checkout</h1>
      <CheckoutForm
        account={account}
        offerChoices={{
          email: ctx.hasFeature('offer-messages'),
          whatsapp: ctx.hasFeature('offer-messages') && ctx.hasFeature('whatsapp-offers'),
        }}
        initial={summarize(quote)}
        initialPincode={cart?.pincode ?? ''}
        storeName={ctx.settings?.storeName ?? ctx.store.name}
        themeColor={ctx.settings?.themeColor || ctx.ui.theme.brand}
        whatsappDefault={whatsappOptInDefault}
      />
    </Container>
  )
}
