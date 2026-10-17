import type { TaskConfig } from 'payload'

/** No task holds a job this long: a shopper message takes seconds, a scheme switch a minute. */
const LOCK_LIMIT_MS = 30 * 60_000

/**
 * The queue only runs jobs that are not `processing`, and Payload never clears that flag when
 * the runner stops mid-run (a server restart, a crash, a serverless timeout). Those jobs then
 * wait forever; shopper messages stayed "Sending" for a week (QA, 10 Oct). Every five minutes
 * this hands such jobs back to the queue. Each task is idempotent (docs/15), so a second run is
 * safe; imports are left alone because they may run long and keep their own progress.
 */
export const releaseStuckJobsTask: TaskConfig<'release-stuck-jobs'> = {
  slug: 'release-stuck-jobs',
  label: 'Release jobs left locked by a stopped runner',
  retries: 1,
  schedule: [{ cron: '0 */5 * * * *', queue: 'scheduled' }],
  outputSchema: [{ name: 'released', type: 'number', required: true }],
  handler: async ({ req }) => {
    const before = new Date(Date.now() - LOCK_LIMIT_MS).toISOString()
    const { docs } = await req.payload.update({
      collection: 'payload-jobs',
      where: {
        and: [
          { processing: { equals: true } },
          { completedAt: { exists: false } },
          { updatedAt: { less_than: before } },
          { taskSlug: { not_equals: 'run-import' } },
        ],
      },
      data: { processing: false },
      depth: 0,
      overrideAccess: true,
    })
    if (docs.length)
      req.payload.logger.warn(
        { jobs: docs.map((job) => job.id) },
        `Released ${docs.length} job(s) left locked by a stopped runner`,
      )
    return { output: { released: docs.length } }
  },
}
