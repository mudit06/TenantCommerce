'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

const SELECTED_STORE_COOKIE = 'payload-tenant'

const selectedStore = () =>
  document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SELECTED_STORE_COOKIE}=`))
    ?.slice(SELECTED_STORE_COOKIE.length + 1)

/**
 * Keeps the multi-tenant plugin's selected-store cookie on the store of our team's session.
 * The plugin's own store picker chooses the first store it sees when the cookie is missing,
 * and new documents and list filters follow that cookie, so a session must never point it at
 * another store (QA S1/S2). Set as the session endpoint sets it (src/modules/identity).
 */
export function StoreCookieSync({ storeId }: { storeId: string }) {
  const pathname = usePathname()
  const router = useRouter()
  useEffect(() => {
    if (decodeURIComponent(selectedStore() ?? '') === storeId) return
    document.cookie = `${SELECTED_STORE_COOKIE}=${encodeURIComponent(storeId)}; Path=/; SameSite=Lax`
    router.refresh()
  }, [pathname, router, storeId])
  return null
}
