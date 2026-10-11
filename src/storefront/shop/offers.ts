import { headers } from 'next/headers'

import { getStoreOffers, type StoreOffers } from '@/lib/data/offers'
import { getSellingInfo, getStoreByHost, getStoreContent } from '@/lib/data/store'

import { STORE_HOST_HEADER } from '../constants'

/** The offers of this request's store, for components that don't carry the store (cards). */
export async function requestStoreOffers(): Promise<StoreOffers | null> {
  const host = (await headers()).get(STORE_HOST_HEADER)
  const store = host ? await getStoreByHost(host) : null
  return store ? getStoreOffers(store.tenantId) : null
}

/** Whether this request's store takes orders, for components that don't carry the store. */
export async function requestSelling(): Promise<boolean> {
  const host = (await headers()).get(STORE_HOST_HEADER)
  const store = host ? await getStoreByHost(host) : null
  return store ? (await getSellingInfo(store.tenantId)).selling : false
}

/** The store's name and whether it takes quote requests, for the cards' quick quote. */
export async function requestCardStore(): Promise<{ name: string; enquiries: boolean } | null> {
  const host = (await headers()).get(STORE_HOST_HEADER)
  const store = host ? await getStoreByHost(host) : null
  if (!store) return null
  const content = await getStoreContent(store.tenantId)
  return {
    name: content.settings?.storeName ?? store.name,
    enquiries: content.features.includes('enquiries'),
  }
}
