import { cookies } from 'next/headers'

import { getPayloadClient } from '@/lib/data/payload'
import { readSession, SESSION_COOKIE, type ShopperSession } from '@/modules/customers'

// The signed-in shopper for storefront pages and actions (ADR 0003). The session cookie lives
// on the store's own domain and is checked against the store of the request, never trusted on
// its own.

export async function signedInShopper(tenantId: string): Promise<ShopperSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  return readSession(await getPayloadClient(), tenantId, token)
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  ;(await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  })
}

export async function clearSessionCookie() {
  ;(await cookies()).delete(SESSION_COOKIE)
}

/** Where to go after signing in: a path on this store only, never another site */
export function safeNext(next: string | null | undefined, fallback = '/account'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.includes('\\')) {
    return fallback
  }
  return next
}

/** /account/login?next=… for a page that needs a signed-in shopper */
export const loginHref = (next: string) => `/account/login?next=${encodeURIComponent(next)}`
