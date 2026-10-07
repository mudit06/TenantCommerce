import { createHash, randomBytes } from 'node:crypto'

import type { Payload, PayloadRequest } from 'payload'

import type { Customer } from '@/payload-types'

import { SESSION_DAYS, SESSION_TOUCH_MS } from '../constants'

// Signed-in shopper sessions (ADR 0003): a random token in an HTTP-only cookie on the store's
// own domain, kept here as a SHA-256 hash with the store it belongs to.

const hashOf = (token: string) => createHash('sha256').update(token).digest('hex')

/** Looks like a token we issued (43 base64url characters), before any database read */
const TOKEN = /^[A-Za-z0-9_-]{43}$/

export type ShopperSession = { id: string; customer: Customer }

export async function createSession(
  req: PayloadRequest,
  tenantId: string,
  customerId: string,
  meta: { ip?: string | null; userAgent?: string | null } = {},
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url')
  const now = new Date()
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  await req.payload.create({
    collection: 'customer-sessions',
    data: {
      tenant: tenantId,
      customer: customerId,
      tokenHash: hashOf(token),
      ip: meta.ip ?? undefined,
      userAgent: meta.userAgent?.slice(0, 300) ?? undefined,
      expiresAt: expiresAt.toISOString(),
      lastSeenAt: now.toISOString(),
    },
    overrideAccess: true,
    req,
  })
  return { token, expiresAt }
}

/**
 * The account behind a session cookie, in this store only: a token from another store, an
 * expired or revoked session, or a blocked account reads as signed out.
 */
export async function readSession(
  payload: Payload,
  tenantId: string,
  token: string | null | undefined,
): Promise<ShopperSession | null> {
  if (!token || !TOKEN.test(token)) return null
  const { docs } = await payload.find({
    collection: 'customer-sessions',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { tokenHash: { equals: hashOf(token) } },
        { revokedAt: { exists: false } },
        { expiresAt: { greater_than: new Date().toISOString() } },
      ],
    },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  const session = docs[0]
  if (!session) return null
  const { docs: customers } = await payload.find({
    collection: 'customers',
    where: { and: [{ tenant: { equals: tenantId } }, { id: { equals: session.customer } }] },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { passwordHash: false },
  })
  const customer = customers[0] as Customer | undefined
  if (!customer || customer.status === 'blocked') return null
  const seen = session.lastSeenAt ? new Date(session.lastSeenAt).getTime() : 0
  if (Date.now() - seen > SESSION_TOUCH_MS) {
    await payload.update({
      collection: 'customer-sessions',
      id: session.id,
      data: { lastSeenAt: new Date().toISOString() },
      overrideAccess: true,
    })
  }
  return { id: String(session.id), customer }
}

/** "Log out": this session only. */
export async function revokeSession(payload: Payload, tenantId: string, token: string) {
  if (!TOKEN.test(token)) return
  await payload.update({
    collection: 'customer-sessions',
    where: { and: [{ tenant: { equals: tenantId } }, { tokenHash: { equals: hashOf(token) } }] },
    data: { revokedAt: new Date().toISOString() },
    overrideAccess: true,
  })
}

/** "Log out of all devices", and every deletion or block of the account. */
export async function revokeAllSessions(req: PayloadRequest, tenantId: string, customerId: string) {
  await req.payload.update({
    collection: 'customer-sessions',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { customer: { equals: customerId } },
        { revokedAt: { exists: false } },
      ],
    },
    data: { revokedAt: new Date().toISOString() },
    overrideAccess: true,
    req,
  })
}
