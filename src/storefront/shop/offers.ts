import { headers } from 'next/headers'

import { getStoreOffers, type StoreOffers } from '@/lib/data/offers'
import { getStoreByHost } from '@/lib/data/store'

import { STORE_HOST_HEADER } from '../constants'

/** The offers of this request's store, for components that don't carry the store (cards). */
export async function requestStoreOffers(): Promise<StoreOffers | null> {
  const host = (await headers()).get(STORE_HOST_HEADER)
  const store = host ? await getStoreByHost(host) : null
  return store ? getStoreOffers(store.tenantId) : null
}
