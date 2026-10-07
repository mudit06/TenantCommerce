import type { Payload, PayloadRequest } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { withTransaction } from '@/lib/db/transaction'
import { saveCodRules } from '@/modules/content'
import { cancelOrder, placeOrder, placeOrderSchema, quoteCheckout } from '@/modules/orders'
import { switchSchemesTask } from '@/modules/promotions'
import { saveCoupon, makeBulkCodes } from '@/modules/promotions/services/coupons'
import {
  changeSchemeStatus,
  createFromOccasion,
  previewScheme,
} from '@/modules/promotions/services/schemes'
import { setFeature } from '@/modules/tenancy'
import type { Order, Plan } from '@/payload-types'

import {
  createPlatformUser,
  reqAs,
  seedPlans,
  startPayload,
  stopPayload,
  type TestUser,
} from './helpers'
import { buildShop, sampleOrderInput, type Shop } from './shop'

// Schemes and coupons through checkout (docs/11 "Promotions engine"): a live scheme prices the
// cart, a scheduled one doesn't yet, the coupon's limits hold under the order's transaction,
// a cancelled order gives its use back, and one store's codes don't work in another.

let payload: Payload
let plans: Record<string, Plan>
let admin: TestUser
let shopA: Shop
let shopB: Shop

const asOwner = async <T>(shop: Shop, fn: (req: PayloadRequest) => Promise<T>) => {
  const req = await reqAs(payload, shop.owner)
  return withTransaction(req, () => fn(req))
}

const towelLine = (shop: Shop, qty = 1) => [{ productId: shop.towel, qty }]
const tapLine = (shop: Shop, qty = 1) => [{ productId: shop.tap, variantId: shop.chrome, qty }]

async function place(
  shop: Shop,
  lines: { productId: string; variantId?: string; qty: number }[],
  overrides: Record<string, unknown> = {},
): Promise<Order> {
  const req = await reqAs(payload)
  const input = placeOrderSchema.parse(sampleOrderInput({ paymentMethod: 'cod', ...overrides }))
  return (
    await withTransaction(req, () => placeOrder(req, shop.tenantId, { lines, input, live: null }))
  ).order
}

async function liveScheme(shop: Shop, data: Record<string, unknown>) {
  const scheme = await asOwner(shop, (req) => createFromOccasion(req, shop.tenantId, 'diwali'))
  await payload.update({
    collection: 'schemes',
    id: scheme.id,
    data: {
      startsAt: new Date(Date.now() - 60_000).toISOString(),
      endsAt: new Date(Date.now() + 86_400_000).toISOString(),
      ...data,
    },
    overrideAccess: true,
  })
  await asOwner(shop, (req) =>
    changeSchemeStatus(req, shop.tenantId, String(scheme.id), 'schedule'),
  )
  return scheme
}

beforeAll(async () => {
  payload = await startPayload()
  plans = await seedPlans(payload)
  admin = await createPlatformUser(payload, 'admin@platform.test', 'super-admin')
  shopA = await buildShop(payload, {
    admin,
    plan: plans.starter!,
    slug: 'promo-a',
    ownerEmail: 'a@promo.test',
  })
  shopB = await buildShop(payload, {
    admin,
    plan: plans.starter!,
    slug: 'promo-b',
    ownerEmail: 'b@promo.test',
  })
  for (const shop of [shopA, shopB]) {
    await asOwner(shop, (req) =>
      saveCodRules(req, {
        tenantId: shop.tenantId,
        codEnabled: true,
        codMinOrderMinor: null,
        codMaxOrderMinor: null,
        codFeeMinor: null,
      }),
    )
  }
})

afterAll(async () => {
  await stopPayload(payload)
})

describe('schemes', () => {
  it('prices the cart with a live scheme and stores it on the order', async () => {
    const scheme = await liveScheme(shopA, {
      name: 'Diwali 2026',
      offer: { type: 'percent', percent: 10 },
      appliesTo: { mode: 'all' },
    })
    const fresh = await payload.findByID({
      collection: 'schemes',
      id: scheme.id,
      overrideAccess: true,
    })
    expect(fresh.status).toBe('live')
    const quote = await quoteCheckout(payload, shopA.tenantId, { lines: tapLine(shopA) })
    // ₹5,190 tap: 10% off
    expect(quote.promotions.lineDiscounts[`${shopA.tap}:${shopA.chrome}`]).toBe(51_900)
    const order = await place(shopA, tapLine(shopA))
    expect(order.appliedOffers?.map((o) => [o.kind, o.name, o.discountMinor])).toEqual([
      ['scheme', 'Diwali 2026', 51_900],
    ])
    expect(order.items?.[0]?.discountMinor).toBe(51_900)
    const preview = await asOwner(shopA, (req) =>
      previewScheme(req, shopA.tenantId, String(scheme.id)),
    )
    expect(preview.cart?.discountMinor).toBeGreaterThan(0)
    // Ended: the next cart pays full price
    await asOwner(shopA, (req) => changeSchemeStatus(req, shopA.tenantId, String(scheme.id), 'end'))
    const after = await quoteCheckout(payload, shopA.tenantId, { lines: tapLine(shopA) })
    expect(after.promotions.appliedOffers).toEqual([])
  })

  it('waits for the start, and the job moves it along its dates', async () => {
    const scheme = await asOwner(shopA, (req) => createFromOccasion(req, shopA.tenantId, 'holi'))
    await payload.update({
      collection: 'schemes',
      id: scheme.id,
      data: {
        startsAt: new Date(Date.now() + 3_600_000).toISOString(),
        endsAt: new Date(Date.now() + 7_200_000).toISOString(),
        offer: { type: 'percent', percent: 20 },
      },
      overrideAccess: true,
    })
    await asOwner(shopA, (req) =>
      changeSchemeStatus(req, shopA.tenantId, String(scheme.id), 'schedule'),
    )
    expect(
      (await quoteCheckout(payload, shopA.tenantId, { lines: towelLine(shopA) })).promotions
        .appliedOffers,
    ).toEqual([])
    // Starts now: the job turns it live
    await payload.update({
      collection: 'schemes',
      id: scheme.id,
      data: { startsAt: new Date(Date.now() - 1000).toISOString() },
      overrideAccess: true,
    })
    const req = await reqAs(payload)
    // The task's handler, run by hand (tests don't run the job queue)
    const run = switchSchemesTask.handler as (args: { req: PayloadRequest }) => Promise<unknown>
    await run({ req })
    const live = await payload.findByID({
      collection: 'schemes',
      id: scheme.id,
      overrideAccess: true,
    })
    expect(live.status).toBe('live')
    await asOwner(shopA, (r) => changeSchemeStatus(r, shopA.tenantId, String(scheme.id), 'end'))
  })

  it('keeps a switched-off store’s schemes off the cart', async () => {
    await liveScheme(shopB, { offer: { type: 'percent', percent: 15 }, appliesTo: { mode: 'all' } })
    expect(
      (await quoteCheckout(payload, shopB.tenantId, { lines: towelLine(shopB) })).promotions
        .appliedOffers,
    ).toHaveLength(1)
    const req = await reqAs(payload, admin)
    await withTransaction(req, () =>
      setFeature(req, { tenantId: shopB.tenantId, key: 'schemes', enabled: false }),
    )
    expect(
      (await quoteCheckout(payload, shopB.tenantId, { lines: towelLine(shopB) })).promotions
        .appliedOffers,
    ).toEqual([])
    await withTransaction(req, () =>
      setFeature(req, { tenantId: shopB.tenantId, key: 'schemes', enabled: true }),
    )
  })
})

describe('coupons', () => {
  it('applies a code in any case and counts its use when the order is placed', async () => {
    const coupon = await asOwner(shopA, (req) =>
      saveCoupon(req, shopA.tenantId, {
        code: 'Towel100',
        type: 'fixed',
        amountMinor: 10_000,
        usageLimit: 2,
      }),
    )
    const quote = await quoteCheckout(payload, shopA.tenantId, {
      lines: towelLine(shopA),
      couponCode: ' towel100 ',
    })
    expect(quote.promotions.coupon?.code).toBe('Towel100')
    const order = await place(shopA, towelLine(shopA), { couponCode: 'towel100' })
    expect(order.appliedOffers?.find((o) => o.kind === 'coupon')?.discountMinor).toBe(10_000)
    const used = await payload.findByID({
      collection: 'coupons',
      id: coupon.id,
      overrideAccess: true,
    })
    expect(used.usedCount).toBe(1)
    const { docs: rows } = await payload.find({
      collection: 'coupon-redemptions',
      where: { order: { equals: String(order.id) } },
      overrideAccess: true,
    })
    expect(rows.map((r) => r.status)).toEqual(['used'])
    // Once per shopper by default: the same phone can't use it again
    const again = await quoteCheckout(payload, shopA.tenantId, {
      lines: towelLine(shopA),
      couponCode: 'TOWEL100',
      contact: { email: 'rahul.k@example.com', phone: '+919876543210' },
    })
    expect(again.promotions.couponProblem).toBe('You have already used Towel100.')
    // Cancelled: the use comes back
    const req = await reqAs(payload)
    await withTransaction(req, () => cancelOrder(req, String(order.id), { reason: 'Test' }))
    const back = await payload.findByID({
      collection: 'coupons',
      id: coupon.id,
      overrideAccess: true,
    })
    expect(back.usedCount).toBe(0)
  })

  it('stops at the total limit, even for the last use', async () => {
    await asOwner(shopA, (req) =>
      saveCoupon(req, shopA.tenantId, {
        code: 'ONLYONE',
        type: 'fixed',
        amountMinor: 5_000,
        usageLimit: 1,
        perCustomerLimit: null,
      }),
    )
    await place(shopA, towelLine(shopA), { couponCode: 'ONLYONE' })
    const quote = await quoteCheckout(payload, shopA.tenantId, {
      lines: towelLine(shopA),
      couponCode: 'ONLYONE',
    })
    expect(quote.promotions.couponProblem).toBe('ONLYONE has been fully used.')
  })

  it('refuses another store’s code, and codes can’t repeat in a store', async () => {
    const quote = await quoteCheckout(payload, shopB.tenantId, {
      lines: towelLine(shopB),
      couponCode: 'TOWEL100',
    })
    expect(quote.promotions.couponProblem).toBe('This code isn’t valid in this store.')
    await expect(
      asOwner(shopA, (req) =>
        saveCoupon(req, shopA.tenantId, { code: 'towel100', type: 'free-shipping' }),
      ),
    ).rejects.toThrow(/already a code/)
    // Store B may have the same code
    await asOwner(shopB, (req) =>
      saveCoupon(req, shopB.tenantId, { code: 'TOWEL100', type: 'free-shipping' }),
    )
  })

  it('makes single-use bulk codes from a coupon', async () => {
    const base = await asOwner(shopA, (req) =>
      saveCoupon(req, shopA.tenantId, { code: 'LEAFLET', type: 'fixed', amountMinor: 20_000 }),
    )
    const req = await reqAs(payload, shopA.owner)
    const { codes } = await makeBulkCodes(req, shopA.tenantId, {
      basedOn: String(base.id),
      prefix: 'WED',
      count: 5,
    })
    expect(codes).toHaveLength(5)
    expect(codes.every((c) => /^WED-[A-Z2-9]{6}$/.test(c))).toBe(true)
    const quote = await quoteCheckout(payload, shopA.tenantId, {
      lines: towelLine(shopA),
      couponCode: codes[0],
    })
    expect(quote.promotions.coupon?.code).toBe(codes[0])
  })
})
