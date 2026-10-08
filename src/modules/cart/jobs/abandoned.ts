import type { TaskConfig } from 'payload'

import { remindAbandonedCarts } from '../services/abandoned'

/**
 * Every five minutes: reminders for carts that went quiet. Kept out of the cart module's index
 * (it reads the orders module, which reads this one) and wired in payload.config directly.
 */
export const abandonedCartsTask: TaskConfig<'abandoned-carts'> = {
  slug: 'abandoned-carts',
  label: 'Remind shoppers of carts they left',
  retries: 1,
  schedule: [{ cron: '0 */5 * * * *', queue: 'scheduled' }],
  outputSchema: [{ name: 'reminded', type: 'number', required: true }],
  handler: async ({ req }) => ({ output: { reminded: await remindAbandonedCarts(req) } }),
}
