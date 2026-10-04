// "Manage store" and "View as support" (docs/05 "Platform admins inside a vendor's store"): a
// platform admin opens one store's CMS for a limited time, with a reason. While the session is
// open the admin works in that store only, exactly like its own staff; without one, our team sees
// the platform panel and no store data at all.

/** How long one session lasts before the admin has to give a reason again (docs/05). */
export const STORE_SESSION_MINUTES = 120

export const STORE_SESSION_MODES = ['manage', 'view'] as const
export type StoreSessionMode = (typeof STORE_SESSION_MODES)[number]

export const STORE_SESSION_MODE_LABELS: Record<StoreSessionMode, string> = {
  manage: 'Manage store',
  view: 'View as support',
}

export type StoreSession = {
  tenantId: string
  /** The store's name when the user was loaded with depth (auth depth 1 does this) */
  tenantName?: string
  tenantSlug?: string
  /** The store's enabled features, for hiding switched-off screens like its own staff */
  enabledFeatures?: string[]
  mode: StoreSessionMode
  reason: string
  startedAt?: string
  endsAt: string
}

type SessionLike = {
  tenant?: unknown
  mode?: string | null
  reason?: string | null
  startedAt?: string | null
  endsAt?: string | null
}

type UserLike = {
  collection?: string
  platformRole?: string | null
  status?: string | null
  storeSession?: SessionLike | null
}

const tenantIdOf = (value: unknown): string | null => {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (value && typeof value === 'object' && 'id' in value) return tenantIdOf(value.id)
  return null
}

/**
 * The platform admin's open store session, or null when there is none or it has ended. Only our
 * team can hold one; a support login can only ever view. Pure, so access functions can call it.
 */
export function storeSessionOf(user: unknown, now: number = Date.now()): StoreSession | null {
  if (!user || typeof user !== 'object') return null
  const staff = user as UserLike
  if (staff.collection !== 'users' || staff.status === 'disabled') return null
  const role = staff.platformRole
  if (role !== 'super-admin' && role !== 'support') return null
  const session = staff.storeSession
  const tenantId = tenantIdOf(session?.tenant)
  if (!session || !tenantId || !session.endsAt || !session.reason) return null
  const ends = Date.parse(session.endsAt)
  if (!Number.isFinite(ends) || ends <= now) return null
  const mode: StoreSessionMode =
    session.mode === 'manage' && role === 'super-admin' ? 'manage' : 'view'
  const tenant =
    session.tenant && typeof session.tenant === 'object'
      ? (session.tenant as { name?: unknown; slug?: unknown; enabledFeatures?: unknown })
      : null
  return {
    tenantId,
    tenantName: typeof tenant?.name === 'string' ? tenant.name : undefined,
    tenantSlug: typeof tenant?.slug === 'string' ? tenant.slug : undefined,
    enabledFeatures: Array.isArray(tenant?.enabledFeatures)
      ? tenant.enabledFeatures.filter((key): key is string => typeof key === 'string')
      : undefined,
    mode,
    reason: session.reason,
    startedAt: session.startedAt ?? undefined,
    endsAt: session.endsAt,
  }
}

/**
 * Which admin someone is in. Store staff always work in their store's CMS; our team works in the
 * platform panel unless a store session is open, and then in that one store's CMS.
 */
export type Workspace = 'platform' | 'store'

export function workspaceOf(user: unknown): Workspace | null {
  if (!user || typeof user !== 'object') return null
  const staff = user as UserLike
  if (staff.collection !== 'users') return null
  const role = staff.platformRole
  if (role === 'super-admin' || role === 'support') {
    return storeSessionOf(user) ? 'store' : 'platform'
  }
  return 'store'
}
