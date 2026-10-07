import { describe, expect, it } from 'vitest'

import {
  computePromotions,
  describeScheme,
  normalizeCode,
  pickSchemes,
  schemeUnitPrice,
  type CouponRule,
  type PromoLine,
  type SchemeRule,
} from '@/modules/promotions/rules'

// The promotions engine (docs/11 "Promotions engine"): one scheme per line, the better price
// wins, group offers spread over their lines, caps and minimums, and the coupon against a
// scheme that doesn't combine with coupons.

const all = { mode: 'all' as const, categoryIds: [], productIds: [], excludeProductIds: [] }

const scheme = (overrides: Partial<SchemeRule>): SchemeRule => ({
  id: 's1',
  name: 'Diwali offer',
  badge: 'Diwali offer',
  type: 'percent',
  percent: 10,
  amountMinor: 0,
  tiers: [],
  buyQty: 0,
  getQty: 0,
  getDiscountPercent: 100,
  maxDiscountMinor: null,
  minOrderMinor: null,
  specialPrices: {},
  covers: all,
  combinesWithCoupons: false,
  prepaidOnly: false,
  priority: 0,
  endsAt: '2026-11-09T18:29:00.000Z',
  ...overrides,
})

const coupon = (overrides: Partial<CouponRule>): CouponRule => ({
  id: 'c1',
  code: 'AQUA500',
  type: 'fixed',
  percent: 0,
  amountMinor: 50_000,
  maxDiscountMinor: null,
  minOrderMinor: null,
  covers: all,
  paymentMethods: [],
  affiliateId: null,
  ...overrides,
})

const tap: PromoLine = {
  key: 'tap',
  productId: 'p-tap',
  variantId: 'v-chrome',
  categoryIds: ['faucets', 'bathroom'],
  qty: 1,
  unitMinor: 425_000,
}
const shower: PromoLine = {
  key: 'shower',
  productId: 'p-shower',
  variantId: null,
  categoryIds: ['showers', 'bathroom'],
  qty: 1,
  unitMinor: 269_000,
}
const towel: PromoLine = {
  key: 'towel',
  productId: 'p-towel',
  variantId: null,
  categoryIds: ['accessories'],
  qty: 3,
  unitMinor: 50_000,
}

describe('schemes', () => {
  it('takes 10% off covered lines, capped per order and only above the minimum', () => {
    const diwali = scheme({
      maxDiscountMinor: 150_000,
      minOrderMinor: 300_000,
      covers: { ...all, mode: 'categories', categoryIds: ['faucets', 'showers'] },
    })
    const pick = pickSchemes([diwali], [tap, shower, towel], {})
    // 10% of 4,250 + 2,690 = ₹694, below the ₹1,500 cap; the towel isn't covered
    expect(pick.lineDiscounts).toEqual({ tap: 42_500, shower: 26_900 })
    expect(pick.applied).toEqual([
      { kind: 'scheme', ref: 's1', name: 'Diwali offer', discountMinor: 69_400 },
    ])
    expect(pickSchemes([diwali], [shower], {}).applied).toEqual([])
    const capped = pickSchemes(
      [scheme({ percent: 50, maxDiscountMinor: 150_000 })],
      [tap, shower],
      {},
    )
    expect(Object.values(capped.lineDiscounts).reduce((a, b) => a + b, 0)).toBe(150_000)
  })

  it('gives each line the better price, never two schemes at once', () => {
    const tenOff = scheme({ id: 'ten', percent: 10 })
    const launch = scheme({
      id: 'launch',
      name: 'Rainline launch',
      type: 'special-price',
      specialPrices: { 'p-shower': 229_000 },
    })
    const pick = pickSchemes([tenOff, launch], [tap, shower], {})
    // Shower: ₹400 off from the launch price beats 10% (₹269)
    expect(pick.lineDiscounts).toEqual({ tap: 42_500, shower: 40_000 })
    expect(pick.applied.map((a) => a.ref).sort()).toEqual(['launch', 'ten'])
  })

  it('reaches a spend tier only with the lines it covers, and spreads the amount', () => {
    const wedding = scheme({
      type: 'tiered',
      tiers: [
        { minOrderMinor: 500_000, discountMinor: 50_000 },
        { minOrderMinor: 1_000_000, discountMinor: 120_000 },
      ],
    })
    const pick = pickSchemes([wedding], [tap, shower], {})
    expect(Object.values(pick.lineDiscounts).reduce((a, b) => a + b, 0)).toBe(50_000)
    expect(pick.lineDiscounts.tap).toBeGreaterThan(pick.lineDiscounts.shower!)
    expect(pickSchemes([wedding], [shower], {}).applied).toEqual([])
  })

  it('makes the cheapest units free in buy 2 get 1, per full group', () => {
    const holi = scheme({ type: 'buy-x-get-y', buyQty: 2, getQty: 1, getDiscountPercent: 100 })
    expect(pickSchemes([holi], [towel], {}).lineDiscounts).toEqual({ towel: 50_000 })
    expect(pickSchemes([holi], [{ ...towel, qty: 2 }], {}).applied).toEqual([])
    // 3 towels + tap: the group is tap, towel, towel → one towel free
    expect(pickSchemes([holi], [tap, towel], {}).lineDiscounts).toEqual({ towel: 50_000 })
  })

  it('takes a flat amount off each piece, never below zero', () => {
    const flat = scheme({ type: 'fixed', amountMinor: 70_000 })
    expect(pickSchemes([flat], [towel], {}).lineDiscounts).toEqual({ towel: 150_000 })
  })

  it('leaves prepaid-only schemes out of cash on delivery orders', () => {
    const prepaid = scheme({ prepaidOnly: true })
    expect(pickSchemes([prepaid], [tap], { paymentMethod: 'cod' }).applied).toEqual([])
    expect(pickSchemes([prepaid], [tap], { paymentMethod: 'razorpay' }).applied).toHaveLength(1)
  })

  it('leaves out excluded products', () => {
    const s = scheme({ covers: { ...all, excludeProductIds: ['p-tap'] } })
    expect(pickSchemes([s], [tap, shower], {}).lineDiscounts).toEqual({ shower: 26_900 })
  })

  it('makes delivery free above the minimum', () => {
    const free = scheme({ type: 'free-shipping', minOrderMinor: 500_000 })
    expect(computePromotions([tap, shower], [free], null, {}).freeShipping).toBe(true)
    expect(computePromotions([shower], [free], null, {}).freeShipping).toBe(false)
  })

  it('shows one piece’s offer price on cards, and the offer in words', () => {
    const launch = scheme({ type: 'special-price', specialPrices: { 'v-chrome': 382_500 } })
    expect(schemeUnitPrice([launch], tap)?.priceMinor).toBe(382_500)
    expect(schemeUnitPrice([scheme({ type: 'tiered' })], tap)).toBeNull()
    expect(describeScheme(scheme({ maxDiscountMinor: 150_000, minOrderMinor: 300_000 }))).toBe(
      '10% off, up to ₹1,500, orders above ₹3,000',
    )
    expect(describeScheme(scheme({ type: 'buy-x-get-y', buyQty: 2, getQty: 1 }))).toBe(
      'Buy 2, get 1 free',
    )
  })
})

describe('coupons', () => {
  it('takes the coupon off after schemes when they combine', () => {
    const result = computePromotions(
      [tap, shower],
      [scheme({ combinesWithCoupons: true })],
      { ok: true, coupon: coupon({}) },
      {},
    )
    expect(result.appliedOffers.map((o) => [o.kind, o.discountMinor])).toEqual([
      ['scheme', 69_400],
      ['coupon', 50_000],
    ])
    expect(Object.values(result.lineDiscounts).reduce((a, b) => a + b, 0)).toBe(119_400)
    expect(result.coupon).toEqual({ id: 'c1', code: 'AQUA500', affiliateId: null })
  })

  it('keeps whichever saves more when a scheme doesn’t combine with coupons', () => {
    const small = computePromotions(
      [tap, shower],
      [scheme({})],
      { ok: true, coupon: coupon({}) },
      {},
    )
    // Coupon ₹500 < scheme ₹694: the scheme stays, the cart says why
    expect(small.coupon).toBeNull()
    expect(small.couponProblem).toBe(
      'AQUA500 can’t be used with Diwali offer. Diwali offer saves you more, so we kept it.',
    )
    const big = computePromotions(
      [tap, shower],
      [scheme({})],
      { ok: true, coupon: coupon({ amountMinor: 100_000 }) },
      {},
    )
    expect(big.coupon?.code).toBe('AQUA500')
    expect(big.appliedOffers.map((o) => o.kind)).toEqual(['coupon'])
    expect(big.note).toMatch(/saves you more than Diwali offer/)
  })

  it('checks the minimum on the subtotal after schemes, and the payment method', () => {
    const min = computePromotions(
      [shower],
      [],
      { ok: true, coupon: coupon({ minOrderMinor: 300_000 }) },
      {},
    )
    expect(min.couponProblem).toBe('Add ₹310 more to use AQUA500.')
    const prepaid = computePromotions(
      [tap],
      [],
      { ok: true, coupon: coupon({ code: 'PREPAID5', paymentMethods: ['razorpay'] }) },
      { paymentMethod: 'cod' },
    )
    expect(prepaid.couponProblem).toBe('PREPAID5 is for orders paid online.')
  })

  it('caps a percent coupon and passes on why a code was refused', () => {
    const result = computePromotions(
      [tap, shower],
      [],
      { ok: true, coupon: coupon({ type: 'percent', percent: 10, maxDiscountMinor: 50_000 }) },
      {},
    )
    expect(result.appliedOffers[0]!.discountMinor).toBe(50_000)
    expect(
      computePromotions([tap], [], { ok: false, problem: 'This code has expired.' }, {})
        .couponProblem,
    ).toBe('This code has expired.')
    expect(normalizeCode(' aqua 500 ')).toBe('AQUA500')
  })
})
