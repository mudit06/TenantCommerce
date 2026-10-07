import type { TaskConfig } from 'payload'

import { queueReviewRequests } from '../services/requests'

/** Every morning: review requests for orders delivered the set number of days ago. */
export const reviewRequestsTask: TaskConfig<'review-requests'> = {
  slug: 'review-requests',
  label: 'Ask buyers for a review',
  retries: 1,
  schedule: [{ cron: '0 0 5 * * *', queue: 'scheduled' }],
  outputSchema: [{ name: 'queued', type: 'number', required: true }],
  handler: async ({ req }) => ({ output: { queued: await queueReviewRequests(req.payload, req) } }),
}
