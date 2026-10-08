import { cookies } from 'next/headers'

import { getPayloadClient } from '@/lib/data/payload'
import { getStoreByHost } from '@/lib/data/store'
import { CART_COOKIE, CART_DAYS, readRestoreToken, restoreCart } from '@/modules/cart'
import { STORE_HOST_HEADER } from '@/storefront/constants'
import { CART_COUNT_COOKIE } from '@/storefront/shop/server'

type Context = { params: Promise<{ tenant: string; token: string }> }

/** The reminder's "Return to your cart" (docs/07 `GET /cart/restore/:token`). */
export async function GET(request: Request, { params }: Context) {
  const { token } = await params
  const host = request.headers.get(STORE_HOST_HEADER)
  const store = host ? await getStoreByHost(host) : null
  const cartId = readRestoreToken(decodeURIComponent(token))
  const restored =
    store && cartId ? await restoreCart(await getPayloadClient(), store.tenantId, cartId) : null
  if (restored) {
    const jar = await cookies()
    const options = {
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: CART_DAYS * 24 * 60 * 60,
    }
    jar.set(CART_COOKIE, restored.token, { ...options, httpOnly: true })
    jar.set(CART_COUNT_COOKIE, String(restored.count), options)
  }
  // The cart either way: an expired link shows whatever this browser has
  return new Response(null, { status: 303, headers: { Location: '/cart' } })
}
