import { createHash, randomBytes } from 'node:crypto'

import type { Payload } from 'payload'

import { idOf } from '@/access'
import type { Cart } from '@/payload-types'

// Carts (docs/06 `carts`): what a shopper picked, found by the hash of a random token kept in
// the shopper's cart cookie. Quantities only; prices are worked out on every read.

export const CART_COOKIE = 'te_cart'
export const CART_DAYS = 30
export const MAX_LINES = 50
export const MAX_QTY = 99

export const newCartToken = () => randomBytes(24).toString('base64url')
export const hashCartToken = (token: string) => createHash('sha256').update(token).digest('hex')

export type CartLine = { productId: string; variantId: string | null; qty: number }

export const cartLinesOf = (cart: Pick<Cart, 'items'> | null): CartLine[] =>
  (cart?.items ?? []).map((item) => ({
    productId: idOf(item.product)!,
    variantId: idOf(item.variant),
    qty: item.qty,
  }))

const sameLine = (a: { productId: string; variantId: string | null }, b: typeof a) =>
  a.productId === b.productId && (a.variantId ?? null) === (b.variantId ?? null)

export async function findCart(
  payload: Payload,
  tenantId: string,
  token: string | null | undefined,
) {
  if (!token) return null
  const { docs } = await payload.find({
    collection: 'carts',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { tokenHash: { equals: hashCartToken(token) } },
        { status: { equals: 'active' } },
      ],
    },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  return docs[0] ?? null
}

const expiry = () => new Date(Date.now() + CART_DAYS * 24 * 60 * 60 * 1000).toISOString()

/** Saves the lines (and checkout details) of the cart behind `token`, creating it if needed. */
export async function saveCart(
  payload: Payload,
  tenantId: string,
  token: string,
  lines: readonly CartLine[],
  extra: Partial<
    Pick<Cart, 'pincode' | 'contact' | 'couponCode' | 'shippingAddress' | 'customer'>
  > = {},
): Promise<Cart> {
  const items = lines
    .filter((line) => line.qty > 0)
    .slice(0, MAX_LINES)
    .map((line) => ({
      product: line.productId,
      variant: line.variantId ?? undefined,
      qty: Math.min(MAX_QTY, Math.floor(line.qty)),
      addedAt: new Date().toISOString(),
    }))
  const existing = await findCart(payload, tenantId, token)
  // Any change starts the reminder clock again; a cart that was left and comes back is active
  const data = {
    items,
    ...extra,
    lastActivityAt: new Date().toISOString(),
    expiresAt: expiry(),
    abandonedAt: null,
  }
  if (existing) {
    return payload.update({ collection: 'carts', id: existing.id, data, overrideAccess: true })
  }
  return payload.create({
    collection: 'carts',
    data: { tenant: tenantId, tokenHash: hashCartToken(token), status: 'active', ...data },
    overrideAccess: true,
  })
}

/** Adds `qty` of a product (or sets it with `replace`); 0 removes the line. */
export function changeLine(
  lines: readonly CartLine[],
  target: CartLine,
  { replace = false }: { replace?: boolean } = {},
): CartLine[] {
  const next = lines.map((line) => ({ ...line }))
  const found = next.find((line) => sameLine(line, target))
  if (found) found.qty = replace ? target.qty : found.qty + target.qty
  else if (target.qty > 0) next.push({ ...target })
  return next
    .map((line) => ({ ...line, qty: Math.min(MAX_QTY, Math.max(0, Math.floor(line.qty))) }))
    .filter((line) => line.qty > 0)
}

export async function markCartConverted(payload: Payload, cartId: string, orderId: string) {
  await payload.update({
    collection: 'carts',
    id: cartId,
    data: { status: 'converted', convertedOrder: orderId },
    overrideAccess: true,
  })
}

/**
 * "Return to your cart" from a reminder (docs/screens Abandoned carts rule 3): the cart moves to
 * this browser under a new token, so the link works on any device. Prices are worked out again
 * when the cart opens, so an ended offer isn't honoured.
 */
export async function restoreCart(
  payload: Payload,
  tenantId: string,
  cartId: string,
): Promise<{ token: string; count: number } | null> {
  const { docs } = await payload.find({
    collection: 'carts',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { id: { equals: cartId } },
        { status: { equals: 'active' } },
      ],
    },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  const cart = docs[0]
  if (!cart || !(cart.items ?? []).length) return null
  const token = newCartToken()
  await payload.update({
    collection: 'carts',
    id: cart.id,
    data: {
      tokenHash: hashCartToken(token),
      lastActivityAt: new Date().toISOString(),
      expiresAt: expiry(),
    },
    overrideAccess: true,
  })
  return { token, count: (cart.items ?? []).reduce((sum, item) => sum + item.qty, 0) }
}
