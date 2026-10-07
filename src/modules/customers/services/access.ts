import type { PayloadRequest } from 'payload'

import { CUSTOMER_READ, hasTenantRole, STORE_ADMIN, storeSessionOf } from '@/access'
import { AppError } from '@/lib/errors'

/**
 * Who may see and change a store's customers (docs/screens Customers "Who"): owners and
 * managers change; order managers and support look. Our team works through a store session.
 */
export function assertCustomerAccess(req: PayloadRequest, tenantId: string, write: boolean) {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 'Sign in first', 401)
  const session = storeSessionOf(req.user)
  if (session) {
    if (session.tenantId !== tenantId || (write && session.mode !== 'manage')) {
      throw new AppError(
        'FORBIDDEN',
        'Open this store with “Manage store” to change its customers',
        403,
      )
    }
    return
  }
  if (!hasTenantRole(req.user, tenantId, write ? STORE_ADMIN : CUSTOMER_READ)) {
    throw new AppError(
      'FORBIDDEN',
      write ? 'Only owners and managers handle customer requests' : 'Your role can’t see customers',
      403,
    )
  }
}
