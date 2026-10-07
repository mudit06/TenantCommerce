import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { formatINR } from '@/lib/money'
import { customerAddresses, customerOrders, hasPassword } from '@/modules/customers'
import { maskedPhone, offersAgreed, preferenceFor, whatsappStopped } from '@/modules/notifications'
import { featureConfig } from '@/modules/tenancy'
import { getStoreContext } from '@/storefront/context'
import { AccountNav } from '@/storefront/kit/account/AccountNav'
import { AddressBook, type SavedAddress } from '@/storefront/kit/account/AddressBook'
import { BuyAgainButton } from '@/storefront/kit/account/BuyAgainButton'
import { LogOutButtons } from '@/storefront/kit/account/LogOutButtons'
import { dayMonth, pillClass, shopperOrderStatus } from '@/storefront/kit/account/orderStatus'
import { ProfileForm } from '@/storefront/kit/account/ProfileForm'
import { UpdatesCard } from '@/storefront/kit/account/UpdatesCard'
import { buttonClass, Container } from '@/storefront/kit/ui'
import { getPayloadClient } from '@/lib/data/payload'
import { loginHref, signedInShopper } from '@/storefront/shop/account'

export const metadata: Metadata = { title: 'My account', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ tenant: string }> }

const money = (minor: number | null | undefined) => formatINR(minor ?? 0, { decimals: 'always' })

/**
 * My account (docs/screens storefront `st-account`): orders with tracking and invoices, order
 * updates and offers, saved addresses and profile, for the signed-in shopper only.
 */
export default async function AccountPage({ params }: Props) {
  const ctx = await getStoreContext((await params).tenant)
  const session = await signedInShopper(ctx.store.tenantId)
  if (!session) redirect(loginHref('/account'))
  const { customer } = session
  const tenantId = ctx.store.tenantId
  const customerId = String(customer.id)
  const payload = await getPayloadClient()

  const orders = await customerOrders(payload, tenantId, customerId)
  const addresses = await customerAddresses(payload, tenantId, customerId)
  const withPassword = await hasPassword(payload, tenantId, customerId)
  // The phone for updates: the profile's, else the latest order's
  const phone = customer.phone ?? orders.find((o) => o.contact?.phone)?.contact?.phone ?? null
  const phonePref = phone ? await preferenceFor(payload, tenantId, 'phone', phone) : null
  const emailPref = await preferenceFor(payload, tenantId, 'email', customer.email)
  const offerConfig = await featureConfig<{ maxPerShopperPerWeek: number }>(
    payload,
    tenantId,
    'offer-messages',
  )
  const whatsappOffers = offerConfig
    ? await featureConfig(payload, tenantId, 'whatsapp-offers')
    : null
  // On unless stopped: updates follow the checkout box per order, and the switch turns them on
  // for every later order
  const whatsappOn = phone
    ? !whatsappStopped(phonePref) &&
      (Boolean(phonePref?.whatsapp?.optedIn) || orders.some((o) => o.whatsappOptIn))
    : false

  const firstName = customer.name?.split(' ')[0]
  const savedAddresses: SavedAddress[] = addresses.map((a) => ({
    id: String(a.id),
    type: (a.type ?? 'home') as SavedAddress['type'],
    isDefault: Boolean(a.isDefault),
    name: a.address?.name ?? '',
    phone: a.address?.phone ?? '',
    line1: a.address?.line1 ?? '',
    line2: a.address?.line2 ?? '',
    landmark: a.address?.landmark ?? '',
    city: a.address?.city ?? '',
    stateCode: a.address?.stateCode ?? '',
    pincode: a.address?.pincode ?? '',
    gstin: a.gstin ?? '',
    legalName: a.legalName ?? '',
  }))

  const nav = [
    { label: 'Orders', href: '/account' },
    { label: 'Addresses', href: '/account#addresses' },
    { label: 'Profile', href: '/account#profile' },
  ]

  return (
    <Container className="py-6 sm:py-10">
      <div className="grid gap-6 md:grid-cols-[200px_minmax(0,1fr)]">
        <AccountNav active="/account" items={nav} />
        <div className="min-w-0 space-y-5">
          <header>
            <h1 className="font-heading text-2xl font-bold">
              Hi{firstName ? ` ${firstName}` : ''}
            </h1>
            <p className="text-sm text-ink-soft">{customer.email}</p>
          </header>

          <section aria-labelledby="orders-heading" className="space-y-3">
            <h2
              className="text-sm font-semibold uppercase tracking-wide text-ink-soft"
              id="orders-heading"
            >
              Your orders
            </h2>
            {orders.length === 0 ? (
              <div className="rounded-card border border-line bg-white p-4 text-sm text-ink-soft">
                No orders yet. Orders placed with {customer.email} show here, including ones placed
                before you had an account.{' '}
                <Link className="font-semibold text-ink underline" href="/">
                  Start shopping
                </Link>
              </div>
            ) : (
              orders.map((order) => {
                const status = shopperOrderStatus(order)
                const items = (order.items ?? []).reduce((sum, item) => sum + item.qty, 0)
                const delivered = order.fulfillmentStatus === 'delivered'
                return (
                  <article
                    className="space-y-2 rounded-card border border-line bg-white p-4"
                    key={order.id}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <b className="font-mono text-sm">{order.orderNumber}</b>
                      <span className={pillClass(status.tone)}>{status.label}</span>
                      <span className="flex-1" />
                      <b className="text-sm">{money(order.totals?.grandTotalMinor)}</b>
                    </div>
                    <p className="text-xs text-ink-soft">
                      {delivered && order.completedAt
                        ? `Delivered ${dayMonth(order.completedAt)}`
                        : `Placed ${dayMonth(order.placedAt ?? order.createdAt, true)}`}{' '}
                      · {items} item{items === 1 ? '' : 's'}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex gap-1.5">
                        {(order.items ?? []).slice(0, 4).map((item) =>
                          item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- snapshot URL from the order
                            <img
                              alt=""
                              className="size-11 rounded-md border border-line object-cover"
                              height={44}
                              key={item.id}
                              loading="lazy"
                              src={item.imageUrl}
                              width={44}
                            />
                          ) : (
                            <span className="size-11 rounded-md bg-surface-alt" key={item.id} />
                          ),
                        )}
                      </div>
                      <span className="flex-1" />
                      {order.status !== 'cancelled' && !delivered ? (
                        <Link
                          className={buttonClass('dark', 'min-h-9 px-3')}
                          href={`/account/orders/${encodeURIComponent(order.orderNumber)}`}
                        >
                          Track order
                        </Link>
                      ) : (
                        <Link
                          className={buttonClass('outline', 'min-h-9 px-3')}
                          href={`/account/orders/${encodeURIComponent(order.orderNumber)}`}
                        >
                          View order
                        </Link>
                      )}
                      {delivered ? <BuyAgainButton orderNumber={order.orderNumber} /> : null}
                      {order.invoice ? (
                        <a
                          className={buttonClass('outline', 'min-h-9 px-3')}
                          href={`/checkout/invoice?order=${encodeURIComponent(order.orderNumber)}`}
                          rel="noopener"
                          target="_blank"
                        >
                          Invoice
                        </a>
                      ) : null}
                    </div>
                  </article>
                )
              })
            )}
          </section>

          <UpdatesCard
            email={customer.email}
            maskedPhone={phone ? maskedPhone(phone) : null}
            offers={
              offerConfig
                ? {
                    email: offersAgreed(emailPref, 'email'),
                    whatsapp: whatsappOffers ? offersAgreed(phonePref, 'whatsapp') : null,
                    perWeek: offerConfig.maxPerShopperPerWeek,
                  }
                : null
            }
            whatsappOn={whatsappOn}
          />
          <AddressBook addresses={savedAddresses} />
          <ProfileForm
            email={customer.email}
            hasPassword={withPassword}
            name={customer.name ?? ''}
            phone={customer.phone ?? ''}
          />
          <LogOutButtons className="rounded-card border border-line bg-white p-2 md:hidden" />
        </div>
      </div>
    </Container>
  )
}
