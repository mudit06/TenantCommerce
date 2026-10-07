import type { Payload } from 'payload'

import { isFeatureEnabled } from '@/modules/tenancy'

import {
  computePromotions,
  type AppliedOffer,
  type PromoLine,
  type PromotionsResult,
  type SchemeRule,
} from '../rules'
import { categoryAncestors, checkCoupon, liveSchemeDocs, ordersByContact, schemeRule } from './load'

// The promotions engine (docs/11 "Promotions engine"): live schemes and the coupon, applied on
// the server every time the cart changes and again at checkout, so a scheme that ended a minute
// ago no longer applies. The rules themselves are pure (../rules.ts).

export type PromotionLine = Omit<PromoLine, 'categoryIds'> & { categoryIds: string[] }

export type PromotionContext = {
  tenantId: string
  couponCode?: string | null
  paymentMethod?: 'razorpay' | 'cod' | null
  contact?: { email?: string | null; phone?: string | null }
  subtotalMinor: number
  at: Date
}

export type { AppliedOffer, PromotionsResult }

const NOTHING: PromotionsResult = {
  lineDiscounts: {},
  freeShipping: false,
  appliedOffers: [],
  couponProblem: null,
  coupon: null,
  note: null,
}

/** Live schemes as engine rules, with the store's switch checked on the server (rule 4). */
export async function liveSchemes(
  payload: Payload,
  tenantId: string,
  at: Date,
): Promise<SchemeRule[]> {
  if (!(await isFeatureEnabled(payload, tenantId, 'schemes'))) return []
  return (await liveSchemeDocs(payload, tenantId, at)).map(schemeRule)
}

export async function applyPromotions(
  payload: Payload,
  lines: readonly PromotionLine[],
  context: PromotionContext,
): Promise<PromotionsResult> {
  const typed = context.couponCode?.trim()
  if (!lines.length) {
    return { ...NOTHING, couponProblem: typed ? 'Add something to your cart first.' : null }
  }
  const [schemesOn, couponsOn] = await Promise.all([
    isFeatureEnabled(payload, context.tenantId, 'schemes'),
    isFeatureEnabled(payload, context.tenantId, 'coupons'),
  ])
  let schemes: SchemeRule[] = []
  if (schemesOn) {
    const docs = await liveSchemeDocs(payload, context.tenantId, context.at)
    schemes = docs.map(schemeRule)
    // Orders per shopper, when the scheme has a limit and checkout knows who is buying
    const limited = docs.filter((d) => d.rules?.perCustomerLimit)
    if (limited.length && (context.contact?.email || context.contact?.phone)) {
      const over = new Set<string>()
      for (const doc of limited) {
        const used = await ordersByContact(payload, context.tenantId, context.contact, [
          { 'appliedOffers.ref': { equals: String(doc.id) } },
        ])
        if (used >= (doc.rules?.perCustomerLimit ?? Infinity)) over.add(String(doc.id))
      }
      schemes = schemes.filter((s) => !over.has(s.id))
    }
  }
  const needsTree = schemes.some((s) => s.covers.mode === 'categories')
  const tree = needsTree ? await categoryAncestors(payload, context.tenantId) : null
  const promoLines: PromoLine[] = lines.map((line) => ({
    ...line,
    categoryIds: tree
      ? [...new Set(line.categoryIds.flatMap((id) => tree.get(id) ?? [id]))]
      : line.categoryIds,
  }))
  let couponCheck = null
  if (typed) {
    couponCheck = couponsOn
      ? await checkCoupon(payload, context.tenantId, typed, {
          at: context.at,
          contact: context.contact,
        })
      : ({ ok: false, problem: 'This code isn’t valid in this store.' } as const)
  }
  if (couponCheck?.ok && couponCheck.coupon.covers.mode === 'categories' && !tree) {
    const full = await categoryAncestors(payload, context.tenantId)
    for (const line of promoLines) {
      line.categoryIds = [...new Set(line.categoryIds.flatMap((id) => full.get(id) ?? [id]))]
    }
  }
  return computePromotions(promoLines, schemes, couponCheck, {
    paymentMethod: context.paymentMethod,
  })
}
