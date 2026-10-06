import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { saveConnector } from '@/connectors'
import { withTransaction } from '@/lib/db/transaction'
import { saveCodRules } from '@/modules/content'
import {
  cancelOrder,
  markOrderPaid,
  placeOrder,
  placeOrderSchema,
  quoteCheckout,
} from '@/modules/orders'
import type { Plan } from '@/payload-types'

import {
  createPlatformUser,
  reqAs,
  seedPlans,
  startPayload,
  stopPayload,
  type TestUser,
} from './helpers'
import { buildShop, sampleAddress, sampleOrderInput, type Shop } from './shop'

// Checkout and the order lifecycle (docs/11): prices from the catalogue only, GST by place of
// supply, delivery from the zones, COD rules, stock held and sold atomically, cancellations.

let payload: Payload
let plans: Record<string, Plan>
let admin: TestUser
let shop: Shop
let other: Shop

const variant = (id: string) =>
  payload.findByID({ collection: 'variants', id, depth: 0, overrideAccess: true })

async function place(
  lines: { productId: string; variantId?: string | null; qty: number }[],
  overrides: Record<string, unknown> = {},
  store: Shop = shop,
) {
  const req = await reqAs(payload)
  const input = placeOrderSchema.parse(sampleOrderInput(overrides))
  return withTransaction(req, () => placeOrder(req, store.tenantId, { lines, input }))
}

beforeAll(async () => {
  payload = await startPayload()
  plans = await seedPlans(payload)
  admin = await createPlatformUser(payload, 'admin@platform.test', 'super-admin')
  shop = await buildShop(payload, {
    admin,
    plan: plans.starter!,
    slug: 'shop-a',
    ownerEmail: 'a@shop.test',
  })
  other = await buildShop(payload, {
    admin,
    plan: plans.starter!,
    slug: 'shop-b',
    ownerEmail: 'b@shop.test',
  })
  const req = await reqAs(payload, shop.owner)
  await withTransaction(req, () =>
    saveCodRules(req, {
      tenantId: shop.tenantId,
      codEnabled: true,
      codMinOrderMinor: 49_900,
      codMaxOrderMinor: 25_00_000,
      codFeeMinor: 4_900,
    }),
  )
  await payload.create({
    collection: 'shipping-zones',
    data: {
      tenant: shop.tenantId,
      name: 'Maharashtra',
      states: ['27'],
      rateType: 'flat',
      fee: { amountMinor: 9_900, currency: 'INR' },
      freeAbove: { amountMinor: 99_900, currency: 'INR' },
      codAllowed: true,
      etaMinDays: 2,
      etaMaxDays: 3,
    },
  })
  await payload.create({
    collection: 'shipping-zones',
    data: {
      tenant: shop.tenantId,
      name: 'Rest of India, prepaid',
      states: ['24', '29', '07'],
      rateType: 'flat',
      fee: { amountMinor: 14_900, currency: 'INR' },
      codAllowed: false,
    },
  })
})

afterAll(async () => {
  await stopPayload(payload)
})

describe('quoteCheckout', () => {
  it('prices from the catalogue, with GST split by the place of supply', async () => {
    const quote = await quoteCheckout(payload, shop.tenantId, {
      lines: [{ productId: shop.tap, variantId: shop.black, qty: 1 }],
      pincode: '411045',
      paymentMethod: 'cod',
    })
    expect(quote.problems).toEqual([])
    expect(quote.lines[0]).toMatchObject({
      unitMinor: 5_49_000,
      options: 'Black matt',
      sku: 'AV-BM-1120-MB',
    })
    expect(quote.placeOfSupply).toMatchObject({ stateCode: '27', source: 'prefix' })
    expect(quote.pricing.intraState).toBe(true)
    // Free delivery above ₹999 in Maharashtra; COD fee ₹49 taxed at 18%
    expect(quote.delivery).toMatchObject({
      serviceable: true,
      feeMinor: 0,
      zoneName: 'Maharashtra',
    })
    expect(quote.pricing.totals).toMatchObject({ codFeeMinor: 4_900, grandTotalMinor: 5_53_900 })
    const { cgstMinor, sgstMinor, taxMinor } = quote.pricing.totals
    expect(cgstMinor + sgstMinor).toBe(taxMinor)
    expect(Math.abs(cgstMinor - sgstMinor)).toBeLessThanOrEqual(2)
  })

  it('goes IGST for another state and turns COD off where the zone doesn’t allow it', async () => {
    const quote = await quoteCheckout(payload, shop.tenantId, {
      lines: [{ productId: shop.towel, qty: 1 }],
      pincode: '380001',
    })
    expect(quote.pricing.intraState).toBe(false)
    expect(quote.delivery?.feeMinor).toBe(14_900)
    expect(quote.payment.cod).toMatchObject({ available: false })
    expect(quote.pricing.totals.igstMinor).toBe(quote.pricing.totals.taxMinor)
  })

  it('refuses places outside every zone, items without a finish and quantities above stock', async () => {
    const outside = await quoteCheckout(payload, shop.tenantId, {
      lines: [{ productId: shop.towel, qty: 1 }],
      pincode: '781001',
    })
    expect(outside.problems).toContain('We don’t deliver to this pincode yet.')
    const quote = await quoteCheckout(payload, shop.tenantId, {
      lines: [
        { productId: shop.tap, qty: 1 },
        { productId: shop.tap, variantId: shop.chrome, qty: 5 },
      ],
    })
    expect(quote.lines.map((line) => line.problem)).toEqual([
      'Choose a finish or size.',
      'Only 3 left.',
    ])
  })

  it('ignores products of another store', async () => {
    const quote = await quoteCheckout(payload, shop.tenantId, {
      lines: [{ productId: other.towel, qty: 1 }],
    })
    expect(quote.lines).toEqual([])
    expect(quote.problems).toContain('Your cart is empty.')
  })

  it('applies the COD order limits', async () => {
    const small = await quoteCheckout(payload, shop.tenantId, {
      lines: [{ productId: shop.towel, qty: 0 + 1 }],
      pincode: '411045',
    })
    expect(small.payment.cod.available).toBe(true)
    const big = await quoteCheckout(payload, shop.tenantId, {
      lines: [{ productId: shop.towel, qty: 30 }],
      pincode: '411045',
    })
    expect(big.payment.cod).toMatchObject({
      available: false,
      reason: expect.stringContaining('up to'),
    })
  })
})

describe('placing orders', () => {
  it('confirms a COD order at once and sells the stock', async () => {
    const { order } = await place([
      { productId: shop.tap, variantId: shop.chrome, qty: 2 },
      { productId: shop.towel, qty: 1 },
    ])
    expect(order).toMatchObject({
      status: 'confirmed',
      paymentStatus: 'pending',
      paymentMethod: 'cod',
      stockState: 'sold',
      placeOfSupplyStateCode: '27',
    })
    expect(order.orderNumber).toMatch(/^SHO-1000\d$/)
    expect(order.trackingCode).toMatch(/^[A-Z2-9]{10}$/)
    expect(order.contact?.phone).toBe('+919876543210')
    expect(order.items?.map((item) => [item.title, item.qty, item.gstRate])).toEqual([
      ['Aria basin mixer', 2, 18],
      ['Cotton bath towel', 1, 5],
    ])
    expect(order.totals?.grandTotalMinor).toBe(2 * 5_19_000 + 1_05_000 + 4_900)
    expect(await variant(shop.chrome)).toMatchObject({ stockQty: 1, reservedQty: 0 })
    const { docs: events } = await payload.find({
      collection: 'order-events',
      where: { order: { equals: order.id } },
      sort: 'at',
      overrideAccess: true,
    })
    expect(events.map((event) => event.type)).toEqual(['created', 'status_changed'])
  })

  it('holds stock for an online order until it is paid', async () => {
    await saveConnector(await reqAs(payload, shop.owner), 'razorpay', {
      tenantId: shop.tenantId,
      mode: 'test',
      public: { keyId: 'rzp_test_AbCdEfGh1234' },
      secrets: { keySecret: 's', webhookSecret: 'w' },
    })
    const { order } = await place([{ productId: shop.tap, variantId: shop.black, qty: 1 }], {
      paymentMethod: 'razorpay',
    })
    expect(order).toMatchObject({ status: 'pending', stockState: 'reserved', paymentMode: 'test' })
    expect(order.expiresAt).toBeTruthy()
    expect(await variant(shop.black)).toMatchObject({ stockQty: 1, reservedQty: 1 })

    // The last black tap is held: nobody else can buy it meanwhile
    await expect(
      place([{ productId: shop.tap, variantId: shop.black, qty: 1 }], {
        paymentMethod: 'razorpay',
      }),
    ).rejects.toThrow(/Out of stock|sold out/)

    const req = await reqAs(payload)
    const paid = await withTransaction(req, () =>
      markOrderPaid(req, String(order.id), {
        amountMinor: order.totals!.grandTotalMinor!,
        methodLabel: 'UPI',
        byLabel: 'Razorpay',
      }),
    )
    expect(paid).toMatchObject({ status: 'confirmed', paymentStatus: 'paid', stockState: 'sold' })
    expect(await variant(shop.black)).toMatchObject({ stockQty: 0, reservedQty: 0 })
    // A repeated webhook changes nothing
    const again = await withTransaction(req, () =>
      markOrderPaid(req, String(order.id), {
        amountMinor: 1,
        methodLabel: 'UPI',
        byLabel: 'Razorpay',
      }),
    )
    expect(again.totals?.paidMinor).toBe(order.totals?.grandTotalMinor)
  })

  it('gives stock back when an order is cancelled, and notes the refund due', async () => {
    const before = (await variant(shop.chrome)).stockQty
    const { order } = await place([{ productId: shop.tap, variantId: shop.chrome, qty: 1 }])
    expect((await variant(shop.chrome)).stockQty).toBe(before! - 1)
    const req = await reqAs(payload, shop.owner)
    const cancelled = await withTransaction(req, () =>
      cancelOrder(req, String(order.id), { reason: 'Shopper asked' }),
    )
    expect(cancelled).toMatchObject({
      status: 'cancelled',
      fulfillmentStatus: 'cancelled',
      stockState: 'restocked',
    })
    expect((await variant(shop.chrome)).stockQty).toBe(before)
    await expect(
      withTransaction(req, () => cancelOrder(req, String(order.id), { reason: 'Again' })),
    ).rejects.toMatchObject({ code: 'INVALID_TRANSITION' })
  })

  it('takes the state from the pincode, not from what was typed', async () => {
    const { order } = await place([{ productId: shop.towel, qty: 1 }], {
      paymentMethod: 'razorpay',
      shippingAddress: sampleAddress({ stateCode: '24' }),
    })
    expect(order.placeOfSupplyStateCode).toBe('27')
    expect(order.shippingAddress?.stateCode).toBe('27')
  })

  it('refuses COD where it isn’t allowed, and an invalid buyer GSTIN', async () => {
    await expect(
      place([{ productId: shop.towel, qty: 1 }], {
        shippingAddress: sampleAddress({ pincode: '380001', city: 'Ahmedabad', stateCode: '24' }),
      }),
    ).rejects.toThrow(/isn’t available at this pincode/)
    expect(
      placeOrderSchema.safeParse(sampleOrderInput({ buyerGstin: '27AAAAA0000A1Z0' })).success,
    ).toBe(false)
  })

  it('refuses online payment in a store without Razorpay keys', async () => {
    await expect(
      place([{ productId: other.towel, qty: 1 }], { paymentMethod: 'razorpay' }, other),
    ).rejects.toThrow(/isn’t taking orders online|Online payment isn’t available/)
  })
})
