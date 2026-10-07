import type { TaskConfig } from 'payload'
import { refreshSchemeStats } from '../services/stats'

/**
 * Moves schemes along their dates (docs/06 `schemes`: scheduled → live → ended) every minute,
 * and (through the collection's storefront hook) refreshes the store's pages so prices change
 * at that minute. The engine also checks the dates itself, so a late run never gives a discount after the end.
 */
export const switchSchemesTask: TaskConfig<'switch-schemes'> = {
  slug: 'switch-schemes',
  label: 'Start and end schemes on time',
  retries: 1,
  schedule: [{ cron: '0 * * * * *', queue: 'default' }],
  outputSchema: [{ name: 'changed', type: 'number', required: true }],
  handler: async ({ req }) => {
    const now = new Date().toISOString()
    const move = async (where: object, status: 'live' | 'ended') => {
      const { docs } = await req.payload.find({
        collection: 'schemes',
        where: where as never,
        depth: 0,
        limit: 500,
        pagination: false,
        overrideAccess: true,
      })
      for (const doc of docs) {
        await req.payload.update({
          collection: 'schemes',
          id: doc.id,
          data: { status, ...(status === 'ended' ? { endedAt: now } : {}) },
          overrideAccess: true,
          context: { schemeSwitch: true },
        })
      }
      return docs.length
    }
    const started = await move(
      {
        and: [
          { status: { equals: 'scheduled' } },
          { startsAt: { less_than_equal: now } },
          { endsAt: { greater_than: now } },
        ],
      },
      'live',
    )
    const ended = await move(
      {
        and: [
          { status: { in: ['scheduled', 'live', 'paused'] } },
          { endsAt: { less_than_equal: now } },
        ],
      },
      'ended',
    )
    // Coupons past their end read as expired on the Coupons screen
    const { docs: expired } = await req.payload.update({
      collection: 'coupons',
      where: { and: [{ status: { equals: 'active' } }, { endsAt: { less_than_equal: now } }] },
      data: { status: 'expired' },
      overrideAccess: true,
    })
    return { output: { changed: started + ended + expired.length } }
  },
}

/** Every night: results for live schemes and those that ended in the last week. */
export const schemeStatsTask: TaskConfig<'scheme-stats'> = {
  slug: 'scheme-stats',
  label: 'Work out scheme results',
  retries: 1,
  schedule: [{ cron: '0 15 2 * * *', queue: 'scheduled' }],
  outputSchema: [{ name: 'schemes', type: 'number', required: true }],
  handler: async ({ req }) => {
    const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()
    const { docs } = await req.payload.find({
      collection: 'schemes',
      where: {
        or: [
          { status: { in: ['live', 'paused'] } },
          { and: [{ status: { equals: 'ended' } }, { endsAt: { greater_than: weekAgo } }] },
        ],
      },
      depth: 0,
      limit: 1000,
      pagination: false,
      overrideAccess: true,
    })
    for (const doc of docs) {
      const tenant = typeof doc.tenant === 'object' ? doc.tenant?.id : doc.tenant
      if (tenant) await refreshSchemeStats(req.payload, String(tenant), String(doc.id))
    }
    return { output: { schemes: docs.length } }
  },
}
