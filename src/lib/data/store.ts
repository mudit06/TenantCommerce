import { unstable_cache } from 'next/cache'

import { idOf } from '@/access'
import { storefrontTag } from '@/hooks/revalidateStorefront'
import { HOST_MAP_TAG, tenantTag } from '@/lib/cache'
import { getTenantFeatures } from '@/modules/tenancy'
import type { Navigation, SiteSetting } from '@/payload-types'

import { getPayloadClient } from './payload'

// Storefront data layer (docs/04 "Three layers of isolation", layer 2): every function takes the
// store first and filters on it; storefront pages never call Payload directly.

export type StoreRef = {
  tenantId: string
  slug: string
  name: string
  status: 'draft' | 'active' | 'suspended' | 'archived'
  host: string
  primaryHost: string | null
  redirectToPrimary: boolean
}

/** The store a request host belongs to, or null for an unknown host (cached, docs/04). */
export const getStoreByHost = (host: string): Promise<StoreRef | null> =>
  unstable_cache(
    async () => {
      const payload = await getPayloadClient()
      const { docs } = await payload.find({
        collection: 'tenant-domains',
        where: { host: { equals: host } },
        depth: 1,
        limit: 1,
        overrideAccess: true,
      })
      const domain = docs[0]
      const tenant = domain && typeof domain.tenant === 'object' ? domain.tenant : null
      if (!domain || !tenant) return null
      const { docs: primary } = await payload.find({
        collection: 'tenant-domains',
        where: { and: [{ tenant: { equals: tenant.id } }, { isPrimary: { equals: true } }] },
        depth: 0,
        limit: 1,
        overrideAccess: true,
      })
      return {
        tenantId: String(tenant.id),
        slug: tenant.slug,
        name: tenant.name,
        status: tenant.status,
        host,
        primaryHost: primary[0]?.host ?? null,
        redirectToPrimary: Boolean(domain.redirectToPrimary) && primary[0]?.host !== host,
      } satisfies StoreRef
    },
    ['store-by-host', host],
    { tags: [HOST_MAP_TAG], revalidate: 300 },
  )()

export type StoreContent = {
  settings: SiteSetting | null
  navigation: Navigation | null
  features: string[]
}

/** Store settings, menus and switched-on features. */
export const getStoreContent = (tenantId: string): Promise<StoreContent> =>
  unstable_cache(
    async () => {
      const payload = await getPayloadClient()
      const [settings, navigation, features] = await Promise.all([
        payload
          .find({
            collection: 'site-settings',
            where: { tenant: { equals: tenantId } },
            depth: 2,
            limit: 1,
            overrideAccess: true,
          })
          .then((r) => r.docs[0] ?? null),
        payload
          .find({
            collection: 'navigation',
            where: { tenant: { equals: tenantId } },
            depth: 2,
            limit: 1,
            overrideAccess: true,
          })
          .then((r) => r.docs[0] ?? null),
        getTenantFeatures(payload, tenantId).then((r) => [...r.enabled]),
      ])
      return { settings, navigation, features }
    },
    ['store-content', tenantId],
    { tags: [storefrontTag(tenantId), tenantTag(tenantId, 'features')], revalidate: 3600 },
  )()

export const sameTenant = (doc: { tenant?: unknown } | null | undefined, tenantId: string) =>
  Boolean(doc) && idOf(doc?.tenant) === tenantId
