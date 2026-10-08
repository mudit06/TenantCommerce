import type { Payload, PayloadRequest } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { withTransaction } from '@/lib/db/transaction'
import {
  applyAsAffiliate,
  approveDueReferrals,
  payoutPreview,
  recordPayout,
} from '@/modules/affiliate'
import { assertAffiliateAccess } from '@/modules/affiliate/services/access'
import { savePayoutDetails } from '@/modules/affiliate/services/details'
import {
  linkCoupon,
  saveProgram,
  saveRates,
  setAffiliateStatus,
} from '@/modules/affiliate/services/program'
import { saveCodRules } from '@/modules/content'
import { saveCoupon } from '@/modules/promotions/services/coupons'
import { cancelOrder, moveParcel, packParcel, placeOrder, placeOrderSchema } from '@/modules/orders'
import { setFeature } from '@/modules/tenancy'
import type { Affiliate, Plan } from '@/payload-types'

import {
  createPlatformUser,
  reqAs,
  seedPlans,
  startPayload,
  stopPayload,
  type TestUser,
} from './helpers'
import { buildShop, sampleOrderInput, type Shop } from './shop'

// Affiliates (docs/11 "Affiliate commissions", docs/screens Affiliates): the referral link or the
// affiliate's coupon credits an order, never their own; commission on the goods value before GST
// at their rate or a category rate; pending until delivered and the hold has passed; cancelled
// orders reverse it; the owner records payouts with TDS once the year passes ₹20,000.

let payload: Payload
let plans: Record<string, Plan>
let admin: TestUser
let shop: Shop
let affiliate: Affiliate

const asOwner = async <T>(fn: (req: PayloadRequest) => Promise<T>) => {
  const req = await reqAs(payload, shop.owner)
  return withTransaction(req, () => fn(req))
}
const asSystem = async <T>(fn: (req: PayloadRequest) => Promise<T>) => {
  const req = await reqAs(payload)
  return withTransaction(req, () => fn(req))
}

const order = async (
  overrides: Record<string, unknown> = {},
  meta: { ref?: string } = {},
  qty = 1,
) => {
  const input = placeOrderSchema.parse(sampleOrderInput({ paymentMethod: 'cod', ...overrides }))
  const { order: placed } = await asSystem((req) =>
    placeOrder(req, shop.tenantId, {
      lines: [{ productId: shop.towel, qty }],
      input,
      live: null,
      meta,
    }),
  )
  return placed
}

const referralOf = async (orderId: string | number) =>
  (
    await payload.find({
      collection: 'referrals',
      where: { order: { equals: String(orderId) } },
      overrideAccess: true,
    })
  ).docs[0]

beforeAll(async () => {
  payload = await startPayload()
  plans = await seedPlans(payload)
  admin = await createPlatformUser(payload, 'admin@platform.test', 'super-admin')
  shop = await buildShop(payload, {
    admin,
    plan: plans.enterprise!,
    slug: 'aff-a',
    ownerEmail: 'a@aff.test',
  })
  const req = await reqAs(payload, admin)
  await withTransaction(req, () =>
    setFeature(req, { tenantId: shop.tenantId, key: 'affiliate', enabled: true }),
  )
  await asOwner((r) =>
    saveCodRules(r, {
      tenantId: shop.tenantId,
      codEnabled: true,
      codMinOrderMinor: null,
      codMaxOrderMinor: null,
      codFeeMinor: null,
    }),
  )
})

afterAll(async () => {
  await stopPayload(payload)
})

describe('applications', () => {
  it('takes an application from a store account and approves it with a code', async () => {
    affiliate = await asSystem((req) =>
      applyAsAffiliate(
        req,
        shop.tenantId,
        { id: '0123456789abcdef01234567', email: 'Riya@Example.com' },
        {
          name: 'Riya Sharma',
          phone: '98765 12455',
          promotesOn: 'instagram',
          profileUrl: 'instagram.com/riya.homes',
          pan: 'abcps1234k',
          acceptTerms: true,
        },
      ),
    )
    expect(affiliate).toMatchObject({
      status: 'applied',
      code: 'RIYA',
      email: 'riya@example.com',
      phone: '+919876512455',
      panMasked: 'ABCPS••••K',
    })
    // The PAN is stored encrypted, never as typed
    expect(affiliate.panSealed).not.toContain('ABCPS1234K')
    await expect(
      asSystem((req) =>
        applyAsAffiliate(
          req,
          shop.tenantId,
          { id: '0123456789abcdef01234567', email: 'riya@example.com' },
          { name: 'Riya', phone: '9876512455', promotesOn: 'other', acceptTerms: true },
        ),
      ),
    ).rejects.toThrow('already applied')

    affiliate = await asOwner((req) =>
      setAffiliateStatus(req, shop.tenantId, String(affiliate.id), { action: 'approve' }),
    )
    expect(affiliate).toMatchObject({ status: 'approved', commissionPercent: 5 })
    const { docs: mails } = await payload.find({
      collection: 'notification-logs',
      where: { and: [{ to: { equals: 'riya@example.com' } }, { kind: { equals: 'affiliate' } }] },
      overrideAccess: true,
    })
    expect(JSON.parse(mails[0]!.text!).email.paragraphs.join(' ')).toMatch(/\/r\/RIYA/)
  })
})

describe('commission', () => {
  let delivered: string

  it('credits the link’s affiliate 5% of the goods value before GST, never their own orders', async () => {
    // The towel is ₹1,050 with 5% GST: ₹1,000 taxable, ₹50 commission
    const referred = await order({}, { ref: 'riya' })
    const row = await referralOf(referred.id)
    expect(row).toMatchObject({
      affiliate: String(affiliate.id),
      via: 'link',
      baseMinor: 1_00_000,
      grossMinor: 5_000,
      commissionMinor: 5_000,
      status: 'pending',
    })
    expect(row!.holdUntil).toBeFalsy()
    const saved = await payload.findByID({
      collection: 'orders',
      id: referred.id,
      overrideAccess: true,
    })
    expect(saved.referral).toMatchObject({ affiliate: String(affiliate.id), via: 'link' })
    delivered = String(referred.id)

    const own = await order(
      { contact: { name: 'Riya Sharma', email: 'riya@example.com', phone: '+91 98111 22334' } },
      { ref: 'RIYA' },
    )
    expect(await referralOf(own.id)).toBeUndefined()
    expect(await referralOf((await order({}, { ref: 'NOBODY' })).id)).toBeUndefined()
  })

  it('uses a category rate, and the affiliate’s coupon credits them without a link', async () => {
    const { docs: categories } = await payload.find({
      collection: 'categories',
      where: { tenant: { equals: shop.tenantId } },
      overrideAccess: true,
    })
    await asOwner((req) =>
      saveRates(req, shop.tenantId, String(affiliate.id), {
        commissionPercent: 5,
        categoryRates: [{ category: String(categories[0]!.id), percent: 8 }],
      }),
    )
    const coupon = await payload.create({
      collection: 'coupons',
      data: {
        tenant: shop.tenantId,
        code: 'RIYA10',
        codeNormalized: 'RIYA10',
        type: 'percent',
        percent: 10,
        status: 'active',
      },
      overrideAccess: true,
    })
    await asOwner((req) => linkCoupon(req, shop.tenantId, String(affiliate.id), String(coupon.id)))
    // Editing the coupon keeps its affiliate link
    await asOwner((req) =>
      saveCoupon(
        req,
        shop.tenantId,
        { code: 'RIYA10', type: 'percent', percent: 10, appliesTo: { mode: 'all' } },
        String(coupon.id),
      ),
    )
    const edited = await payload.findByID({
      collection: 'coupons',
      id: coupon.id,
      overrideAccess: true,
    })
    expect(edited.affiliate).toBe(String(affiliate.id))
    const withCode = await order({ couponCode: 'RIYA10' })
    const row = await referralOf(withCode.id)
    // 10% off: ₹900 taxable at the category's 8%
    expect(row).toMatchObject({ via: 'coupon', baseMinor: 90_000, commissionMinor: 7_200 })
    expect(row!.rateNote).toMatch(/8%/)
  })

  it('holds until the return window closes after delivery, and a cancel reverses it', async () => {
    const parcel = await asOwner((req) => packParcel(req, delivered))
    await asOwner((req) =>
      moveParcel(req, String(parcel.id), {
        to: 'shipped',
        carrier: 'Delhivery',
        trackingNumber: 'AWB9',
      }),
    )
    await asOwner((req) => moveParcel(req, String(parcel.id), { to: 'delivered' }))
    const held = await referralOf(delivered)
    expect(held!.holdUntil).toBeTruthy()
    const req = await reqAs(payload)
    expect(await approveDueReferrals(req)).toBe(0)
    expect(await approveDueReferrals(req, new Date(Date.now() + 8 * 86_400_000))).toBe(1)
    expect((await referralOf(delivered))!.status).toBe('approved')

    const cancelled = await order({}, { ref: 'RIYA' })
    await asOwner((r) => cancelOrder(r, String(cancelled.id), { reason: 'Shopper asked' }))
    expect(await referralOf(cancelled.id)).toMatchObject({ status: 'reversed', commissionMinor: 0 })
  })
})

describe('payouts', () => {
  it('lets only the owner record a payout, above the minimum, and marks the commission paid', async () => {
    // Our team, outside a "Manage store" session, can't record a store's payout
    const platform = await reqAs(payload, admin)
    await expect(assertAffiliateAccess(platform, shop.tenantId, 'payout')).rejects.toThrow(
      'Only the store owner',
    )
    await expect(
      asOwner((req) =>
        recordPayout(req, shop.tenantId, String(affiliate.id), {
          paidOn: '2026-10-08',
          method: 'upi',
          reference: '402155557731',
        }),
      ),
    ).rejects.toThrow(/minimum payout/)
    await asOwner((req) =>
      saveProgram(req, shop.tenantId, {
        defaultCommissionPercent: 5,
        cookieDays: 30,
        holdDays: 7,
        minPayoutMinor: 0,
        autoApproveApplications: false,
        termsPath: 'pages/affiliate-terms',
      }),
    )
    await asSystem((req) =>
      savePayoutDetails(req, shop.tenantId, affiliate, {
        payout: { method: 'upi', upiId: 'riya.s@okaxis' },
      }),
    )
    const fresh = await payload.findByID({
      collection: 'affiliates',
      id: affiliate.id,
      overrideAccess: true,
    })
    expect(fresh.payoutMasked).toBe('UPI ri••••@okaxis')
    const preview = await payoutPreview(payload, shop.tenantId, fresh)
    expect(preview).toMatchObject({ grossMinor: 5_000, tdsMinor: 0, netMinor: 5_000 })

    const payout = await asOwner((req) =>
      recordPayout(req, shop.tenantId, String(affiliate.id), {
        paidOn: '2026-10-08',
        method: 'upi',
        reference: '402155557731',
      }),
    )
    expect(payout).toMatchObject({ number: 'PAY/26-27/0001', netMinor: 5_000, tdsMinor: 0 })
    const paid = await payload.findByID({
      collection: 'referrals',
      id: payout.referrals![0]!,
      overrideAccess: true,
    })
    expect(paid).toMatchObject({ status: 'paid', payout: String(payout.id) })
    const { docs: audit } = await payload.find({
      collection: 'audit-logs',
      where: { action: { equals: 'affiliate_payout' } },
      overrideAccess: true,
    })
    expect(audit).toHaveLength(1)
    expect(JSON.stringify(audit[0])).not.toContain('okaxis')
  })
})
