import type { TaskConfig } from 'payload'

import { approveDueReferrals } from '../services/ledger'

/** Daily, early morning India time: commission whose return window has closed is approved. */
export const approveCommissionTask: TaskConfig<'approve-commission'> = {
  slug: 'approve-commission',
  label: 'Approve affiliate commission after the return window',
  retries: 1,
  schedule: [{ cron: '0 30 23 * * *', queue: 'scheduled' }],
  outputSchema: [{ name: 'approved', type: 'number', required: true }],
  handler: async ({ req }) => ({ output: { approved: await approveDueReferrals(req) } }),
}
