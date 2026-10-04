import type { PayloadRequest } from 'payload'

import { idOf } from '@/access'
import { env } from '@/lib/env'
import { signPreviewToken } from '@/lib/preview-token'
import { storeOriginForHost } from '@/lib/storeOrigin'

/** Where the store's draft preview of a page lives (src/app/(storefront)/[tenant]/preview). */
export const PREVIEW_PATH = '/preview/pages'

/**
 * The live preview address of a saved page: on the store's primary domain, so it renders with
 * that vendor's own storefront code (vendors/<slug>, else vendors/default), signed for this page
 * and store only. None for an unsaved page or a store without a domain yet.
 */
export async function pagePreviewUrl(
  req: PayloadRequest,
  data: { id?: unknown; tenant?: unknown } | null | undefined,
): Promise<string | null> {
  const pageId = idOf(data?.id)
  const tenantId = idOf(data?.tenant)
  if (!pageId || !tenantId) return null
  const { docs } = await req.payload.find({
    collection: 'tenant-domains',
    where: { and: [{ tenant: { equals: tenantId } }, { isPrimary: { equals: true } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const host = docs[0]?.host
  if (!host) return null
  const token = await signPreviewToken({ pageId, tenantId }, env.PAYLOAD_SECRET)
  return `${storeOriginForHost(host, env.ADMIN_URL)}${PREVIEW_PATH}/${encodeURIComponent(pageId)}?token=${encodeURIComponent(token)}`
}
