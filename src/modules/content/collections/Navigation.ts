import type { CollectionConfig } from 'payload'

import { ANY_STORE_ROLE, CONTENT_WRITE, nobody, tenantRoleOrPlatform } from '@/access'
import { linkField } from '@/fields/link'

const linkRow = (maxRows?: number) => ({
  name: 'links',
  type: 'array' as const,
  maxRows,
  fields: [{ name: 'label', type: 'text' as const, required: true }, linkField()],
})

/**
 * The store's menus: header with large dropdowns, footer columns and the phone menu
 * (docs/screens Menus). One per store: the multi-tenant plugin's `isGlobal` opens it directly.
 */
export const Navigation: CollectionConfig = {
  slug: 'navigation',
  labels: { singular: 'Menus', plural: 'Menus' },
  admin: { group: 'Content', useAsTitle: 'title' },
  access: {
    read: tenantRoleOrPlatform({ roles: ANY_STORE_ROLE, supportCanAccess: true }),
    create: tenantRoleOrPlatform({ roles: CONTENT_WRITE }),
    update: tenantRoleOrPlatform({ roles: CONTENT_WRITE }),
    delete: nobody,
  },
  fields: [
    {
      // Document title in the admin (one menu document per store)
      name: 'title',
      type: 'text',
      defaultValue: 'Menus',
      admin: { hidden: true },
      hooks: { afterRead: [({ value }) => value || 'Menus'] },
    },
    {
      // The header menu as the wireframe draws it, live from the editor below
      name: 'outline',
      type: 'ui',
      admin: {
        components: { Field: '@/modules/content/admin/MenuOutline#MenuOutline' },
        disableListColumn: true,
      },
    },
    {
      name: 'sideSummary',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: { Field: '@/modules/content/admin/MenuOutline#MenuSideSummary' },
        disableListColumn: true,
      },
    },
    {
      name: 'header',
      label: 'Header menu',
      type: 'array',
      maxRows: 10,
      labels: { singular: 'Menu item', plural: 'Menu items' },
      fields: [
        {
          type: 'row',
          fields: [{ name: 'label', type: 'text', required: true }, linkField()],
        },
        {
          name: 'columns',
          label: 'Dropdown columns',
          type: 'array',
          maxRows: 4,
          admin: { description: 'Optional. Up to four columns open under this item on desktop.' },
          fields: [{ name: 'heading', type: 'text' }, linkRow(12)],
        },
        { name: 'featuredImage', label: 'Dropdown image', type: 'upload', relationTo: 'media' },
      ],
    },
    {
      name: 'footer',
      label: 'Footer columns',
      type: 'array',
      maxRows: 5,
      admin: { position: 'sidebar', initCollapsed: true },
      fields: [{ name: 'heading', type: 'text', required: true }, linkRow(10)],
    },
    {
      name: 'mobileSameAsHeader',
      label: 'Phone menu same as header menu',
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar', description: 'Switch off to set a shorter menu for phones.' },
    },
    {
      name: 'mobile',
      label: 'Phone menu',
      type: 'array',
      maxRows: 12,
      admin: { position: 'sidebar', condition: (data) => data?.mobileSameAsHeader === false },
      fields: [{ name: 'label', type: 'text', required: true }, linkField()],
    },
  ],
}
