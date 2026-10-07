import { on } from '@/lib/events'

import { refreshCustomerStats } from './services/account'

/** An account's orders, spend and last order follow its orders (docs/screens Customers). */
export function registerCustomerEvents(): void {
  for (const name of ['order.confirmed', 'order.cancelled', 'refund.processed'] as const) {
    on(name, `customers:stats:${name}`, async ({ tenantId, orderId }, { req }) => {
      const order = await req.payload.findByID({
        collection: 'orders',
        id: orderId,
        depth: 0,
        overrideAccess: true,
        select: { customer: true },
        req,
      })
      if (order.customer) await refreshCustomerStats(req, tenantId, order.customer)
    })
  }
}
