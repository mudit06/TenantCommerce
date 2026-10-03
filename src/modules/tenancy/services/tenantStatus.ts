import type { PayloadRequest } from 'payload'

import { isSuperAdmin } from '@/access'
import { emit } from '@/lib/events'
import { AppError } from '@/lib/errors'
import { recordAudit } from '@/modules/audit'
import type { Tenant } from '@/payload-types'

import { TENANT_TRANSITIONS, type TenantStatus } from '../constants'
import { revalidateHostMap } from './cache'

const VERB: Record<TenantStatus, string> = {
  draft: 'Moved back to draft',
  active: 'Store is live',
  suspended: 'Suspended the store',
  archived: 'Archived the store',
}

/**
 * Moves a store through its lifecycle (docs/04): draft -> active -> suspended <-> active ->
 * archived. Suspending shows shoppers "store unavailable" and makes the CMS read-only; nothing
 * is deleted. A reason is required for suspend and archive and goes to the audit log.
 */
export async function changeTenantStatus(
  req: PayloadRequest,
  input: { tenantId: string; to: TenantStatus; reason?: string },
): Promise<Tenant> {
  if (req.user && !isSuperAdmin(req.user)) {
    throw new AppError('FORBIDDEN', 'Only super admins change a store’s status', 403)
  }
  const tenant = await req.payload
    .findByID({ collection: 'tenants', id: input.tenantId, depth: 0, overrideAccess: true, req })
    .catch(() => null)
  if (!tenant) throw new AppError('NOT_FOUND', 'Store not found', 404)
  const from = tenant.status as TenantStatus
  if (from === input.to) return tenant
  if (!TENANT_TRANSITIONS[from].includes(input.to)) {
    throw new AppError('INVALID_TRANSITION', `A ${from} store cannot become ${input.to}`, 409)
  }
  if ((input.to === 'suspended' || input.to === 'archived') && !input.reason?.trim()) {
    throw new AppError('VALIDATION_FAILED', 'Give a reason', 400, { reason: 'Give a reason' })
  }
  const updated = await req.payload.update({
    collection: 'tenants',
    id: tenant.id,
    data: {
      status: input.to,
      ...(input.to === 'active' && !tenant.activatedAt
        ? { activatedAt: new Date().toISOString() }
        : {}),
    },
    overrideAccess: true,
    req,
    context: { allowStatusChange: true },
  })
  revalidateHostMap()
  await recordAudit(req, {
    action: 'store_status_changed',
    tenant: String(tenant.id),
    collectionSlug: 'tenants',
    docId: String(tenant.id),
    summary: input.to === 'active' && from === 'suspended' ? 'Resumed the store' : VERB[input.to],
    reason: input.reason,
    diff: { before: from, after: input.to },
  })
  await emit('tenant.status-changed', { tenantId: String(tenant.id), from, to: input.to }, { req })
  return updated
}
