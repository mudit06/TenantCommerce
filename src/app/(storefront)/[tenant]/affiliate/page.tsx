import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { getPayloadClient } from '@/lib/data/payload'
import { formatINR } from '@/lib/money'
import { affiliateOfCustomer, programConfig } from '@/modules/affiliate'
import { getStoreContext } from '@/storefront/context'
import { ApplyForm } from '@/storefront/kit/affiliate/ApplyForm'
import { buttonClass, Container } from '@/storefront/kit/ui'
import { loginHref, signedInShopper } from '@/storefront/shop/account'

export const metadata: Metadata = { title: 'Affiliate program' }
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ tenant: string }> }

/**
 * Affiliate program (docs/screens storefront `st-affiliate`): what affiliates earn and how, and
 * the application, which needs a store account.
 */
export default async function AffiliatePage({ params }: Props) {
  const ctx = await getStoreContext((await params).tenant)
  if (!ctx.hasFeature('affiliate')) notFound()
  const payload = await getPayloadClient()
  const config = await programConfig(payload, ctx.store.tenantId)
  if (!config) notFound()
  const storeName = ctx.settings?.storeName ?? ctx.store.name
  const session = await signedInShopper(ctx.store.tenantId)
  const mine = session
    ? await affiliateOfCustomer(payload, ctx.store.tenantId, String(session.customer.id))
    : null
  const minPayout = formatINR(config.minPayoutMinor)

  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3">
          <h1 className="font-heading text-2xl font-bold sm:text-3xl">Earn with {storeName}</h1>
          <p className="text-lg text-ink-soft">
            Share products you love. Earn {config.defaultCommissionPercent}% of every order you
            refer, paid monthly.
          </p>
        </header>
        <ol className="grid gap-3 sm:grid-cols-3">
          {[
            ['Apply with your store account', 'We reply within 3 working days'],
            ['Share your link or code', 'Instagram, YouTube, WhatsApp or your website'],
            [
              'Earn on delivered orders',
              `Confirmed after the ${config.holdDays}-day return window`,
            ],
          ].map(([title, text], i) => (
            <li className="rounded-card border border-line bg-white p-4" key={title}>
              <span className="text-xs font-semibold text-ink-soft">{i + 1}</span>
              <p className="font-semibold">{title}</p>
              <p className="text-sm text-ink-soft">{text}</p>
            </li>
          ))}
        </ol>
        <p className="rounded-card bg-surface-alt p-4 text-sm">
          Paid by {storeName} by UPI or bank transfer each month, once you have {minPayout} or more
          confirmed. TDS applies above ₹20,000 a year. Commission is a share of the order value
          before GST, delivery and the cash on delivery fee.
        </p>

        <section className="rounded-card border border-line bg-white">
          <h2 className="border-b border-line px-4 py-3 font-semibold">Apply</h2>
          <div className="p-4">
            {!session ? (
              <div className="space-y-3 text-sm">
                <p>Applying needs an account with {storeName}. We’ll email you a code to log in.</p>
                <Link className={buttonClass('primary')} href={loginHref('/affiliate')}>
                  Log in to apply
                </Link>
              </div>
            ) : mine?.status === 'applied' ? (
              <p className="text-sm">
                Thank you, {mine.name.split(' ')[0]}. We have your application and reply within 3
                working days, by email to {mine.email}.
              </p>
            ) : mine?.status === 'approved' || mine?.status === 'paused' ? (
              <div className="space-y-3 text-sm">
                <p>
                  You are an affiliate of {storeName}
                  {mine.status === 'paused' ? ' (paused for now)' : ''}. Your code is{' '}
                  <b className="font-mono">{mine.code}</b>.
                </p>
                <Link className={buttonClass('primary')} href="/affiliate/dashboard">
                  Open your dashboard
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {mine?.status === 'rejected' ? (
                  <p className="text-sm">
                    Your last application wasn’t accepted
                    {mine.rejectReason ? `: ${mine.rejectReason}` : ''}. You can apply again.
                  </p>
                ) : null}
                <ApplyForm
                  email={session.customer.email}
                  name={session.customer.name ?? ''}
                  phone={session.customer.phone?.replace(/^\+91/, '') ?? ''}
                  termsPath={config.termsPath}
                />
              </div>
            )}
          </div>
        </section>
      </div>
    </Container>
  )
}
