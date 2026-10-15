import type { Access, PayloadRequest } from 'payload'

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

// Stores' switched-on features, read once per request. Payload works out every collection's
// permissions (create, read, update, delete, versions...) on each admin page, and each gated
// collection asked the database again: about sixty tenant reads per page.
const NONE: readonly string[] = []
const featuresPerRequest = new WeakMap<object, Map<string, Promise<readonly string[]>>>()

/** Forget what this request read: the store's features have just changed (featureSync). */
export const forgetStoreFeatures = (req: PayloadRequest) => featuresPerRequest.delete(req)

async function storesWithFeature(
  req: PayloadRequest,
  ids: readonly string[],
  feature: FeatureKey,
): Promise<string[]> {
  let known = featuresPerRequest.get(req)
  if (!known) {
    known = new Map()
    featuresPerRequest.set(req, known)
  }
  const missing = ids.filter((id) => !known.has(id))
  if (missing.length > 0) {
    const loading = req.payload
      .find({
        collection: 'tenants',
        where: { id: { in: missing } },
        depth: 0,
        limit: missing.length,
        pagination: false,
        overrideAccess: true,
        select: { enabledFeatures: true },
        req,
      })
      .then(({ docs }) => new Map(docs.map((doc) => [idOf(doc.id), doc.enabledFeatures ?? []])))
    for (const id of missing) {
      const features = loading.then((found) => found.get(id) ?? NONE)
      known.set(id, features)
    }
  }
  const features = await Promise.all(ids.map((id) => known.get(id) ?? NONE))
  return ids.filter((_, index) => features[index]?.includes(feature))
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
    return scopedToTenants('tenant', await storesWithFeature(req, ids, feature), data)
  }
