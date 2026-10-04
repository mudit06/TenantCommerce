import { unstable_cache } from 'next/cache'

import { storefrontTag } from '@/hooks/revalidateStorefront'
import type { Page } from '@/payload-types'

import { getPayloadClient } from './payload'

/** A published page of this store (drafts never reach shoppers). */
export const getPublishedPage = (tenantId: string, slug: string): Promise<Page | null> =>
  unstable_cache(
    async () => {
      const payload = await getPayloadClient()
      const { docs } = await payload.find({
        collection: 'pages',
        where: {
          and: [
            { tenant: { equals: tenantId } },
            { slug: { equals: slug } },
            { _status: { equals: 'published' } },
          ],
        },
        depth: 2,
        limit: 1,
        draft: false,
        overrideAccess: true,
      })
      return docs[0] ?? null
    },
    ['page', tenantId, slug],
    { tags: [storefrontTag(tenantId)], revalidate: 3600 },
  )()

/**
 * The latest draft of one page of this store, for the editor's preview only (never cached: the
 * preview route checks a signed link first). The store filter is explicit (CLAUDE.md rule 1).
 */
export async function getDraftPage(tenantId: string, pageId: string): Promise<Page | null> {
  const payload = await getPayloadClient()
  const { docs } = await payload.find({
    collection: 'pages',
    where: { and: [{ tenant: { equals: tenantId } }, { id: { equals: pageId } }] },
    depth: 2,
    limit: 1,
    draft: true,
    overrideAccess: true,
  })
  return docs[0] ?? null
}

/** Live banners for a placement, highest priority first. */
export const getBanners = (
  tenantId: string,
  placement: 'home-hero' | 'category-top' | 'announcement' | 'popup',
) =>
  unstable_cache(
    async () => {
      const payload = await getPayloadClient()
      const now = new Date().toISOString()
      const { docs } = await payload.find({
        collection: 'banners',
        where: {
          and: [
            { tenant: { equals: tenantId } },
            { placement: { equals: placement } },
            { isActive: { equals: true } },
            { or: [{ startsAt: { exists: false } }, { startsAt: { less_than_equal: now } }] },
            { or: [{ endsAt: { exists: false } }, { endsAt: { greater_than: now } }] },
          ],
        },
        depth: 2,
        sort: '-priority',
        limit: 5,
        overrideAccess: true,
      })
      return docs
    },
    ['banners', tenantId, placement],
    // Short: a banner's start and end times must take effect without an edit
    { tags: [storefrontTag(tenantId)], revalidate: 300 },
  )()
