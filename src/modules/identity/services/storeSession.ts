import type { PayloadRequest } from 'payload'
import { z } from 'zod'

import {
  idOf,
  isSuperAdmin,
  platformRoleOf,
  STORE_SESSION_MINUTES,
  STORE_SESSION_MODE_LABELS,
  STORE_SESSION_MODES,
  storeSessionOf,
  type StoreSessionMode,
} from '@/access'
import { AppError } from '@/lib/errors'
import { recordAudit } from '@/modules/audit'

export const startStoreSessionSchema = z.object({
  tenantId: z.string().min(1),
  mode: z.enum(STORE_SESSION_MODES),
  reason: z
    .string()
    .trim()
    .min(
      5,
      'Say why you are opening this store, for example “vendor asked us to add the Diwali page”',
    )
    .max(300),
})

export type StartStoreSessionInput = z.infer<typeof startStoreSessionSchema>

export type StoreSessionResult = {
  tenantId: string
  tenantName: string
  mode: StoreSessionMode
  endsAt: string
}

/**
 * Opens a store's CMS for a platform admin (docs/05): "manage" for super admins (full edit),
 * "view" for support and super admins (read-only). One store at a time; opening another ends the
 * first. The reason and the start go to the store's audit log, which its owner can see.
 */
export async function startStoreSession(
  req: PayloadRequest,
  input: StartStoreSessionInput,
  now: Date = new Date(),
): Promise<StoreSessionResult> {
  const role = platformRoleOf(req.user)
  if (!req.user || !role)
    throw new AppError('FORBIDDEN', 'Only our team opens a vendor’s store', 403)
  if (input.mode === 'manage' && !isSuperAdmin(req.user)) {
    throw new AppError(
      'FORBIDDEN',
      'Only super admins can manage a store. Use View as support.',
      403,
    )
  }
  const tenant = await req.payload
    .findByID({ collection: 'tenants', id: input.tenantId, depth: 0, overrideAccess: true, req })
    .catch(() => null)
  if (!tenant) throw new AppError('NOT_FOUND', 'This store doesn’t exist', 404)
  if (tenant.status === 'archived') {
    throw new AppError('BUSINESS_RULE', 'This store is archived. Its CMS can’t be opened.', 409)
  }

  const previous = storeSessionOf(req.user, now.getTime())
  if (previous) await endStoreSession(req, { reason: 'Opened another store' })

  const endsAt = new Date(now.getTime() + STORE_SESSION_MINUTES * 60_000).toISOString()
  await req.payload.update({
    collection: 'users',
    id: req.user.id,
    data: {
      storeSession: {
        tenant: tenant.id,
        mode: input.mode,
        reason: input.reason,
        startedAt: now.toISOString(),
        endsAt,
      },
    },
    overrideAccess: true,
    req,
    context: { skipAudit: true },
  })
  await recordAudit(req, {
    action: 'support_access',
    tenant: String(tenant.id),
    summary: `${STORE_SESSION_MODE_LABELS[input.mode]}: opened the store's CMS for ${STORE_SESSION_MINUTES / 60} hours`,
    reason: input.reason,
    actingAsPlatform: true,
  })
  return { tenantId: String(tenant.id), tenantName: tenant.name, mode: input.mode, endsAt }
}

/** Closes the platform admin's store session, if any, and logs it. Safe to call twice. */
export async function endStoreSession(
  req: PayloadRequest,
  { reason }: { reason?: string } = {},
): Promise<{ tenantId: string | null }> {
  if (!req.user || !platformRoleOf(req.user)) {
    throw new AppError('FORBIDDEN', 'Only our team has store sessions', 403)
  }
  const raw = (req.user as { storeSession?: { tenant?: unknown; mode?: string | null } | null })
    .storeSession
  const tenantId = idOf(raw?.tenant)
  if (!tenantId) return { tenantId: null }
  await req.payload.update({
    collection: 'users',
    id: req.user.id,
    data: {
      storeSession: { tenant: null, mode: null, reason: null, startedAt: null, endsAt: null },
    },
    overrideAccess: true,
    req,
    context: { skipAudit: true },
  })
  const mode = raw?.mode === 'manage' ? 'manage' : 'view'
  await recordAudit(req, {
    action: 'support_access',
    tenant: tenantId,
    summary: `${STORE_SESSION_MODE_LABELS[mode]}: closed the store's CMS`,
    reason,
    actingAsPlatform: true,
  })
  return { tenantId }
}
