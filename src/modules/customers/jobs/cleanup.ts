import type { TaskConfig } from 'payload'

/** Every night: sign-in codes over a day old and sessions ended over 30 days ago go. */
export const cleanupCustomerAuthTask: TaskConfig<'customers-cleanup'> = {
  slug: 'customers-cleanup',
  label: 'Delete old sign-in codes and sessions',
  retries: 1,
  schedule: [{ cron: '0 45 2 * * *', queue: 'scheduled' }],
  outputSchema: [{ name: 'deleted', type: 'number', required: true }],
  handler: async ({ req }) => {
    const day = new Date(Date.now() - 86_400_000).toISOString()
    const month = new Date(Date.now() - 30 * 86_400_000).toISOString()
    const codes = await req.payload.delete({
      collection: 'login-codes',
      where: { createdAt: { less_than: day } },
      overrideAccess: true,
    })
    const sessions = await req.payload.delete({
      collection: 'customer-sessions',
      where: {
        or: [
          { expiresAt: { less_than: new Date().toISOString() } },
          { revokedAt: { less_than: month } },
        ],
      },
      overrideAccess: true,
    })
    return { output: { deleted: codes.docs.length + sessions.docs.length } }
  },
}
