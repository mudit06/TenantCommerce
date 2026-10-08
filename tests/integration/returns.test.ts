import type { Payload, PayloadRequest } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { withTransaction } from '@/lib/db/transaction'
import { saveCodRules } from '@/modules/content'
import {
  decideReturn,
  moveParcel,
  packParcel,
  placeOrder,
  placeOrderSchema,
  requestReturn,
  returnOptions,
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

// Returns (docs/11 "Returns and exchanges"): asked for from a delivered order while the window
// is open, up to what was bought; approved with pickup instructions (the shopper is told),
// received, then refunded; rejected with a reason; another store's staff can't touch it.

let payload: Payload
let plans: Record<string, Plan>
let admin: TestUser
let shop: Shop
let other: Shop

const asOwner = async <T>(s: Shop, fn: (req: PayloadRequest) => Promise<T>) => {
  const req = await reqAs(payload, s.owner)
  return withTransaction(req, () => fn(req))
}
const asSystem = async <T>(fn: (req: PayloadRequest) => Promise<T>) => {
  const req = await reqAs(payload)
  return withTransaction(req, () => fn(req))
}

async function delivered(qty: number): Promise<Order> {
  const input = placeOrderSchema.parse(sampleOrderInput({ paymentMethod: 'cod' }))
  const { order } = await asSystem((req) =>
    placeOrder(req, shop.tenantId, { lines: [{ productId: shop.towel, qty }], input, live: null }),
  )
  const parcel = await asOwner(shop, (req) => packParcel(req, String(order.id)))
  await asOwner(shop, (req) =>
    moveParcel(req, String(parcel.id), { to: 'shipped', carrier: 'DTDC', trackingNumber: 'R1' }),
  )
  await asOwner(shop, (req) => moveParcel(req, String(parcel.id), { to: 'delivered' }))
  return payload.findByID({ collection: 'orders', id: order.id, overrideAccess: true })
}

beforeAll(async () => {
  payload = await startPayload()
  plans = await seedPlans(payload)
  admin = await createPlatformUser(payload, 'admin@platform.test', 'super-admin')
  shop = await buildShop(payload, {
    admin,
    plan: plans.starter!,
    slug: 'ret-a',
    ownerEmail: 'a@ret.test',
  })
  other = await buildShop(payload, {
    admin,
    plan: plans.starter!,
    slug: 'ret-b',
    ownerEmail: 'b@ret.test',
  })
  await asOwner(shop, (req) =>
    saveCodRules(req, {
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

describe('returns', () => {
  it('takes a request inside the window, up to what was bought', async () => {
    const order = await delivered(3)
    const item = order.items![0]!
    const before = await returnOptions(payload, shop.tenantId, order)
    expect(before).toMatchObject({ open: true, windowDays: 7 })
    await expect(
      asSystem((req) =>
        requestReturn(
          req,
          shop.tenantId,
          order,
          {
            items: [{ orderItemId: item.id!, qty: 4 }],
            reason: 'damaged',
          },
          {},
        ),
      ),
    ).rejects.toThrow('Up to 3')
    const request = await asSystem((req) =>
      requestReturn(
        req,
        shop.tenantId,
        order,
        { items: [{ orderItemId: item.id!, qty: 2 }], reason: 'damaged', note: 'Torn edges' },
        {},
      ),
    )
    // Two towels at ₹1,050 each
    expect(request).toMatchObject({
      status: 'requested',
      items: [{ qty: 2, amountMinor: 2_10_000 }],
    })
    const after = await returnOptions(payload, shop.tenantId, order)
    expect(after.items[0]!.qty).toBe(1)
    expect(
      (await payload.findByID({ collection: 'orders', id: order.id, overrideAccess: true }))
        .returnStatus,
    ).toBe('requested')

    // Another store's owner can't decide it
    await expect(
      asOwner(other, (req) =>
        decideReturn(req, String(order.id), String(request.id), { action: 'reject', reason: 'No' }),
      ),
    ).rejects.toThrow()

    await asOwner(shop, (req) =>
      decideReturn(req, String(order.id), String(request.id), {
        action: 'approve',
        pickupNote: 'Our courier picks it up on Friday. Keep it in its box.',
      }),
    )
    const { docs: logs } = await payload.find({
      collection: 'notification-logs',
      where: {
        and: [{ order: { equals: order.id } }, { milestone: { equals: 'return_approved' } }],
      },
      overrideAccess: true,
    })
    expect(logs.length).toBeGreaterThan(0)
    expect(logs[0]!.returnRequest).toBe(String(request.id))

    await asOwner(shop, (req) =>
      decideReturn(req, String(order.id), String(request.id), { action: 'received' }),
    )
    await refundOrder(await reqAs(payload, shop.owner), String(order.id), {
      amountMinor: 2_10_000,
      reason: 'Returned: torn',
      manual: true,
      reference: 'UPI 77',
    })
    const closed = await payload.findByID({
      collection: 'return-requests',
      id: request.id,
      overrideAccess: true,
    })
    expect(closed.status).toBe('refunded')
  })

  it('rejects with a reason, and closes after the window', async () => {
    const order = await delivered(1)
    const item = order.items![0]!
    const request = await asSystem((req) =>
      requestReturn(
        req,
        shop.tenantId,
        order,
        {
          items: [{ orderItemId: item.id!, qty: 1 }],
          reason: 'changed-mind',
        },
        {},
      ),
    )
    await expect(
      asOwner(shop, (req) =>
        decideReturn(req, String(order.id), String(request.id), { action: 'reject', reason: '' }),
      ),
    ).rejects.toThrow()
    const rejected = await asOwner(shop, (req) =>
      decideReturn(req, String(order.id), String(request.id), {
        action: 'reject',
        reason: 'Used items can’t be returned',
      }),
    )
    expect(rejected.status).toBe('rejected')
    // A rejected request frees the item again, until the window closes
    expect((await returnOptions(payload, shop.tenantId, order)).items[0]!.qty).toBe(1)
    await payload.update({
      collection: 'orders',
      id: order.id,
      data: { completedAt: new Date(Date.now() - 10 * 86_400_000).toISOString() },
      overrideAccess: true,
    })
    const late = await payload.findByID({
      collection: 'orders',
      id: order.id,
      overrideAccess: true,
    })
    await expect(
      asSystem((req) =>
        requestReturn(
          req,
          shop.tenantId,
          late,
          {
            items: [{ orderItemId: item.id!, qty: 1 }],
            reason: 'damaged',
          },
          {},
        ),
      ),
    ).rejects.toThrow('closed')
  })
})
