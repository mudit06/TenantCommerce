import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { connectorOverview, saveConnector, shiprocketRateSource } from '@/connectors'
import { withTransaction } from '@/lib/db/transaction'
import { saveCodRules } from '@/modules/content'
import {
  bookWithShiprocket,
  handleCourierWebhook,
  packParcel,
  placeOrder,
  placeOrderSchema,
  quoteCheckout,
  retrackQuietParcels,
} from '@/modules/orders'
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

// Shiprocket (docs/09): live rates at checkout (mudit, 6 October 2026), booking a packed parcel,
// the tracking webhook (token, read back from Shiprocket, once per scan) and the re-track job.

let payload: Payload
let plans: Record<string, Plan>
let admin: TestUser
let shop: Shop

/** A stand-in for Shiprocket's API; tests set what tracking says */
function fakeShiprocket() {
  const calls: string[] = []
  let trackingStatus = 'PICKED UP'
  let next = 100
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    calls.push(
      `${init?.method ?? 'GET'} ${url.replace('https://apiv2.shiprocket.in/v1/external', '')}`,
    )
    if (url.endsWith('/auth/login')) return Response.json({ token: 'tok' })
    if (url.includes('/courier/serviceability/')) {
      const cod = new URL(url).searchParams.get('cod') === '1'
      return Response.json({
        data: {
          recommended_courier_company_id: 12,
          available_courier_companies: [
            {
              courier_company_id: 12,
              courier_name: 'Delhivery Surface',
              rate: 87.5,
              cod: 1,
              estimated_delivery_days: '4',
            },
            {
              courier_company_id: 33,
              courier_name: 'Xpressbees',
              rate: 70,
              cod: cod ? 0 : 1,
              estimated_delivery_days: '6',
            },
          ],
        },
      })
    }
    if (url.endsWith('/orders/create/adhoc'))
      return Response.json({ order_id: next++, shipment_id: next++, status: 'NEW' })
    if (url.endsWith('/courier/assign/awb')) {
      return Response.json({
        awb_assign_status: 1,
        response: {
          data: {
            awb_code: `AWB${next++}`,
            courier_name: 'Delhivery Surface',
            courier_company_id: 12,
          },
        },
      })
    }
    if (url.endsWith('/courier/generate/pickup'))
      return Response.json({
        pickup_status: 1,
        response: { pickup_scheduled_date: '2026-10-08 10:00:00' },
      })
    if (url.endsWith('/courier/generate/label'))
      return Response.json({ label_created: 1, label_url: 'https://example.test/label.pdf' })
    if (url.includes('/courier/track/awb/')) {
      return Response.json({
        tracking_data: {
          shipment_track: [{ current_status: trackingStatus, edd: '2026-10-10' }],
          shipment_track_activities: [
            {
              date: '2026-10-08 12:00:00',
              'sr-status-label': trackingStatus,
              activity: 'Scanned',
              location: 'Pune Hub',
            },
          ],
        },
      })
    }
    return Response.json({}, { status: 404 })
  }) as unknown as typeof fetch
  return { fetchImpl, calls, setTracking: (status: string) => (trackingStatus = status) }
}

async function placeCod(): Promise<Order> {
  const req = await reqAs(payload)
  const input = placeOrderSchema.parse(sampleOrderInput({ paymentMethod: 'cod' }))
  return (
    await withTransaction(req, () =>
      placeOrder(req, shop.tenantId, {
        lines: [{ productId: shop.towel, qty: 1 }],
        input,
        live: null,
      }),
    )
  ).order
}

const parcelOf = async (orderId: string | number) =>
  (
    await payload.find({
      collection: 'shipments',
      where: { order: { equals: orderId } },
      overrideAccess: true,
    })
  ).docs[0]!

beforeAll(async () => {
  payload = await startPayload()
  plans = await seedPlans(payload)
  admin = await createPlatformUser(payload, 'admin@platform.test', 'super-admin')
  shop = await buildShop(payload, {
    admin,
    plan: plans.starter!,
    slug: 'ship-a',
    ownerEmail: 'a@ship.test',
  })
  const ownerReq = await reqAs(payload, shop.owner)
  await withTransaction(ownerReq, () =>
    saveCodRules(ownerReq, {
      tenantId: shop.tenantId,
      codEnabled: true,
      codMinOrderMinor: null,
      codMaxOrderMinor: null,
      codFeeMinor: null,
    }),
  )
  await saveConnector(await reqAs(payload, shop.owner), 'shiprocket', {
    tenantId: shop.tenantId,
    public: { pickupLocation: 'Primary', pickupPincode: '400001', courierMode: 'auto' },
    secrets: { apiEmail: 'api@ship.test', apiPassword: 'pw' },
  })
})

afterAll(async () => {
  await stopPayload(payload)
})

describe('live rates', () => {
  it('charge the shopper Shiprocket’s recommended courier rate, with its delivery days', async () => {
    const shiprocket = fakeShiprocket()
    const live = await shiprocketRateSource(payload, shop.tenantId, shiprocket.fetchImpl)
    const quote = await quoteCheckout(payload, shop.tenantId, {
      lines: [{ productId: shop.towel, qty: 1 }],
      pincode: '411045',
      live,
    })
    expect(quote.delivery).toMatchObject({
      source: 'shiprocket',
      feeMinor: 8_750,
      etaMaxDays: 4,
      courierName: 'Delhivery Surface',
    })
    expect(quote.pricing.totals.shippingMinor).toBe(8_750)
    // Cached for the day: a second quote asks Shiprocket nothing more
    const asked = shiprocket.calls.filter((c) => c.includes('serviceability')).length
    await quoteCheckout(payload, shop.tenantId, {
      lines: [{ productId: shop.towel, qty: 1 }],
      pincode: '411045',
      live,
    })
    expect(shiprocket.calls.filter((c) => c.includes('serviceability')).length).toBe(asked)
  })

  it('fall back to the rate card when Shiprocket can’t answer', async () => {
    const broken = (async () => {
      throw new Error('down')
    }) as unknown as typeof fetch
    const live = await shiprocketRateSource(payload, shop.tenantId, broken)
    const quote = await quoteCheckout(payload, shop.tenantId, {
      lines: [{ productId: shop.towel, qty: 1 }],
      pincode: '560001',
      live,
    })
    expect(quote.delivery).toMatchObject({ source: 'rate-card', serviceable: true })
  })
})

describe('booking and tracking', () => {
  let order: Order

  it('books a packed parcel: AWB, courier, label, pickup; the parcel stays packed', async () => {
    const shiprocket = fakeShiprocket()
    order = await placeCod()
    const ownerReq = await reqAs(payload, shop.owner)
    const parcel = await withTransaction(ownerReq, () => packParcel(ownerReq, String(order.id)))
    const booked = await bookWithShiprocket(await reqAs(payload, shop.owner), String(parcel.id), {
      fetchImpl: shiprocket.fetchImpl,
    })
    expect(booked).toMatchObject({
      provider: 'shiprocket',
      status: 'packed',
      carrier: 'Delhivery Surface',
      labelUrl: 'https://example.test/label.pdf',
    })
    expect(booked.awb).toMatch(/^AWB\d+$/)
    expect(booked.trackingUrl).toBe(`https://shiprocket.co/tracking/${booked.awb}`)
    expect(shiprocket.calls.map((c) => c.split('?')[0])).toEqual(
      expect.arrayContaining([
        'POST /orders/create/adhoc',
        'POST /courier/assign/awb',
        'POST /courier/generate/pickup',
        'POST /courier/generate/label',
      ]),
    )
    await expect(
      bookWithShiprocket(await reqAs(payload, shop.owner), String(parcel.id), {
        fetchImpl: shiprocket.fetchImpl,
      }),
    ).rejects.toMatchObject({ code: 'CONFLICT' })
  })

  it('refuses a webhook with the wrong token, and marks the connector failing', async () => {
    const shiprocket = fakeShiprocket()
    const parcel = await parcelOf(order.id)
    const req = await reqAs(payload)
    expect(
      await handleCourierWebhook(req, shop.tenantId, {
        token: 'nope',
        body: { awb: parcel.awb!, current_status: 'DELIVERED' },
        fetchImpl: shiprocket.fetchImpl,
      }),
    ).toBe('bad-token')
    expect((await parcelOf(order.id)).status).toBe('packed')
    const { connectors } = await connectorOverview(payload, shop.tenantId)
    expect(
      connectors.find((c) => c.provider.key === 'shiprocket')?.health?.failingSince,
    ).toBeTruthy()
  })

  it('moves the parcel by what Shiprocket’s tracking says, not the webhook body, once per scan', async () => {
    const shiprocket = fakeShiprocket()
    const parcel = await parcelOf(order.id)
    const { connectors } = await connectorOverview(payload, shop.tenantId)
    const token = connectors.find((c) => c.provider.key === 'shiprocket')!.webhookToken!
    const req = await reqAs(payload)
    // The body claims delivered; Shiprocket's tracking says picked up
    const outcome = await withTransaction(req, () =>
      handleCourierWebhook(req, shop.tenantId, {
        token,
        body: { awb: parcel.awb!, current_status: 'DELIVERED' },
        fetchImpl: shiprocket.fetchImpl,
      }),
    )
    expect(outcome).toBe('moved')
    expect((await parcelOf(order.id)).status).toBe('shipped')
    expect(
      await withTransaction(req, () =>
        handleCourierWebhook(req, shop.tenantId, {
          token,
          body: { awb: parcel.awb! },
          fetchImpl: shiprocket.fetchImpl,
        }),
      ),
    ).toBe('ignored')
    shiprocket.setTracking('UNDELIVERED')
    await withTransaction(req, () =>
      handleCourierWebhook(req, shop.tenantId, {
        token,
        body: { awb: parcel.awb! },
        fetchImpl: shiprocket.fetchImpl,
      }),
    )
    const failed = await parcelOf(order.id)
    expect(failed).toMatchObject({ status: 'delivery_failed', attempts: 1 })
    expect(
      await withTransaction(req, () =>
        handleCourierWebhook(req, shop.tenantId, {
          token,
          body: { awb: 'UNKNOWN' },
          fetchImpl: shiprocket.fetchImpl,
        }),
      ),
    ).toBe('unknown-awb')
  })

  it('re-tracks quiet parcels and completes the order when delivered', async () => {
    const shiprocket = fakeShiprocket()
    shiprocket.setTracking('DELIVERED')
    const req = await reqAs(payload)
    const result = await retrackQuietParcels(req, {
      now: new Date(Date.now() + 2 * 86_400_000),
      fetchImpl: shiprocket.fetchImpl,
    })
    expect(result.moved).toBeGreaterThanOrEqual(1)
    const done = await payload.findByID({
      collection: 'orders',
      id: order.id,
      overrideAccess: true,
    })
    expect(done).toMatchObject({
      status: 'completed',
      fulfillmentStatus: 'delivered',
      paymentStatus: 'paid',
    })
  })
})
