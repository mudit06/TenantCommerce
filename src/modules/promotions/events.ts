import { on } from '@/lib/events'

import { holdCoupon, releaseCoupon, useCoupon } from './services/redemptions'

/** Coupon uses follow the order (docs/11 "Events and side effects"), in the order's transaction. */
export function registerPromotionEvents(): void {
  on('order.placed', 'promotions:hold-coupon', async ({ tenantId, orderId }, { req }) => {
    const order = await req.payload.findByID({
      collection: 'orders',
      id: orderId,
      depth: 0,
      overrideAccess: true,
      req,
    })
    await holdCoupon(req, tenantId, order)
  })
  on('order.confirmed', 'promotions:use-coupon', async ({ tenantId, orderId }, { req }) => {
    await useCoupon(req, tenantId, orderId)
  })
  on('order.cancelled', 'promotions:release-coupon', async ({ tenantId, orderId }, { req }) => {
    await releaseCoupon(req, tenantId, orderId)
  })
}
