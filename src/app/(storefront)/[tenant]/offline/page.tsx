import type { Metadata } from 'next'

import { OfflineView } from '@/storefront/kit/pwa/OfflineView'
import { Container } from '@/storefront/kit/ui'

/**
 * No page is built ahead: each store's page is rendered on its first visit, then served from the
 * cache until the store's data changes (tag revalidation from Payload hooks) or its data's own
 * expiry passes (docs/13). Keep this page free of request reads (headers, cookies, search params).
 */
export const generateStaticParams = async () => []

export const metadata: Metadata = { title: 'Offline', robots: { index: false, follow: false } }

/** The page the service worker shows when a page can't load and isn't saved (`st-offline`). */
export default function OfflinePage() {
  return (
    <Container className="py-12">
      <div className="mx-auto max-w-md">
        <OfflineView />
      </div>
    </Container>
  )
}
