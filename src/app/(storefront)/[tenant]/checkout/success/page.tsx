import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import Link from 'next/link'

import { GST_STATES } from '@/lib/gst/gstin'
import { formatINR } from '@/lib/money'
import { getStoreContext } from '@/storefront/context'
import { CheckIcon } from '@/storefront/kit/icons'
import { RetryPayment } from '@/storefront/kit/shop/RetryPayment'
import { buttonClass, Container } from '@/storefront/kit/ui'
import { canSeeOrder, ORDER_COOKIE } from '@/storefront/shop/orderAccess'
import { currentCart } from '@/storefront/shop/server'

export const metadata: Metadata = { title: 'Your order', robots: { index: false, follow: false } }

type Props = {
  params: Promise<{ tenant: string }>
  searchParams: Promise<{ order?: string }>
}

const money = (minor: number | null | undefined) => formatINR(minor ?? 0, { decimals: 'always' })

/**
 * Order confirmed (docs/screens storefront `st-confirmation`). Only the browser that placed the
 * order sees it (a signed cookie for 24 hours): the number in the address is sequential, so it
 * never opens an order on its own.
 */
export default async function OrderPlacedPage({ params, searchParams }: Props) {
  const ctx = await getStoreContext((await params).tenant)
  const number = (await searchParams).order ?? ''
  const { payload } = await currentCart(ctx.store.tenantId)
  const { docs } = await payload.find({
    collection: 'orders',
    where: {
      and: [{ tenant: { equals: ctx.store.tenantId } }, { orderNumber: { equals: number } }],
    },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  const order = docs[0]
  const allowed = order && canSeeOrder((await cookies()).get(ORDER_COOKIE)?.value, String(order.id))
  if (!order || !allowed) {
    return (
      <Container className="py-16 text-center">
        <h1 className="font-heading text-2xl font-bold">We can’t show this order here</h1>
        <p className="mt-2 text-ink-soft">
          Open the link in your order email or WhatsApp message to see it.
        </p>
        <Link className={buttonClass('dark', 'mt-6')} href="/">
          Continue shopping
        </Link>
      </Container>
    )
  }
  const { docs: payments } = await payload.find({
    collection: 'transactions',
    where: {
      and: [{ order: { equals: order.id } }, { status: { in: ['captured', 'authorized'] } }],
    },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  const paidBy = payments[0]?.methodDetail ?? null
  const firstName = order.contact?.name?.split(' ')[0] ?? ''
  const address = order.shippingAddress
  const state = address?.stateCode ? GST_STATES[address.stateCode as keyof typeof GST_STATES] : ''
  const awaitingPayment = order.status === 'pending' && order.paymentMethod === 'razorpay'
  const cancelled = order.status === 'cancelled'
  const eta = order.shippingMethod?.etaMaxDays
  const placedAt = new Date(order.placedAt ?? order.createdAt)
  const arrives =
    typeof eta === 'number'
      ? new Date(placedAt.getTime() + eta * 86_400_000).toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          timeZone: 'Asia/Kolkata',
        })
      : null

  return (
    <Container className="py-10">
      <div className="text-center">
        <span
          aria-hidden
          className={`mx-auto flex size-16 items-center justify-center rounded-full text-white ${awaitingPayment || cancelled ? 'bg-ink-soft' : 'bg-dark'}`}
        >
          <CheckIcon height={30} width={30} />
        </span>
        <h1 className="mt-5 font-heading text-2xl font-bold sm:text-3xl">
          {cancelled
            ? 'This order was cancelled'
            : awaitingPayment
              ? 'Your order is waiting for payment'
              : `Thank you${firstName ? `, ${firstName}` : ''}. Your order is placed.`}
        </h1>
        <p className="mt-2 text-ink-soft">
          Order <span className="font-mono font-semibold text-ink">{order.orderNumber}</span> ·{' '}
          {money(order.totals?.grandTotalMinor)}{' '}
          {order.paymentMethod === 'cod'
            ? 'to pay in cash on delivery'
            : order.paymentStatus === 'paid'
              ? `paid${paidBy ? ` by ${paidBy}` : ' online'}`
              : 'not paid yet'}
        </p>
        {!cancelled && !awaitingPayment && order.contact?.email ? (
          <p className="mt-1 text-sm text-ink-soft">
            We’ll email the details to {order.contact.email}
          </p>
        ) : null}
        {awaitingPayment ? (
          <div className="mx-auto mt-5 max-w-md">
            <p className="mb-3 text-sm text-ink-soft">
              The payment window was closed before paying. Your items are held for 30 minutes.
            </p>
            <RetryPayment
              orderNumber={order.orderNumber}
              themeColor={ctx.settings?.themeColor || ctx.ui.theme.brand}
            />
          </div>
        ) : null}
        {cancelled && order.cancelReason ? (
          <p className="mt-2 text-sm text-ink-soft">{order.cancelReason}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
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
          <Link className={buttonClass('outline')} href="/">
            Continue shopping
          </Link>
        </div>
      </div>

      <div className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-2">
        <section className="rounded-card border border-line bg-white">
          <h2 className="border-b border-line px-4 py-3 font-semibold">Delivery</h2>
          <div className="p-4 text-sm">
            {arrives && !cancelled ? <p className="font-semibold">Arrives by {arrives}</p> : null}
            <p className="mt-1 text-ink-soft">
              {[
                address?.name,
                address?.line1,
                address?.line2,
                address?.city,
                [state, address?.pincode].filter(Boolean).join(' '),
              ]
                .filter(Boolean)
                .join(', ')}
            </p>
          </div>
        </section>
        <section className="rounded-card border border-line bg-white">
          <h2 className="border-b border-line px-4 py-3 font-semibold">Items</h2>
          <ul className="divide-y divide-line px-4 text-sm">
            {(order.items ?? []).map((item) => (
              <li className="flex justify-between gap-3 py-3" key={item.id}>
                <span>
                  {item.title}
                  {item.options ? ` · ${item.options}` : ''}
                  {item.qty > 1 ? ` × ${item.qty}` : ''}
                </span>
                <span>{money(item.lineTotalMinor)}</span>
              </li>
            ))}
            {order.totals?.shippingMinor ? (
              <li className="flex justify-between py-3">
                <span>Delivery</span>
                <span>{money(order.totals.shippingMinor)}</span>
              </li>
            ) : null}
            {order.totals?.codFeeMinor ? (
              <li className="flex justify-between py-3">
                <span>Cash on delivery fee</span>
                <span>{money(order.totals.codFeeMinor)}</span>
              </li>
            ) : null}
            <li className="flex justify-between py-3 font-bold">
              <span>Total</span>
              <span>{money(order.totals?.grandTotalMinor)}</span>
            </li>
          </ul>
        </section>
      </div>
    </Container>
  )
}
