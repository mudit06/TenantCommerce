import type { Payload, PayloadRequest } from 'payload'

import { hasTenantRole, storeSessionOf, type TenantRole } from '@/access'
import { AppError } from '@/lib/errors'
import type { InvoiceLine } from '@/modules/tax-invoicing'
import type { Order } from '@/payload-types'

// Reports (docs/screens/vendor-cms.md `cms-reports`): a month's sales, best sellers, offers,
// affiliates and abandoned carts, and the HSN-wise GST summary for GSTR-1. Worked out from the
// orders, invoices and ledgers when asked (no nightly rollups yet: one store's month is small).

export const REPORT_ROLES: readonly TenantRole[] = ['owner', 'manager', 'order-manager', 'support']

export function assertReportAccess(req: PayloadRequest, tenantId: string) {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 'Sign in first', 401)
  const session = storeSessionOf(req.user)
  if (session ? session.tenantId !== tenantId : !hasTenantRole(req.user, tenantId, REPORT_ROLES)) {
    throw new AppError('FORBIDDEN', 'Your role can’t see reports', 403)
  }
}

const IST = 330 * 60_000
const DAY = 86_400_000

/** "2026-09" → the month's start and end instants (India time), and its name */
export function monthRange(month: string | null | undefined, now = new Date()) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month ?? '')
  const local = new Date(now.getTime() + IST)
  const year = match ? Number(match[1]) : local.getUTCFullYear()
  const index = match ? Number(match[2]) - 1 : local.getUTCMonth()
  const from = new Date(Date.UTC(year, index, 1) - IST)
  const to = new Date(Date.UTC(year, index + 1, 1) - IST)
  const prevFrom = new Date(Date.UTC(year, index - 1, 1) - IST)
  return {
    key: `${year}-${String(index + 1).padStart(2, '0')}`,
    label: new Date(Date.UTC(year, index, 1)).toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }),
    prevLabel: new Date(Date.UTC(year, index - 1, 1)).toLocaleDateString('en-IN', {
      month: 'long',
      timeZone: 'UTC',
    }),
    from,
    to,
    prevFrom,
    days: Math.round((to.getTime() - from.getTime()) / DAY),
  }
}

const SOLD = ['paid', 'partially_refunded', 'refunded'] as const

/**
 * Orders that count as sales in the period: paid online, or cash collected on delivery (rule 2),
 * by the day the money came in.
 */
export async function soldOrders(
  payload: Payload,
  tenantId: string,
  from: Date,
  to: Date,
): Promise<Order[]> {
  const { docs } = await payload.find({
    collection: 'orders',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { paymentStatus: { in: [...SOLD] } },
        { paidAt: { greater_than_equal: from.toISOString() } },
        { paidAt: { less_than: to.toISOString() } },
      ],
    },
    sort: 'paidAt',
    depth: 0,
    limit: 50_000,
    pagination: false,
    overrideAccess: true,
  })
  return docs
}

export type HsnRow = {
  hsn: string
  description: string
  ratePercent: number
  qty: number
  taxableMinor: number
  igstMinor: number
  cgstMinor: number
  sgstMinor: number
  taxMinor: number
  totalMinor: number
}

/**
 * The HSN-wise summary (rule 1, GSTR-1 table 12): every tax invoice issued in the period less
 * every credit note, grouped by HSN code and rate. Delivery and COD fee lines carry the goods'
 * HSN (a composite supply, docs/11), so they fall in the same rows.
 */
export async function hsnSummary(
  payload: Payload,
  tenantId: string,
  from: Date,
  to: Date,
): Promise<HsnRow[]> {
  const { docs } = await payload.find({
    collection: 'invoices',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { issuedAt: { greater_than_equal: from.toISOString() } },
        { issuedAt: { less_than: to.toISOString() } },
      ],
    },
    depth: 0,
    limit: 50_000,
    pagination: false,
    overrideAccess: true,
    select: { type: true, lines: true },
  })
  const rows = new Map<string, HsnRow>()
  for (const invoice of docs) {
    const sign = invoice.type === 'credit-note' ? -1 : 1
    for (const line of (invoice.lines as InvoiceLine[] | null) ?? []) {
      const hsn = line.hsnCode || 'No HSN'
      const key = `${hsn}|${line.ratePercent}`
      const row =
        rows.get(key) ??
        ({
          hsn,
          description: '',
          ratePercent: line.ratePercent,
          qty: 0,
          taxableMinor: 0,
          igstMinor: 0,
          cgstMinor: 0,
          sgstMinor: 0,
          taxMinor: 0,
          totalMinor: 0,
        } satisfies HsnRow)
      // The first goods line names the row (charges are described as such)
      if (!row.description && line.unitMinor !== null) row.description = line.description
      if (line.unitMinor !== null) row.qty += sign * line.qty
      row.taxableMinor += sign * line.taxableMinor
      row.igstMinor += sign * line.igstMinor
      row.cgstMinor += sign * line.cgstMinor
      row.sgstMinor += sign * line.sgstMinor
      row.taxMinor += sign * (line.igstMinor + line.cgstMinor + line.sgstMinor)
      row.totalMinor += sign * line.totalMinor
      rows.set(key, row)
    }
  }
  return [...rows.values()].sort((a, b) =>
    a.hsn === b.hsn ? a.ratePercent - b.ratePercent : a.hsn.localeCompare(b.hsn),
  )
}

export type Report = Awaited<ReturnType<typeof buildReport>>

/** Everything on the Reports screen for one month. */
export async function buildReport(payload: Payload, tenantId: string, month?: string | null) {
  const range = monthRange(month)
  const scope = { tenant: { equals: tenantId } }
  const [orders, previous, refunds, hsn, schemes, coupons, referrals, carts] = await Promise.all([
    soldOrders(payload, tenantId, range.from, range.to),
    payload.count({
      collection: 'orders',
      where: {
        and: [
          scope,
          { paymentStatus: { in: [...SOLD] } },
          { paidAt: { greater_than_equal: range.prevFrom.toISOString() } },
          { paidAt: { less_than: range.from.toISOString() } },
        ],
      },
      overrideAccess: true,
    }),
    payload.find({
      collection: 'refunds',
      where: {
        and: [
          scope,
          { status: { equals: 'processed' } },
          { processedAt: { greater_than_equal: range.from.toISOString() } },
          { processedAt: { less_than: range.to.toISOString() } },
        ],
      },
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { amountMinor: true, order: true },
    }),
    hsnSummary(payload, tenantId, range.from, range.to),
    payload.find({
      collection: 'schemes',
      where: scope,
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { name: true, status: true, startsAt: true },
    }),
    payload.find({
      collection: 'coupons',
      where: scope,
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { code: true, affiliate: true },
    }),
    payload.find({
      collection: 'referrals',
      where: scope,
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { status: true, commissionMinor: true, order: true },
    }),
    payload.find({
      collection: 'carts',
      where: {
        and: [
          scope,
          { abandonedAt: { greater_than_equal: range.from.toISOString() } },
          { abandonedAt: { less_than: range.to.toISOString() } },
        ],
      },
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { reminders: true, convertedOrder: true },
    }),
  ])

  const gross = orders.reduce((s, o) => s + (o.totals?.grandTotalMinor ?? 0), 0)
  const online = orders.filter((o) => o.paymentMethod === 'razorpay').length

  // Daily sales by the India-time day the money came in
  const daily = Array.from({ length: range.days }, (_, i) => ({ day: i + 1, salesMinor: 0 }))
  for (const o of orders) {
    const i = Math.floor((new Date(o.paidAt!).getTime() - range.from.getTime()) / DAY)
    if (daily[i]) daily[i].salesMinor += o.totals?.grandTotalMinor ?? 0
  }

  // Best sellers by what the lines brought in, GST included
  const products = new Map<string, { title: string; units: number; salesMinor: number }>()
  for (const o of orders) {
    for (const item of o.items ?? []) {
      const key = item.productId ?? item.title
      const p = products.get(key) ?? { title: item.title, units: 0, salesMinor: 0 }
      p.units += item.qty
      p.salesMinor += item.lineTotalMinor ?? 0
      products.set(key, p)
    }
  }
  const bestSellers = [...products.values()]
    .sort((a, b) => b.salesMinor - a.salesMinor)
    .slice(0, 10)

  // Offers: each scheme and coupon with its orders, sales and the discount it gave (rule 4)
  const schemeName = new Map(schemes.docs.map((s) => [String(s.id), s]))
  const couponOf = new Map(coupons.docs.map((c) => [String(c.id), c]))
  const offers = new Map<
    string,
    { name: string; note: string; orders: number; salesMinor: number; discountMinor: number }
  >()
  for (const o of orders) {
    for (const applied of o.appliedOffers ?? []) {
      const key = `${applied.kind}:${applied.ref}`
      const scheme = applied.kind === 'scheme' ? schemeName.get(applied.ref ?? '') : null
      const coupon = applied.kind === 'coupon' ? couponOf.get(applied.ref ?? '') : null
      const row = offers.get(key) ?? {
        name: scheme?.name ?? coupon?.code ?? applied.code ?? applied.name ?? 'Offer',
        note: scheme
          ? scheme.status === 'live'
            ? 'live'
            : (scheme.status ?? '')
          : coupon?.affiliate
            ? 'affiliate'
            : 'coupon',
        orders: 0,
        salesMinor: 0,
        discountMinor: 0,
      }
      row.orders += 1
      row.salesMinor += o.totals?.grandTotalMinor ?? 0
      row.discountMinor += applied.discountMinor ?? 0
      offers.set(key, row)
    }
  }

  // Affiliates: the month's referred sales; commission waiting now
  const referred = orders.filter((o) => o.referral?.affiliate)
  const commission = { approvedMinor: 0, pendingMinor: 0 }
  for (const r of referrals.docs) {
    if (r.status === 'approved') commission.approvedMinor += r.commissionMinor
    if (r.status === 'pending') commission.pendingMinor += r.commissionMinor
  }

  // Abandoned carts left this month: reminded, and recovered by an order
  const reminded = carts.docs.filter((c) => (c.reminders ?? []).length)
  const recoveredIds = reminded
    .map((c) => (typeof c.convertedOrder === 'object' ? c.convertedOrder?.id : c.convertedOrder))
    .filter((id): id is string => Boolean(id))
    .map(String)
  const { docs: recoveredOrders } = recoveredIds.length
    ? await payload.find({
        collection: 'orders',
        where: {
          and: [scope, { id: { in: recoveredIds } }, { status: { not_equals: 'cancelled' } }],
        },
        depth: 0,
        pagination: false,
        overrideAccess: true,
        select: { totals: true },
      })
    : { docs: [] }

  return {
    month: range,
    figures: {
      grossMinor: gross,
      orders: orders.length,
      previousOrders: previous.totalDocs,
      averageMinor: orders.length ? Math.round(gross / orders.length) : 0,
      refundsMinor: refunds.docs.reduce((s, r) => s + r.amountMinor, 0),
      refundedOrders: new Set(
        refunds.docs.map((r) => String(typeof r.order === 'object' ? r.order?.id : r.order)),
      ).size,
      onlineShare: orders.length ? Math.round((online / orders.length) * 100) : 0,
    },
    daily,
    bestSellers,
    offers: [...offers.values()].sort((a, b) => b.salesMinor - a.salesMinor),
    affiliates: {
      salesMinor: referred.reduce((s, o) => s + (o.totals?.grandTotalMinor ?? 0), 0),
      orders: referred.length,
      ...commission,
    },
    carts: {
      reminded: reminded.length,
      recovered: recoveredOrders.length,
      recoveredMinor: recoveredOrders.reduce((s, o) => s + (o.totals?.grandTotalMinor ?? 0), 0),
    },
    hsn,
    orderRows: orders,
  }
}
