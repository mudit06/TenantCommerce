import { cookies, headers } from 'next/headers'

import { getPayloadClient } from '@/lib/data/payload'
import { getStoreByHost, type StoreRef } from '@/lib/data/store'
import { CART_COOKIE, CART_DAYS, cartLinesOf, findCart, newCartToken } from '@/modules/cart'

import { STORE_HOST_HEADER } from '../constants'

// The shopper's store and cart for server actions and shop pages. The store is always the
// request's host (set by src/proxy.ts), never something the browser sends (docs/04).

/** A store sells while it is live; a draft store also sells locally so it can be tried out. */
export const storeIsOpen = (store: StoreRef) =>
  store.status === 'active' || (store.status === 'draft' && process.env.NODE_ENV !== 'production')

export async function currentStore(): Promise<StoreRef | null> {
  const host = (await headers()).get(STORE_HOST_HEADER)
  const store = host ? await getStoreByHost(host) : null
  return store && storeIsOpen(store) ? store : null
}

export async function cartToken({ create }: { create: boolean }): Promise<string | null> {
  const jar = await cookies()
  const existing = jar.get(CART_COOKIE)?.value
  if (existing || !create) return existing ?? null
  const token = newCartToken()
  jar.set(CART_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: CART_DAYS * 24 * 60 * 60,
  })
  return token
}

/** Pieces in the cart, readable by the page so the header badge needs no request (not a secret) */
export const CART_COUNT_COOKIE = 'te_cart_n'

export async function setCartCount(count: number) {
  ;(await cookies()).set(CART_COUNT_COOKIE, String(count), {
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: CART_DAYS * 24 * 60 * 60,
  })
}

export async function currentCart(tenantId: string) {
  const payload = await getPayloadClient()
  const cart = await findCart(payload, tenantId, await cartToken({ create: false }))
  return { payload, cart, lines: cartLinesOf(cart) }
}

/** Pieces in the cart, for the header badge. */
export async function cartCount(tenantId: string): Promise<number> {
  const { lines } = await currentCart(tenantId)
  return lines.reduce((sum, line) => sum + line.qty, 0)
}

export async function visitorMeta() {
  const h = await headers()
  return {
    ip: h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || null,
    userAgent: h.get('user-agent'),
  }
}
