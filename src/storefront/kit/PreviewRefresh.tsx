'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Keeps the editor's live preview in step with the editor: tells the admin the preview is ready,
 * then reloads the server-rendered draft whenever the editor saves (Payload's live preview
 * messages, docs/screens Page builder). Messages from any other origin are ignored.
 */
export function PreviewRefresh({ adminOrigin }: { adminOrigin: string }) {
  const router = useRouter()
  useEffect(() => {
    if (window.parent === window) return
    window.parent.postMessage({ type: 'payload-live-preview', ready: true }, adminOrigin)
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== adminOrigin) return
      const data = event.data as { type?: unknown } | null
      if (data && data.type === 'payload-document-event') router.refresh()
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [adminOrigin, router])
  return (
    <div
      aria-live="polite"
      className="sticky top-0 z-50 bg-dark px-4 py-1.5 text-center text-xs font-medium text-white"
    >
      Draft preview · shoppers don’t see this until it is published
    </div>
  )
}
