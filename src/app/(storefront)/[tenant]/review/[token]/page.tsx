import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { getPayloadClient } from '@/lib/data/payload'
import { nameChoices, readReviewToken, reviewableItems } from '@/modules/reviews'
import { featureConfig } from '@/modules/tenancy'
import { getStoreContext } from '@/storefront/context'
import { ReviewForm } from '@/storefront/kit/reviews/ReviewForm'
import { buttonClass, Container } from '@/storefront/kit/ui'
import { mediaUrl } from '@/storefront/kit/media'

export const metadata: Metadata = {
  title: 'Review your purchase',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ tenant: string; token: string }>
  searchParams: Promise<{ from?: string }>
}

const day = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'Asia/Kolkata',
      })
    : ''

/**
 * Write a review (docs/screens storefront `st-review`): from the review email's signed link or
 * from My account. Delivered items only, one review per item.
 */
export default async function ReviewPage({ params, searchParams }: Props) {
  const { tenant, token } = await params
  const { from } = await searchParams
  const ctx = await getStoreContext(tenant)
  const payload = await getPayloadClient()
  const config = await featureConfig<{ allowPhotos: boolean }>(
    payload,
    ctx.store.tenantId,
    'reviews',
  )
  if (!config) notFound()
  const orderId = readReviewToken(decodeURIComponent(token))
  const { docs } = orderId
    ? await payload.find({
        collection: 'orders',
        where: { and: [{ tenant: { equals: ctx.store.tenantId } }, { id: { equals: orderId } }] },
        limit: 1,
        depth: 0,
        pagination: false,
        overrideAccess: true,
      })
    : { docs: [] }
  const order = docs[0]
  if (!order) {
    return (
      <Container className="py-16 text-center">
        <h1 className="font-heading text-2xl font-bold">This review link isn’t valid any more</h1>
        <p className="mt-2 text-ink-soft">
          Open the latest email from us, or review from your account.
        </p>
        <Link className={buttonClass('dark', 'mt-6')} href="/account">
          My account
        </Link>
      </Container>
    )
  }
  const items = await reviewableItems(payload, ctx.store.tenantId, order)
  const names = nameChoices(
    order.contact?.name ?? order.shippingAddress?.name,
    order.shippingAddress?.city,
  )
  const open = items.filter((i) => !i.reviewed)

  return (
    <Container className="py-8 sm:py-10">
      <div className="mx-auto max-w-2xl space-y-5">
        <header>
          <h1 className="font-heading text-2xl font-bold">Review your purchase</h1>
          <p className="text-sm text-ink-soft">
            Order <span className="font-mono">{order.orderNumber}</span>
            {order.completedAt ? ` · delivered ${day(order.completedAt)}` : ''}
          </p>
        </header>
        {items.length === 0 ? (
          <p className="rounded-card bg-surface-alt p-4 text-sm">
            You can review items once they are delivered.
          </p>
        ) : open.length === 0 ? (
          <p className="rounded-card bg-surface-alt p-4 text-sm">
            Thank you: you have reviewed everything in this order.
          </p>
        ) : null}
        {open.map((item) => (
          <section
            className="space-y-4 rounded-card border border-line bg-white p-4 sm:p-5"
            key={item.orderItemId}
          >
            <div className="flex items-center gap-3">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- snapshot URL from the order
                <img
                  alt=""
                  className="size-16 rounded-md border border-line object-cover"
                  src={mediaUrl(item.imageUrl) ?? item.imageUrl}
                />
              ) : null}
              <div className="flex-1">
                <b className="text-sm">{item.title}</b>
                <p className="text-xs text-ink-soft">
                  {[item.options, item.sku].filter(Boolean).join(' · ')}
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                Verified purchase
              </span>
            </div>
            <ReviewForm
              allowPhotos={config.allowPhotos}
              names={names}
              orderItemId={item.orderItemId}
              source={from === 'account' ? 'account' : 'review-email'}
              token={decodeURIComponent(token)}
            />
          </section>
        ))}
        <p className="rounded-card bg-surface-alt p-3 text-sm">
          We check reviews before they appear, usually within two days. We publish honest reviews,
          good or bad. Nothing is offered for a review.
        </p>
      </div>
    </Container>
  )
}
