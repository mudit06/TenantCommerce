import { unstable_cache } from 'next/cache'

import { storefrontTag } from '@/hooks/revalidateStorefront'
import type { DealerPoint } from '@/modules/dealers'

import { getPayloadClient } from './payload'

export type StoreDealer = DealerPoint & {
  phone: string
  email: string | null
  hours: string | null
}

/** The store's dealers marked "Show on store" (docs/screens storefront `st-dealers`). */
export const getDealers = (tenantId: string): Promise<StoreDealer[]> =>
  unstable_cache(
    async () => {
      const payload = await getPayloadClient()
      const { docs } = await payload.find({
        collection: 'dealers',
        where: { and: [{ tenant: { equals: tenantId } }, { isActive: { not_equals: false } }] },
        depth: 0,
        limit: 2000,
        pagination: false,
        overrideAccess: true,
      })
      return docs.map((d) => ({
        id: String(d.id),
        name: d.name,
        type: d.type,
        city: d.city,
        state: d.state,
        pincode: d.pincode,
        address: d.address,
        location: Array.isArray(d.location) ? (d.location as [number, number]) : null,
        phone: d.phone,
        email: d.email ?? null,
        hours: d.hours ?? null,
      }))
    },
    ['dealers', tenantId],
    { tags: [storefrontTag(tenantId)], revalidate: 3600 },
  )()
