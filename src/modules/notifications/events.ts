import { on } from '@/lib/events'

import { MILESTONE_FOR_PARCEL } from './milestones'
import { indianMobile } from './rules'
import { queueMilestone, queueStaffAlert } from './services/engine'
import { setWhatsAppUpdates } from './services/preferences'
import { ensureSettings } from './services/settings'
import { ensureStarterTemplates } from './services/templates'

/**
 * The order journey's messages (docs/18): every step is an event from the orders, shipping and
 * payments modules, never a direct call. Handlers run in the emitter's transaction and only
 * write logs and queue the send job.
 */
export function registerNotificationEvents(): void {
  on('tenant.created', 'notifications:store-defaults', async ({ tenantId }, { req }) => {
    await ensureSettings(req, tenantId)
    await ensureStarterTemplates(req, tenantId)
  })

  // The WhatsApp box at checkout, kept by phone so STOP and the next order agree
  on('order.placed', 'notifications:checkout-opt-in', async ({ tenantId, orderId }, { req }) => {
    const order = await req.payload.findByID({
      collection: 'orders',
      id: orderId,
      depth: 0,
      overrideAccess: true,
      req,
    })
    const phone = indianMobile(order.contact?.phone)
    if (order.whatsappOptIn && phone)
      await setWhatsAppUpdates(req, tenantId, phone, true, 'checkout')
  })

  on('order.confirmed', 'notifications:order-confirmed', async ({ tenantId, orderId }, { req }) => {
    await queueMilestone(req, { tenantId, orderId, milestone: 'order_confirmed' })
    await queueStaffAlert(req, { tenantId, alert: 'new_order', orderId, key: orderId })
  })

  on('shipment.changed', 'notifications:parcel', async (event, { req }) => {
    const milestone = MILESTONE_FOR_PARCEL[event.to]
    if (!milestone) return
    await queueMilestone(req, {
      tenantId: event.tenantId,
      orderId: event.orderId,
      shipmentId: event.shipmentId,
      milestone,
      // A second failed delivery or a re-attempt sends a second message
      attempt: ['out_for_delivery', 'delivery_failed'].includes(event.to) ? event.attempt : 0,
    })
    if (event.to === 'delivery_failed') {
      await queueStaffAlert(req, {
        tenantId: event.tenantId,
        alert: 'delivery_failed',
        orderId: event.orderId,
        key: `${event.shipmentId}:${event.attempt}`,
      })
    }
  })

  on('order.cancelled', 'notifications:order-cancelled', ({ tenantId, orderId }, { req }) =>
    queueMilestone(req, { tenantId, orderId, milestone: 'order_cancelled' }).then(() => {}),
  )

  on('refund.processed', 'notifications:refund', ({ tenantId, orderId, refundId }, { req }) =>
    queueMilestone(req, { tenantId, orderId, refundId, milestone: 'refund_processed' }).then(
      () => {},
    ),
  )
}
