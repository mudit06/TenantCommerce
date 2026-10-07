import type { PayloadRequest } from 'payload'

import { hasTenantRole, storeSessionOf, type TenantRole } from '@/access'
import { AppError } from '@/lib/errors'
import { requireFeature } from '@/modules/tenancy'

/** Owners, managers, content editors and support handle reviews (docs/screens Reviews "Who"). */
export const REVIEW_ROLES: readonly TenantRole[] = ['owner', 'manager', 'content-editor', 'support']
/** Settings are the owner's and manager's */
const SETTINGS_ROLES: readonly TenantRole[] = ['owner', 'manager']

export async function assertReviewAccess(
  req: PayloadRequest,
  tenantId: string,
  what: 'read' | 'moderate' | 'settings',
) {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 'Sign in first', 401)
  const session = storeSessionOf(req.user)
  if (session) {
    if (session.tenantId !== tenantId || (what !== 'read' && session.mode !== 'manage')) {
      throw new AppError('FORBIDDEN', 'Open this store with “Manage store” to handle reviews', 403)
    }
  } else if (
    !hasTenantRole(req.user, tenantId, what === 'settings' ? SETTINGS_ROLES : REVIEW_ROLES)
  ) {
    throw new AppError('FORBIDDEN', 'Your role can’t do this', 403)
  }
  await requireFeature(req.payload, tenantId, 'reviews')
}
