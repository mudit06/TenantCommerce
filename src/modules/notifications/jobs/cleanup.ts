import type { TaskConfig } from 'payload'

/** Messages are kept 90 days (docs/06 `notification-logs`): every night, older rows go. */
export const cleanupNotificationLogsTask: TaskConfig<'notifications-cleanup'> = {
  slug: 'notifications-cleanup',
  label: 'Delete messages older than 90 days',
  retries: 1,
  schedule: [{ cron: '0 30 2 * * *', queue: 'scheduled' }],
  outputSchema: [{ name: 'deleted', type: 'number', required: true }],
  handler: async ({ req }) => {
    const before = new Date(Date.now() - 90 * 86_400_000).toISOString()
    const { docs } = await req.payload.delete({
      collection: 'notification-logs',
      where: { createdAt: { less_than: before } },
      overrideAccess: true,
    })
    return { output: { deleted: docs.length } }
  },
}
