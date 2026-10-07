import type { PayloadRequest } from 'payload'

import { ANY_STORE_ROLE, hasTenantRole, STORE_ADMIN, storeSessionOf } from '@/access'
import { AppError } from '@/lib/errors'
import type { FeatureKey } from '@/modules/features'
import { requireFeature } from '@/modules/tenancy'

/**
 * Schemes and coupons (docs/screens "Who"): owners and managers change them, other roles look.
 * The store's switch is checked on the server, so a switched-off feature answers "not found".
 */
export async function assertMarketingAccess(
  req: PayloadRequest,
  tenantId: string,
  write: boolean,
  feature: FeatureKey,
) {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 'Sign in first', 401)
  const session = storeSessionOf(req.user)
  if (session) {
    if (session.tenantId !== tenantId || (write && session.mode !== 'manage')) {
      throw new AppError('FORBIDDEN', 'Open this store with “Manage store” to change offers', 403)
    }
  } else if (!hasTenantRole(req.user, tenantId, write ? STORE_ADMIN : ANY_STORE_ROLE)) {
    throw new AppError(
      'FORBIDDEN',
      write ? 'Only owners and managers change offers' : 'Your role can’t see offers',
      403,
    )
  }
  await requireFeature(req.payload, tenantId, feature)
}
