import type { Metadata } from 'next'

import { OfflineView } from '@/storefront/kit/pwa/OfflineView'
import { Container } from '@/storefront/kit/ui'

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
