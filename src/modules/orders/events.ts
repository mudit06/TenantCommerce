import { on } from '@/lib/events'

import { markReturnRefunded } from './services/returns'

/** A refund on an order with a received return closes that return (docs/11 "Returns"). */
export function registerOrderEvents() {
  on('refund.processed', 'orders:return-refunded', ({ tenantId, orderId, refundId }, { req }) =>
    markReturnRefunded(req, tenantId, orderId, refundId),
  )
}
