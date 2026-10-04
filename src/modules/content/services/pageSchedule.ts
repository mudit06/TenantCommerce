import type { Payload } from 'payload'

export type ScheduledChange = { at: string; type: 'publish' | 'unpublish' }

/**
 * Upcoming scheduled publishes of pages, from Payload's own job queue (the same query as its
 * schedule drawer). Jobs are not tenant-scoped, so callers pass the ids of one store's pages.
 */
export async function upcomingPageSchedules(
  payload: Payload,
  pageIds: readonly string[],
  now: Date = new Date(),
): Promise<Map<string, ScheduledChange>> {
  const schedules = new Map<string, ScheduledChange>()
  if (pageIds.length === 0) return schedules
  const { docs } = await payload.find({
    collection: 'payload-jobs',
    where: {
      and: [
        { taskSlug: { equals: 'schedulePublish' } },
        { waitUntil: { greater_than: now.toISOString() } },
        { 'input.doc.relationTo': { equals: 'pages' } },
        { 'input.doc.value': { in: pageIds.map(String) } },
      ],
    },
    sort: 'waitUntil',
    limit: 500,
    depth: 0,
    overrideAccess: true,
  })
  for (const job of docs) {
    const input = job.input as { doc?: { value?: unknown }; type?: unknown } | null
    const id = input?.doc?.value
    if (typeof id !== 'string' || !job.waitUntil || schedules.has(id)) continue
    schedules.set(id, {
      at: job.waitUntil,
      type: input?.type === 'unpublish' ? 'unpublish' : 'publish',
    })
  }
  return schedules
}
