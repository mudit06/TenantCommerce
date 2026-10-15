import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

import { getStoreContext } from '@/storefront/context'
import { StoreDocument, storeMetadata, storeViewport } from '@/storefront/kit/layout/StoreDocument'

import '@/app/(storefront)/[tenant]/globals.css'

type Props = { children: ReactNode; params: Promise<{ tenant: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const metadata = storeMetadata(await getStoreContext((await params).tenant))
  return { ...metadata, robots: { index: false, follow: false } }
}

export async function generateViewport({ params }: Props): Promise<Viewport> {
  return storeViewport(await getStoreContext((await params).tenant))
}

/**
 * The editor's draft preview (docs/screens Page builder rule 4), in the store's own design. src/proxy.ts
 * sends a store's `/preview/pages/<id>?token=...` here once the link's signature checks out. The
 * store shows as it will look, even before launch or during maintenance, so there is no closed
 * notice; and nothing here is cached.
 */
export default async function PreviewLayout({ children, params }: Props) {
  const ctx = await getStoreContext((await params).tenant)
  return (
    <StoreDocument closed={null} ctx={ctx}>
      {children}
    </StoreDocument>
  )
}
