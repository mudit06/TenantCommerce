// Admin URLs used by our custom screens. Payload serves the admin at /admin (payload.config).
export const ADMIN = '/admin'

export const adminUrl = {
  dashboard: ADMIN,
  vendors: `${ADMIN}/collections/tenants`,
  newVendor: `${ADMIN}/vendors/new`,
  vendor: (
    id: string | number,
    tab?: 'features' | 'connectors' | 'domains' | 'billing' | 'staff',
  ) => `${ADMIN}/collections/tenants/${id}${tab ? `/${tab}` : ''}`,
  plans: `${ADMIN}/collections/plans`,
  subscriptions: `${ADMIN}/collections/subscriptions`,
  subscription: (id: string | number) => `${ADMIN}/collections/subscriptions/${id}`,
  user: (id: string | number) => `${ADMIN}/collections/users/${id}`,
  team: `${ADMIN}/team`,
  staff: `${ADMIN}/staff`,
  payments: `${ADMIN}/payments`,
  messaging: `${ADMIN}/messaging`,
  shipping: `${ADMIN}/shipping`,
  notifications: `${ADMIN}/order-updates`,
  reports: `${ADMIN}/reports`,
  /** Choose a page type before the editor opens (Pages "Create page") */
  newPage: `${ADMIN}/new-page`,
  pages: `${ADMIN}/collections/pages`,
  page: (id: string | number) => `${ADMIN}/collections/pages/${id}`,
  createPage: (template: string) => `${ADMIN}/collections/pages/create?template=${template}`,
  collection: (slug: string) => `${ADMIN}/collections/${slug}`,
  create: (slug: string) => `${ADMIN}/collections/${slug}/create`,
  doc: (slug: string, id: string | number) => `${ADMIN}/collections/${slug}/${id}`,
  /** A list filtered by `where[field][operator]=value` (Payload's list address) */
  filtered: (slug: string, field: string, value: string, operator = 'equals') =>
    `${ADMIN}/collections/${slug}?where[${field}][${operator}]=${encodeURIComponent(value)}`,
}
