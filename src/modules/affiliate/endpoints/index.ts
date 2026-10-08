import type { Endpoint, PayloadRequest } from 'payload'
import { z } from 'zod'

import { withTransaction } from '@/lib/db/transaction'
import { AppError } from '@/lib/errors'
import { apiHandler, assertSameOrigin, ok, readBody, routeParam } from '@/lib/http/endpoint'

import { assertAffiliateAccess } from '../services/access'
import { recordPayout, recordPayoutSchema } from '../services/payouts'
import {
  linkCoupon,
  programSchema,
  ratesSchema,
  saveProgram,
  saveRates,
  setAffiliateStatus,
  statusActionSchema,
} from '../services/program'

// The Affiliates screen's actions (docs/07): status, rates, coupon, payouts, program settings.
// Kept out of the module's index: these import the HTTP helpers, which read the environment.

const storeOf = (req: PayloadRequest) => {
  const store = new URL(req.url ?? 'http://x').searchParams.get('store') ?? ''
  if (!store) throw new AppError('VALIDATION_FAILED', 'Which store?', 400)
  return store
}

const action = (
  path: string,
  what: 'write' | 'payout',
  run: (req: PayloadRequest, tenantId: string) => Promise<unknown>,
): Endpoint => ({
  path,
  method: 'post',
  handler: apiHandler(async (req) => {
    if (!req.user) throw new AppError('UNAUTHENTICATED', 'Sign in first', 401)
    assertSameOrigin(req)
    const tenantId = storeOf(req)
    await assertAffiliateAccess(req, tenantId, what)
    const result = await withTransaction(req, () => run(req, tenantId))
    return ok(result ?? { saved: true })
  }),
})

export const affiliateEndpoints: Endpoint[] = [
  action('/admin/v1/affiliates/program', 'write', async (req, tenantId) => {
    await saveProgram(req, tenantId, await readBody(req, programSchema))
    return { saved: true }
  }),
  action('/admin/v1/affiliates/:id/status', 'write', async (req, tenantId) => {
    const updated = await setAffiliateStatus(
      req,
      tenantId,
      routeParam(req, 'id'),
      await readBody(req, statusActionSchema),
    )
    return { id: updated.id, status: updated.status }
  }),
  action('/admin/v1/affiliates/:id/rates', 'write', async (req, tenantId) => {
    await saveRates(req, tenantId, routeParam(req, 'id'), await readBody(req, ratesSchema))
    return { saved: true }
  }),
  action('/admin/v1/affiliates/:id/coupon', 'write', async (req, tenantId) => {
    const { coupon } = await readBody(req, z.object({ coupon: z.string().nullable() }))
    await linkCoupon(req, tenantId, routeParam(req, 'id'), coupon)
    return { saved: true }
  }),
  action('/admin/v1/affiliates/:id/payouts', 'payout', async (req, tenantId) => {
    const payout = await recordPayout(
      req,
      tenantId,
      routeParam(req, 'id'),
      await readBody(req, recordPayoutSchema),
    )
    return { id: payout.id, number: payout.number }
  }),
]
