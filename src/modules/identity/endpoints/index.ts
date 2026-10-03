import type { Endpoint } from 'payload'

import { withTransaction } from '@/lib/db/transaction'
import { AppError } from '@/lib/errors'
import { apiHandler, assertSameOrigin, ok, readBody, routeParam } from '@/lib/http/endpoint'

import { inviteInputSchema, inviteStaff, resendInvite } from '../services/invites'

const requireUser = (req: Parameters<Endpoint['handler']>[0]) => {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 'Sign in first', 401)
}

/** Staff invites (docs/07 admin endpoints). Accepting uses Payload's /admin/reset/:token page. */
export const identityEndpoints: Endpoint[] = [
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
]
