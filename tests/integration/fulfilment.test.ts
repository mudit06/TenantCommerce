import type { Payload } from 'payload'

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { idOf } from '@/access'
import { withTransaction } from '@/lib/db/transaction'
import { saveCodRules } from '@/modules/content'
import {
  cancelOrder,
  markOrderPaid,
  moveParcel,
  packParcel,
  placeOrder,
  placeOrderSchema,
} from '@/modules/orders'
import { refundOrder } from '@/modules/payments'
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

// After checkout (docs/11): parcels through the journey, the order's roll-up, COD paid on
// delivery, GST invoices (prepaid when paid, COD when packed) with consecutive numbers,
// cancellation of packed parcels, refunds with credit notes.

let payload: Payload
let plans: Record<string, Plan>
let admin: TestUser
let shop: Shop

const fresh = (id: string | number) =>
  payload.findByID({ collection: 'orders', id, depth: 0, overrideAccess: true })

async function place(
  paymentMethod: 'cod' | 'razorpay',
  lines = [{ productId: shop.towel, qty: 2 }],
): Promise<Order> {
  const req = await reqAs(payload)
  const input = placeOrderSchema.parse(sampleOrderInput({ paymentMethod }))
  return (await withTransaction(req, () => placeOrder(req, shop.tenantId, { lines, input }))).order
}

const asOwner = async <T>(work: (req: Awaited<ReturnType<typeof reqAs>>) => Promise<T>) => {
  const req = await reqAs(payload, shop.owner)
  return withTransaction(req, () => work(req))
}

beforeAll(async () => {
  payload = await startPayload()
  plans = await seedPlans(payload)
  admin = await createPlatformUser(payload, 'admin@platform.test', 'super-admin')
  shop = await buildShop(payload, {
    admin,
    plan: plans.starter!,
    slug: 'ful-a',
    ownerEmail: 'a@ful.test',
  })
  await asOwner((req) =>
    saveCodRules(req, {
      tenantId: shop.tenantId,
      codEnabled: true,
      codMinOrderMinor: null,
      codMaxOrderMinor: null,
      codFeeMinor: null,
    }),
  )
  const { saveConnector } = await import('@/connectors')
  await saveConnector(await reqAs(payload, shop.owner), 'razorpay', {
    tenantId: shop.tenantId,
    mode: 'test',
    public: { keyId: 'rzp_test_AbCdEfGh1234' },
    secrets: { keySecret: 's', webhookSecret: 'w' },
  })
})

afterAll(async () => {
  await stopPayload(payload)
})

describe('a COD order from packing to delivery', () => {
  let order: Order

  it('invoices it when packed and moves the order to processing', async () => {
    order = await place('cod')
    expect(order.invoice).toBeFalsy()
    const parcel = await asOwner((req) => packParcel(req, String(order.id)))
    expect(parcel).toMatchObject({
      status: 'packed',
      codAmountMinor: order.totals?.grandTotalMinor,
    })
    const packed = await fresh(order.id)
    expect(packed).toMatchObject({ status: 'processing', fulfillmentStatus: 'packed' })
    const invoice = await payload.findByID({
      collection: 'invoices',
      id: String(idOf(packed.invoice)),
      overrideAccess: true,
    })
    expect(invoice.number).toMatch(/^INV\/\d{2}-\d{2}\/00001$/)
    expect(invoice.totals).toMatchObject({ grandTotalMinor: order.totals?.grandTotalMinor })
    expect(invoice.amountInWords).toMatch(/^Rupees .* Only$/)
    await expect(asOwner((req) => packParcel(req, String(order.id)))).rejects.toThrow(
      /already packed/,
    )
  })

  it('needs the courier and tracking number to ship, then follows the journey', async () => {
    const { docs } = await payload.find({
      collection: 'shipments',
      where: { order: { equals: order.id } },
      overrideAccess: true,
    })
    const parcel = docs[0]!
    await expect(
      asOwner((req) => moveParcel(req, String(parcel.id), { to: 'shipped' })),
    ).rejects.toMatchObject({
      fields: { carrier: expect.any(String), trackingNumber: expect.any(String) },
    })
    await asOwner((req) =>
      moveParcel(req, String(parcel.id), {
        to: 'shipped',
        carrier: 'Delhivery',
        trackingNumber: '149022100458',
      }),
    )
    expect((await fresh(order.id)).fulfillmentStatus).toBe('shipped')
    // A late, repeated or backward update changes nothing
    const repeat = await asOwner((req) => moveParcel(req, String(parcel.id), { to: 'shipped' }))
    expect(repeat.result).toBe('repeat')
    await expect(
      asOwner((req) => moveParcel(req, String(parcel.id), { to: 'delivery_failed' })),
    ).rejects.toMatchObject({
      fields: { failureReason: expect.any(String) },
    })
    await asOwner((req) =>
      moveParcel(req, String(parcel.id), {
        to: 'delivery_failed',
        failureReason: 'customer_unavailable',
      }),
    )
    await asOwner((req) => moveParcel(req, String(parcel.id), { to: 'out_for_delivery' }))
    await asOwner((req) => moveParcel(req, String(parcel.id), { to: 'delivered' }))
    const done = await fresh(order.id)
    expect(done).toMatchObject({
      status: 'completed',
      fulfillmentStatus: 'delivered',
      paymentStatus: 'paid',
    })
    expect(done.totals?.paidMinor).toBe(done.totals?.grandTotalMinor)
    const shipped = await payload.findByID({
      collection: 'shipments',
      id: parcel.id,
      overrideAccess: true,
    })
    expect(shipped.attempts).toBe(1)
    expect(shipped.events?.map((event) => event.status)).toEqual([
      'packed',
      'shipped',
      'delivery_failed',
      'out_for_delivery',
      'delivered',
    ])
  })

  it('refunds a COD order by hand with a reference and a credit note', async () => {
    await expect(
      asOwner((req) =>
        refundOrder(req, String(order.id), {
          amountMinor: 1_00,
          reason: 'Scratched',
          manual: false,
        }),
      ),
    ).rejects.toMatchObject({ fields: { reference: expect.any(String) } })
    const refund = await refundOrder(await reqAs(payload, shop.owner), String(order.id), {
      amountMinor: 50_000,
      reason: 'One towel was torn',
      manual: true,
      reference: 'UPI 6123',
    })
    expect(refund).toMatchObject({ status: 'processed', method: 'manual' })
    const note = await payload.findByID({
      collection: 'invoices',
      id: String(idOf(refund.creditNote)),
      overrideAccess: true,
    })
    expect(note).toMatchObject({ type: 'credit-note' })
    expect(note.number).toMatch(/^CN\/\d{2}-\d{2}\/00001$/)
    expect(note.totals).toMatchObject({ grandTotalMinor: 50_000 })
    expect(await fresh(order.id)).toMatchObject({ paymentStatus: 'partially_refunded' })
    await expect(
      refundOrder(await reqAs(payload, shop.owner), String(order.id), {
        amountMinor: 10_00_00_000,
        reason: 'Too much',
        manual: true,
        reference: 'x',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })
  })
})

describe('prepaid orders', () => {
  it('get an invoice when paid, with the next consecutive number', async () => {
    const order = await place('razorpay')
    const req = await reqAs(payload)
    await withTransaction(req, () =>
      markOrderPaid(req, String(order.id), {
        amountMinor: order.totals!.grandTotalMinor!,
        methodLabel: 'UPI',
        byLabel: 'Razorpay',
      }),
    )
    const paid = await fresh(order.id)
    const invoice = await payload.findByID({
      collection: 'invoices',
      id: String(idOf(paid.invoice)),
      overrideAccess: true,
    })
    expect(invoice.number).toMatch(/\/00002$/)
  })

  it('cancel with packed parcels: the parcel is cancelled and the order notes the refund due', async () => {
    const order = await place('razorpay')
    const req = await reqAs(payload)
    await withTransaction(req, () =>
      markOrderPaid(req, String(order.id), {
        amountMinor: order.totals!.grandTotalMinor!,
        methodLabel: 'UPI',
        byLabel: 'Razorpay',
      }),
    )
    await asOwner((r) => packParcel(r, String(order.id)))
    const cancelled = await asOwner((r) =>
      cancelOrder(r, String(order.id), { reason: 'Out of stock after all' }),
    )
    expect(cancelled).toMatchObject({ status: 'cancelled', fulfillmentStatus: 'cancelled' })
    const { docs } = await payload.find({
      collection: 'shipments',
      where: { order: { equals: order.id } },
      overrideAccess: true,
    })
    expect(docs[0]?.status).toBe('cancelled')
    const { docs: events } = await payload.find({
      collection: 'order-events',
      where: { order: { equals: order.id } },
      sort: '-at',
      overrideAccess: true,
    })
    expect(events[0]?.text).toMatch(/refund of .* due/)
  })

  it('can’t be cancelled once shipped', async () => {
    const order = await place('cod')
    const parcel = await asOwner((r) => packParcel(r, String(order.id)))
    await asOwner((r) =>
      moveParcel(r, String(parcel.id), {
        to: 'shipped',
        carrier: 'Blue Dart',
        trackingNumber: 'BD1',
      }),
    )
    await expect(
      asOwner((r) => cancelOrder(r, String(order.id), { reason: 'Changed mind' })),
    ).rejects.toMatchObject({
      code: 'INVALID_TRANSITION',
    })
  })
})

describe('who may work on orders', () => {
  it('lets order roles change orders, support only look, and nobody from another store', async () => {
    const { orderFor } = await import('@/modules/orders')
    const { inviteStaff } = await import('@/modules/identity')
    const { userByEmail, inStoreSession } = await import('./helpers')
    const order = await place('cod')
    // Room for three more staff on this test's plan
    await payload.update({
      collection: 'plans',
      id: plans.starter!.id,
      data: { limits: { ...plans.starter!.limits, maxStaffUsers: 10 } },
      overrideAccess: true,
    })
    const invite = async (email: string, roles: string[]) => {
      const req = await reqAs(payload, admin)
      await withTransaction(req, () =>
        inviteStaff(
          req,
          { email, name: email, tenantId: shop.tenantId, roles: roles as never },
          { sendEmail: false },
        ),
      )
      return userByEmail(payload, email)
    }
    const orderManager = await invite('om@ful.test', ['order-manager'])
    const editor = await invite('ed@ful.test', ['catalog-editor'])
    const storeSupport = await invite('sup@ful.test', ['support'])
    const id = String(order.id)
    await expect(orderFor(await reqAs(payload, orderManager), id, true)).resolves.toBeTruthy()
    await expect(orderFor(await reqAs(payload, storeSupport), id, false)).resolves.toBeTruthy()
    await expect(orderFor(await reqAs(payload, storeSupport), id, true)).rejects.toMatchObject({
      httpStatus: 403,
    })
    await expect(orderFor(await reqAs(payload, editor), id, false)).rejects.toMatchObject({
      httpStatus: 403,
    })
    await expect(orderFor(await reqAs(payload, admin), id, false)).rejects.toMatchObject({
      httpStatus: 403,
    })
    await expect(
      orderFor(await reqAs(payload, inStoreSession(admin, shop.tenantId, 'view')), id, true),
    ).rejects.toMatchObject({
      httpStatus: 403,
    })
    await expect(
      orderFor(await reqAs(payload, inStoreSession(admin, shop.tenantId, 'manage')), id, true),
    ).resolves.toBeTruthy()
  })
})
