import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

import { getStoreContext } from '@/storefront/context'
import {
  closedMessage,
  StoreDocument,
  storeMetadata,
  storeViewport,
} from '@/storefront/kit/layout/StoreDocument'

import './globals.css'

type Props = { children: ReactNode; params: Promise<{ tenant: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return storeMetadata(await getStoreContext((await params).tenant))
}

export async function generateViewport({ params }: Props): Promise<Viewport> {
  return storeViewport(await getStoreContext((await params).tenant))
}

/**
 * Every shopper page of a store (docs/03 `app/(storefront)/[tenant]`). It reads nothing from the
 * request, so the pages under it that don't either are rendered once and cached (docs/13); the
 * editor's draft preview has its own route (src/app/(preview)).
 */
export default async function StoreLayout({ children, params }: Props) {
  const ctx = await getStoreContext((await params).tenant)
  return (
    <StoreDocument closed={closedMessage(ctx)} ctx={ctx}>
      {children}
    </StoreDocument>
  )
}
