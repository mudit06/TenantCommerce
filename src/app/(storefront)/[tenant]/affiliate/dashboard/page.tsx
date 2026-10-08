import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { getPayloadClient } from '@/lib/data/payload'
import { formatINR } from '@/lib/money'
import { affiliateFigures, affiliateOfCustomer, programConfig } from '@/modules/affiliate'
import { storeFacts } from '@/modules/notifications'
import type { Referral } from '@/payload-types'
import { getStoreContext } from '@/storefront/context'
import { LinkBuilder } from '@/storefront/kit/affiliate/LinkBuilder'
import { PayoutDetailsForm } from '@/storefront/kit/affiliate/PayoutDetailsForm'
import { CopyCode } from '@/storefront/kit/shop/CopyCode'
import { Container } from '@/storefront/kit/ui'
import { loginHref, signedInShopper } from '@/storefront/shop/account'

export const metadata: Metadata = {
  title: 'Affiliate dashboard',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ tenant: string }> }

const day = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        timeZone: 'Asia/Kolkata',
      })
    : '—'

const money = (minor: number) => formatINR(minor, { decimals: 'always' })

/** The referral's status in words for the affiliate (Affiliate dashboard rule 2) */
function statusText(r: Referral) {
  if (r.status === 'pending') {
    return r.holdUntil && new Date(r.holdUntil).getTime() > Date.now()
      ? `Pending until ${day(r.holdUntil)}`
      : r.holdUntil
        ? 'Pending: approving soon'
        : 'Pending: not delivered yet'
  }
  if (r.status === 'reversed') {
    const last = (r.adjustments ?? []).at(-1)?.reason
    return `Reversed${last === 'cancel' ? ': cancelled' : last ? ': refunded' : ''}`
  }
  return r.status === 'paid' ? 'Paid' : 'Approved'
}

const nextMonthEarly = () => {
  const now = new Date(Date.now() + 330 * 60_000)
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toLocaleDateString(
    'en-IN',
    { month: 'long', timeZone: 'UTC' },
  )
}

/**
 * Affiliate dashboard (docs/screens storefront `st-affiliate-dash`): the link and code, referred
 * orders with commission by status (never the shopper's details), payouts and payout details.
 */
export default async function AffiliateDashboard({ params }: Props) {
  const ctx = await getStoreContext((await params).tenant)
  if (!ctx.hasFeature('affiliate')) redirect('/')
  const session = await signedInShopper(ctx.store.tenantId)
  if (!session) redirect(loginHref('/affiliate/dashboard'))
  const payload = await getPayloadClient()
  const tenantId = ctx.store.tenantId
  const affiliate = await affiliateOfCustomer(payload, tenantId, String(session.customer.id))
  if (!affiliate || (affiliate.status !== 'approved' && affiliate.status !== 'paused')) {
    redirect('/affiliate')
  }
  const scope = { tenant: { equals: tenantId } }
  const mine = { affiliate: { equals: String(affiliate.id) } }
  const [config, figures, facts, referrals, payouts, coupon] = await Promise.all([
    programConfig(payload, tenantId),
    affiliateFigures(payload, tenantId, String(affiliate.id)),
    storeFacts(payload, tenantId),
    payload.find({
      collection: 'referrals',
      where: { and: [scope, mine] },
      sort: '-createdAt',
      depth: 0,
      limit: 50,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'affiliate-payouts',
      where: { and: [scope, mine] },
      sort: '-paidOn',
      depth: 0,
      limit: 24,
      overrideAccess: true,
    }),
    affiliate.coupon
      ? payload.find({
          collection: 'coupons',
          where: { and: [scope, { id: { equals: affiliate.coupon } }] },
          limit: 1,
          depth: 0,
          overrideAccess: true,
          select: { code: true },
        })
      : null,
  ])
  const f = figures.get(String(affiliate.id))
  const link = `${facts.storeOrigin}/r/${affiliate.code}`
  const couponCode = coupon?.docs[0]?.code ?? null
  return (
    <Container className="py-8 sm:py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <header>
          <h1 className="font-heading text-2xl font-bold">Hi {affiliate.name.split(' ')[0]}</h1>
          {affiliate.status === 'paused' ? (
            <p className="mt-1 text-sm text-ink-soft">
              Your affiliate account is paused: new orders don’t earn commission for now.
            </p>
          ) : null}
        </header>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Clicks, 30 days', (f?.clicks30 ?? 0).toLocaleString('en-IN'), null],
            ['Orders, 30 days', String(f?.orders30 ?? 0), null],
            ['Pending', formatINR(f?.pendingMinor ?? 0), 'return windows open'],
            ['Approved', formatINR(f?.approvedMinor ?? 0), `paid in early ${nextMonthEarly()}`],
          ].map(([label, value, hint]) => (
            <div className="rounded-card border border-line bg-white p-4" key={label}>
              <dt className="text-xs text-ink-soft">{label}</dt>
              <dd className="text-xl font-bold">{value}</dd>
              {hint ? <dd className="text-xs text-ink-soft">{hint}</dd> : null}
            </div>
          ))}
        </dl>

        <section className="rounded-card border border-line bg-white">
          <h2 className="border-b border-line px-4 py-3 font-semibold">Your link and code</h2>
          <div className="space-y-4 p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <code className="min-w-0 break-all rounded bg-surface-alt px-2 py-1">{link}</code>
              <CopyCode code={link} />
            </div>
            <LinkBuilder code={affiliate.code} origin={facts.storeOrigin} />
            <p>
              {couponCode ? (
                <>
                  Your coupon: <b className="font-mono">{couponCode}</b>. Orders with it count as
                  yours, even without the link.
                </>
              ) : (
                <>Your code is {affiliate.code}. The store can also give you a personal coupon.</>
              )}
            </p>
            <p className="text-xs text-ink-soft">
              The link remembers you for {config?.cookieDays ?? 30} days; the last link a shopper
              clicked counts. Please mark your posts as a paid partnership. Your own orders don’t
              earn commission.
            </p>
          </div>
        </section>

        <section className="rounded-card border border-line bg-white">
          <h2 className="border-b border-line px-4 py-3 font-semibold">Referred orders</h2>
          {referrals.docs.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-ink-soft">
                  <tr>
                    <th className="px-4 py-2 font-semibold">Date</th>
                    <th className="px-4 py-2 text-right font-semibold">Order value</th>
                    <th className="px-4 py-2 text-right font-semibold">Commission</th>
                    <th className="px-4 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {referrals.docs.map((r) => (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap px-4 py-2">
                        {day(r.orderPlacedAt ?? r.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right">
                        {money(r.baseMinor)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right">
                        {money(r.commissionMinor)}
                      </td>
                      <td className="px-4 py-2">
                        {statusText(r)}
                        {r.rateNote ? (
                          <span className="block text-xs text-ink-soft">{r.rateNote}</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-4 text-sm text-ink-soft">
              No referred orders yet. Share your link to get started.
            </p>
          )}
          <p className="border-t border-line px-4 py-2 text-xs text-ink-soft">
            Order value before GST, delivery and COD fee.
          </p>
        </section>

        <section className="rounded-card border border-line bg-white">
          <h2 className="border-b border-line px-4 py-3 font-semibold">Payouts</h2>
          <div className="space-y-4 p-4">
            {payouts.docs.length ? (
              <ul className="divide-y divide-line text-sm">
                {payouts.docs.map((p) => (
                  <li className="flex flex-wrap justify-between gap-2 py-2" key={p.id}>
                    <span>
                      <span className="font-mono">{p.number}</span> · gross {money(p.grossMinor)} ·
                      TDS {money(p.tdsMinor)} · paid {day(p.paidOn)}
                      {p.reference ? ` · UTR ending ${p.reference.slice(-4)}` : ''}
                    </span>
                    <b>{money(p.netMinor)}</b>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-soft">
                No payouts yet. {facts.storeName} pays each month once you have{' '}
                {formatINR(config?.minPayoutMinor ?? 50_000)} or more approved.
              </p>
            )}
            <PayoutDetailsForm
              pan={affiliate.panMasked ?? null}
              payout={affiliate.payoutMasked ?? null}
            />
          </div>
        </section>
      </div>
    </Container>
  )
}
