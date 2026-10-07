import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { getStoreOffers, runningSchemes, type StoreScheme } from '@/lib/data/offers'
import { formatINR } from '@/lib/money'
import { OCCASIONS } from '@/modules/promotions'
import { getStoreContext } from '@/storefront/context'
import { CopyCode } from '@/storefront/kit/shop/CopyCode'
import { OfferSignup } from '@/storefront/kit/shop/OfferSignup'
import { buttonClass, Container } from '@/storefront/kit/ui'

export const metadata: Metadata = { title: 'Offers' }

type Props = { params: Promise<{ tenant: string }> }

const when = (iso: string, withTime = true) =>
  new Date(iso).toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(withTime ? { hour: 'numeric', minute: '2-digit', hour12: true } : {}),
    timeZone: 'Asia/Kolkata',
  })

/** Time left to the scheme's real end: never reset or extended (docs/14 dark patterns). */
function left(endsAt: string, now: number) {
  const ms = new Date(endsAt).getTime() - now
  const days = Math.floor(ms / 86_400_000)
  const hours = Math.floor((ms % 86_400_000) / 3_600_000)
  return days > 0 ? `${days} d ${hours} h left` : `${Math.max(1, hours)} h left`
}

const nowMs = () => Date.now()

const occasionLabel = (value: string | null) =>
  OCCASIONS.find((o) => o.value === value && value !== 'custom')?.label ?? 'Offer'

const covers = (s: StoreScheme) =>
  s.covers.mode === 'all'
    ? 'Whole store'
    : s.covers.mode === 'products'
      ? `${s.covers.productIds.length} products`
      : 'Chosen categories'

/**
 * Offers (docs/screens storefront `st-offers`): live schemes with their real end, coming-up
 * schemes the vendor chose to show, public coupon codes, and the offer sign-up.
 */
export default async function OffersPage({ params }: Props) {
  const ctx = await getStoreContext((await params).tenant)
  const offers = await getStoreOffers(ctx.store.tenantId)
  if (!offers.schemesOn && !offers.couponsOn) notFound()
  const now = nowMs()
  const live = runningSchemes(offers, new Date(now))
  const upcoming = offers.schemes.filter(
    (s) => new Date(s.startsAt).getTime() > now && s.showBeforeStart,
  )
  const storeName = ctx.settings?.storeName ?? ctx.store.name
  const nothing = !live.length && !upcoming.length && !offers.coupons.length

  return (
    <Container className="space-y-8 py-8 sm:py-10">
      <header>
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">Offers</h1>
        <p className="mt-1 text-ink-soft">Prices include GST. Offers end at the time shown.</p>
      </header>

      {nothing ? (
        <p className="rounded-card bg-surface-alt p-5 text-ink-soft">
          No offers running right now.{' '}
          {offers.offerMessagesOn ? 'Sign up below to hear about the next one first.' : ''}
        </p>
      ) : null}

      {live.length ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide text-ink-soft uppercase">Live now</h2>
          {live.map((s) => (
            <article className="rounded-card border-2 border-ink bg-white p-5" key={s.id}>
              <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-white">
                {s.badge || occasionLabel(s.occasion)}
              </span>
              <h3 className="mt-3 font-heading text-xl font-bold">{s.name}</h3>
              <p className="mt-1">{s.description}</p>
              <p className="mt-1 text-sm text-ink-soft">
                {covers(s)}
                {s.prepaidOnly ? ' · when you pay online' : ''}
                {s.combinesWithCoupons ? ' · works with coupons' : ' · not with coupons'}
              </p>
              <p className="mt-3 flex flex-wrap gap-x-3 text-sm">
                <span>Ends {when(s.endsAt)}</span>
                {s.showCountdown ? (
                  <span className="font-mono text-ink-soft">{left(s.endsAt, now)}</span>
                ) : null}
              </p>
              {s.slug ? (
                <Link className={buttonClass('dark', 'mt-4')} href={`/offers/${s.slug}`}>
                  Shop the offer
                </Link>
              ) : null}
            </article>
          ))}
        </section>
      ) : null}

      {upcoming.length ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide text-ink-soft uppercase">Coming up</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {upcoming.map((s) => (
              <article className="rounded-card border border-line bg-white p-4" key={s.id}>
                <span className="rounded-full bg-surface-alt px-2.5 py-0.5 text-xs font-semibold">
                  {occasionLabel(s.occasion)}
                </span>
                <p className="mt-2 font-semibold">{s.description}</p>
                <p className="mt-1 text-sm text-ink-soft">
                  {when(s.startsAt, false)} to {when(s.endsAt, false)} · {covers(s).toLowerCase()}
                  {s.combinesWithCoupons ? '' : ' · not with coupons'}
                </p>
                <p className="mt-1 text-xs text-ink-soft">Prices change when it starts.</p>
                {offers.offerMessagesOn ? (
                  <a className={buttonClass('outline', 'mt-3 min-h-9 px-3')} href="#offer-signup">
                    Remind me
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {offers.couponsOn && offers.coupons.length ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide text-ink-soft uppercase">
            Coupon codes
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {offers.coupons.map((c) => (
              <div
                className="flex items-center gap-3 rounded-card border border-dashed border-line bg-white p-3"
                key={c.code}
              >
                <div className="flex-1">
                  <b className="font-mono">{c.code}</b>
                  <p className="text-sm">
                    {c.gives}
                    {c.minOrderMinor ? ` on orders above ${formatINR(c.minOrderMinor)}` : ''}
                    {c.onlineOnly ? ' when you pay online' : ''}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {[
                      c.endsAt ? `Until ${when(c.endsAt, false)}` : null,
                      c.perCustomerLimit === 1 ? 'once per customer' : null,
                      c.firstOrderOnly ? 'first order only' : null,
                      c.onlineOnly ? 'not with cash on delivery' : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <CopyCode code={c.code} />
              </div>
            ))}
          </div>
          <p className="text-xs text-ink-soft">
            One coupon per order. Some offers don’t work with coupons: the cart keeps whichever
            saves you more.
          </p>
        </section>
      ) : null}

      {offers.offerMessagesOn ? (
        <OfferSignup storeName={storeName} whatsapp={offers.whatsappOffersOn} />
      ) : null}
    </Container>
  )
}
