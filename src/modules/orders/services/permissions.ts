import type { PayloadRequest } from 'payload'

import { hasTenantRole, idOf, ORDER_READ, ORDER_WORK, storeSessionOf } from '@/access'
import { AppError } from '@/lib/errors'
import type { Order } from '@/payload-types'

import { loadOrder } from './transition'

/**
 * Who may work on a store's orders (docs/05 matrix "Orders, refunds, invoices, shipments"):
 * owners, managers and order managers; support only looks. Our team works through a store
 * session: managing to change, viewing to look.
 */
export function assertOrderAccess(req: PayloadRequest, tenantId: string, write: boolean) {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 'Sign in first', 401)
  const session = storeSessionOf(req.user)
  if (session) {
    if (session.tenantId !== tenantId || (write && session.mode !== 'manage')) {
      throw new AppError(
        'FORBIDDEN',
        'Open this store with “Manage store” to change its orders',
        403,
      )
    }
    return
  }
  if (!hasTenantRole(req.user, tenantId, write ? ORDER_WORK : ORDER_READ)) {
    throw new AppError(
      'FORBIDDEN',
      write ? 'Your role can’t change orders' : 'Your role can’t see orders',
      403,
    )
  }
}

/** The order, after checking the person may read (or change) it. */
export async function orderFor(
  req: PayloadRequest,
  orderId: string,
  write: boolean,
): Promise<Order> {
  const order = await loadOrder(req, orderId)
  assertOrderAccess(req, idOf(order.tenant)!, write)
  return order
}
