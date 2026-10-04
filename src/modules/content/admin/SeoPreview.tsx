import type { UIFieldServerComponent } from 'payload'

import { currentStore } from '@/admin/store'

import { SeoPreviewClient } from './SeoPreviewClient'

/** Search result preview on the SEO tab, with the store's real address. */
export const SeoPreview: UIFieldServerComponent = async ({ req }) => {
  const store = await currentStore(req.payload, req.user)
  return (
    <SeoPreviewClient
      origin={
        store?.storeUrl ??
        (store?.primaryHost ? `https://${store.primaryHost}` : 'https://your-store')
      }
      storeName={store?.name ?? ''}
    />
  )
}
