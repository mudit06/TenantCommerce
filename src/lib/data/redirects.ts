import { unstable_cache } from 'next/cache'

import { storefrontTag } from '@/hooks/revalidateStorefront'

import { getPayloadClient } from './payload'

/** Where an old store address now lives, or null (docs/12, docs/13 "Redirects"). */
export const findRedirect = (tenantId: string, path: string): Promise<string | null> => {
  const from = path.length > 1 ? path.replace(/\/+$/, '') : path
  return unstable_cache(
    async () => {
      const payload = await getPayloadClient()
      const { docs } = await payload.find({
        collection: 'redirects',
        where: { and: [{ tenant: { equals: tenantId } }, { from: { equals: from } }] },
        limit: 1,
        depth: 0,
        pagination: false,
        overrideAccess: true,
        select: { to: true },
      })
      return docs[0]?.to ?? null
    },
    ['redirect', tenantId, from],
    { tags: [storefrontTag(tenantId)], revalidate: 3600 },
  )()
}
