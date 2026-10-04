import type { Access, FieldAccess, Where } from 'payload'

import type { PlatformRole, TenantRole } from './roles'
import { storeSessionOf } from './storeSession'

export * from './matrix'
export * from './roles'
export * from './storeSession'

// Access functions composed per collection (docs/05). The multi-tenant plugin adds the
// "only your stores" constraint on top of these for tenant-scoped collections; these add roles.

type Membership = { tenant?: unknown; roles?: readonly string[] | null }
type StaffLike = {
  collection?: string
  id?: number | string
  platformRole?: string | null
  status?: string | null
  tenants?: readonly Membership[] | null
}

const asStaff = (user: unknown): StaffLike | null =>
  user && typeof user === 'object' && (user as StaffLike).collection === 'users'
    ? (user as StaffLike)
    : null

export const idOf = (value: unknown): string | null => {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (value && typeof value === 'object' && 'id' in value)
    return idOf((value as { id: unknown }).id)
  return null
}

export function platformRoleOf(user: unknown): PlatformRole | null {
  const staff = asStaff(user)
  if (!staff || staff.status === 'disabled') return null
  return staff.platformRole === 'super-admin' || staff.platformRole === 'support'
    ? staff.platformRole
    : null
}

export const isSuperAdmin = (user: unknown) => platformRoleOf(user) === 'super-admin'
export const isPlatformStaff = (user: unknown) => platformRoleOf(user) !== null

/** Store ids where the user holds any of `roles` (any role at all when omitted). */
export function tenantIdsWithRoles(user: unknown, roles?: readonly TenantRole[]): string[] {
  const staff = asStaff(user)
  if (!staff || staff.status === 'disabled') return []
  const ids = new Set<string>()
  for (const membership of staff.tenants ?? []) {
    const id = idOf(membership.tenant)
    if (!id) continue
    if (!roles || (membership.roles ?? []).some((role) => roles.includes(role as TenantRole))) {
      ids.add(id)
    }
  }
  return [...ids]
}

export const hasTenantRole = (user: unknown, tenantId: string, roles?: readonly TenantRole[]) =>
  tenantIdsWithRoles(user, roles).includes(tenantId)

const inTenants = (field: string, ids: string[]): Where | false =>
  ids.length > 0 ? { [field]: { in: ids } } : false

/**
 * The store constraint for tenant-scoped access. On create and update Payload passes the
 * incoming `data` and treats any query result as "allowed", so the target store is checked here:
 * holding a role in one store must not allow writing into another store the user belongs to.
 */
export function scopedToTenants(
  field: string,
  ids: string[],
  data?: Record<string, unknown> | null,
): Where | false {
  const target = data ? idOf(data[field]) : null
  if (target && !ids.includes(target)) return false
  return inTenants(field, ids)
}

// ---- Collection access ------------------------------------------------------------------

export const nobody: Access = () => false

export const superAdminOnly: Access = ({ req }) => isSuperAdmin(req.user)

export const platformStaffOnly: Access = ({ req }) => isPlatformStaff(req.user)

/**
 * Platform rows that belong to a store (subscriptions, tenant-domains): our team sees all,
 * the store's staff with one of `roles` see their own store's rows.
 */
export const platformStaffOrOwnTenant =
  (roles: readonly TenantRole[], field = 'tenant'): Access =>
  ({ req }) =>
    isPlatformStaff(req.user) || inTenants(field, tenantIdsWithRoles(req.user, roles))

/**
 * What a platform admin may do in tenant-scoped data. Without an open store session: nothing,
 * unless the collection is platform data kept per store (`platformOutsideStore`, feature flags).
 * With one (docs/05 "Manage store", "View as support"): that one store only, read-only when
 * viewing. `supportCanAccess` marks a read rule, as every read in our collections sets it.
 */
function platformAccess(
  user: unknown,
  role: PlatformRole,
  {
    read,
    platformOutsideStore,
    field,
  }: { read: boolean; platformOutsideStore: boolean; field: string },
  data?: Record<string, unknown> | null,
): Where | boolean {
  const session = storeSessionOf(user)
  if (!session) {
    if (!platformOutsideStore) return false
    return role === 'super-admin' || read
  }
  if (session.mode === 'view' && !read) return false
  return scopedToTenants(field, [session.tenantId], data)
}

/**
 * Tenant-scoped collections: store staff with one of `roles` work inside their own stores
 * (docs/05 permission matrix); our team works in a store through a store session.
 */
export const tenantRoleOrPlatform =
  ({
    roles,
    supportCanAccess = false,
    platformOutsideStore = false,
    field = 'tenant',
  }: {
    roles: readonly TenantRole[]
    /** This rule is a read: support may use it (and our team in "View as support") */
    supportCanAccess?: boolean
    /** Platform data kept per store (feature flags): our team reaches it from the platform panel */
    platformOutsideStore?: boolean
    field?: string
  }): Access =>
  ({ req, data }) => {
    const role = platformRoleOf(req.user)
    if (role) {
      return platformAccess(
        req.user,
        role,
        { read: supportCanAccess, platformOutsideStore, field },
        data,
      )
    }
    return scopedToTenants(field, tenantIdsWithRoles(req.user, roles), data)
  }

/** The same platform rule for access functions that check store staff in their own way. */
export const platformTenantAccess = (
  user: unknown,
  { read, field = 'tenant' }: { read: boolean; field?: string },
  data?: Record<string, unknown> | null,
): Where | boolean | null => {
  const role = platformRoleOf(user)
  if (!role) return null
  return platformAccess(user, role, { read, platformOutsideStore: false, field }, data)
}

// ---- Field access -----------------------------------------------------------------------

export const fieldSuperAdminOnly: FieldAccess = ({ req }) => isSuperAdmin(req.user)
export const fieldPlatformStaffOnly: FieldAccess = ({ req }) => isPlatformStaff(req.user)
