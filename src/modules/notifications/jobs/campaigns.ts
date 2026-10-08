import type { TaskConfig } from 'payload'

import { sendDueCampaigns } from '../services/campaigns'

/** Every five minutes: offer messages whose time has come are queued, one per shopper. */
export const sendCampaignsTask: TaskConfig<'offer-campaigns-send'> = {
  slug: 'offer-campaigns-send',
  label: 'Send scheduled offer messages',
  retries: 1,
  schedule: [{ cron: '0 */5 * * * *', queue: 'scheduled' }],
  outputSchema: [{ name: 'campaigns', type: 'number', required: true }],
  handler: async ({ req }) => ({ output: { campaigns: await sendDueCampaigns(req) } }),
}
