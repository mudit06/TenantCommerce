import { createHmac, timingSafeEqual } from 'node:crypto'

import type { Payload, PayloadRequest } from 'payload'

import { env } from '@/lib/env'
import { featureConfig } from '@/modules/tenancy'

import { localMinutes } from '../rules'

// Offer messages' shared rules (docs/18 "Offer messages", docs/screens Offer messages rule 5):
// only inside the store's send window, at most N a week per shopper, and a one-tap unsubscribe
// link in every one.

export type OfferConfig = {
  maxPerShopperPerWeek: number
  sendWindow: { start: string; end: string }
}

export const offerConfig = (payload: Payload, tenantId: string, req?: PayloadRequest) =>
  featureConfig<OfferConfig>(payload, tenantId, 'offer-messages', req)

const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

/** The first moment at or after `at` inside the send window (India time). */
export function insideWindow(
  at: Date,
  window: { start: string; end: string },
  timeZone = 'Asia/Kolkata',
): Date {
  const now = localMinutes(at, timeZone)
  const start = minutesOf(window.start)
  const end = minutesOf(window.end)
  if (now >= start && now < end) return at
  const wait = now < start ? start - now : 24 * 60 - now + start
  const next = new Date(at.getTime() + wait * 60_000)
  next.setUTCSeconds(0, 0)
  return next
}

/** Offer and cart messages queued or sent to `to` in the last 7 days (the weekly cap). */
export async function offersThisWeek(req: PayloadRequest, tenantId: string, to: string) {
  const { totalDocs } = await req.payload.count({
    collection: 'notification-logs',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { to: { equals: to } },
        { kind: { in: ['offer', 'cart'] } },
        { status: { not_in: ['skipped', 'failed'] } },
        { createdAt: { greater_than: new Date(Date.now() - 7 * 86_400_000).toISOString() } },
      ],
    },
    overrideAccess: true,
    req,
  })
  return totalDocs
}

// ---- Unsubscribe links ------------------------------------------------------------------

const sign = (value: string) =>
  createHmac('sha256', env.PAYLOAD_SECRET)
    .update(`unsubscribe:${value}`)
    .digest('base64url')
    .slice(0, 24)

/** A link that stops offers on one channel for one email or phone, in one store. */
export function unsubscribeToken(tenantId: string, channel: 'email' | 'whatsapp', value: string) {
  const body = Buffer.from(JSON.stringify([tenantId, channel, value])).toString('base64url')
  return `${body}.${sign(body)}`
}

export function readUnsubscribeToken(
  token: string,
): { tenantId: string; channel: 'email' | 'whatsapp'; value: string } | null {
  const [body, signature] = token.split('.')
  if (!body || !signature) return null
  const expected = Buffer.from(sign(body))
  const given = Buffer.from(signature)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const [tenantId, channel, value] = JSON.parse(
      Buffer.from(body, 'base64url').toString(),
    ) as string[]
    if (!tenantId || (channel !== 'email' && channel !== 'whatsapp') || !value) return null
    return { tenantId, channel, value }
  } catch {
    return null
  }
}
