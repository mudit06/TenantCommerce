import type { Endpoint, PayloadRequest } from 'payload'
import { z } from 'zod'

import { CATALOG_READ, hasTenantRole, idOf, STORE_ADMIN, storeSessionOf } from '@/access'
import { withTransaction } from '@/lib/db/transaction'
import { AppError } from '@/lib/errors'
import { apiHandler, assertSameOrigin, ok, readBody, routeParam } from '@/lib/http/endpoint'

import { positionForPincode } from './services/position'

// Dealers screen helpers (docs/07 admin endpoints): the position for a pincode, and the Shown
// switch on each row. Kept out of the module's index exports' runtime path for the storefront.

function assertDealerAccess(req: PayloadRequest, tenantId: string, write: boolean) {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 'Sign in first', 401)
  const session = storeSessionOf(req.user)
  const allowed = session
    ? session.tenantId === tenantId && (!write || session.mode === 'manage')
    : hasTenantRole(req.user, tenantId, write ? STORE_ADMIN : CATALOG_READ)
  if (!allowed) throw new AppError('FORBIDDEN', 'Your role can’t change dealers', 403)
}

export const dealerEndpoints: Endpoint[] = [
  {
    path: '/admin/v1/dealers/position',
    method: 'get',
    handler: apiHandler(async (req) => {
      const params = new URL(req.url ?? 'http://x').searchParams
      const tenantId = params.get('store') ?? ''
      assertDealerAccess(req, tenantId, false)
      const position = await positionForPincode(req.payload, tenantId, params.get('pincode') ?? '')
      return ok({ position })
    }),
  },
  {
    // The Shown switch (docs/screens `cms-dealers` rule 1): saved with the person's own access
    path: '/admin/v1/dealers/:id/shown',
    method: 'post',
    handler: apiHandler(async (req) => {
      assertSameOrigin(req)
      const id = routeParam(req, 'id')
      const { shown } = await readBody(req, z.object({ shown: z.boolean() }))
      const dealer = await req.payload
        .findByID({ collection: 'dealers', id, depth: 0, overrideAccess: true, req })
        .catch(() => null)
      if (!dealer) throw new AppError('NOT_FOUND', 'Dealer not found', 404)
      assertDealerAccess(req, idOf(dealer.tenant)!, true)
      await withTransaction(req, () =>
        req.payload.update({
          collection: 'dealers',
          id,
          data: { isActive: shown },
          overrideAccess: false,
          user: req.user,
          req,
        }),
      )
      return ok({ shown })
    }),
  },
]
