import { notFound } from 'next/navigation'
import { cache } from 'react'

import { getCategoryTree } from '@/lib/data/catalog'
import { getSellingInfo, getStoreByHost, getStoreContent } from '@/lib/data/store'
import { storeOriginForHost } from '@/lib/storeOrigin'

import { getVendorUI } from './registry'

/**
 * Everything a storefront page needs about its store, once per request. The host is the URL
 * segment src/proxy.ts wrote: a store's domain is always rewritten to its own host, and the
 * admin host never reaches these routes (the proxy answers 404), so a store can't be opened
 * through another host's address (docs/04). Nothing here reads the request, so shopper pages
 * can be rendered once and served from the cache (docs/13).
 */
export const getStoreContext = cache(async (hostParam: string) => {
  const host = decodeURIComponent(hostParam).toLowerCase()
  const store = await getStoreByHost(host)
  if (!store || store.status === 'archived') notFound()
  const [content, ui, categories, selling] = await Promise.all([
    getStoreContent(store.tenantId),
    getVendorUI(store.slug),
    getCategoryTree(store.tenantId),
    getSellingInfo(store.tenantId),
  ])
  const origin = storeOriginForHost(host)!
  return {
    store,
    ...content,
    ui,
    categories,
    selling,
    origin,
    hasFeature: (key: string) => content.features.includes(key),
  }
})

export type StoreContext = Awaited<ReturnType<typeof getStoreContext>>
