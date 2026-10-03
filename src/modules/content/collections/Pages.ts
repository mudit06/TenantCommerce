import type { CollectionConfig } from 'payload'

import { ANY_STORE_ROLE, CONTENT_WRITE, tenantRoleOrPlatform } from '@/access'
import { PAGE_BLOCKS } from '@/blocks'
import { seoFields } from '@/fields/seo'
import { fillSlugFrom, slugField } from '@/fields/slug'

/**
 * Content pages built from blocks: the home page, landing pages and policies (docs/screens
 * Pages and Page builder). Drafts, versions and scheduled publishing come from Payload.
 */
export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Page', plural: 'Pages' },
  admin: {
    group: 'Content',
    useAsTitle: 'title',
    defaultColumns: ['title', 'slug', 'template', '_status', 'updatedAt'],
    listSearchableFields: ['title', 'slug'],
    description:
      'Versions are kept for every save. Policy pages are linked from the footer and checkout.',
  },
  versions: {
    drafts: { schedulePublish: true },
    maxPerDoc: 30,
  },
  access: {
    read: tenantRoleOrPlatform({ roles: ANY_STORE_ROLE, supportCanAccess: true }),
    create: tenantRoleOrPlatform({ roles: CONTENT_WRITE }),
    update: tenantRoleOrPlatform({ roles: CONTENT_WRITE }),
    delete: tenantRoleOrPlatform({ roles: CONTENT_WRITE }),
  },
  indexes: [{ fields: ['tenant', 'slug'], unique: true }],
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      type: 'row',
      fields: [
        slugField({
          required: false,
          admin: {
            description:
              'Filled from the title. Store address: /pages/<slug>. The home page uses “home”.',
          },
        }),
        {
          name: 'template',
          type: 'select',
          required: true,
          defaultValue: 'default',
          options: [
            { label: 'Default', value: 'default' },
            { label: 'Landing', value: 'landing' },
            { label: 'Policy', value: 'policy' },
          ],
        },
      ],
    },
    { name: 'layout', label: 'Blocks on this page', type: 'blocks', blocks: PAGE_BLOCKS },
    seoFields(),
  ],
  hooks: {
    beforeValidate: [fillSlugFrom('title')],
  },
}
