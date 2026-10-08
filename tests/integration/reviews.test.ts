import type { Payload, PayloadRequest } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { withTransaction } from '@/lib/db/transaction'
import { saveCodRules } from '@/modules/content'
import { moveParcel, packParcel, placeOrder, placeOrderSchema } from '@/modules/orders'
import {
  accountWishlist,
  queueReviewRequests,
  readReviewToken,
  reviewableItems,
  reviewToken,
  saveWishlist,
  submitReview,
} from '@/modules/reviews'
import { moderateReview, saveReviewSettings } from '@/modules/reviews/services/moderate'
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

// Reviews (docs/screens Reviews, Write a review): only delivered items, one review per item,
// held for approval, approved whatever the rating, rejected only with a reason, the product's
// rating from published reviews; review requests once per order; wishlists per account.

let payload: Payload
let plans: Record<string, Plan>
let admin: TestUser
let shopA: Shop
let shopB: Shop

const asOwner = async <T>(shop: Shop, fn: (req: PayloadRequest) => Promise<T>) => {
  const req = await reqAs(payload, shop.owner)
  return withTransaction(req, () => fn(req))
}
const asSystem = async <T>(fn: (req: PayloadRequest) => Promise<T>) => {
  const req = await reqAs(payload)
  return withTransaction(req, () => fn(req))
}

async function deliveredOrder(shop: Shop): Promise<Order> {
  const input = placeOrderSchema.parse(sampleOrderInput({ paymentMethod: 'cod' }))
  const { order } = await asSystem((req) =>
    placeOrder(req, shop.tenantId, {
      lines: [{ productId: shop.towel, qty: 1 }],
      input,
      live: null,
    }),
  )
  const parcel = await asOwner(shop, (req) => packParcel(req, String(order.id)))
  await asOwner(shop, (req) =>
    moveParcel(req, String(parcel.id), {
      to: 'shipped',
      carrier: 'Delhivery',
      trackingNumber: 'AWB1',
    }),
  )
  await asOwner(shop, (req) => moveParcel(req, String(parcel.id), { to: 'delivered' }))
  return payload.findByID({ collection: 'orders', id: order.id, overrideAccess: true })
}

beforeAll(async () => {
  payload = await startPayload()
  plans = await seedPlans(payload)
  admin = await createPlatformUser(payload, 'admin@platform.test', 'super-admin')
  shopA = await buildShop(payload, {
    admin,
    plan: plans.starter!,
    slug: 'rev-a',
    ownerEmail: 'a@rev.test',
  })
  shopB = await buildShop(payload, {
    admin,
    plan: plans.starter!,
    slug: 'rev-b',
    ownerEmail: 'b@rev.test',
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

describe('reviews', () => {
  let order: Order

  it('takes reviews of delivered items only, one per item', async () => {
    const input = placeOrderSchema.parse(sampleOrderInput({ paymentMethod: 'cod' }))
    const { order: fresh } = await asSystem((req) =>
      placeOrder(req, shopA.tenantId, {
        lines: [{ productId: shopA.towel, qty: 1 }],
        input,
        live: null,
      }),
    )
    expect(await reviewableItems(payload, shopA.tenantId, fresh)).toEqual([])

    order = await deliveredOrder(shopA)
    const [item] = await reviewableItems(payload, shopA.tenantId, order)
    expect(item).toMatchObject({ title: 'Cotton bath towel', reviewed: false })
    const review = await asSystem((req) =>
      submitReview(
        req,
        shopA.tenantId,
        order,
        {
          orderItemId: item!.orderItemId,
          rating: 2,
          title: 'Thin',
          body: 'Thinner than shown',
          displayName: 'Rahul K., Pune',
        },
        { source: 'review-email' },
      ),
    )
    // Held for approval by default; the shown name is one of the choices, never the email
    expect(review).toMatchObject({ status: 'pending', displayName: 'Rahul K., Pune', rating: 2 })
    await expect(
      asSystem((req) =>
        submitReview(
          req,
          shopA.tenantId,
          order,
          { orderItemId: item!.orderItemId, rating: 5, displayName: 'x@example.com' },
          { source: 'review-email' },
        ),
      ),
    ).rejects.toThrow(/already reviewed/)
  })

  it('publishes a low rating like any other, with a reply, and updates the product', async () => {
    const { docs } = await payload.find({
      collection: 'reviews',
      where: { tenant: { equals: shopA.tenantId } },
      overrideAccess: true,
    })
    const review = docs[0]!
    await asOwner(shopA, (req) =>
      moderateReview(req, shopA.tenantId, String(review.id), {
        action: 'approve',
        reply: 'Sorry about this. We will send a thicker one.',
      }),
    )
    const product = await payload.findByID({
      collection: 'products',
      id: shopA.towel,
      overrideAccess: true,
    })
    expect(product.rating).toMatchObject({ average: 2, count: 1 })
    const { docs: logs } = await payload.find({
      collection: 'notification-logs',
      where: {
        and: [{ tenant: { equals: shopA.tenantId } }, { milestone: { equals: 'review_reply' } }],
      },
      overrideAccess: true,
    })
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({ kind: 'review', channel: 'email', to: 'rahul.k@example.com' })
    // Store B's owner can't touch store A's review
    await expect(
      asOwner(shopB, (req) =>
        moderateReview(req, shopB.tenantId, String(review.id), {
          action: 'reject',
          reason: 'spam',
        }),
      ),
    ).rejects.toThrow('Review not found')
  })

  it('publishes straight away when the store doesn’t hold reviews', async () => {
    await asOwner(shopA, (req) =>
      saveReviewSettings(req, shopA.tenantId, {
        holdForApproval: false,
        showOnProductPages: true,
        allowPhotos: true,
        requestAfterDays: 5,
        requestChannels: ['email'],
      }),
    )
    const second = await deliveredOrder(shopA)
    const [item] = await reviewableItems(payload, shopA.tenantId, second)
    const review = await asSystem((req) =>
      submitReview(
        req,
        shopA.tenantId,
        second,
        { orderItemId: item!.orderItemId, rating: 5, displayName: 'Rahul' },
        { source: 'account' },
      ),
    )
    expect(review.status).toBe('published')
    const product = await payload.findByID({
      collection: 'products',
      id: shopA.towel,
      overrideAccess: true,
    })
    expect(product.rating).toMatchObject({ average: 3.5, count: 2 })
  })

  it('signs review links and refuses a changed one', () => {
    const token = reviewToken(String(order.id))
    expect(readReviewToken(token)).toBe(String(order.id))
    expect(readReviewToken(token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A'))).toBeNull()
    expect(readReviewToken(reviewToken(String(order.id), Date.now() - 100 * 86_400_000))).toBeNull()
  })

  it('asks for a review once, the set number of days after delivery', async () => {
    const delivered = await deliveredOrder(shopB)
    await payload.update({
      collection: 'orders',
      id: delivered.id,
      data: { completedAt: new Date(Date.now() - 5.5 * 86_400_000).toISOString() },
      overrideAccess: true,
    })
    const req = await reqAs(payload)
    expect(await queueReviewRequests(payload, req)).toBeGreaterThanOrEqual(1)
    expect(await queueReviewRequests(payload, req)).toBe(0)
    const { docs } = await payload.find({
      collection: 'notification-logs',
      where: {
        and: [{ order: { equals: delivered.id } }, { milestone: { equals: 'review_request' } }],
      },
      overrideAccess: true,
    })
    expect(docs).toHaveLength(1)
    expect(JSON.parse(docs[0]!.text!).email.button.url).toMatch(/\/review\//)
  })
})

describe('wishlists', () => {
  it('merges the device’s list into the account, per store', async () => {
    const req = await reqAs(payload)
    const customerId = '0123456789abcdef01234567'
    await saveWishlist(
      req,
      shopA.tenantId,
      customerId,
      [{ productId: shopA.towel, variantId: null }],
      { merge: false },
    )
    const merged = await saveWishlist(
      req,
      shopA.tenantId,
      customerId,
      [
        { productId: shopA.tap, variantId: shopA.chrome },
        { productId: shopA.towel, variantId: null },
      ],
      { merge: true },
    )
    expect(merged).toHaveLength(2)
    expect(await accountWishlist(payload, shopA.tenantId, customerId)).toHaveLength(2)
    expect(await accountWishlist(payload, shopB.tenantId, customerId)).toEqual([])
  })
})
