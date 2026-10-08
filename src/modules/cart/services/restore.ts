import { createHmac, timingSafeEqual } from 'node:crypto'

import { env } from '@/lib/env'

// The button in a cart reminder (docs/screens Abandoned carts rule 3): restores this exact cart
// on any device for 7 days. Signed, naming the cart and when it was made; nothing is stored.

export const RESTORE_DAYS = 7

const sign = (value: string) =>
  createHmac('sha256', env.PAYLOAD_SECRET)
    .update(`cart-restore:${value}`)
    .digest('base64url')
    .slice(0, 32)

export function restoreToken(cartId: string, issuedAt = Date.now()) {
  const body = `${cartId}.${issuedAt.toString(36)}`
  return `${body}.${sign(body)}`
}

export function readRestoreToken(token: string, now = Date.now()): string | null {
  const [cartId, issued, signature] = token.split('.')
  if (!cartId || !issued || !signature || !/^[a-f0-9]{24}$/i.test(cartId)) return null
  const expected = Buffer.from(sign(`${cartId}.${issued}`))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  const at = parseInt(issued, 36)
  if (!Number.isFinite(at) || now - at > RESTORE_DAYS * 86_400_000) return null
  return cartId
}
