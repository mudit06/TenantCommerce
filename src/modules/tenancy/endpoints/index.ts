import type { Endpoint, PayloadRequest } from 'payload'

import { isSuperAdmin } from '@/access'
import { withTransaction } from '@/lib/db/transaction'
import { AppError } from '@/lib/errors'
import { apiHandler, assertSameOrigin, ok, readBody, routeParam } from '@/lib/http/endpoint'
import { isFeatureKey } from '@/modules/features'

import type { PaymentMethod, TenantStatus } from '../constants'
import {
  changePlanSchema,
  featureSwitchSchema,
  onboardingSchema,
  recordPaymentSchema,
  statusChangeSchema,
  subscriptionActionSchema,
} from '../schemas'
import { applyIndustryPreset, setFeature } from '../services/features'
import { createTenant } from '../services/onboarding'
import {
  changeSubscriptionPlan,
  changeSubscriptionStatus,
  recordSubscriptionPayment,
} from '../services/subscriptions'
import { changeTenantStatus } from '../services/tenantStatus'

/** Platform endpoints are for super admins only, from our own admin origin (docs/07). */
function guard(req: PayloadRequest) {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 'Sign in first', 401)
  if (!isSuperAdmin(req.user)) throw new AppError('FORBIDDEN', 'Super admins only', 403)
  assertSameOrigin(req)
}

const statusEndpoint = (action: string, to: TenantStatus): Endpoint => ({
  path: `/admin/v1/platform/tenants/:id/${action}`,
  method: 'post',
  handler: apiHandler(async (req) => {
    guard(req)
    const tenantId = routeParam(req, 'id')
    const { reason } = await readBody(req, statusChangeSchema)
    const tenant = await withTransaction(req, () =>
      changeTenantStatus(req, { tenantId, to, reason }),
    )
    return ok({ id: tenant.id, status: tenant.status })
  }),
})

export const tenancyEndpoints: Endpoint[] = [
  {
    path: '/admin/v1/platform/tenants',
    method: 'post',
    handler: apiHandler(async (req) => {
      guard(req)
      const input = await readBody(req, onboardingSchema)
      const result = await withTransaction(req, () => createTenant(req, input))
      return ok(
        {
          id: result.tenant.id,
          slug: result.tenant.slug,
          primaryHost: result.primaryHost,
          subscriptionId: result.subscriptionId,
          ownerUserId: result.ownerUserId,
          inviteEmailed: result.inviteEmailed,
          featuresOn: result.featuresOn,
        },
        201,
      )
    }),
  },
  statusEndpoint('activate', 'active'),
  statusEndpoint('suspend', 'suspended'),
  statusEndpoint('resume', 'active'),
  statusEndpoint('archive', 'archived'),
  {
    path: '/admin/v1/platform/tenants/:id/features',
    method: 'patch',
    handler: apiHandler(async (req) => {
      guard(req)
      const tenantId = routeParam(req, 'id')
      const { key, enabled, cascade } = await readBody(req, featureSwitchSchema)
      if (!isFeatureKey(key)) throw new AppError('NOT_FOUND', `Unknown feature "${key}"`, 404)
      const states = await withTransaction(req, () =>
        setFeature(req, { tenantId, key, enabled, cascade }),
      )
      return ok({ features: states })
    }),
  },
  {
    path: '/admin/v1/platform/tenants/:id/features/apply-preset',
    method: 'post',
    handler: apiHandler(async (req) => {
      guard(req)
      const tenantId = routeParam(req, 'id')
      const states = await withTransaction(req, () => applyIndustryPreset(req, tenantId))
      return ok({ features: states })
    }),
  },
  {
    path: '/admin/v1/platform/subscriptions/:id/payments',
    method: 'post',
    handler: apiHandler(async (req) => {
      guard(req)
      const subscriptionId = routeParam(req, 'id')
      const input = await readBody(req, recordPaymentSchema)
      const sub = await withTransaction(req, () =>
        recordSubscriptionPayment(req, {
          subscriptionId,
          amountMinor: input.amountMinor,
          paidOn: input.paidOn,
          method: input.method as PaymentMethod,
          reference: input.reference,
        }),
      )
      return ok({ id: sub.id, status: sub.status, currentPeriodEnd: sub.currentPeriodEnd }, 201)
    }),
  },
  {
    path: '/admin/v1/platform/subscriptions/:id/plan',
    method: 'post',
    handler: apiHandler(async (req) => {
      guard(req)
      const subscriptionId = routeParam(req, 'id')
      const input = await readBody(req, changePlanSchema)
      const sub = await withTransaction(req, () =>
        changeSubscriptionPlan(req, { subscriptionId, ...input }),
      )
      return ok({ id: sub.id })
    }),
  },
  {
    path: '/admin/v1/platform/subscriptions/:id/status',
    method: 'post',
    handler: apiHandler(async (req) => {
      guard(req)
      const subscriptionId = routeParam(req, 'id')
      const input = await readBody(req, subscriptionActionSchema)
      const sub = await withTransaction(req, () =>
        changeSubscriptionStatus(req, { subscriptionId, ...input }),
      )
      return ok({ id: sub.id, status: sub.status })
    }),
  },
]
