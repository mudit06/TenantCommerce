import { createHmac, timingSafeEqual } from 'node:crypto'

// Guest access to an order (docs/05 "Guest access to an order", docs/screens Order confirmed
// rule 4): the browser that placed it holds a signed cookie for 24 hours. Order numbers run in
// sequence, so the number alone never opens an order.

export const ORDER_COOKIE = 'te_orders'
export const ORDER_ACCESS_HOURS = 24
const MAX_ORDERS = 5

const secret = () => process.env.PAYLOAD_SECRET ?? ''
const sign = (value: string) =>
  createHmac('sha256', secret()).update(`order-access:${value}`).digest('base64url')

type Grant = { orderId: string; expires: number }

export function readOrderGrants(cookie: string | undefined, now = Date.now()): Grant[] {
  if (!cookie) return []
  return cookie
    .split('.')
    .map((part) => {
      const [orderId, expires, signature] = part.split('~')
      if (!orderId || !expires || !signature) return null
      const expected = Buffer.from(sign(`${orderId}~${expires}`))
      const given = Buffer.from(signature)
      if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
      const at = Number(expires)
      return at > now ? { orderId, expires: at } : null
    })
    .filter((grant): grant is Grant => grant !== null)
}

/** The cookie value after adding `orderId`, keeping the latest few still valid. */
export function grantOrderAccess(
  cookie: string | undefined,
  orderId: string,
  now = Date.now(),
): string {
  const expires = now + ORDER_ACCESS_HOURS * 60 * 60 * 1000
  const grants = [
    ...readOrderGrants(cookie, now).filter((grant) => grant.orderId !== orderId),
    { orderId, expires },
  ].slice(-MAX_ORDERS)
  return grants
    .map(({ orderId: id, expires: at }) => `${id}~${at}~${sign(`${id}~${at}`)}`)
    .join('.')
}

export const canSeeOrder = (cookie: string | undefined, orderId: string) =>
  readOrderGrants(cookie).some((grant) => grant.orderId === orderId)
