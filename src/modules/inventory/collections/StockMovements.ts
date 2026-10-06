import type { CollectionConfig } from 'payload'

import { CATALOG_READ, nobody, tenantRoleOrPlatform } from '@/access'

/**
 * Every change to a variant's stock or reservation (docs/06 `stock-movements`, docs/11 "Stock"):
 * reserved at checkout, sold when paid, released when cancelled or expired, returned, adjusted.
 */
export const StockMovements: CollectionConfig = {
  slug: 'stock-movements',
  admin: { hidden: true },
  access: {
    read: tenantRoleOrPlatform({ roles: CATALOG_READ, supportCanAccess: true }),
    create: nobody,
    update: nobody,
    delete: nobody,
  },
  indexes: [{ fields: ['tenant', 'variant', 'createdAt'] }],
  fields: [
    { name: 'variant', type: 'relationship', relationTo: 'variants', required: true },
    {
      name: 'reason',
      type: 'select',
      required: true,
      options: ['reserve', 'release', 'sale', 'cancel', 'return', 'adjustment', 'import'],
    },
    { name: 'stockDelta', type: 'number', defaultValue: 0 },
    { name: 'reservedDelta', type: 'number', defaultValue: 0 },
    { name: 'order', type: 'relationship', relationTo: 'orders' },
    { name: 'by', type: 'relationship', relationTo: 'users' },
    { name: 'note', type: 'text' },
  ],
}
