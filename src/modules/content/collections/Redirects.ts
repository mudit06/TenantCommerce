import type { CollectionConfig } from 'payload'

import { ANY_STORE_ROLE, CONTENT_WRITE, tenantRoleOrPlatform } from '@/access'

const PATH = /^\/(?!\/)[^\s?#]*$/

const pathValidate = (value: string | null | undefined) =>
  !value || PATH.test(value) ? true : 'A path on this store, starting with /, like /products/aria'

/**
 * Old store addresses that now live elsewhere (docs/06 `redirects`, docs/12 "changing a slug
 * creates a redirect", docs/13 migrations from a vendor's old site). Made automatically when a
 * product, category or page moves; staff add their old site's addresses by hand.
 */
export const Redirects: CollectionConfig = {
  slug: 'redirects',
  labels: { singular: 'Redirect', plural: 'Redirects' },
  admin: {
    group: 'Content',
    useAsTitle: 'from',
    defaultColumns: ['from', 'to', 'reason', 'updatedAt'],
    listSearchableFields: ['from', 'to'],
    description:
      'Shoppers and search engines opening the old address go to the new one (permanent, 308).',
  },
  access: {
    read: tenantRoleOrPlatform({ roles: ANY_STORE_ROLE, supportCanAccess: true }),
    create: tenantRoleOrPlatform({ roles: CONTENT_WRITE }),
    update: tenantRoleOrPlatform({ roles: CONTENT_WRITE }),
    delete: tenantRoleOrPlatform({ roles: CONTENT_WRITE }),
  },
  indexes: [{ fields: ['tenant', 'from'], unique: true }],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        // Addresses are kept without a trailing slash, lower case as the store writes them
        for (const key of ['from', 'to'] as const) {
          const value = data?.[key]
          if (typeof value === 'string' && value.length > 1) {
            data![key] = value.trim().replace(/\/+$/, '')
          }
        }
        return data
      },
    ],
  },
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'from',
          label: 'Old address',
          type: 'text',
          required: true,
          validate: pathValidate,
          admin: { placeholder: '/old-product-page' },
        },
        {
          name: 'to',
          label: 'New address',
          type: 'text',
          required: true,
          validate: pathValidate,
          admin: { placeholder: '/products/aria-basin-mixer' },
        },
      ],
    },
    {
      name: 'reason',
      type: 'select',
      defaultValue: 'manual',
      options: [
        { label: 'Added by hand', value: 'manual' },
        { label: 'Address changed', value: 'slug-change' },
      ],
      admin: { readOnly: true },
    },
  ],
}
