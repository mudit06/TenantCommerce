import type { TaskConfig } from 'payload'

import { sendLog } from '../services/send'

/** Sends one shopper message (docs/18 "How a message is sent"), retried with backoff. */
export const sendNotificationTask: TaskConfig<'notifications-send'> = {
  slug: 'notifications-send',
  label: 'Send a shopper message',
  retries: { attempts: 4, backoff: { type: 'exponential', delay: 30_000 } },
  inputSchema: [{ name: 'logId', type: 'text', required: true }],
  outputSchema: [{ name: 'outcome', type: 'text', required: true }],
  handler: async ({ input, req }) => {
    const outcome = await sendLog(req.payload, input.logId)
    // Throwing hands the retry to the job queue; the row stays queued with its last error
    if (outcome === 'retry') throw new Error('The provider failed; trying again later')
    return { output: { outcome } }
  },
}
