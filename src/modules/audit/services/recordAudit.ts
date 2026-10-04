import type { PayloadRequest } from 'payload'

import { idOf, platformRoleOf, tenantIdsWithRoles } from '@/access'

import type { AuditAction } from '../constants'

export type AuditEntry = {
  action: AuditAction
  tenant?: string | null
  summary?: string
  collectionSlug?: string
  docId?: string
  diff?: unknown
  reason?: string
  actingAsPlatform?: boolean
}

function actorRole(user: unknown, tenant?: string | null): string | undefined {
  const platformRole = platformRoleOf(user)
  if (platformRole) return platformRole
  if (!user || typeof user !== 'object' || !tenant) return undefined
  const memberships = (user as { tenants?: { tenant?: unknown; roles?: string[] | null }[] | null })
    .tenants
  const membership = memberships?.find((row) => idOf(row.tenant) === tenant)
  return membership?.roles?.join(', ') ?? (tenantIdsWithRoles(user).length ? 'staff' : undefined)
}

function clientIp(req: PayloadRequest): string | undefined {
  const forwarded = req.headers?.get('x-forwarded-for')
  return forwarded?.split(',')[0]?.trim() || req.headers?.get('x-real-ip') || undefined
}

/**
 * Appends one audit entry inside the caller's request (and so its transaction). Never stores
 * secrets or shopper PII in `diff` (docs/14).
 */
export async function recordAudit(req: PayloadRequest, entry: AuditEntry): Promise<void> {
  const user = req.user
  await req.payload.create({
    collection: 'audit-logs',
    data: {
      ...entry,
      tenant: entry.tenant ?? undefined,
      diff: entry.diff === undefined ? undefined : (entry.diff as Record<string, unknown>),
      actor: user && user.collection === 'users' ? user.id : undefined,
      actorRole: actorRole(user, entry.tenant),
      actingAsPlatform: entry.actingAsPlatform ?? Boolean(entry.tenant && platformRoleOf(user)),
      ip: clientIp(req),
      at: new Date().toISOString(),
    },
    overrideAccess: true,
    req,
  })
}
