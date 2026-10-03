import type { CollectionConfig } from 'payload'

import { ANY_STORE_ROLE, CONTENT_WRITE, tenantRoleOrPlatform } from '@/access'
import { linkField } from '@/fields/link'

/** Scheduled banners for the home hero, category tops, the announcement strip and pop-ups. */
export const Banners: CollectionConfig = {
  slug: 'banners',
  labels: { singular: 'Banner', plural: 'Banners' },
  admin: {
    group: 'Content',
    useAsTitle: 'title',
    defaultColumns: ['title', 'placement', 'startsAt', 'endsAt', 'isActive'],
  },
  access: {
    read: tenantRoleOrPlatform({ roles: ANY_STORE_ROLE, supportCanAccess: true }),
    create: tenantRoleOrPlatform({ roles: CONTENT_WRITE }),
    update: tenantRoleOrPlatform({ roles: CONTENT_WRITE }),
    delete: tenantRoleOrPlatform({ roles: CONTENT_WRITE }),
  },
  indexes: [{ fields: ['tenant', 'placement', 'startsAt'] }],
  fields: [
    { name: 'title', type: 'text', required: true, admin: { description: 'For staff only' } },
    {
      name: 'placement',
      type: 'select',
      required: true,
      options: [
        { label: 'Home page hero', value: 'home-hero' },
        { label: 'Top of category pages', value: 'category-top' },
        { label: 'Announcement strip', value: 'announcement' },
        { label: 'Pop-up', value: 'popup' },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'image',
          label: 'Desktop image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        { name: 'mobileImage', label: 'Phone image', type: 'upload', relationTo: 'media' },
      ],
    },
    linkField(),
    {
      type: 'row',
      fields: [
        { name: 'startsAt', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
        {
          name: 'endsAt',
          type: 'date',
          admin: { date: { pickerAppearance: 'dayAndTime' } },
          validate: (value: unknown, { siblingData }: { siblingData: { startsAt?: string } }) =>
            !value ||
            !siblingData?.startsAt ||
            new Date(String(value)) > new Date(siblingData.startsAt)
              ? true
              : 'Must end after it starts',
        },
        {
          name: 'priority',
          type: 'number',
          defaultValue: 0,
          admin: { description: 'Higher shows first' },
        },
      ],
    },
    { name: 'isActive', label: 'Show on store', type: 'checkbox', defaultValue: true },
  ],
}
