import type { TaskConfig } from 'payload'

import { reconcileOnlinePayments } from '../services/online'

/** Every 15 minutes: settle or cancel online orders left unpaid past 30 minutes (docs/09 step 5). */
export const reconcilePaymentsTask: TaskConfig<'payments-reconcile'> = {
  slug: 'payments-reconcile',
  label: 'Settle or cancel unpaid online orders',
  retries: 1,
  schedule: [{ cron: '0 */15 * * * *', queue: 'scheduled' }],
  outputSchema: [
    { name: 'settled', type: 'number', required: true },
    { name: 'cancelled', type: 'number', required: true },
  ],
  handler: async ({ req }) => ({ output: await reconcileOnlinePayments(req) }),
}
