import type { TaskConfig } from 'payload'

import { retrackQuietParcels } from '../services/shiprocket'

/** Every 3 hours: re-track Shiprocket parcels with no news for a day (docs/09 "Missed webhooks"). */
export const retrackParcelsTask: TaskConfig<'orders-retrack-parcels'> = {
  slug: 'orders-retrack-parcels',
  label: 'Re-track quiet Shiprocket parcels',
  retries: 1,
  schedule: [{ cron: '0 7 */3 * * *', queue: 'scheduled' }],
  outputSchema: [
    { name: 'checked', type: 'number', required: true },
    { name: 'moved', type: 'number', required: true },
  ],
  handler: async ({ req }) => ({ output: await retrackQuietParcels(req) }),
}
