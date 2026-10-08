import { on } from '@/lib/events'

import { adjustForRefund, recordReferral, reverseReferral, startHold } from './services/ledger'

/** The commission ledger follows the order (docs/11 "Events and side effects"). */
export function registerAffiliateEvents() {
  on('order.confirmed', 'affiliate:record', async ({ tenantId, orderId }, { req }) => {
    await recordReferral(req, tenantId, orderId)
  })
  on('order.delivered', 'affiliate:hold', ({ tenantId, orderId }, { req }) =>
    startHold(req, tenantId, orderId),
  )
  on('order.cancelled', 'affiliate:reverse', ({ tenantId, orderId }, { req }) =>
    reverseReferral(req, tenantId, orderId),
  )
  on('refund.processed', 'affiliate:refund', ({ tenantId, orderId, amountMinor }, { req }) =>
    adjustForRefund(req, tenantId, orderId, amountMinor),
  )
}
