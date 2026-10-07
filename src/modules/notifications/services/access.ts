import type { PayloadRequest } from 'payload'

import { hasTenantRole, ORDER_READ, ORDER_WORK, STORE_ADMIN, storeSessionOf } from '@/access'
import { AppError } from '@/lib/errors'

// Who may do what with order updates (docs/05, docs/screens Order updates): owners and managers
// change the settings; order managers look, and resend a message on an order.

export type NotificationAction = 'read' | 'settings' | 'resend'

export function assertNotificationAccess(
  req: PayloadRequest,
  tenantId: string,
  action: NotificationAction,
) {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 'Sign in first', 401)
  const session = storeSessionOf(req.user)
  if (session) {
    if (session.tenantId !== tenantId || (action !== 'read' && session.mode !== 'manage')) {
      throw new AppError('FORBIDDEN', 'Open this store with “Manage store” to change this', 403)
    }
    return
  }
  const roles = action === 'settings' ? STORE_ADMIN : action === 'resend' ? ORDER_WORK : ORDER_READ
  if (!hasTenantRole(req.user, tenantId, roles)) {
    throw new AppError(
      'FORBIDDEN',
      action === 'settings'
        ? 'Only owners and managers change order updates'
        : 'Only order roles can do this',
      403,
    )
  }
}
