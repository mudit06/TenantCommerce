import type { CollectionConfig } from 'payload'

import { CATALOG_READ, CATALOG_WRITE, tenantRoleOrPlatform } from '@/access'
import { fillSlugFrom, slugField } from '@/fields/slug'

/** Sub-brands a manufacturer sells under (docs/06). Optional: most stores have one brand. */
export const Brands: CollectionConfig = {
  slug: 'brands',
  labels: { singular: 'Brand', plural: 'Brands' },
  admin: {
    group: 'Catalog',
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'updatedAt'],
    description: 'Only needed when the store sells under more than one brand name.',
  },
  access: {
    read: tenantRoleOrPlatform({ roles: CATALOG_READ, supportCanAccess: true }),
    create: tenantRoleOrPlatform({ roles: CATALOG_WRITE }),
    update: tenantRoleOrPlatform({ roles: CATALOG_WRITE }),
    delete: tenantRoleOrPlatform({ roles: CATALOG_WRITE }),
  },
  indexes: [{ fields: ['tenant', 'slug'], unique: true }],
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', required: true },
        slugField({ required: false, admin: { description: 'Filled from the name' } }),
      ],
    },
    { name: 'logo', type: 'upload', relationTo: 'media' },
  ],
  hooks: {
    beforeValidate: [fillSlugFrom('name')],
  },
}
