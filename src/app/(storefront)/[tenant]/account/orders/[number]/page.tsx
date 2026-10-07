import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { getPayloadClient } from '@/lib/data/payload'
import { GST_STATES } from '@/lib/gst/gstin'
import { formatINR } from '@/lib/money'
import { customerOrder } from '@/modules/customers'
import { maskedPhone, trackingView } from '@/modules/notifications'
import { getStoreContext } from '@/storefront/context'
import { CancelOrderButton } from '@/storefront/kit/account/CancelOrderButton'
import { dayMonth, pillClass, shopperOrderStatus } from '@/storefront/kit/account/orderStatus'
import { CheckIcon, TruckIcon, WhatsAppIcon } from '@/storefront/kit/icons'
import { TrackingUpdates } from '@/storefront/kit/shop/TrackingUpdates'
import { buttonClass, Container } from '@/storefront/kit/ui'
import { storeWhatsApp } from '@/storefront/kit/whatsapp'
import { loginHref, signedInShopper } from '@/storefront/shop/account'

export const metadata: Metadata = { title: 'Your order', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ tenant: string; number: string }> }

const withinDays = (iso: string, days: number) =>
  Date.now() - new Date(iso).getTime() < days * 86_400_000

const money = (minor: number | null | undefined) => formatINR(minor ?? 0, { decimals: 'always' })

/**
 * Order tracking for a signed-in shopper (docs/screens storefront `st-order`): where it is, the
 * invoice, the address, updates, and what they can still do. Only the account that owns the
 * order opens it; guests sign in with an email code, which brings their guest orders in.
 */
export default async function AccountOrderPage({ params }: Props) {
  const { tenant, number } = await params
  const ctx = await getStoreContext(tenant)
  const orderNumber = decodeURIComponent(number)
  const session = await signedInShopper(ctx.store.tenantId)
  if (!session) redirect(loginHref(`/account/orders/${encodeURIComponent(orderNumber)}`))
  const payload = await getPayloadClient()
  const order = await customerOrder(
    payload,
    ctx.store.tenantId,
    String(session.customer.id),
    orderNumber,
  )
  if (!order) notFound()
  const view = order.trackingCode
    ? await trackingView(payload, ctx.store.tenantId, order.trackingCode)
    : null
  const { docs: payments } = await payload.find({
    collection: 'transactions',
    where: {
      and: [
        { tenant: { equals: ctx.store.tenantId } },
        { order: { equals: order.id } },
        { status: { in: ['captured', 'authorized', 'refunded', 'partially_refunded'] } },
      ],
    },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  const paidBy = payments[0]?.methodDetail ?? null
  const status = shopperOrderStatus(order)
  const address = order.shippingAddress
  const state = address?.stateCode ? GST_STATES[address.stateCode as keyof typeof GST_STATES] : ''
  const totals = order.totals ?? {}
  const shipped = !['unfulfilled', 'packed', 'cancelled'].includes(order.fulfillmentStatus)
  const canCancel =
    ['confirmed', 'processing'].includes(order.status) &&
    ['unfulfilled', 'packed'].includes(order.fulfillmentStatus)
  const returnDays = ctx.settings?.returns?.windowDays ?? 7
  const deliveredAt = order.fulfillmentStatus === 'delivered' ? order.completedAt : null
  const returnOpen = deliveredAt ? withinDays(deliveredAt, returnDays) : false
  const whatsapp = storeWhatsApp(
    ctx.settings?.contact?.whatsapp,
    `Hi, I need help with my order ${order.orderNumber}.`,
  )
  const paidLine =
    order.paymentMethod === 'cod'
      ? 'Cash on delivery'
      : order.paymentStatus === 'refunded'
        ? 'Refunded'
        : paidBy
          ? `Paid by ${paidBy}`
          : 'Paid online'

  return (
    <Container className="py-6 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-ink-soft">
        <Link className="hover:underline" href="/account">
          Account
        </Link>{' '}
        ›{' '}
        <Link className="hover:underline" href="/account">
          Orders
        </Link>{' '}
        › <span className="text-ink">{order.orderNumber}</span>
      </nav>
      <header className="mb-5">
        <h1 className="flex flex-wrap items-center gap-3 font-heading text-2xl font-bold">
          Order <span className="font-mono">{order.orderNumber}</span>
          <span className={pillClass(status.tone)}>{status.label}</span>
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Placed {dayMonth(order.placedAt ?? order.createdAt, true)} · {paidLine}
        </p>
      </header>

      {view ? (
        <section className="mb-5 rounded-card border border-line bg-white p-4">
          <h2 className="mb-3 font-semibold">Delivery</h2>
          <ol className="grid gap-3 sm:grid-cols-5">
            {view.steps.map((step) => (
              <li className="flex items-center gap-2 sm:flex-col sm:items-start" key={step.label}>
                <span
                  aria-hidden
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full ${step.done ? 'bg-dark text-white' : 'border border-line text-transparent'}`}
                >
                  <CheckIcon height={14} width={14} />
                </span>
                <span className={`text-sm ${step.done ? 'font-semibold' : 'text-ink-soft'}`}>
                  {step.label}
                  {step.at && step.done ? (
                    <span className="block text-xs font-normal text-ink-soft">
                      {dayMonth(step.at)}
                    </span>
                  ) : null}
                </span>
                <span className="sr-only">{step.done ? '(done)' : '(not yet)'}</span>
              </li>
            ))}
          </ol>
          {view.parcels
            .filter((p) => p.courier || p.trackingNumber)
            .map((parcel) => (
              <div
                className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-4 text-sm"
                key={parcel.id}
              >
                <TruckIcon aria-hidden height={18} width={18} />
                <span className="flex-1">
                  {parcel.courier ?? 'Courier'}
                  {parcel.trackingNumber ? (
                    <>
                      {' '}
                      · AWB <span className="font-mono">{parcel.trackingNumber}</span>
                    </>
                  ) : null}
                  <span className="block text-xs text-ink-soft">{parcel.statusLabel}</span>
                </span>
                {parcel.trackingUrl ? (
                  <a
                    className={buttonClass('outline', 'min-h-9 px-3')}
                    href={parcel.trackingUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Track on {parcel.courier ?? 'the courier’s site'}
                  </a>
                ) : null}
              </div>
            ))}
        </section>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-card border border-line bg-white">
          <h2 className="border-b border-line px-4 py-3 font-semibold">Items</h2>
          <ul className="divide-y divide-line px-4 text-sm">
            {(order.items ?? []).map((item) => (
              <li className="flex items-center gap-3 py-3" key={item.id}>
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- snapshot URL from the order
                  <img
                    alt=""
                    className="size-11 rounded-md border border-line object-cover"
                    height={44}
                    loading="lazy"
                    src={item.imageUrl}
                    width={44}
                  />
                ) : (
                  <span className="size-11 shrink-0 rounded-md bg-surface-alt" />
                )}
                <span className="flex-1">
                  {item.title}
                  <span className="block text-xs text-ink-soft">
                    {[item.options, `Qty ${item.qty}`].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span>{money(item.lineTotalMinor)}</span>
              </li>
            ))}
          </ul>
          <ul className="divide-y divide-line border-t border-line px-4 text-sm">
            {totals.discountMinor ? (
              <li className="flex justify-between py-2">
                <span>Discounts</span>
                <span>−{money(totals.discountMinor)}</span>
              </li>
            ) : null}
            <li className="flex justify-between py-2">
              <span>Delivery</span>
              <span>{totals.shippingMinor ? money(totals.shippingMinor) : 'Free'}</span>
            </li>
            {totals.codFeeMinor ? (
              <li className="flex justify-between py-2">
                <span>Cash on delivery fee</span>
                <span>{money(totals.codFeeMinor)}</span>
              </li>
            ) : null}
            <li className="flex justify-between py-2 font-bold">
              <span>Total</span>
              <span>{money(totals.grandTotalMinor)}</span>
            </li>
          </ul>
          <p className="px-4 pb-3 text-xs text-ink-soft">
            {totals.igstMinor
              ? `Includes IGST of ${money(totals.igstMinor)}`
              : totals.taxMinor
                ? `Includes GST of ${money(totals.taxMinor)}`
                : 'Prices include GST'}
            {totals.refundedMinor ? ` · Refunded ${money(totals.refundedMinor)}` : ''}
          </p>
        </section>

        <div className="space-y-5">
          <section className="rounded-card border border-line bg-white">
            <h2 className="border-b border-line px-4 py-3 font-semibold">Delivery address</h2>
            <p className="p-4 text-sm">
              {address?.name}
              <br />
              {[address?.line1, address?.line2, address?.landmark, address?.city]
                .filter(Boolean)
                .join(', ')}
              , {[state, address?.pincode].filter(Boolean).join(' ')}
              {address?.phone ? (
                <>
                  <br />
                  <span className="text-ink-soft">{maskedPhone(address.phone)}</span>
                </>
              ) : null}
            </p>
          </section>

          {view?.phone && !view.cancelled && order.trackingCode ? (
            <TrackingUpdates
              code={order.trackingCode}
              initialOn={view.whatsappOn}
              phone={view.phone}
            />
          ) : null}

          <div className="flex flex-wrap gap-2">
            {order.invoice ? (
              <a
                className={buttonClass('outline')}
                href={`/checkout/invoice?order=${encodeURIComponent(order.orderNumber)}`}
                rel="noopener"
                target="_blank"
              >
                Download invoice
              </a>
            ) : null}
            {whatsapp ? (
              <a
                className={buttonClass('outline')}
                href={whatsapp}
                rel="noopener noreferrer"
                target="_blank"
              >
                <WhatsAppIcon aria-hidden height={16} width={16} /> Get help on WhatsApp
              </a>
            ) : null}
          </div>

          {order.status === 'cancelled' ? (
            <p className="rounded-card bg-surface-alt p-3 text-sm">
              This order was cancelled{order.cancelReason ? `: ${order.cancelReason}` : ''}.
              {order.paymentMethod === 'razorpay' && order.paymentStatus !== 'pending'
                ? ' Any amount paid is refunded to the same account.'
                : ''}
            </p>
          ) : canCancel ? (
            <div className="rounded-card bg-surface-alt p-3 text-sm">
              <p className="mb-2">You can cancel until the order ships.</p>
              <CancelOrderButton
                orderNumber={order.orderNumber}
                prepaid={order.paymentMethod === 'razorpay'}
              />
            </div>
          ) : shipped && !deliveredAt ? (
            <p className="rounded-card bg-surface-alt p-3 text-sm">
              Can’t cancel now that it has shipped. Returns open for {returnDays} days after
              delivery.
            </p>
          ) : deliveredAt ? (
            <p className="rounded-card bg-surface-alt p-3 text-sm">
              {returnOpen
                ? `Delivered ${dayMonth(deliveredAt)}. To return an item, message the store within ${returnDays} days of delivery${whatsapp ? ' on WhatsApp' : ''}.`
                : `Delivered ${dayMonth(deliveredAt)}. The return window closed ${dayMonth(new Date(new Date(deliveredAt).getTime() + returnDays * 86_400_000).toISOString())}.`}
            </p>
          ) : null}
        </div>
      </div>
    </Container>
  )
}
