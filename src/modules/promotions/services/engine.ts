import type { Payload } from 'payload'

// The promotions engine (docs/11 "Promotions engine"): live schemes and the coupon, applied on
// the server every time the cart changes and again at checkout. Schemes and coupons arrive with
// stage C; until then nothing is discounted and a typed coupon is refused politely.

export type PromotionLine = {
  key: string
  productId: string
  variantId: string | null
  categoryIds: string[]
  qty: number
  unitMinor: number
}

export type PromotionContext = {
  tenantId: string
  couponCode?: string | null
  paymentMethod?: 'razorpay' | 'cod' | null
  contact?: { email?: string | null; phone?: string | null }
  subtotalMinor: number
  at: Date
}

export type AppliedOffer = {
  kind: 'scheme' | 'coupon'
  ref: string
  code?: string
  name: string
  discountMinor: number
}

export type PromotionsResult = {
  /** Discount per cart line key, GST included */
  lineDiscounts: Record<string, number>
  freeShipping: boolean
  appliedOffers: AppliedOffer[]
  /** Why the typed coupon wasn't applied, for the cart */
  couponProblem: string | null
}

export async function applyPromotions(
  _payload: Payload,
  _lines: readonly PromotionLine[],
  context: PromotionContext,
): Promise<PromotionsResult> {
  return {
    lineDiscounts: {},
    freeShipping: false,
    appliedOffers: [],
    couponProblem: context.couponCode ? 'This code isn’t valid in this store.' : null,
  }
}
