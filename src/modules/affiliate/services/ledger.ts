import type { Payload, PayloadRequest } from 'payload'

import { idOf } from '@/access'
import { categoryAncestors } from '@/modules/promotions'
import { isFeatureEnabled } from '@/modules/tenancy'
import type { Affiliate, Order, Referral } from '@/payload-types'

import { programConfig } from './access'

// The commission ledger (docs/11 "Affiliate commissions"). A referred order gets one row when it
// is confirmed (COD at once, prepaid when paid): pending, with no hold date until it is
// delivered; delivery starts the hold (the return window), and the daily job approves rows whose
// hold has passed. A cancelled order reverses its row; a refund reduces it by the refunded share.
// Rows already paid out are left as they are.

const DAY = 86_400_000

async function findAffiliate(
  req: PayloadRequest,
  tenantId: string,
  where: { id: string } | { code: string },
): Promise<Affiliate | null> {
  const { docs } = await req.payload.find({
    collection: 'affiliates',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        'id' in where ? { id: { equals: where.id } } : { code: { equals: where.code } },
      ],
    },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  return docs[0] ?? null
}

/** Who referred the order: the affiliate's coupon first, else the referral link's cookie. */
export async function attributeOrder(
  req: PayloadRequest,
  tenantId: string,
  order: Order,
): Promise<{ affiliate: Affiliate; via: 'link' | 'coupon' } | null> {
  let found: { affiliate: Affiliate | null; via: 'link' | 'coupon' } | null = null
  const couponRef = (order.appliedOffers ?? []).find((o) => o.kind === 'coupon')?.ref
  if (couponRef) {
    const { docs } = await req.payload.find({
      collection: 'coupons',
      where: { and: [{ tenant: { equals: tenantId } }, { id: { equals: couponRef } }] },
      limit: 1,
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { affiliate: true },
      req,
    })
    const affiliateId = docs[0]?.affiliate
    if (affiliateId) {
      found = { affiliate: await findAffiliate(req, tenantId, { id: affiliateId }), via: 'coupon' }
    }
  }
  const code = order.referral?.code?.trim().toUpperCase()
  if (!found?.affiliate && code) {
    found = { affiliate: await findAffiliate(req, tenantId, { code }), via: 'link' }
  }
  const affiliate = found?.affiliate
  if (!affiliate || affiliate.status !== 'approved') return null
  // An affiliate's own orders never earn commission
  const email = order.contact?.email?.toLowerCase()
  const own =
    (order.customer && order.customer === affiliate.customer) ||
    (email && email === affiliate.email.toLowerCase()) ||
    (order.contact?.phone && order.contact.phone === affiliate.phone)
  return own ? null : { affiliate, via: found!.via }
}

/**
 * The commission on an order: each line's taxable value (after discounts; no delivery, COD fee
 * or GST) at the affiliate's category rate for that line, else their rate; summed, rounded once.
 */
export async function commissionFor(
  payload: Payload,
  tenantId: string,
  affiliate: Pick<Affiliate, 'commissionPercent' | 'categoryRates'>,
  order: Pick<Order, 'items'>,
  defaultPercent: number,
  req?: PayloadRequest,
) {
  const items = order.items ?? []
  const basePercent = affiliate.commissionPercent ?? defaultPercent
  const rates = affiliate.categoryRates ?? []
  let chains = new Map<string, string[]>()
  let productCategories = new Map<string, string[]>()
  if (rates.length) {
    chains = await categoryAncestors(payload, tenantId, req)
    const ids = [...new Set(items.map((i) => i.productId).filter((v): v is string => !!v))]
    const { docs } = await payload.find({
      collection: 'products',
      where: { and: [{ tenant: { equals: tenantId } }, { id: { in: ids } }] },
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { primaryCategory: true, categories: true },
      req,
    })
    productCategories = new Map(
      docs.map((p) => [
        String(p.id),
        [idOf(p.primaryCategory), ...(p.categories ?? []).map(idOf)].filter((v): v is string =>
          Boolean(v),
        ),
      ]),
    )
  }
  let base = 0
  // Paise × basis points, rounded once at the end
  let raw = 0
  let note: string | null = null
  for (const item of items) {
    const taxable = item.taxableMinor ?? 0
    base += taxable
    let percent = basePercent
    if (rates.length && item.productId) {
      const path = (productCategories.get(item.productId) ?? []).flatMap(
        (c) => chains.get(c) ?? [c],
      )
      const match = path.map((c) => rates.find((r) => r.category === c)).find(Boolean)
      if (match) {
        percent = match.percent
        note ??= `${match.categoryName ?? 'Category'} ${match.percent}%`
      }
    }
    raw += taxable * Math.round(percent * 100)
  }
  const commission = Math.round(raw / 10_000)
  return {
    baseMinor: base,
    commissionMinor: commission,
    percent: base ? Math.round((commission / base) * 10_000) / 100 : basePercent,
    note,
  }
}

async function referralOf(req: PayloadRequest, tenantId: string, orderId: string) {
  const { docs } = await req.payload.find({
    collection: 'referrals',
    where: { and: [{ tenant: { equals: tenantId } }, { order: { equals: orderId } }] },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  return docs[0] ?? null
}

/** order.confirmed: records the referral (once), and credits the order to the affiliate. */
export async function recordReferral(
  req: PayloadRequest,
  tenantId: string,
  orderId: string,
): Promise<Referral | null> {
  if (!(await isFeatureEnabled(req.payload, tenantId, 'affiliate'))) return null
  const existing = await referralOf(req, tenantId, orderId)
  if (existing) return existing
  const order = await req.payload.findByID({
    collection: 'orders',
    id: orderId,
    depth: 0,
    overrideAccess: true,
    req,
  })
  if (idOf(order.tenant) !== tenantId) return null
  const found = await attributeOrder(req, tenantId, order)
  if (!found) return null
  const config = await programConfig(req.payload, tenantId, req)
  const amount = await commissionFor(
    req.payload,
    tenantId,
    found.affiliate,
    order,
    config?.defaultCommissionPercent ?? 5,
    req,
  )
  const referral = await req.payload.create({
    collection: 'referrals',
    data: {
      tenant: tenantId,
      affiliate: String(found.affiliate.id),
      order: orderId,
      orderNumber: order.orderNumber,
      orderPlacedAt: order.placedAt,
      via: found.via,
      baseMinor: amount.baseMinor,
      commissionPercent: amount.percent,
      rateNote: amount.note,
      grossMinor: amount.commissionMinor,
      commissionMinor: amount.commissionMinor,
      status: 'pending',
    },
    overrideAccess: true,
    req,
  })
  await req.payload.update({
    collection: 'orders',
    id: orderId,
    data: {
      referral: {
        code: order.referral?.code ?? null,
        affiliate: String(found.affiliate.id),
        via: found.via,
      },
    },
    overrideAccess: true,
    req,
  })
  return referral
}

/** order.delivered: the return window starts; approved once it has passed. */
export async function startHold(req: PayloadRequest, tenantId: string, orderId: string) {
  const referral = await referralOf(req, tenantId, orderId)
  if (!referral || referral.status !== 'pending') return
  const config = await programConfig(req.payload, tenantId, req)
  await req.payload.update({
    collection: 'referrals',
    id: referral.id,
    data: {
      holdUntil: new Date(Date.now() + (config?.holdDays ?? 7) * DAY).toISOString(),
    },
    overrideAccess: true,
    req,
  })
}

/** order.cancelled: nothing is owed on it any more. */
export async function reverseReferral(req: PayloadRequest, tenantId: string, orderId: string) {
  const referral = await referralOf(req, tenantId, orderId)
  if (!referral || (referral.status !== 'pending' && referral.status !== 'approved')) return
  await req.payload.update({
    collection: 'referrals',
    id: referral.id,
    data: {
      status: 'reversed',
      commissionMinor: 0,
      adjustments: [
        ...(referral.adjustments ?? []),
        { reason: 'cancel', amountMinor: referral.commissionMinor, at: new Date().toISOString() },
      ],
    },
    overrideAccess: true,
    req,
  })
}

/** refund.processed: the commission falls by the refunded share of the order. */
export async function adjustForRefund(
  req: PayloadRequest,
  tenantId: string,
  orderId: string,
  refundedMinor: number,
) {
  const referral = await referralOf(req, tenantId, orderId)
  if (!referral || (referral.status !== 'pending' && referral.status !== 'approved')) return
  const order = await req.payload.findByID({
    collection: 'orders',
    id: orderId,
    depth: 0,
    overrideAccess: true,
    req,
  })
  const total = order.totals?.grandTotalMinor ?? 0
  if (!total) return
  const cut = Math.min(
    referral.commissionMinor,
    Math.round((referral.grossMinor * Math.min(refundedMinor, total)) / total),
  )
  if (cut <= 0) return
  const left = referral.commissionMinor - cut
  await req.payload.update({
    collection: 'referrals',
    id: referral.id,
    data: {
      commissionMinor: left,
      ...(left === 0 ? { status: 'reversed' as const } : {}),
      adjustments: [
        ...(referral.adjustments ?? []),
        { reason: 'refund', amountMinor: cut, at: new Date().toISOString() },
      ],
    },
    overrideAccess: true,
    req,
  })
}

/** The daily job: pending rows whose hold has passed become approved. */
export async function approveDueReferrals(req: PayloadRequest, now = new Date()) {
  const { docs } = await req.payload.find({
    collection: 'referrals',
    where: {
      and: [
        { status: { equals: 'pending' } },
        { holdUntil: { less_than_equal: now.toISOString() } },
      ],
    },
    depth: 0,
    limit: 1000,
    pagination: false,
    overrideAccess: true,
    req,
  })
  for (const referral of docs) {
    await req.payload.update({
      collection: 'referrals',
      id: referral.id,
      data: { status: 'approved', approvedAt: now.toISOString() },
      overrideAccess: true,
      req,
    })
  }
  return docs.length
}
