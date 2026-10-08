import type { Payload, PayloadRequest } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { withTransaction } from '@/lib/db/transaction'
import { saveCodRules } from '@/modules/content'
import { moveParcel, packParcel, placeOrder, placeOrderSchema } from '@/modules/orders'
import { refundOrder } from '@/modules/payments'
import { assertReportAccess, buildReport, monthRange } from '@/modules/reports'
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

// Reports (docs/screens Reports): sales are orders paid or cash collected, by that day; refunds
// apart; the GST summary is invoices less credit notes by HSN and rate; one store only.

let payload: Payload
let plans: Record<string, Plan>
let admin: TestUser
let shopA: Shop
let shopB: Shop

const asOwner = async <T>(shop: Shop, fn: (req: PayloadRequest) => Promise<T>) => {
  const req = await reqAs(payload, shop.owner)
  return withTransaction(req, () => fn(req))
}

async function deliveredCod(shop: Shop, qty: number): Promise<Order> {
  const input = placeOrderSchema.parse(sampleOrderInput({ paymentMethod: 'cod' }))
  const req = await reqAs(payload)
  const { order } = await withTransaction(req, () =>
    placeOrder(req, shop.tenantId, {
      lines: [{ productId: shop.towel, qty }],
      input,
      live: null,
    }),
  )
  const parcel = await asOwner(shop, (r) => packParcel(r, String(order.id)))
  await asOwner(shop, (r) =>
    moveParcel(r, String(parcel.id), { to: 'shipped', carrier: 'Delhivery', trackingNumber: 'A1' }),
  )
  await asOwner(shop, (r) => moveParcel(r, String(parcel.id), { to: 'delivered' }))
  return payload.findByID({ collection: 'orders', id: order.id, overrideAccess: true })
}

beforeAll(async () => {
  payload = await startPayload()
  plans = await seedPlans(payload)
  admin = await createPlatformUser(payload, 'admin@platform.test', 'super-admin')
  shopA = await buildShop(payload, {
    admin,
    plan: plans.starter!,
    slug: 'rep-a',
    ownerEmail: 'a@rep.test',
  })
  shopB = await buildShop(payload, {
    admin,
    plan: plans.starter!,
    slug: 'rep-b',
    ownerEmail: 'b@rep.test',
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

describe('reports', () => {
  it('counts collected sales, best sellers and the HSN summary less credit notes', async () => {
    const one = await deliveredCod(shopA, 2)
    await deliveredCod(shopA, 1)
    await deliveredCod(shopB, 5)
    // A COD order not delivered yet isn't a sale
    const req = await reqAs(payload)
    await withTransaction(req, () =>
      placeOrder(req, shopA.tenantId, {
        lines: [{ productId: shopA.towel, qty: 1 }],
        input: placeOrderSchema.parse(sampleOrderInput({ paymentMethod: 'cod' })),
        live: null,
      }),
    )
    // ₹525 back on the first order (half of one towel's ₹1,050): a credit note
    await refundOrder(await reqAs(payload, shopA.owner), String(one.id), {
      amountMinor: 52_500,
      reason: 'Torn',
      manual: true,
      reference: 'UPI 1',
    })

    const report = await buildReport(payload, shopA.tenantId)
    expect(report.figures).toMatchObject({
      orders: 2,
      grossMinor: 3 * 1_05_000,
      averageMinor: 1_57_500,
      refundsMinor: 52_500,
      refundedOrders: 1,
      onlineShare: 0,
    })
    expect(report.bestSellers[0]).toMatchObject({ title: 'Cotton bath towel', units: 3 })
    expect(report.daily.reduce((s, d) => s + d.salesMinor, 0)).toBe(3 * 1_05_000)
    // Towels: HSN 6302 at 5%; ₹3,000 taxable invoiced, less the credit note's ₹500
    expect(report.hsn).toHaveLength(1)
    expect(report.hsn[0]).toMatchObject({ hsn: '6302', ratePercent: 5, taxableMinor: 2_50_000 })
    expect(report.hsn[0]!.cgstMinor + report.hsn[0]!.sgstMinor + report.hsn[0]!.igstMinor).toBe(
      report.hsn[0]!.taxMinor,
    )
    expect(report.hsn[0]!.taxMinor).toBe(12_500)
  })

  it('shows one store only, to its own staff', async () => {
    const b = await buildReport(payload, shopB.tenantId)
    expect(b.figures.orders).toBe(1)
    expect(() =>
      assertReportAccess({ user: shopA.owner } as PayloadRequest, shopB.tenantId),
    ).toThrow()
    expect(() =>
      assertReportAccess({ user: shopA.owner } as PayloadRequest, shopA.tenantId),
    ).not.toThrow()
  })

  it('reads months in India time', () => {
    const sept = monthRange('2026-09')
    expect(sept.from.toISOString()).toBe('2026-08-31T18:30:00.000Z')
    expect(sept.to.toISOString()).toBe('2026-09-30T18:30:00.000Z')
    expect(sept).toMatchObject({ days: 30, label: 'September 2026', prevLabel: 'August' })
  })
})
