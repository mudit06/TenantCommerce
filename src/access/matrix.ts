import type { TenantRole } from './roles'

// The staff permission matrix (docs/05) as named role groups, so collections say who may do
// what without repeating role lists. "Read" groups add the roles that only look.

/** Products, categories, attribute sets, brands, documents, CSV import */
export const CATALOG_WRITE: readonly TenantRole[] = ['owner', 'manager', 'catalog-editor']
export const CATALOG_READ: readonly TenantRole[] = [...CATALOG_WRITE, 'order-manager', 'support']

/** Pages, menus, banners */
export const CONTENT_WRITE: readonly TenantRole[] = ['owner', 'manager', 'content-editor']

/** Media library: catalog and content editors both upload */
export const MEDIA_WRITE: readonly TenantRole[] = [
  'owner',
  'manager',
  'catalog-editor',
  'content-editor',
]

/** Dealers, store settings, shipping */
export const STORE_ADMIN: readonly TenantRole[] = ['owner', 'manager']

/** Enquiries, warranty and service requests */
export const ENQUIRY_WORK: readonly TenantRole[] = ['owner', 'manager', 'order-manager', 'support']

/** Every store role: reading shared reference data (media, categories in pickers) */
export const ANY_STORE_ROLE: readonly TenantRole[] = [
  'owner',
  'manager',
  'catalog-editor',
  'order-manager',
  'content-editor',
  'support',
]

/**
 * What each store role can do, as shown to owners on Staff and roles (docs/05, docs/screens
 * Staff and roles). Display only: access functions use the groups above.
 */
export const ROLE_SUMMARY: readonly {
  area: string
  access: Record<TenantRole, 'yes' | 'read' | 'no'>
}[] = [
  {
    area: 'Products, categories, import',
    access: {
      owner: 'yes',
      manager: 'yes',
      'catalog-editor': 'yes',
      'order-manager': 'read',
      'content-editor': 'no',
      support: 'read',
    },
  },
  {
    area: 'Pages, menus and banners',
    access: {
      owner: 'yes',
      manager: 'yes',
      'catalog-editor': 'no',
      'order-manager': 'no',
      'content-editor': 'yes',
      support: 'no',
    },
  },
  {
    area: 'Media library',
    access: {
      owner: 'yes',
      manager: 'yes',
      'catalog-editor': 'yes',
      'order-manager': 'no',
      'content-editor': 'yes',
      support: 'no',
    },
  },
  {
    area: 'Dealers',
    access: {
      owner: 'yes',
      manager: 'yes',
      'catalog-editor': 'no',
      'order-manager': 'no',
      'content-editor': 'no',
      support: 'no',
    },
  },
  {
    area: 'Orders, refunds, invoices',
    access: {
      owner: 'yes',
      manager: 'yes',
      'catalog-editor': 'no',
      'order-manager': 'yes',
      'content-editor': 'no',
      support: 'read',
    },
  },
  {
    area: 'Customers',
    access: {
      owner: 'yes',
      manager: 'yes',
      'catalog-editor': 'no',
      'order-manager': 'read',
      'content-editor': 'no',
      support: 'read',
    },
  },
  {
    area: 'Enquiries and service',
    access: {
      owner: 'yes',
      manager: 'yes',
      'catalog-editor': 'no',
      'order-manager': 'yes',
      'content-editor': 'no',
      support: 'yes',
    },
  },
  {
    area: 'Store settings, shipping',
    access: {
      owner: 'yes',
      manager: 'yes',
      'catalog-editor': 'no',
      'order-manager': 'no',
      'content-editor': 'no',
      support: 'no',
    },
  },
  {
    area: 'Schemes and coupons',
    access: {
      owner: 'yes',
      manager: 'yes',
      'catalog-editor': 'read',
      'order-manager': 'read',
      'content-editor': 'read',
      support: 'read',
    },
  },
  {
    area: 'Reviews: approve, reject, reply',
    access: {
      owner: 'yes',
      manager: 'yes',
      'catalog-editor': 'no',
      'order-manager': 'no',
      'content-editor': 'yes',
      support: 'yes',
    },
  },
  {
    area: 'Reports',
    access: {
      owner: 'yes',
      manager: 'yes',
      'catalog-editor': 'no',
      'order-manager': 'yes',
      'content-editor': 'no',
      support: 'no',
    },
  },
  {
    area: 'Payment, WhatsApp and SMS keys, staff',
    access: {
      owner: 'yes',
      manager: 'no',
      'catalog-editor': 'no',
      'order-manager': 'no',
      'content-editor': 'no',
      support: 'no',
    },
  },
]
