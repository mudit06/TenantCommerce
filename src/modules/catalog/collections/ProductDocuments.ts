import type { CollectionConfig } from 'payload'

import { CATALOG_READ, CATALOG_WRITE, tenantRoleOrPlatform } from '@/access'
import { userHasFeature } from '@/modules/tenancy'

import { DOCUMENT_TYPES } from '../constants'

/**
 * Spec sheets, manuals, catalogues and certificates (PDF), shown on product pages and the
 * Downloads page (docs/06). Linking a document to products comes with the products collection.
 */
export const ProductDocuments: CollectionConfig = {
  slug: 'product-documents',
  labels: { singular: 'Document', plural: 'Documents' },
  admin: {
    group: 'Catalog',
    useAsTitle: 'title',
    defaultColumns: ['title', 'type', 'showOnDownloadsPage', 'updatedAt'],
  },
  access: {
    read: tenantRoleOrPlatform({ roles: CATALOG_READ, supportCanAccess: true }),
    create: tenantRoleOrPlatform({ roles: CATALOG_WRITE }),
    update: tenantRoleOrPlatform({ roles: CATALOG_WRITE }),
    delete: tenantRoleOrPlatform({ roles: CATALOG_WRITE }),
  },
  indexes: [{ fields: ['tenant', 'type'] }],
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: { placeholder: 'Sola thermostatic diverter, installation guide' },
    },
    {
      type: 'row',
      fields: [
        { name: 'type', type: 'select', required: true, options: [...DOCUMENT_TYPES] },
        {
          name: 'file',
          label: 'PDF',
          type: 'upload',
          relationTo: 'media',
          required: true,
          filterOptions: { mimeType: { equals: 'application/pdf' } },
        },
      ],
    },
    {
      name: 'categories',
      type: 'relationship',
      relationTo: 'categories',
      hasMany: true,
      admin: { description: 'Groups the document on the Downloads page' },
    },
    {
      name: 'showOnDownloadsPage',
      label: 'Show on the Downloads page',
      type: 'checkbox',
      defaultValue: true,
      admin: { condition: (_data, _sibling, { user }) => userHasFeature(user, 'downloads') },
    },
  ],
}
