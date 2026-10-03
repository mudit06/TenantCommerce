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
  collection: (slug: string) => `${ADMIN}/collections/${slug}`,
  create: (slug: string) => `${ADMIN}/collections/${slug}/create`,
}
