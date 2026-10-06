import { createHmac } from 'node:crypto'

import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { saveConnector } from '@/connectors'
import { withTransaction } from '@/lib/db/transaction'
import { placeOrder, placeOrderSchema } from '@/modules/orders'
import {
  completeOnlinePayment,
  handleRazorpayWebhook,
  reconcileOnlinePayments,
  startOnlinePayment,
} from '@/modules/payments'
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

// Razorpay Standard Checkout end to end with a stand-in for Razorpay's API (docs/09): start,
// the verified browser callback, webhooks (good, forged, repeated) and reconciliation.

const KEY_SECRET = 'key-secret-123'
const WEBHOOK_SECRET = 'hook-secret-456'

let payload: Payload
let plans: Record<string, Plan>
let admin: TestUser
let shop: Shop

/** A tiny fake of the Razorpay API: orders get ids, payments are what the test says */
let next = 1

function fakeRazorpay() {
  const payments = new Map<
    string,
    { id: string; status: string; amount: number; method: string }[]
  >()
  const calls: string[] = []
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    calls.push(`${init?.method ?? 'GET'} ${url}`)
    if (url.endsWith('/orders') && init?.method === 'POST') {
      const body = JSON.parse(String(init.body)) as { amount: number }
      const id = `order_T${next++}`
      return Response.json({ id, amount: body.amount, currency: 'INR', status: 'created' })
    }
    const orderPayments = url.match(/\/orders\/([^/]+)\/payments$/)
    if (orderPayments) {
      const items = (payments.get(orderPayments[1]!) ?? []).map((p) => ({
        ...p,
        order_id: orderPayments[1],
      }))
      return Response.json({ items })
    }
    const payment = url.match(/\/payments\/([^/]+)$/)
    if (payment) {
      for (const [orderId, list] of payments) {
        const found = list.find((p) => p.id === payment[1])
        if (found) return Response.json({ ...found, order_id: orderId })
      }
      return Response.json({ error: { description: 'not found' } }, { status: 404 })
    }
    return Response.json({}, { status: 404 })
  }) as unknown as typeof fetch
  return {
    fetchImpl,
    calls,
    pay: (orderId: string, amount: number, id = `pay_${orderId}`) =>
      payments.set(orderId, [{ id, status: 'captured', amount, method: 'upi' }]),
  }
}

const sign = (secret: string, text: string) =>
  createHmac('sha256', secret).update(text).digest('hex')

async function placeOnline(): Promise<Order> {
  const req = await reqAs(payload)
  const input = placeOrderSchema.parse(sampleOrderInput({ paymentMethod: 'razorpay' }))
  const { order } = await withTransaction(req, () =>
    placeOrder(req, shop.tenantId, { lines: [{ productId: shop.towel, qty: 1 }], input }),
  )
  return order
}

const order = (id: string | number) =>
  payload.findByID({ collection: 'orders', id, depth: 0, overrideAccess: true })

beforeAll(async () => {
  payload = await startPayload()
  plans = await seedPlans(payload)
  admin = await createPlatformUser(payload, 'admin@platform.test', 'super-admin')
  shop = await buildShop(payload, {
    admin,
    plan: plans.starter!,
    slug: 'pay-a',
    ownerEmail: 'a@pay.test',
  })
  await saveConnector(await reqAs(payload, shop.owner), 'razorpay', {
    tenantId: shop.tenantId,
    mode: 'test',
    public: { keyId: 'rzp_test_AbCdEfGh1234' },
    secrets: { keySecret: KEY_SECRET, webhookSecret: WEBHOOK_SECRET },
  })
})

afterAll(async () => {
  await stopPayload(payload)
})

describe('online payment', () => {
  it('opens one Razorpay order per order, and reuses it when the shopper retries', async () => {
    const razorpay = fakeRazorpay()
    const placed = await placeOnline()
    const req = await reqAs(payload)
    const first = await startOnlinePayment(
      req,
      shop.tenantId,
      String(placed.id),
      razorpay.fetchImpl,
    )
    expect(first).toMatchObject({
      keyId: 'rzp_test_AbCdEfGh1234',
      amountMinor: placed.totals!.grandTotalMinor,
      mode: 'test',
    })
    const again = await startOnlinePayment(
      req,
      shop.tenantId,
      String(placed.id),
      razorpay.fetchImpl,
    )
    expect(again.razorpayOrderId).toBe(first.razorpayOrderId)
    expect(razorpay.calls.filter((call) => call.startsWith('POST'))).toHaveLength(1)
  })

  it('settles the order from a correctly signed callback, and refuses a forged one', async () => {
    const razorpay = fakeRazorpay()
    const placed = await placeOnline()
    const req = await reqAs(payload)
    const { razorpayOrderId, amountMinor } = await startOnlinePayment(
      req,
      shop.tenantId,
      String(placed.id),
      razorpay.fetchImpl,
    )
    razorpay.pay(razorpayOrderId, amountMinor, 'pay_A1')
    await expect(
      completeOnlinePayment(
        req,
        shop.tenantId,
        { razorpayOrderId, razorpayPaymentId: 'pay_A1', signature: 'forged' },
        razorpay.fetchImpl,
      ),
    ).rejects.toMatchObject({ httpStatus: 403 })
    expect((await order(placed.id)).paymentStatus).toBe('pending')

    await withTransaction(req, () =>
      completeOnlinePayment(
        req,
        shop.tenantId,
        {
          razorpayOrderId,
          razorpayPaymentId: 'pay_A1',
          signature: sign(KEY_SECRET, `${razorpayOrderId}|pay_A1`),
        },
        razorpay.fetchImpl,
      ),
    )
    expect(await order(placed.id)).toMatchObject({ status: 'confirmed', paymentStatus: 'paid' })
    const { docs } = await payload.find({
      collection: 'transactions',
      where: { order: { equals: placed.id } },
      overrideAccess: true,
    })
    expect(docs[0]).toMatchObject({
      status: 'captured',
      providerPaymentId: 'pay_A1',
      methodDetail: 'UPI',
    })
  })

  it('handles the webhook once, and marks the connector failing on a bad signature', async () => {
    const razorpay = fakeRazorpay()
    const placed = await placeOnline()
    const req = await reqAs(payload)
    const { razorpayOrderId, amountMinor } = await startOnlinePayment(
      req,
      shop.tenantId,
      String(placed.id),
      razorpay.fetchImpl,
    )
    const body = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_W1',
            order_id: razorpayOrderId,
            amount: amountMinor,
            status: 'captured',
            method: 'card',
            card: { network: 'Visa' },
          },
        },
      },
    })

    expect(
      await handleRazorpayWebhook(req, shop.tenantId, {
        rawBody: body,
        signature: sign('wrong', body),
        eventId: 'evt_1',
      }),
    ).toBe('bad-signature')
    const failing = await payload.find({
      collection: 'connector-configs',
      where: { tenant: { equals: shop.tenantId } },
      overrideAccess: true,
    })
    expect(failing.docs.find((d) => d.provider === 'razorpay')?.health?.failingSince).toBeTruthy()
    expect((await order(placed.id)).paymentStatus).toBe('pending')

    const outcome = await withTransaction(req, () =>
      handleRazorpayWebhook(req, shop.tenantId, {
        rawBody: body,
        signature: sign(WEBHOOK_SECRET, body),
        eventId: 'evt_1',
      }),
    )
    expect(outcome).toBe('processed')
    expect(await order(placed.id)).toMatchObject({ status: 'confirmed', paymentStatus: 'paid' })
    const healthy = await payload.find({
      collection: 'connector-configs',
      where: { tenant: { equals: shop.tenantId } },
      overrideAccess: true,
    })
    expect(healthy.docs.find((d) => d.provider === 'razorpay')?.health).toMatchObject({
      failingSince: null,
      failedCount: 0,
    })

    expect(
      await handleRazorpayWebhook(req, shop.tenantId, {
        rawBody: body,
        signature: sign(WEBHOOK_SECRET, body),
        eventId: 'evt_1',
      }),
    ).toBe('duplicate')
  })

  it('never marks an order paid for a different amount', async () => {
    const razorpay = fakeRazorpay()
    const placed = await placeOnline()
    const req = await reqAs(payload)
    const { razorpayOrderId } = await startOnlinePayment(
      req,
      shop.tenantId,
      String(placed.id),
      razorpay.fetchImpl,
    )
    const body = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_X',
            order_id: razorpayOrderId,
            amount: 100,
            status: 'captured',
            method: 'upi',
          },
        },
      },
    })
    await withTransaction(req, () =>
      handleRazorpayWebhook(req, shop.tenantId, {
        rawBody: body,
        signature: sign(WEBHOOK_SECRET, body),
        eventId: 'evt_x',
      }),
    )
    expect((await order(placed.id)).paymentStatus).toBe('pending')
  })
})

describe('reconciliation', () => {
  it('settles a paid order whose webhook was missed and cancels the unpaid one', async () => {
    const razorpay = fakeRazorpay()
    const paidLater = await placeOnline()
    const neverPaid = await placeOnline()
    const req = await reqAs(payload)
    const started = await startOnlinePayment(
      req,
      shop.tenantId,
      String(paidLater.id),
      razorpay.fetchImpl,
    )
    await startOnlinePayment(req, shop.tenantId, String(neverPaid.id), razorpay.fetchImpl)
    razorpay.pay(started.razorpayOrderId, started.amountMinor)

    const inAnHour = new Date(Date.now() + 60 * 60_000)
    const result = await reconcileOnlinePayments(req, {
      now: inAnHour,
      fetchImpl: razorpay.fetchImpl,
    })
    expect(result.settled).toBeGreaterThanOrEqual(1)
    expect(await order(paidLater.id)).toMatchObject({ status: 'confirmed', paymentStatus: 'paid' })
    expect(await order(neverPaid.id)).toMatchObject({
      status: 'cancelled',
      paymentStatus: 'failed',
      stockState: 'none',
    })
  })
})
