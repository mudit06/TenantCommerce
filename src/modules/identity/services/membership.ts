import type { PayloadRequest } from 'payload'
import { z } from 'zod'

import {
  hasTenantRole,
  idOf,
  isSuperAdmin,
  TENANT_ROLE_LABELS,
  TENANT_ROLES,
  type TenantRole,
} from '@/access'
import { AppError } from '@/lib/errors'
import { recordAudit } from '@/modules/audit'
import type { User } from '@/payload-types'

export const staffRolesSchema = z.object({
  tenantId: z.string().min(1),
  roles: z.array(z.enum(TENANT_ROLES)).min(1, 'Pick at least one role'),
})

export const storeOnlySchema = z.object({ tenantId: z.string().min(1) })

type Membership = NonNullable<User['tenants']>[number]

function assertOwnerOrSuperAdmin(req: PayloadRequest, tenantId: string) {
  if (!req.user) return
  if (!isSuperAdmin(req.user) && !hasTenantRole(req.user, tenantId, ['owner'])) {
    throw new AppError('FORBIDDEN', 'Only the store owner or our team manage staff', 403)
  }
}

async function loadMember(req: PayloadRequest, userId: string, tenantId: string) {
  const user = await req.payload
    .findByID({ collection: 'users', id: userId, depth: 0, overrideAccess: true, req })
    .catch(() => null)
  const membership = user?.tenants?.find((row) => idOf(row.tenant) === tenantId)
  if (!user || !membership)
    throw new AppError('NOT_FOUND', 'This person doesn’t work in this store', 404)
  return { user, membership }
}

/** A store must always keep someone who can manage staff, keys and payouts (docs/05). */
async function assertAnotherOwner(req: PayloadRequest, tenantId: string, exceptUserId: string) {
  // Staff lists are small (the plan caps them), so the role check runs here rather than in a query
  const { docs } = await req.payload.find({
    collection: 'users',
    where: {
      and: [
        { id: { not_equals: exceptUserId } },
        { status: { not_equals: 'disabled' } },
        { 'tenants.tenant': { equals: tenantId } },
      ],
    },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { tenants: true },
    req,
  })
  const hasOwner = docs.some((user) =>
    (user.tenants ?? []).some(
      (row) => idOf(row.tenant) === tenantId && (row.roles ?? []).includes('owner'),
    ),
  )
  if (!hasOwner) {
    throw new AppError(
      'BUSINESS_RULE',
      'The store needs at least one owner. Make someone else owner first.',
      409,
    )
  }
}

const labelsOf = (roles: readonly string[]) =>
  roles.map((role) => TENANT_ROLE_LABELS[role as TenantRole] ?? role).join(', ')

/** The owner changes what a colleague can do in their store (docs/screens Staff and roles). */
export async function changeStaffRoles(
  req: PayloadRequest,
  input: { userId: string; tenantId: string; roles: TenantRole[] },
): Promise<void> {
  const { tenantId, roles } = staffRolesSchema.parse(input)
  assertOwnerOrSuperAdmin(req, tenantId)
  const { user, membership } = await loadMember(req, input.userId, tenantId)
  if ((membership.roles ?? []).includes('owner') && !roles.includes('owner')) {
    await assertAnotherOwner(req, tenantId, String(user.id))
  }
  const tenants: Membership[] = (user.tenants ?? []).map((row) =>
    idOf(row.tenant) === tenantId ? { ...row, roles } : row,
  )
  await req.payload.update({
    collection: 'users',
    id: user.id,
    data: { tenants },
    overrideAccess: true,
    req,
    context: { skipAudit: true },
  })
  await recordAudit(req, {
    action: 'staff_changed',
    tenant: tenantId,
    collectionSlug: 'users',
    docId: String(user.id),
    summary: `${user.email}: ${labelsOf(membership.roles ?? [])} to ${labelsOf(roles)}`,
  })
}

/** Takes someone out of one store. Their account stays for any other store they work in. */
export async function removeFromStore(
  req: PayloadRequest,
  input: { userId: string; tenantId: string },
): Promise<void> {
  const { tenantId } = storeOnlySchema.parse(input)
  assertOwnerOrSuperAdmin(req, tenantId)
  const { user, membership } = await loadMember(req, input.userId, tenantId)
  if ((membership.roles ?? []).includes('owner')) {
    await assertAnotherOwner(req, tenantId, String(user.id))
  }
  await req.payload.update({
    collection: 'users',
    id: user.id,
    data: { tenants: (user.tenants ?? []).filter((row) => idOf(row.tenant) !== tenantId) },
    overrideAccess: true,
    req,
    context: { skipAudit: true },
  })
  await recordAudit(req, {
    action: 'staff_changed',
    tenant: tenantId,
    collectionSlug: 'users',
    docId: String(user.id),
    summary: `Removed ${user.email} from the store`,
  })
}
