import type { PayloadRequest, ServerProps } from 'payload'

import {
  hasTenantRole,
  isSuperAdmin,
  PLATFORM_ROLE_LABELS,
  platformRoleOf,
  storeSessionOf,
  TENANT_ROLE_LABELS,
  type TenantRole,
  workspaceOf,
} from '@/access'
import { currentStore } from '@/admin/store'

import { AppNavClient, type NavBadges, type NavIdentity } from './AppNavClient'
import { buildMenu } from './menu'

type Props = ServerProps & { req?: PayloadRequest }

/**
 * The admin's left menu (replaces Payload's default nav): the platform panel or one store's CMS,
 * never both (src/admin/workspace.ts). Grouped sections with icons, live counts on Pages and
 * Enquiries, the store being edited at the top and the signed-in person at the bottom.
 */
export async function AppNav({ req, visibleEntities }: Props) {
  if (!req?.user) return null
  const user = req.user
  const workspace = workspaceOf(user)
  if (!workspace) return null
  const session = storeSessionOf(user)
  const store = workspace === 'store' ? await currentStore(req.payload, req.user) : null

  const canManageStaff = Boolean(
    store && (session ? session.mode === 'manage' : hasTenantRole(user, store.id, ['owner'])),
  )
  const sections = buildMenu({
    workspace,
    visibleCollections: new Set(visibleEntities?.collections ?? []),
    isSuperAdmin: isSuperAdmin(user),
    canManageStaff,
  })

  const badges: NavBadges = {}
  if (store) {
    const visible = new Set(visibleEntities?.collections ?? [])
    const [drafts, enquiries] = await Promise.all([
      visible.has('pages')
        ? req.payload.count({
            collection: 'pages',
            where: { and: [{ tenant: { equals: store.id } }, { _status: { equals: 'draft' } }] },
            overrideAccess: true,
          })
        : null,
      visible.has('enquiries')
        ? req.payload.count({
            collection: 'enquiries',
            where: { and: [{ tenant: { equals: store.id } }, { status: { equals: 'new' } }] },
            overrideAccess: true,
          })
        : null,
    ])
    if (drafts?.totalDocs) badges.draftPages = { count: drafts.totalDocs, label: 'drafts' }
    if (enquiries?.totalDocs) badges.newEnquiries = { count: enquiries.totalDocs, label: 'new' }
  }

  const name = ('name' in user && typeof user.name === 'string' && user.name) || user.email
  const platformRole = platformRoleOf(user)
  const memberships = ('tenants' in user ? user.tenants : null) as
    { tenant?: unknown; roles?: string[] | null }[] | null
  const storeRoles = store
    ? (memberships?.find((row) => {
        const tenant = row.tenant
        return (
          (typeof tenant === 'object' && tenant && 'id' in tenant
            ? String(tenant.id)
            : String(tenant)) === store.id
        )
      })?.roles ?? [])
    : []
  const identity: NavIdentity = {
    workspace,
    store: store
      ? {
          id: store.id,
          name: store.name,
          status: store.status,
          planName: store.planName,
          storeUrl: store.storeUrl,
        }
      : null,
    session: session ? { mode: session.mode } : null,
    person: {
      name: String(name ?? ''),
      email: String(user.email ?? ''),
      role: platformRole
        ? PLATFORM_ROLE_LABELS[platformRole]
        : storeRoles.map((role) => TENANT_ROLE_LABELS[role as TenantRole] ?? role).join(', ') ||
          'Staff',
    },
    canSwitchStore: !session && workspace === 'store',
  }

  // Plain data only for the client (the `when` rules stay on the server)
  const items = sections.map((section) => ({
    key: section.key,
    label: section.label,
    items: section.items.map(({ key, label, href, icon, badge, exact, alsoActive }) => ({
      key,
      label,
      href,
      icon,
      badge,
      exact,
      alsoActive,
    })),
  }))
  return <AppNavClient badges={badges} identity={identity} sections={items} />
}
