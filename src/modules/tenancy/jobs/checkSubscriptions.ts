import type { TaskConfig } from 'payload'

import { refreshSubscriptionStatuses } from '../services/subscriptions'

/** Daily: store "past due" on trials and periods that ended unpaid (docs/15). */
export const checkSubscriptionsTask: TaskConfig<'tenancy-check-subscriptions'> = {
  slug: 'tenancy-check-subscriptions',
  label: 'Mark unpaid subscriptions past due',
  retries: 3,
  // 19:00 UTC = 00:30 IST, every day (cron fields: second minute hour day month weekday)
  schedule: [{ cron: '0 0 19 * * *', queue: 'scheduled' }],
  outputSchema: [{ name: 'changed', type: 'number', required: true }],
  handler: async ({ req }) => {
    const changed = await refreshSubscriptionStatuses(req)
    return { output: { changed } }
  },
}
