import { CATALOG_WRITE, STORE_ADMIN, type TenantRole, type Workspace } from '@/access'
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
  /**
   * A screen in the spec that isn't built yet (docs/progress.md): shown greyed with "Soon" and no
   * link, so the menu reads as the wireframe. Remove the flag when the screen ships.
   */
  soon?: boolean
  /** Store roles the entry is for (soon entries; built ones follow collection access) */
  roles?: readonly TenantRole[]
  /** Store feature switch the entry needs (docs/08) */
  feature?: string
}

export type MenuSection = { key: string; label?: string; items: MenuItem[] }

export type MenuContext = {
  workspace: Workspace
  visibleCollections: ReadonlySet<string>
  isSuperAdmin: boolean
  /** Owner of the current store, or our team managing it */
  canManageStaff: boolean
  /** Payment and messaging keys are the owner's (docs/05); our team sees them in a store session */
  canSeeKeys?: boolean
  /** The person's roles in the current store (our team: owner when managing, support viewing) */
  storeRoles?: readonly TenantRole[]
  /** Feature switches on for the current store */
  features?: readonly string[]
}

const collectionItem = (
  key: string,
  label: string,
  icon: IconName,
  extra: Partial<MenuItem> = {},
): MenuItem => ({ key, label, icon, href: adminUrl.collection(key), collection: key, ...extra })

const soonItem = (
  key: string,
  label: string,
  icon: IconName,
  roles: readonly TenantRole[],
  feature?: string,
): MenuItem => ({ key, label, icon, href: '', soon: true, roles, feature })

// Grouped as the wireframe's vendor CMS menu (docs/wireframes #cms-dashboard, docs/screens
// vendor-cms.md "Menu"), mudit 4 October 2026
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
    key: 'catalog',
    label: 'Catalog',
    items: [
      collectionItem('products', 'Products', 'products'),
      collectionItem('variants', 'Variants', 'variants'),
      collectionItem('categories', 'Categories', 'categories'),
      collectionItem('attribute-sets', 'Attribute sets', 'attributes'),
      collectionItem('brands', 'Brands', 'brands'),
      collectionItem('product-documents', 'Documents', 'documents'),
      soonItem('import', 'Import and export', 'upload', CATALOG_WRITE),
      collectionItem('media', 'Media', 'media'),
    ],
  },
  {
    key: 'sales',
    label: 'Sales',
    items: [
      collectionItem('orders', 'Orders', 'receipt'),
      collectionItem('customers', 'Customers', 'staff'),
      collectionItem('enquiries', 'Enquiries', 'enquiries', { badge: 'newEnquiries' }),
    ],
  },
  {
    key: 'marketing',
    label: 'Marketing',
    items: [
      collectionItem('schemes', 'Schemes and offers', 'calendar'),
      collectionItem('coupons', 'Coupons', 'brands'),
      collectionItem('offer-campaigns', 'Offer messages', 'mail'),
      collectionItem('carts', 'Abandoned carts', 'cart'),
      collectionItem('affiliates', 'Affiliates', 'link'),
      collectionItem('reviews', 'Reviews', 'star'),
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
      collectionItem('navigation', 'Navigation', 'menus'),
      collectionItem('banners', 'Banners', 'banners'),
    ],
  },
  {
    key: 'store',
    label: 'Store',
    items: [
      collectionItem('dealers', 'Dealers', 'dealers'),
      {
        key: 'shipping',
        label: 'Shipping',
        href: adminUrl.shipping,
        icon: 'truck',
        // Owners and managers change zones; our team viewing as support looks
        roles: [...STORE_ADMIN, 'support'],
      },
      {
        key: 'payments',
        label: 'Payments',
        href: adminUrl.payments,
        icon: 'card',
        when: (ctx) => Boolean(ctx.canSeeKeys),
      },
      {
        key: 'messaging',
        label: 'WhatsApp and SMS',
        href: adminUrl.messaging,
        icon: 'whatsapp',
        when: (ctx) => Boolean(ctx.canSeeKeys),
      },
      {
        key: 'notifications',
        label: 'Order updates',
        href: adminUrl.notifications,
        icon: 'bell',
        // Owners and managers change them; order managers look (docs/screens Order updates)
        roles: [...STORE_ADMIN, 'order-manager', 'support'],
      },
      collectionItem('site-settings', 'Settings', 'settings'),
      {
        key: 'staff',
        label: 'Staff and roles',
        href: adminUrl.staff,
        icon: 'staff',
        when: (ctx) => ctx.canManageStaff,
      },
    ],
  },
  {
    key: 'insights',
    label: 'Insights',
    items: [soonItem('reports', 'Reports', 'chart', STORE_ADMIN)],
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
        if (item.roles && !item.roles.some((role) => ctx.storeRoles?.includes(role))) return false
        if (item.feature && !ctx.features?.includes(item.feature)) return false
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
  if (!item.href) return false
  if (item.alsoActive?.includes(pathname)) return true
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`)
}

/** A menu entry as the client renders it: plain data, no rules. */
export type NavItem = Pick<
  MenuItem,
  'key' | 'label' | 'href' | 'icon' | 'badge' | 'exact' | 'alsoActive' | 'soon'
>
export type NavSection = { key: string; label?: string; items: NavItem[] }
