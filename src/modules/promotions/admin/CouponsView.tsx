import type { ListViewServerProps } from 'payload'

import { STORE_ADMIN, storeSessionOf } from '@/access'
import { currentStore, storeRolesOf } from '@/admin/store'
import { EmptyState, PageHeader } from '@/admin/ui'
import { formatINR } from '@/lib/money'
import type { Coupon } from '@/payload-types'

import { describeCoupon } from '../rules'
import { couponRule } from '../services/load'
import { CouponsClient, type CouponRow } from './CouponsClient'

const day = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        timeZone: 'Asia/Kolkata',
      })
    : null

function conditions(c: Coupon): string {
  return (
    [
      c.minOrderMinor ? `Orders above ${formatINR(c.minOrderMinor)}` : null,
      c.paymentMethods?.length === 1 && c.paymentMethods[0] === 'razorpay'
        ? 'Pay online only'
        : null,
      c.firstOrderOnly ? 'First order only' : null,
      c.perCustomerLimit === 1 && !c.batch?.id ? 'once per shopper' : null,
      c.affiliate ? 'Credits the affiliate' : null,
    ]
      .filter(Boolean)
      .join(' · ') || 'None'
  )
}

/**
 * Coupons (docs/screens/vendor-cms.md `cms-coupons`): every code with what it gives, its
 * limits and uses; bulk single-use codes show as one row. The editor sits beside the list.
 */
export async function CouponsView({ payload, user }: ListViewServerProps) {
  const store = await currentStore(payload, user)
  if (!store) {
    return (
      <div className="te-page">
        <EmptyState icon="store" title="No store selected">
          Choose a store in the menu to see its coupons.
        </EmptyState>
      </div>
    )
  }
  const roles = storeRolesOf(user, store.id)
  const session = storeSessionOf(user)
  const canWrite = session ? session.mode === 'manage' : roles.some((r) => STORE_ADMIN.includes(r))
  const [{ docs: coupons }, { docs: categories }, { docs: schemes }] = await Promise.all([
    payload.find({
      collection: 'coupons',
      where: { tenant: { equals: store.id } },
      sort: '-createdAt',
      depth: 0,
      limit: 20_000,
      pagination: false,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'categories',
      where: { tenant: { equals: store.id } },
      sort: 'name',
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { name: true },
    }),
    payload.find({
      collection: 'schemes',
      where: { and: [{ tenant: { equals: store.id } }, { status: { not_equals: 'ended' } }] },
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { name: true },
    }),
  ])

  const rows: CouponRow[] = []
  const batches = new Map<string, Coupon[]>()
  for (const c of coupons) {
    if (c.batch?.id) {
      batches.set(c.batch.id, [...(batches.get(c.batch.id) ?? []), c])
      continue
    }
    rows.push({
      id: String(c.id),
      batchId: null,
      code: c.code,
      sub: c.description ?? null,
      gives: describeCoupon(couponRule(c)),
      conditions: conditions(c),
      used: c.usageLimit ? `${c.usedCount ?? 0} / ${c.usageLimit}` : String(c.usedCount ?? 0),
      valid:
        c.status === 'expired' && c.endsAt
          ? `Ended ${day(c.endsAt)}`
          : c.startsAt || c.endsAt
            ? `${day(c.startsAt) ?? 'Now'} to ${day(c.endsAt) ?? 'no end'}`
            : 'No end',
      shown: c.visibility === 'public' ? 'Public' : 'Private',
      status: c.status ?? 'active',
      values: {
        code: c.code,
        description: c.description ?? '',
        type: c.type,
        percent: c.percent ?? null,
        amountMinor: c.amountMinor ?? null,
        minOrderMinor: c.minOrderMinor ?? null,
        maxDiscountMinor: c.maxDiscountMinor ?? null,
        mode: (c.appliesTo?.mode ?? 'all') as 'all' | 'categories' | 'products',
        categories: c.appliesTo?.categories ?? [],
        startsAt: c.startsAt ?? null,
        endsAt: c.endsAt ?? null,
        usageLimit: c.usageLimit ?? null,
        perCustomerLimit: c.perCustomerLimit ?? null,
        firstOrderOnly: Boolean(c.firstOrderOnly),
        onlineOnly: c.paymentMethods?.length === 1 && c.paymentMethods[0] === 'razorpay',
        visibility: (c.visibility ?? 'private') as 'public' | 'private',
        scheme: c.scheme ?? '',
      },
    })
  }
  for (const [batchId, list] of batches) {
    const first = list[0]!
    const used = list.filter((c) => (c.usedCount ?? 0) > 0).length
    rows.push({
      id: batchId,
      batchId,
      code: `${first.batch?.prefix}-••••••`,
      sub: `${list.length} single-use codes`,
      gives: describeCoupon(couponRule(first)),
      conditions: conditions(first),
      used: `${used} / ${list.length}`,
      valid:
        first.startsAt || first.endsAt
          ? `${day(first.startsAt) ?? 'Now'} to ${day(first.endsAt) ?? 'no end'}`
          : 'No end',
      shown: 'Private',
      status: list.every((c) => c.status === 'expired') ? 'expired' : 'active',
      values: null,
    })
  }
  const active = rows.filter((r) => r.status === 'active').length
  const expired = rows.filter((r) => r.status === 'expired').length

  return (
    <div className="te-page">
      <PageHeader
        eyebrow={store.name}
        subtitle={`${active} active · ${expired} expired. One coupon per order; codes match whatever case the shopper types.`}
        title="Coupons"
      />
      <CouponsClient
        canWrite={canWrite}
        categories={categories.map((c) => ({ id: String(c.id), name: c.name }))}
        rows={rows}
        schemes={schemes.map((s) => ({ id: String(s.id), name: s.name }))}
        storeId={store.id}
      />
    </div>
  )
}
