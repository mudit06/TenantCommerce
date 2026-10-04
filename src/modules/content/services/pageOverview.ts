import type { Payload, TypedUser } from 'payload'

import { upcomingPageSchedules, type ScheduledChange } from './pageSchedule'

export type PageStatus = 'draft' | 'published' | 'scheduled' | 'changed'

export type PageRow = {
  id: string
  title: string
  slug: string
  template: string
  status: PageStatus
  updatedAt: string
  lastEditedBy: string | null
  publishedAt: string | null
  scheduled: ScheduledChange | null
}

/** Pages a store has at most for the overview (a store has tens, not thousands). */
const MAX_PAGES = 500

const FIELDS = {
  title: true,
  slug: true,
  template: true,
  _status: true,
  updatedAt: true,
  lastEditedBy: true,
  publishedAt: true,
} as const

/**
 * One store's pages with their real lifecycle state, for the Pages list and the dashboard:
 * published, draft, scheduled (a publish job is waiting) or published with unpublished changes
 * (the newest version is a draft). Filtered by store explicitly (docs/04); pass `user` to apply
 * that person's access as well.
 */
export async function storePageOverview(
  payload: Payload,
  tenantId: string,
  user?: TypedUser | null,
): Promise<PageRow[]> {
  const access = user ? { user, overrideAccess: false } : { overrideAccess: true }
  const where = { tenant: { equals: tenantId } }
  const [latest, live] = await Promise.all([
    payload.find({
      collection: 'pages',
      where,
      draft: true,
      depth: 0,
      limit: MAX_PAGES,
      sort: '-updatedAt',
      select: FIELDS,
      ...access,
    }),
    payload.find({
      collection: 'pages',
      where,
      draft: false,
      depth: 0,
      limit: MAX_PAGES,
      select: { _status: true, publishedAt: true },
      ...access,
    }),
  ])
  const liveById = new Map(live.docs.map((doc) => [String(doc.id), doc]))
  const schedules = await upcomingPageSchedules(
    payload,
    latest.docs.map((doc) => String(doc.id)),
  )
  return latest.docs.map((doc) => {
    const id = String(doc.id)
    const published = liveById.get(id)?._status === 'published'
    const scheduled = schedules.get(id) ?? null
    const status: PageStatus = published
      ? doc._status === 'draft'
        ? 'changed'
        : 'published'
      : scheduled?.type === 'publish'
        ? 'scheduled'
        : 'draft'
    return {
      id,
      title: doc.title,
      slug: doc.slug ?? '',
      template: doc.template ?? 'default',
      status,
      updatedAt: doc.updatedAt,
      lastEditedBy: doc.lastEditedBy ?? null,
      publishedAt: published ? (liveById.get(id)?.publishedAt ?? doc.publishedAt ?? null) : null,
      scheduled,
    }
  })
}

/** Where shoppers find a page on the store. */
export const pageAddress = (slug: string) => (slug === 'home' ? '/' : `/pages/${slug}`)
