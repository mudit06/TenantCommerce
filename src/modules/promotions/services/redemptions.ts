import type { PayloadRequest } from 'payload'

import { conditionalUpdate } from '@/lib/db/atomic'
import { AppError } from '@/lib/errors'
import type { Order } from '@/payload-types'

// Coupon uses (docs/06 `coupon-redemptions`, docs/screens Coupons rule 2): counted when an order
// is placed, inside its transaction, so the last use of a limited code goes to one shopper only;
// given back when the order is cancelled.

/** On order.placed: holds the coupon's use, or fails the order when the last use just went. */
export async function holdCoupon(req: PayloadRequest, tenantId: string, order: Order) {
  const applied = order.appliedOffers?.find((offer) => offer.kind === 'coupon')
  if (!applied?.ref) return
  const counted = await conditionalUpdate(req, {
    collection: 'coupons',
    id: applied.ref,
    tenantId,
    condition: {
      $or: [
        { usageLimit: null },
        { usageLimit: { $exists: false } },
        { $expr: { $lt: [{ $ifNull: ['$usedCount', 0] }, '$usageLimit'] } },
      ],
    },
    update: { $inc: { usedCount: 1 }, $set: { updatedAt: new Date() } },
  })
  if (!counted) {
    throw new AppError(
      'BUSINESS_RULE',
      `${applied.code ?? 'This code'} has just been fully used.`,
      422,
      {
        couponCode: 'This code has just been fully used',
      },
    )
  }
  await req.payload.create({
    collection: 'coupon-redemptions',
    data: {
      tenant: tenantId,
      coupon: applied.ref,
      code: applied.code ?? undefined,
      order: String(order.id),
      customer: order.customer ?? undefined,
      contact: {
        email: order.contact?.email?.toLowerCase() ?? undefined,
        phone: order.contact?.phone ?? undefined,
      },
      discountMinor: applied.discountMinor ?? 0,
      status: order.status === 'pending' ? 'held' : 'used',
    },
    overrideAccess: true,
    req,
  })
}

async function redemptionOf(req: PayloadRequest, tenantId: string, orderId: string) {
  const { docs } = await req.payload.find({
    collection: 'coupon-redemptions',
    where: { and: [{ tenant: { equals: tenantId } }, { order: { equals: orderId } }] },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  return docs[0] ?? null
}

/** On order.confirmed (paid online or COD): the held use becomes a use. */
export async function useCoupon(req: PayloadRequest, tenantId: string, orderId: string) {
  const row = await redemptionOf(req, tenantId, orderId)
  if (row?.status !== 'held') return
  await req.payload.update({
    collection: 'coupon-redemptions',
    id: row.id,
    data: { status: 'used' },
    overrideAccess: true,
    req,
  })
}

/** On order.cancelled: the use comes back to the coupon (docs/11 "Coupons used on a cancelled order are released"). */
export async function releaseCoupon(req: PayloadRequest, tenantId: string, orderId: string) {
  const row = await redemptionOf(req, tenantId, orderId)
  if (!row || row.status === 'released') return
  await req.payload.update({
    collection: 'coupon-redemptions',
    id: row.id,
    data: { status: 'released' },
    overrideAccess: true,
    req,
  })
  await conditionalUpdate(req, {
    collection: 'coupons',
    id: row.coupon,
    tenantId,
    condition: { usedCount: { $gt: 0 } },
    update: { $inc: { usedCount: -1 }, $set: { updatedAt: new Date() } },
  })
}
