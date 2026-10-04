import type { Workspace } from '@/access'
import { adminUrl } from '@/admin/paths'
import type { IconName } from '@/admin/ui/icons'

// The admin menu for each workspace (docs/screens: vendor CMS and super admin "Menu"). A
// collection entry shows only when Payload lets the user see that collection (role, feature
// switch, workspace: src/admin/workspace.ts), so this list never decides access itself.

export type BadgeKey = 'draftPages' | 'newEnquiries'

export type MenuItem = {
  key: string
  label: string
  href: string
  icon: IconName
  /** Shown when this collection is visible to the user */
  collection?: string
  /** Shown when this is true (custom views) */
  when?: (ctx: MenuContext) => boolean
  badge?: BadgeKey
  /** Active for this exact path only (the dashboard) */
  exact?: boolean
  /** Other screens that belong to this entry (the page type chooser belongs to Pages) */
  alsoActive?: string[]
}

export type MenuSection = { key: string; label?: string; items: MenuItem[] }

export type MenuContext = {
  workspace: Workspace
  visibleCollections: ReadonlySet<string>
  isSuperAdmin: boolean
  /** Owner of the current store, or our team managing it */
  canManageStaff: boolean
}

const collectionItem = (
  key: string,
  label: string,
  icon: IconName,
  extra: Partial<MenuItem> = {},
): MenuItem => ({ key, label, icon, href: adminUrl.collection(key), collection: key, ...extra })

const STORE_MENU: MenuSection[] = [
  {
    key: 'home',
    items: [
      {
        key: 'dashboard',
        label: 'Dashboard',
        href: adminUrl.dashboard,
        icon: 'dashboard',
        exact: true,
      },
    ],
  },
  {
    key: 'content',
    label: 'Content',
    items: [
      collectionItem('pages', 'Pages', 'pages', {
        badge: 'draftPages',
        alsoActive: [adminUrl.newPage],
      }),
      collectionItem('media', 'Media', 'media'),
      collectionItem('navigation', 'Menus', 'menus'),
      collectionItem('banners', 'Banners', 'banners'),
    ],
  },
  {
    key: 'commerce',
    label: 'Commerce',
    items: [
      collectionItem('products', 'Products', 'products'),
      collectionItem('variants', 'Variants', 'variants'),
      collectionItem('categories', 'Categories', 'categories'),
      collectionItem('attribute-sets', 'Attribute sets', 'attributes'),
      collectionItem('brands', 'Brands', 'brands'),
      collectionItem('product-documents', 'Documents', 'documents'),
    ],
  },
  {
    key: 'engagement',
    label: 'Engagement',
    items: [
      collectionItem('enquiries', 'Enquiries', 'enquiries', { badge: 'newEnquiries' }),
      collectionItem('dealers', 'Dealers', 'dealers'),
    ],
  },
  {
    key: 'settings',
    label: 'Settings',
    items: [
      collectionItem('site-settings', 'Store settings', 'store'),
      {
        key: 'staff',
        label: 'Staff and roles',
        href: adminUrl.staff,
        icon: 'staff',
        when: (ctx) => ctx.canManageStaff,
      },
    ],
  },
]

const PLATFORM_MENU: MenuSection[] = [
  {
    key: 'home',
    items: [
      {
        key: 'dashboard',
        label: 'Dashboard',
        href: adminUrl.dashboard,
        icon: 'dashboard',
        exact: true,
      },
    ],
  },
  {
    key: 'vendors',
    label: 'Vendors',
    items: [
      collectionItem('tenants', 'All vendors', 'vendors'),
      {
        key: 'new-vendor',
        label: 'New vendor',
        href: adminUrl.newVendor,
        icon: 'plus',
        when: (ctx) => ctx.isSuperAdmin,
      },
    ],
  },
  {
    key: 'billing',
    label: 'Billing',
    items: [
      collectionItem('plans', 'Plans', 'plans'),
      collectionItem('subscriptions', 'Subscriptions', 'subscriptions'),
    ],
  },
  {
    key: 'platform',
    label: 'Platform',
    items: [
      { key: 'team', label: 'Team and access', href: adminUrl.team, icon: 'shield' },
      collectionItem('users', 'Staff users', 'user'),
    ],
  },
]

/** The menu sections the user can see in their workspace, empty sections dropped. */
export function buildMenu(ctx: MenuContext): MenuSection[] {
  const sections = ctx.workspace === 'platform' ? PLATFORM_MENU : STORE_MENU
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.collection && !ctx.visibleCollections.has(item.collection)) return false
        return item.when ? item.when(ctx) : true
      }),
    }))
    .filter((section) => section.items.length > 0)
}

/** Whether a menu entry is the page being shown (the longest matching entry wins in the UI). */
export const isActive = (
  item: Pick<MenuItem, 'href' | 'exact' | 'alsoActive'>,
  pathname: string,
) => {
  if (item.alsoActive?.includes(pathname)) return true
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`)
}

/** A menu entry as the client renders it: plain data, no rules. */
export type NavItem = Pick<
  MenuItem,
  'key' | 'label' | 'href' | 'icon' | 'badge' | 'exact' | 'alsoActive'
>
export type NavSection = { key: string; label?: string; items: NavItem[] }
