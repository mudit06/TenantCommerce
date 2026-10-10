import type { Endpoint } from 'payload'
import { generatePayloadCookie } from 'payload/shared'
import { z } from 'zod'

import { withTransaction } from '@/lib/db/transaction'
import { AppError } from '@/lib/errors'
import { apiHandler, assertSameOrigin, ok, readBody, routeParam } from '@/lib/http/endpoint'

import { inviteInputSchema, inviteStaff, resendInvite } from '../services/invites'
import {
  confirmTwoStepSetup,
  resetTwoStep,
  signInStaff,
  startTwoStepSetup,
  turnOffTwoStep,
} from '../services/twoStep'
import {
  endStoreSession,
  startStoreSession,
  startStoreSessionSchema,
} from '../services/storeSession'
import {
  changeStaffRoles,
  removeFromStore,
  staffRolesSchema,
  storeOnlySchema,
} from '../services/membership'

const requireUser = (req: Parameters<Endpoint['handler']>[0]) => {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 'Sign in first', 401)
}

/**
 * The multi-tenant plugin's selected-store cookie (read by its list filters and new documents).
 * A store session points it at the opened store; ending one clears it.
 */
const selectedStoreCookie = (tenantId: string | null) =>
  tenantId
    ? `payload-tenant=${encodeURIComponent(tenantId)}; Path=/; SameSite=Lax`
    : 'payload-tenant=; Path=/; SameSite=Lax; Max-Age=0'

const withCookie = (response: Response, cookie: string) => {
  response.headers.append('Set-Cookie', cookie)
  return response
}

const signInSchema = z.object({
  email: z.string().trim().email('Enter your email').max(200),
  password: z.string().min(1, 'Enter your password').max(500),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit code')
    .optional(),
  keepSignedIn: z.boolean().optional(),
})

const codeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit code'),
})

/** Staff invites (docs/07 admin endpoints). Accepting uses Payload's /admin/reset/:token page. */
export const identityEndpoints: Endpoint[] = [
  {
    // Sign in and two-step check (docs/screens/super-admin.md `sa-login`): the password, then the
    // authenticator code when the account has two-step on. Same lockout and messages as
    // Payload's login, which refuses accounts with two-step (Users beforeLogin).
    path: '/admin/v1/auth/sign-in',
    method: 'post',
    handler: apiHandler(async (req) => {
      assertSameOrigin(req)
      const input = await readBody(req, signInSchema)
      const result = await signInStaff(req, input)
      if ('twoStepRequired' in result) return ok({ twoStepRequired: true })
      const token = result.token
      const users = req.payload.collections.users.config
      let cookie = generatePayloadCookie({
        collectionAuthConfig: users.auth,
        cookiePrefix: req.payload.config.cookiePrefix,
        token,
      })
      // Not kept: a browser-session cookie, gone when the browser closes (still 8 hours at most)
      if (!input.keepSignedIn) cookie = cookie.replace(/;\s*Expires=[^;]*/i, '')
      return withCookie(ok({ signedIn: true }), cookie)
    }),
  },
  {
    path: '/admin/v1/auth/two-step/setup',
    method: 'post',
    handler: apiHandler(async (req) => {
      requireUser(req)
      assertSameOrigin(req)
      return ok(await startTwoStepSetup(req))
    }),
  },
  {
    path: '/admin/v1/auth/two-step/confirm',
    method: 'post',
    handler: apiHandler(async (req) => {
      requireUser(req)
      assertSameOrigin(req)
      const { code } = await readBody(req, codeSchema)
      await withTransaction(req, () => confirmTwoStepSetup(req, code))
      return ok({ enabled: true })
    }),
  },
  {
    path: '/admin/v1/auth/two-step/off',
    method: 'post',
    handler: apiHandler(async (req) => {
      requireUser(req)
      assertSameOrigin(req)
      const { code } = await readBody(req, codeSchema)
      await withTransaction(req, () => turnOffTwoStep(req, code))
      return ok({ enabled: false })
    }),
  },
  {
    // "Reset two-step" on Vendor staff and Team (super admins, audited)
    path: '/admin/v1/staff/:userId/two-step/reset',
    method: 'post',
    handler: apiHandler(async (req) => {
      requireUser(req)
      assertSameOrigin(req)
      const userId = routeParam(req, 'userId')
      await withTransaction(req, () => resetTwoStep(req, userId))
      return ok({ userId })
    }),
  },
  {
    // "Manage store" / "View as support" (docs/05): opens one store's CMS for 2 hours
    path: '/admin/v1/platform/store-session',
    method: 'post',
    handler: apiHandler(async (req) => {
      requireUser(req)
      assertSameOrigin(req)
      const input = await readBody(req, startStoreSessionSchema)
      const result = await withTransaction(req, () => startStoreSession(req, input))
      return withCookie(ok(result, 201), selectedStoreCookie(result.tenantId))
    }),
  },
  {
    path: '/admin/v1/platform/store-session',
    method: 'delete',
    handler: apiHandler(async (req) => {
      requireUser(req)
      assertSameOrigin(req)
      const result = await withTransaction(req, () => endStoreSession(req))
      return withCookie(ok(result), selectedStoreCookie(null))
    }),
  },
  {
    path: '/admin/v1/staff/invites',
    method: 'post',
    handler: apiHandler(async (req) => {
      requireUser(req)
      assertSameOrigin(req)
      const input = await readBody(req, inviteInputSchema)
      const result = await withTransaction(req, () => inviteStaff(req, input))
      // The link only ever travels by email
      return ok(
        { userId: result.userId, addedToExistingAccount: result.addedToExistingAccount },
        201,
      )
    }),
  },
  {
    path: '/admin/v1/staff/invites/:userId/resend',
    method: 'post',
    handler: apiHandler(async (req) => {
      requireUser(req)
      assertSameOrigin(req)
      const userId = routeParam(req, 'userId')
      const result = await withTransaction(req, () => resendInvite(req, userId))
      return ok({ userId: result.userId })
    }),
  },
  {
    path: '/admin/v1/staff/:userId/roles',
    method: 'patch',
    handler: apiHandler(async (req) => {
      requireUser(req)
      assertSameOrigin(req)
      const userId = routeParam(req, 'userId')
      const input = await readBody(req, staffRolesSchema)
      await withTransaction(req, () => changeStaffRoles(req, { userId, ...input }))
      return ok({ userId })
    }),
  },
  {
    path: '/admin/v1/staff/:userId/remove',
    method: 'post',
    handler: apiHandler(async (req) => {
      requireUser(req)
      assertSameOrigin(req)
      const userId = routeParam(req, 'userId')
      const input = await readBody(req, storeOnlySchema)
      await withTransaction(req, () => removeFromStore(req, { userId, ...input }))
      return ok({ userId })
    }),
  },
]
