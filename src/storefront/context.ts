import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import { getCategoryTree } from '@/lib/data/catalog'
import { getStoreByHost, getStoreContent } from '@/lib/data/store'

import { PUBLIC_PROTOCOL, STORE_HOST_HEADER } from './constants'
import { getVendorUI } from './registry'

/**
 * Everything a storefront page needs about its store, once per request. The host comes from the
 * URL segment the proxy wrote and must match the header it set, so a store can't be opened
 * through another host's address (docs/04).
 */
export const getStoreContext = cache(async (hostParam: string) => {
  const host = decodeURIComponent(hostParam).toLowerCase()
  const requestHeaders = await headers()
  if (requestHeaders.get(STORE_HOST_HEADER) !== host) notFound()
  const store = await getStoreByHost(host)
  if (!store || store.status === 'archived') notFound()
  const [content, ui, categories] = await Promise.all([
    getStoreContent(store.tenantId),
    getVendorUI(store.slug),
    getCategoryTree(store.tenantId),
  ])
  const origin = `${PUBLIC_PROTOCOL}://${requestHeaders.get('host') ?? host}`
  return {
    store,
    ...content,
    ui,
    categories,
    origin,
    hasFeature: (key: string) => content.features.includes(key),
  }
})

export type StoreContext = Awaited<ReturnType<typeof getStoreContext>>
