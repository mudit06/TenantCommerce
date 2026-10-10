import type { PayloadRequest, ServerProps } from 'payload'

import {
  hasTenantRole,
  isSuperAdmin,
  PLATFORM_ROLE_LABELS,
  platformRoleOf,
  storeSessionOf,
  TENANT_ROLE_LABELS,
  workspaceOf,
} from '@/access'
import { currentStore, storeRolesOf } from '@/admin/store'
import { mustSetUpTwoStep, TwoStepGate } from '@/modules/identity/admin'

import { AppNavClient, type NavBadges, type NavIdentity } from './AppNavClient'
import { buildMenu } from './menu'

type Props = ServerProps & { req?: PayloadRequest }

/**
 * The admin's left menu (replaces Payload's default nav): the platform panel or one store's CMS,
 * never both (src/admin/workspace.ts). Grouped sections with icons, live counts on Pages and
 * Enquiries, the store being edited at the top and the signed-in person at the bottom.
 */
export async function AppNav({ req, visibleEntities, permissions }: Props) {
  if (!req?.user) return null
  const user = req.user
  // Our team sets up two-step sign-in before using the panel (docs/05): it covers every page
  if (mustSetUpTwoStep(user)) {
    return <TwoStepGate name={typeof user.name === 'string' ? user.name : ''} />
  }
  const workspace = workspaceOf(user)
  if (!workspace) return null
  const session = storeSessionOf(user)
  const store = workspace === 'store' ? await currentStore(req.payload, req.user) : null

  const canManageStaff = Boolean(
    store && (session ? session.mode === 'manage' : hasTenantRole(user, store.id, ['owner'])),
  )
  const storeRoles = store ? storeRolesOf(user, store.id) : []
  // Shown when Payload shows the collection and the person may read it (the role matrix,
  // docs/05): a catalog editor never sees Enquiries or its count
  const visible = new Set(
    (visibleEntities?.collections ?? []).filter(
      (slug) => !permissions || Boolean(permissions.collections?.[slug]?.read),
    ),
  )
  const sections = buildMenu({
    workspace,
    visibleCollections: visible,
    isSuperAdmin: isSuperAdmin(user),
    canManageStaff,
    // Keys screens: the owner, or our team in a store session (read-only when viewing)
    canSeeKeys: Boolean(store && (session || hasTenantRole(user, store.id, ['owner']))),
    storeRoles,
    features: store?.features ?? [],
  })

  const badges: NavBadges = {}
  if (store) {
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
  const identity: NavIdentity = {
    workspace,
    store: store
      ? {
          id: store.id,
          name: store.name,
          status: store.status,
          planName: store.planName,
          storeUrl: store.storeUrl,
          maxProducts: store.maxProducts ?? null,
          productsCount: store.productsCount,
        }
      : null,
    session: session ? { mode: session.mode } : null,
    person: {
      name: String(name ?? ''),
      email: String(user.email ?? ''),
      role: platformRole
        ? PLATFORM_ROLE_LABELS[platformRole]
        : storeRoles.map((role) => TENANT_ROLE_LABELS[role] ?? role).join(', ') || 'Staff',
    },
    canSwitchStore: !session && workspace === 'store',
  }

  // Plain data only for the client (the `when` rules stay on the server)
  const items = sections.map((section) => ({
    key: section.key,
    label: section.label,
    items: section.items.map(({ key, label, href, icon, badge, exact, alsoActive, soon }) => ({
      key,
      label,
      href,
      icon,
      badge,
      exact,
      alsoActive,
      soon,
    })),
  }))
  return <AppNavClient badges={badges} identity={identity} sections={items} />
}
