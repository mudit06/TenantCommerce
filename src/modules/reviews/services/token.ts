import { createHmac, timingSafeEqual } from 'node:crypto'

import { env } from '@/lib/env'

import { REVIEW_LINK_DAYS } from '../constants'

// The link in the review request email (docs/screens Write a review rule 1): signed with the
// server's secret, naming the order and when it was made, so no login is needed and nothing is
// stored. One review per order item is enforced by the reviews index.

const sign = (value: string) =>
  createHmac('sha256', env.PAYLOAD_SECRET)
    .update(`review:${value}`)
    .digest('base64url')
    .slice(0, 32)

export function reviewToken(orderId: string, issuedAt = Date.now()): string {
  const body = `${orderId}.${issuedAt.toString(36)}`
  return `${body}.${sign(body)}`
}

/** The order a review link names, or null when it was tampered with or is too old. */
export function readReviewToken(token: string, now = Date.now()): string | null {
  const [orderId, issued, signature] = token.split('.')
  if (!orderId || !issued || !signature || !/^[a-f0-9]{24}$/i.test(orderId)) return null
  const expected = Buffer.from(sign(`${orderId}.${issued}`))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  const at = parseInt(issued, 36)
  if (!Number.isFinite(at) || now - at > REVIEW_LINK_DAYS * 86_400_000) return null
  return orderId
}
