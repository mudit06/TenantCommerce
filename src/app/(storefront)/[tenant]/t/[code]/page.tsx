import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'

import { getPayloadClient } from '@/lib/data/payload'
import { allow, LIMITS } from '@/lib/rate-limit'
import { trackingView } from '@/modules/notifications'
import { getStoreContext } from '@/storefront/context'
import { CheckIcon, LockIcon, TruckIcon } from '@/storefront/kit/icons'
import { TrackingUpdates } from '@/storefront/kit/shop/TrackingUpdates'
import { buttonClass, Container } from '@/storefront/kit/ui'
import { loginHref } from '@/storefront/shop/account'

export const metadata: Metadata = {
  title: 'Track your order',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ tenant: string; code: string }> }

const day = (value: string | null) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        timeZone: 'Asia/Kolkata',
      })
    : ''

/**
 * Tracking page (docs/screens storefront `st-track`), behind the "Track order" link in every
 * message: the journey, courier and tracking number. No address, phone or invoice here.
 */
export default async function TrackingPage({ params }: Props) {
  const { tenant, code } = await params
  const ctx = await getStoreContext(tenant)
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const allowed = allow(`tracking:${ip}`, LIMITS.tracking)
  const view = allowed
    ? await trackingView(await getPayloadClient(), ctx.store.tenantId, code)
    : null

  if (!view) {
    return (
      <Container className="py-16 text-center">
        <h1 className="font-heading text-2xl font-bold">
          {allowed ? 'We can’t find this order' : 'Too many tries'}
        </h1>
        <p className="mt-2 text-ink-soft">
          {allowed
            ? 'Check the link in your order email or WhatsApp message.'
            : 'Please wait a minute and open the link again.'}
        </p>
        <Link className={buttonClass('dark', 'mt-6')} href="/">
          Continue shopping
        </Link>
      </Container>
    )
  }

  return (
    <Container className="py-8 sm:py-10">
      <div className="mx-auto max-w-2xl space-y-5">
        <header>
          <h1 className="font-heading text-2xl font-bold">
            Order <span className="font-mono">{view.orderNumber}</span>
          </h1>
          <p className="mt-1 text-ink-soft">{view.headline}</p>
        </header>

        <section className="rounded-card border border-line bg-white p-4">
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
                    <span className="block text-xs font-normal text-ink-soft">{day(step.at)}</span>
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

        <section className="rounded-card border border-line bg-white">
          <h2 className="border-b border-line px-4 py-3 font-semibold">
            {view.parcels.length > 1 ? 'In these parcels' : 'In this order'}
          </h2>
          <ul className="divide-y divide-line px-4 text-sm">
            {view.parcels.flatMap((parcel) =>
              parcel.items.map((item, index) => (
                <li className="flex justify-between gap-3 py-3" key={`${parcel.id}:${index}`}>
                  <span>{item.title}</span>
                  <span>× {item.qty}</span>
                </li>
              )),
            )}
            {view.waiting.map((item, index) => (
              <li className="flex justify-between gap-3 py-3" key={`waiting:${index}`}>
                <span>
                  {item.title}
                  {item.options ? ` · ${item.options}` : ''}
                </span>
                <span>× {item.qty}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3 text-xs text-ink-soft">
            <LockIcon aria-hidden className="shrink-0" height={14} width={14} />
            <span className="flex-1">Address and invoice are hidden on this page.</span>
            {ctx.selling.selling ? (
              <Link
                className={buttonClass('outline', 'min-h-9 px-3 text-xs')}
                href={loginHref(`/account/orders/${encodeURIComponent(view.orderNumber)}`)}
              >
                Log in to see more
              </Link>
            ) : null}
          </div>
        </section>

        {view.phone && !view.cancelled ? (
          <TrackingUpdates code={code} initialOn={view.whatsappOn} phone={view.phone} />
        ) : null}
        <p className="text-xs text-ink-soft">Opened from a Track order link</p>
      </div>
    </Container>
  )
}
