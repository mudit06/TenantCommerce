import type { Payload, PayloadRequest, Where } from 'payload'

import { idOf } from '@/access'
import { formatDate } from '@/lib/dates'
import type { Coupon, Scheme } from '@/payload-types'

import {
  normalizeCode,
  type CouponCheck,
  type CouponRule,
  type Coverage,
  type SchemeRule,
} from '../rules'

// Reads the promotions the engine works with: live schemes, the typed coupon with its limits,
// and the category tree that decides what "covers Faucets" means. Every query is scoped to
// the store.

const ids = (list: unknown): string[] =>
  (Array.isArray(list) ? list : [])
    .map((item) => idOf(item))
    .filter((id): id is string => Boolean(id))

export function schemeRule(doc: Scheme): SchemeRule {
  const offer = doc.offer ?? {}
  const specialPrices: Record<string, number> = {}
  const specialByProduct: Record<string, number> = {}
  for (const row of offer.specialPrices ?? []) {
    const key = idOf(row.variant) ?? idOf(row.product)
    const product = idOf(row.product)
    if (!key || typeof row.priceMinor !== 'number') continue
    specialPrices[key] = row.priceMinor
    if (product)
      specialByProduct[product] = Math.min(specialByProduct[product] ?? Infinity, row.priceMinor)
  }
  return {
    id: String(doc.id),
    name: doc.name,
    badge: doc.display?.badgeText || null,
    type: (offer.type ?? 'percent') as SchemeRule['type'],
    percent: offer.percent ?? 0,
    amountMinor: offer.amountMinor ?? 0,
    tiers: (offer.tiers ?? []).map((t) => ({
      minOrderMinor: t.minOrderMinor ?? 0,
      discountMinor: t.discountMinor ?? 0,
    })),
    buyQty: offer.buyQty ?? 0,
    getQty: offer.getQty ?? 0,
    getDiscountPercent: offer.getDiscountPercent ?? 100,
    maxDiscountMinor: offer.maxDiscountMinor ?? null,
    minOrderMinor: offer.minOrderMinor ?? null,
    specialPrices,
    specialByProduct,
    covers: coverageOf(doc.appliesTo),
    combinesWithCoupons: Boolean(doc.rules?.combinesWithCoupons),
    prepaidOnly: Boolean(doc.rules?.prepaidOnly),
    priority: doc.rules?.priority ?? 0,
    endsAt: doc.endsAt,
  }
}

function coverageOf(
  appliesTo:
    | {
        mode?: string | null
        categories?: unknown
        products?: unknown
        excludeProducts?: unknown
      }
    | null
    | undefined,
): Coverage {
  const mode =
    appliesTo?.mode === 'categories' || appliesTo?.mode === 'products' ? appliesTo.mode : 'all'
  return {
    mode,
    categoryIds: ids(appliesTo?.categories),
    productIds: ids(appliesTo?.products),
    excludeProductIds: ids(appliesTo?.excludeProducts),
  }
}

export function couponRule(doc: Coupon): CouponRule {
  return {
    id: String(doc.id),
    code: doc.code,
    type: doc.type,
    percent: doc.percent ?? 0,
    amountMinor: doc.amountMinor ?? 0,
    maxDiscountMinor: doc.maxDiscountMinor ?? null,
    minOrderMinor: doc.minOrderMinor ?? null,
    covers: coverageOf({
      mode: doc.appliesTo?.mode,
      categories: doc.appliesTo?.categories,
      products: doc.appliesTo?.products,
    }),
    paymentMethods: doc.paymentMethods ?? [],
    affiliateId: doc.affiliate ?? null,
  }
}

/** Schemes running at `at`: scheduled or live, inside their dates, not paused. */
export async function liveSchemeDocs(
  payload: Payload,
  tenantId: string,
  at: Date,
  req?: PayloadRequest,
): Promise<Scheme[]> {
  const { docs } = await payload.find({
    collection: 'schemes',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { status: { in: ['scheduled', 'live'] } },
        { startsAt: { less_than_equal: at.toISOString() } },
        { endsAt: { greater_than: at.toISOString() } },
      ],
    },
    depth: 0,
    limit: 100,
    pagination: false,
    overrideAccess: true,
    req,
  })
  return docs
}

/** Each category with the ones above it, so a scheme on "Bathroom" covers its subcategories. */
export async function categoryAncestors(
  payload: Payload,
  tenantId: string,
  req?: PayloadRequest,
): Promise<Map<string, string[]>> {
  const { docs } = await payload.find({
    collection: 'categories',
    where: { tenant: { equals: tenantId } },
    depth: 0,
    limit: 2000,
    pagination: false,
    overrideAccess: true,
    select: { parent: true },
    req,
  })
  const parentOf = new Map(docs.map((c) => [String(c.id), idOf(c.parent)]))
  const out = new Map<string, string[]>()
  for (const id of parentOf.keys()) {
    const chain: string[] = []
    let current: string | null | undefined = id
    while (current && !chain.includes(current) && chain.length < 10) {
      chain.push(current)
      current = parentOf.get(current)
    }
    out.set(id, chain)
  }
  return out
}

const contactWhere = (
  contact: { email?: string | null; phone?: string | null },
  prefix = 'contact.',
): Where[] =>
  [
    ...(contact.email ? [{ [`${prefix}email`]: { equals: contact.email.toLowerCase() } }] : []),
    ...(contact.phone ? [{ [`${prefix}phone`]: { equals: contact.phone } }] : []),
  ] as Where[]

/** Orders placed by this phone or email that still count (not unpaid, not cancelled). */
export async function ordersByContact(
  payload: Payload,
  tenantId: string,
  contact: { email?: string | null; phone?: string | null },
  extra: Where[] = [],
  req?: PayloadRequest,
): Promise<number> {
  const or = contactWhere(contact)
  if (!or.length) return 0
  const { totalDocs } = await payload.count({
    collection: 'orders',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { or },
        { status: { not_in: ['pending', 'cancelled'] } },
        ...extra,
      ],
    },
    overrideAccess: true,
    req,
  })
  return totalDocs
}

/**
 * The typed coupon and whether it can be used now by this shopper (docs/11 step 2). The
 * minimum order and the payment method are checked by the engine, after scheme discounts.
 */
export async function checkCoupon(
  payload: Payload,
  tenantId: string,
  code: string,
  {
    at,
    contact,
    excludeOrderId,
    req,
  }: {
    at: Date
    contact?: { email?: string | null; phone?: string | null }
    excludeOrderId?: string
    req?: PayloadRequest
  },
): Promise<CouponCheck> {
  const normalized = normalizeCode(code)
  const invalid: CouponCheck = { ok: false, problem: 'This code isn’t valid in this store.' }
  if (!normalized || normalized.length > 40) return invalid
  const { docs } = await payload.find({
    collection: 'coupons',
    where: {
      and: [{ tenant: { equals: tenantId } }, { codeNormalized: { equals: normalized } }],
    },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  const coupon = docs[0]
  if (!coupon) return invalid
  if (coupon.status === 'paused')
    return { ok: false, problem: `${coupon.code} isn’t active right now.` }
  if (coupon.startsAt && new Date(coupon.startsAt) > at) {
    return { ok: false, problem: `${coupon.code} starts on ${formatDate(coupon.startsAt)}.` }
  }
  if (coupon.status === 'expired' || (coupon.endsAt && new Date(coupon.endsAt) <= at)) {
    return { ok: false, problem: `${coupon.code} has expired.` }
  }
  if (coupon.usageLimit && (coupon.usedCount ?? 0) >= coupon.usageLimit) {
    return { ok: false, problem: `${coupon.code} has been fully used.` }
  }
  const who = contactWhere(contact ?? {})
  if (who.length && coupon.perCustomerLimit) {
    const { totalDocs } = await payload.count({
      collection: 'coupon-redemptions',
      where: {
        and: [
          { tenant: { equals: tenantId } },
          { coupon: { equals: String(coupon.id) } },
          { status: { in: ['held', 'used'] } },
          { or: who },
          ...(excludeOrderId ? [{ order: { not_equals: excludeOrderId } }] : []),
        ],
      },
      overrideAccess: true,
      req,
    })
    if (totalDocs >= coupon.perCustomerLimit) {
      return {
        ok: false,
        problem:
          coupon.perCustomerLimit === 1
            ? `You have already used ${coupon.code}.`
            : `You have already used ${coupon.code} ${coupon.perCustomerLimit} times.`,
      }
    }
  }
  if (coupon.firstOrderOnly && who.length) {
    const earlier = await ordersByContact(
      payload,
      tenantId,
      contact ?? {},
      excludeOrderId ? [{ id: { not_equals: excludeOrderId } }] : [],
      req,
    )
    if (earlier > 0) return { ok: false, problem: `${coupon.code} is for a first order only.` }
  }
  return { ok: true, coupon: couponRule(coupon) }
}
