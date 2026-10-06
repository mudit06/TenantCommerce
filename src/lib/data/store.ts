import { unstable_cache } from 'next/cache'

import { idOf } from '@/access'
import { storefrontTag } from '@/hooks/revalidateStorefront'
import { HOST_MAP_TAG, tenantTag } from '@/lib/cache'
import { loadConnector } from '@/connectors'
import { getCodRules } from '@/modules/content'
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

export type SellingInfo = {
  /** Razorpay keys saved and allowed: shoppers can pay online */
  online: boolean
  /** Razorpay in test mode: the store shows a "test payments" notice (docs/screens Payments) */
  testMode: boolean
  /** The platform's COD switch and the vendor's own COD setting */
  cod: boolean
  /** Either: the store sells, so prices, Add to cart and the cart icon show */
  selling: boolean
}

/** Whether a store takes orders online. Short cache: keys change in the CMS, not the catalogue. */
export const getSellingInfo = (tenantId: string): Promise<SellingInfo> =>
  unstable_cache(
    async () => {
      const payload = await getPayloadClient()
      const [razorpay, cod, features] = await Promise.all([
        loadConnector(payload, tenantId, 'razorpay').catch(() => null),
        getCodRules(payload, tenantId),
        getTenantFeatures(payload, tenantId).then((r) => r.enabled),
      ])
      const online = Boolean(razorpay?.public.keyId && razorpay.secret.keySecret)
      const codOn = features.has('cod') && cod.codEnabled
      return {
        online,
        testMode: online && razorpay?.mode === 'test',
        cod: codOn,
        selling: online || codOn,
      }
    },
    ['selling-info', tenantId],
    { tags: [tenantTag(tenantId, 'selling')], revalidate: 60 },
  )()
