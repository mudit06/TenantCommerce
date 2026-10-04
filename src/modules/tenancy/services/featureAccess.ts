import type { Access } from 'payload'

import {
  idOf,
  isPlatformStaff,
  platformTenantAccess,
  scopedToTenants,
  storeSessionOf,
  tenantIdsWithRoles,
  type TenantRole,
} from '@/access'
import type { FeatureKey } from '@/modules/features'

type Membership = { tenant?: unknown; roles?: readonly string[] | null }

/**
 * Whether any of the user's stores has `feature` on, read from the populated memberships
 * (`users.auth.depth` 1). Synchronous so Payload's `admin.hidden` can use it. Our team in a store
 * session sees what that store's own staff see.
 */
export function userHasFeature(user: unknown, feature: FeatureKey): boolean {
  const session = storeSessionOf(user)
  if (session) return session.enabledFeatures ? session.enabledFeatures.includes(feature) : true
  if (isPlatformStaff(user)) return true
  const memberships = (user as { tenants?: Membership[] | null } | null)?.tenants ?? []
  return memberships.some((row) => {
    const tenant = row.tenant as { enabledFeatures?: string[] | null } | string | undefined
    return typeof tenant === 'object' && Boolean(tenant?.enabledFeatures?.includes(feature))
  })
}

/** Hide a feature's screens from stores that don't have it (docs/08 "Checking a flag"). */
export const hiddenWithoutFeature =
  (feature: FeatureKey) =>
  ({ user }: { user: unknown }) =>
    !userHasFeature(user, feature)

/**
 * Collection access for an optional feature's data: store staff with one of `roles`, and our team
 * in a store session, only in stores where the feature is enabled. A switched-off feature's data stays in
 * the database but answers nothing (docs/08).
 */
export const featureGatedAccess =
  ({
    feature,
    roles,
    supportCanAccess = false,
  }: {
    feature: FeatureKey
    roles: readonly TenantRole[]
    supportCanAccess?: boolean
  }): Access =>
  async ({ req, data }) => {
    const platform = platformTenantAccess(req.user, { read: supportCanAccess }, data)
    const ids =
      platform === null
        ? tenantIdsWithRoles(req.user, roles)
        : platform === false
          ? []
          : [storeSessionOf(req.user)!.tenantId]
    if (ids.length === 0) return false
    const { docs } = await req.payload.find({
      collection: 'tenants',
      where: { and: [{ id: { in: ids } }, { enabledFeatures: { in: [feature] } }] },
      depth: 0,
      limit: ids.length,
      pagination: false,
      overrideAccess: true,
      select: {},
      req,
    })
    const allowed = docs.map((doc) => idOf(doc.id)).filter((id): id is string => Boolean(id))
    return scopedToTenants('tenant', allowed, data)
  }
