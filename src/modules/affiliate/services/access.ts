import type { Payload, PayloadRequest } from 'payload'

import { hasTenantRole, storeSessionOf, type TenantRole } from '@/access'
import { AppError } from '@/lib/errors'
import { featureConfig, requireFeature } from '@/modules/tenancy'
import type { Affiliate } from '@/payload-types'

// Who does what on the Affiliates screen (docs/screens Affiliates "Who"): owners and managers
// approve, set rates and the program; order managers and support look; payouts are the owner's.

const READ_ROLES: readonly TenantRole[] = ['owner', 'manager', 'order-manager', 'support']
const WRITE_ROLES: readonly TenantRole[] = ['owner', 'manager']
const PAYOUT_ROLES: readonly TenantRole[] = ['owner']

export type ProgramConfig = {
  defaultCommissionPercent: number
  cookieDays: number
  minPayoutMinor: number
  autoApproveApplications: boolean
  holdDays: number
  termsPath: string
}

export const programConfig = async (payload: Payload, tenantId: string, req?: PayloadRequest) => {
  const config = await featureConfig<Partial<ProgramConfig>>(payload, tenantId, 'affiliate', req)
  if (!config) return null
  return {
    defaultCommissionPercent: config.defaultCommissionPercent ?? 5,
    cookieDays: config.cookieDays ?? 30,
    minPayoutMinor: config.minPayoutMinor ?? 50_000,
    autoApproveApplications: config.autoApproveApplications ?? false,
    holdDays: config.holdDays ?? 7,
    termsPath: config.termsPath ?? 'pages/affiliate-terms',
  } satisfies ProgramConfig
}

export async function assertAffiliateAccess(
  req: PayloadRequest,
  tenantId: string,
  what: 'read' | 'write' | 'payout',
) {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 'Sign in first', 401)
  const session = storeSessionOf(req.user)
  if (session) {
    if (session.tenantId !== tenantId || (what !== 'read' && session.mode !== 'manage')) {
      throw new AppError('FORBIDDEN', 'Open this store with “Manage store” to change this', 403)
    }
  } else if (
    !hasTenantRole(
      req.user,
      tenantId,
      what === 'payout' ? PAYOUT_ROLES : what === 'write' ? WRITE_ROLES : READ_ROLES,
    )
  ) {
    throw new AppError(
      'FORBIDDEN',
      what === 'payout' ? 'Only the store owner records payouts' : 'Your role can’t do this',
      403,
    )
  }
  await requireFeature(req.payload, tenantId, 'affiliate')
}

export async function ownAffiliate(
  payload: Payload,
  tenantId: string,
  id: string,
  req?: PayloadRequest,
): Promise<Affiliate> {
  const { docs } = await payload.find({
    collection: 'affiliates',
    where: { and: [{ tenant: { equals: tenantId } }, { id: { equals: id } }] },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  if (!docs[0]) throw new AppError('NOT_FOUND', 'Affiliate not found', 404)
  return docs[0]
}

/** The shopper's own affiliate record in this store, if they applied */
export async function affiliateOfCustomer(
  payload: Payload,
  tenantId: string,
  customerId: string,
  req?: PayloadRequest,
): Promise<Affiliate | null> {
  const { docs } = await payload.find({
    collection: 'affiliates',
    where: { and: [{ tenant: { equals: tenantId } }, { customer: { equals: customerId } }] },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  return docs[0] ?? null
}
