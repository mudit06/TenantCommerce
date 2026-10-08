import type { ListViewServerProps } from 'payload'

import { storeSessionOf } from '@/access'
import { currentStore, storeRolesOf } from '@/admin/store'
import { EmptyState, PageHeader } from '@/admin/ui'
import { formatINR } from '@/lib/money'
import { couponRule, describeCoupon } from '@/modules/promotions'

import { PROMOTES_ON } from '../constants'
import { programConfig } from '../services/access'
import { payoutDestination, payoutPreview } from '../services/payouts'
import { affiliateFigures, rateText } from '../services/stats'
import {
  AffiliatesClient,
  type AffiliateDetail,
  type AffiliateRow,
  type ApplicationRow,
} from './AffiliatesClient'

const param = (value: unknown) =>
  Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '')

const day = (iso: string | null | undefined, year = false) =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        ...(year ? { year: 'numeric' as const } : {}),
        timeZone: 'Asia/Kolkata',
      })
    : '—'

const TABS = ['approved', 'applied', 'paused', 'rejected'] as const

/**
 * Affiliates (docs/screens/vendor-cms.md `cms-affiliates`): approved affiliates with their clicks,
 * orders and money; applications; the chosen affiliate with rate, coupon and payout details;
 * recording a payout (owner); the program settings.
 */
export async function AffiliatesView({ payload, user, searchParams }: ListViewServerProps) {
  const store = await currentStore(payload, user)
  if (!store) {
    return (
      <div className="te-page">
        <EmptyState icon="store" title="No store selected">
          Choose a store in the menu to see its affiliates.
        </EmptyState>
      </div>
    )
  }
  const roles = storeRolesOf(user, store.id)
  const session = storeSessionOf(user)
  const canWrite = session
    ? session.mode === 'manage'
    : roles.some((r) => r === 'owner' || r === 'manager')
  const canPay = session ? session.mode === 'manage' : roles.includes('owner')
  const scope = { tenant: { equals: store.id } }

  const [config, affiliates, figures, coupons, categories] = await Promise.all([
    programConfig(payload, store.id),
    payload.find({
      collection: 'affiliates',
      where: scope,
      sort: '-createdAt',
      depth: 0,
      limit: 500,
      pagination: false,
      overrideAccess: true,
    }),
    affiliateFigures(payload, store.id),
    payload.find({
      collection: 'coupons',
      where: { and: [scope, { status: { in: ['active', 'scheduled', 'paused'] } }] },
      sort: 'code',
      depth: 0,
      limit: 200,
      pagination: false,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'categories',
      where: scope,
      sort: 'name',
      depth: 0,
      limit: 500,
      pagination: false,
      overrideAccess: true,
      select: { name: true },
    }),
  ])
  if (!config) {
    return (
      <div className="te-page">
        <EmptyState icon="link" title="Affiliates are off">
          Your platform team switches the affiliate program on.
        </EmptyState>
      </div>
    )
  }
  const couponById = new Map(coupons.docs.map((c) => [String(c.id), c]))
  const promotes = (value: string | null | undefined) =>
    PROMOTES_ON.find((p) => p.value === value)?.label ?? ''

  const counts = Object.fromEntries(
    TABS.map((t) => [t, affiliates.docs.filter((a) => a.status === t).length]),
  ) as Record<(typeof TABS)[number], number>
  const tab = (TABS as readonly string[]).includes(param(searchParams?.tab))
    ? (param(searchParams?.tab) as (typeof TABS)[number])
    : counts.applied && !counts.approved
      ? 'applied'
      : 'approved'

  const rows: AffiliateRow[] = affiliates.docs
    .filter((a) => a.status === tab)
    .map((a) => {
      const f = figures.get(String(a.id))
      const coupon = a.coupon ? couponById.get(a.coupon) : null
      return {
        id: String(a.id),
        name: a.name,
        sub: [promotes(a.application?.promotesOn), a.application?.profileUrl]
          .filter(Boolean)
          .join(' · '),
        code: [a.code, coupon?.code].filter(Boolean).join(' · '),
        rate: rateText(a, config.defaultCommissionPercent),
        clicks: (f?.clicks30 ?? 0).toLocaleString('en-IN'),
        orders: String(f?.orders30 ?? 0),
        pending: formatINR(f?.pendingMinor ?? 0),
        approved: formatINR(f?.approvedMinor ?? 0),
        paid: formatINR(f?.paidMinor ?? 0),
      }
    })
  const applications: ApplicationRow[] = affiliates.docs
    .filter((a) => a.status === 'applied')
    .map((a) => ({
      id: String(a.id),
      name: a.name,
      sub: [promotes(a.application?.promotesOn), a.application?.profileUrl]
        .filter(Boolean)
        .join(' · '),
      note: a.application?.audienceNote ?? '',
      applied: day(a.application?.appliedAt ?? a.createdAt),
    }))

  // The affiliate open on the side: the one asked for, else the first in the tab
  const chosenId = param(searchParams?.a)
  const chosen =
    affiliates.docs.find((a) => String(a.id) === chosenId) ??
    affiliates.docs.find((a) => a.status === tab && tab !== 'applied')
  let detail: AffiliateDetail | null = null
  if (chosen) {
    const [preview, { docs: payouts }] = await Promise.all([
      payoutPreview(payload, store.id, chosen),
      payload.find({
        collection: 'affiliate-payouts',
        where: { and: [scope, { affiliate: { equals: String(chosen.id) } }] },
        sort: '-paidOn',
        depth: 0,
        limit: 12,
        overrideAccess: true,
      }),
    ])
    const coupon = chosen.coupon ? couponById.get(chosen.coupon) : null
    detail = {
      id: String(chosen.id),
      name: chosen.name,
      status: chosen.status,
      since: day(chosen.approvedAt ?? chosen.createdAt, true),
      link: `/r/${chosen.code}`,
      rate: rateText(chosen, config.defaultCommissionPercent),
      commissionPercent: chosen.commissionPercent ?? config.defaultCommissionPercent,
      categoryRates: (chosen.categoryRates ?? []).map((r) => ({
        category: r.category,
        percent: r.percent,
      })),
      coupon: coupon
        ? { id: String(coupon.id), label: `${coupon.code} · ${describeCoupon(couponRule(coupon))}` }
        : null,
      payout: chosen.payoutMasked ?? 'Not given yet',
      pan: chosen.panMasked ?? 'Not given yet (TDS 20% past ₹20,000)',
      gstin: chosen.gstin ?? null,
      yearTotal: `${formatINR(preview.yearGrossMinor)} (TDS from ₹20,000)`,
      contact: [chosen.email, chosen.phone].filter(Boolean).join(' · '),
      rejectReason: chosen.rejectReason ?? null,
      preview: {
        count: preview.referrals.length,
        gross: formatINR(preview.grossMinor, { decimals: 'always' }),
        tds: `${formatINR(preview.tdsMinor, { decimals: 'always' })}${preview.tdsPercent ? ` (${preview.tdsPercent}%)` : ''}`,
        net: formatINR(preview.netMinor, { decimals: 'always' }),
        enough: preview.grossMinor > 0 && preview.grossMinor >= preview.minPayoutMinor,
        // Only the owner sees where to pay, in full, while recording it (rule 4)
        payTo: canPay ? payoutDestination(chosen) : null,
      },
      payouts: payouts.map((p) => ({
        id: String(p.id),
        number: p.number,
        paidOn: day(p.paidOn, true),
        gross: formatINR(p.grossMinor),
        tds: formatINR(p.tdsMinor),
        net: formatINR(p.netMinor),
        reference: p.reference ? `ending ${p.reference.slice(-4)}` : '',
      })),
    }
  }

  let pending = 0
  let approved = 0
  for (const f of figures.values()) {
    pending += f.pendingMinor
    approved += f.approvedMinor
  }

  return (
    <div className="te-page">
      <PageHeader
        eyebrow={store.name}
        subtitle={`${counts.approved} approved · ${formatINR(pending)} pending · ${formatINR(approved)} approved to pay`}
        title="Affiliates"
      />
      <AffiliatesClient
        applications={applications}
        canPay={canPay}
        canWrite={canWrite}
        categories={categories.docs.map((c) => ({ id: String(c.id), name: c.name }))}
        counts={counts}
        coupons={coupons.docs
          .filter((c) => !c.affiliate || c.affiliate === String(chosen?.id ?? ''))
          .map((c) => ({
            id: String(c.id),
            label: `${c.code} · ${describeCoupon(couponRule(c))}`,
          }))}
        detail={detail}
        program={{
          defaultCommissionPercent: config.defaultCommissionPercent,
          cookieDays: config.cookieDays,
          holdDays: config.holdDays,
          minPayoutMinor: config.minPayoutMinor,
          autoApproveApplications: config.autoApproveApplications,
          termsPath: config.termsPath,
        }}
        rows={rows}
        storeId={store.id}
        tab={tab}
      />
    </div>
  )
}
