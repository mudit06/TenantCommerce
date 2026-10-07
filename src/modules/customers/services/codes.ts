import { createHmac, randomInt, timingSafeEqual } from 'node:crypto'

import type { PayloadRequest } from 'payload'
import { z } from 'zod'

import { loginCodeEmail } from '@/emails/loginCode'
import { env } from '@/lib/env'
import { AppError } from '@/lib/errors'
import { allow } from '@/lib/rate-limit'
import type { Customer } from '@/payload-types'

import { CODE_MINUTES, CODE_RESEND_SECONDS, CODE_TRIES } from '../constants'
import { attachGuestOrders, findCustomerByEmail } from './account'

// Email code sign-in (docs/05 "Email OTP", docs/screens storefront `st-login`): the same answer
// whether or not the email has an account, and the code creates the account when it doesn't.

export const emailSchema = z.email('Enter your email address').trim().toLowerCase().max(200)
export const codeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, 'The code has 6 digits')

const LIMITS = {
  perEmail: { max: 5, windowMs: 60 * 60_000 },
  perIp: { max: 20, windowMs: 10 * 60_000 },
  verifyPerIp: { max: 30, windowMs: 10 * 60_000 },
}

const hashOf = (tenantId: string, email: string, code: string) =>
  createHmac('sha256', env.PAYLOAD_SECRET)
    .update(`login:${tenantId}:${email}:${code}`)
    .digest('hex')

/** First letter and the domain, as the wireframe shows it: r•••@example.com */
export function maskedEmail(email: string): string {
  const [name = '', domain = ''] = email.split('@')
  return `${name.slice(0, 1)}•••@${domain}`
}

async function latestCode(req: PayloadRequest, tenantId: string, email: string) {
  const { docs } = await req.payload.find({
    collection: 'login-codes',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { email: { equals: email } },
        { usedAt: { exists: false } },
      ],
    },
    sort: '-createdAt',
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  return docs[0] ?? null
}

/**
 * Sends a sign-in code to `email`, unless one went out under 30 seconds ago (the answer then
 * says how long to wait). Blocked accounts get nothing, with the same answer.
 */
export async function sendLoginCode(
  req: PayloadRequest,
  tenantId: string,
  rawEmail: string,
  {
    ip,
    storeName,
    themeColor,
  }: { ip?: string | null; storeName: string; themeColor?: string | null },
): Promise<{ maskedEmail: string; waitSeconds: number }> {
  const email = emailSchema.parse(rawEmail)
  const previous = await latestCode(req, tenantId, email)
  if (previous) {
    const age = (Date.now() - new Date(previous.createdAt).getTime()) / 1000
    if (age < CODE_RESEND_SECONDS) {
      return { maskedEmail: maskedEmail(email), waitSeconds: Math.ceil(CODE_RESEND_SECONDS - age) }
    }
  }
  if (
    !allow(`login-code:${tenantId}:${email}`, LIMITS.perEmail) ||
    !allow(`login-code-ip:${ip ?? 'unknown'}`, LIMITS.perIp)
  ) {
    throw new AppError('BUSINESS_RULE', 'Too many codes asked for. Please try again later.', 429)
  }
  const existing = await findCustomerByEmail(req, tenantId, email)
  const answer = { maskedEmail: maskedEmail(email), waitSeconds: CODE_RESEND_SECONDS }
  if (existing?.status === 'blocked') return answer

  // A new code replaces any earlier one for this email
  await req.payload.update({
    collection: 'login-codes',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { email: { equals: email } },
        { usedAt: { exists: false } },
      ],
    },
    data: { usedAt: new Date().toISOString() },
    overrideAccess: true,
    req,
  })
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
  await req.payload.create({
    collection: 'login-codes',
    data: {
      tenant: tenantId,
      email,
      codeHash: hashOf(tenantId, email, code),
      expiresAt: new Date(Date.now() + CODE_MINUTES * 60_000).toISOString(),
      attempts: 0,
      ip: ip ?? undefined,
    },
    overrideAccess: true,
    req,
  })
  const message = loginCodeEmail({ storeName, code, minutes: CODE_MINUTES, themeColor })
  await req.payload.sendEmail({
    to: email,
    from: `"${storeName.replace(/"/g, '')}" <${env.EMAIL_FROM_ADDRESS}>`,
    subject: message.subject,
    text: message.text,
    html: message.html,
  })
  return answer
}

/**
 * Checks the code and signs the shopper in: the account is created on first use, and guest
 * orders placed with this email join it (the code proves the email is theirs, docs/05).
 */
export async function verifyLoginCode(
  req: PayloadRequest,
  tenantId: string,
  rawEmail: string,
  rawCode: string,
  { ip }: { ip?: string | null } = {},
): Promise<Customer> {
  const email = emailSchema.parse(rawEmail)
  const code = codeSchema.parse(rawCode)
  if (!allow(`login-verify-ip:${ip ?? 'unknown'}`, LIMITS.verifyPerIp)) {
    throw new AppError('BUSINESS_RULE', 'Too many tries. Please wait a few minutes.', 429)
  }
  const expired = () =>
    new AppError('BUSINESS_RULE', 'This code has expired. Send a new one.', 400, {
      code: 'This code has expired',
    })
  const stored = await latestCode(req, tenantId, email)
  if (!stored || new Date(stored.expiresAt).getTime() < Date.now()) throw expired()
  const attempts = (stored.attempts ?? 0) + 1
  if (attempts > CODE_TRIES) throw expired()

  const expected = Buffer.from(stored.codeHash)
  const given = Buffer.from(hashOf(tenantId, email, code))
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    // Outside the caller's transaction: the error below rolls it back, and the try must count
    await req.payload.update({
      collection: 'login-codes',
      id: stored.id,
      data: { attempts, ...(attempts >= CODE_TRIES ? { usedAt: new Date().toISOString() } : {}) },
      overrideAccess: true,
    })
    const left = CODE_TRIES - attempts
    throw new AppError(
      'BUSINESS_RULE',
      left > 0
        ? `That code isn’t right. ${left} ${left === 1 ? 'try' : 'tries'} left.`
        : 'That code isn’t right. Send a new one.',
      400,
      { code: 'That code isn’t right' },
    )
  }
  await req.payload.update({
    collection: 'login-codes',
    id: stored.id,
    data: { attempts, usedAt: new Date().toISOString() },
    overrideAccess: true,
    req,
  })

  const now = new Date().toISOString()
  const existing = await findCustomerByEmail(req, tenantId, email)
  if (existing?.status === 'blocked') {
    throw new AppError('FORBIDDEN', 'This account can’t log in. Please contact the store.', 403)
  }
  const customer = existing
    ? await req.payload.update({
        collection: 'customers',
        id: existing.id,
        data: { emailVerified: true, lastLoginAt: now },
        overrideAccess: true,
        req,
      })
    : await req.payload.create({
        collection: 'customers',
        data: {
          tenant: tenantId,
          email,
          status: 'active',
          emailVerified: true,
          lastLoginAt: now,
        },
        overrideAccess: true,
        req,
      })
  await attachGuestOrders(req, tenantId, customer)
  return customer
}
