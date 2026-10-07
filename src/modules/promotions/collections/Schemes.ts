import type { CollectionConfig, Field } from 'payload'

import { ANY_STORE_ROLE, STORE_ADMIN } from '@/access'
import { lastEditedByField, recordEditor } from '@/fields/editedBy'
import { fillSlugFrom, slugField } from '@/fields/slug'
import { AppError } from '@/lib/errors'
import { featureGatedAccess, hiddenWithoutFeature } from '@/modules/tenancy'

import { OCCASIONS, SCHEME_STATUSES } from '../occasions'
import { SCHEME_TYPES } from '../rules'

const rupees = (name: string, label: string, description?: string): Field => ({
  name,
  label,
  type: 'number',
  min: 0,
  admin: { description, components: { Field: '@/fields/money/RupeeInput#RupeeInput' } },
})

const offerIs =
  (...types: string[]) =>
  (_: unknown, siblingData: Record<string, unknown>) =>
    types.includes(String(siblingData?.type))

const coversIs = (mode: string) => (_: unknown, siblingData: Record<string, unknown>) =>
  siblingData?.mode === mode

const write = featureGatedAccess({ feature: 'schemes', roles: STORE_ADMIN })

/**
 * A festival scheme or launch offer that applies by itself (docs/06 `schemes`, docs/screens
 * Scheme editor). The promotions engine reads live schemes on every cart and at checkout; the
 * status follows the dates (the switch-schemes job) and the Pause, Schedule and End now buttons.
 */
export const Schemes: CollectionConfig = {
  slug: 'schemes',
  labels: { singular: 'Scheme', plural: 'Schemes and offers' },
  admin: {
    group: 'Marketing',
    useAsTitle: 'name',
    defaultColumns: ['name', 'status', 'startsAt', 'endsAt'],
    hidden: hiddenWithoutFeature('schemes'),
    components: {
      views: {
        list: { Component: '@/modules/promotions/admin/SchemesList#SchemesList' },
      },
    },
  },
  versions: { maxPerDoc: 50 },
  defaultSort: '-startsAt',
  access: {
    read: featureGatedAccess({ feature: 'schemes', roles: ANY_STORE_ROLE, supportCanAccess: true }),
    create: write,
    update: write,
    delete: write,
  },
  indexes: [
    { fields: ['tenant', 'status', 'startsAt'] },
    { fields: ['tenant', 'slug'], unique: true },
  ],
  hooks: {
    beforeValidate: [fillSlugFrom('name')],
    beforeChange: [
      recordEditor,
      ({ data, originalDoc, operation }) => {
        const starts = data.startsAt ? new Date(data.startsAt).getTime() : NaN
        const ends = data.endsAt ? new Date(data.endsAt).getTime() : NaN
        if (starts && ends && ends <= starts) {
          throw new AppError('VALIDATION_FAILED', 'The scheme must end after it starts', 400, {
            endsAt: 'Ends after it starts',
          })
        }
        // An ended scheme is a record of what happened: its dates and offer stay (rule 9)
        if (operation === 'update' && originalDoc?.status === 'ended') {
          for (const key of ['startsAt', 'endsAt'] as const) {
            if (
              data[key] &&
              new Date(data[key]).getTime() !== new Date(originalDoc[key]).getTime()
            ) {
              throw new AppError('BUSINESS_RULE', 'An ended scheme’s dates can’t change', 422)
            }
          }
        }
        return data
      },
    ],
  },
  fields: [
    {
      type: 'collapsible',
      label: 'When',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'name', type: 'text', required: true, admin: { width: '60%' } },
            {
              name: 'occasion',
              type: 'select',
              defaultValue: 'custom',
              options: OCCASIONS.map(({ value, label }) => ({ value, label })),
              admin: { width: '40%' },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'startsAt',
              label: 'Starts',
              type: 'date',
              required: true,
              admin: { date: { pickerAppearance: 'dayAndTime', timeIntervals: 15 } },
            },
            {
              name: 'endsAt',
              label: 'Ends',
              type: 'date',
              required: true,
              admin: { date: { pickerAppearance: 'dayAndTime', timeIntervals: 15 } },
            },
          ],
        },
        slugField({
          required: false,
          label: 'Landing page address',
          admin: { description: 'The offer’s page is /offers/<this>. Times are India time.' },
        }),
      ],
    },
    {
      // Phase 1: every retail shopper. Trade audiences come with trade accounts (Phase 2)
      name: 'audience',
      type: 'select',
      hasMany: true,
      defaultValue: ['retail'],
      options: [{ value: 'retail', label: 'All shoppers' }],
      admin: { hidden: true },
    },
    {
      name: 'offer',
      type: 'group',
      label: 'Offer',
      fields: [
        {
          name: 'type',
          type: 'radio',
          required: true,
          defaultValue: 'percent',
          options: [...SCHEME_TYPES],
          admin: { layout: 'horizontal' },
        },
        {
          type: 'row',
          fields: [
            {
              name: 'percent',
              label: 'Discount (%)',
              type: 'number',
              min: 1,
              max: 90,
              admin: { condition: offerIs('percent') },
            },
            {
              ...(rupees('amountMinor', 'Off each item') as object),
              admin: {
                condition: offerIs('fixed'),
                components: { Field: '@/fields/money/RupeeInput#RupeeInput' },
              },
            } as Field,
            {
              name: 'buyQty',
              label: 'Buy',
              type: 'number',
              min: 1,
              defaultValue: 2,
              admin: { condition: offerIs('buy-x-get-y') },
            },
            {
              name: 'getQty',
              label: 'Get',
              type: 'number',
              min: 1,
              defaultValue: 1,
              admin: { condition: offerIs('buy-x-get-y') },
            },
            {
              name: 'getDiscountPercent',
              label: 'Off the cheapest (%)',
              type: 'number',
              min: 1,
              max: 100,
              defaultValue: 100,
              admin: {
                condition: offerIs('buy-x-get-y'),
                description: '100 means free',
              },
            },
          ],
        },
        {
          name: 'tiers',
          label: 'Spend tiers',
          type: 'array',
          admin: { condition: offerIs('tiered'), initCollapsed: false },
          fields: [
            {
              type: 'row',
              fields: [
                rupees('minOrderMinor', 'Spend at least'),
                rupees('discountMinor', 'Amount off'),
              ],
            },
          ],
        },
        {
          name: 'specialPrices',
          label: 'Launch prices',
          type: 'array',
          admin: {
            condition: offerIs('special-price'),
            description: 'The MRP shown stays the product’s real MRP (docs/14).',
          },
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'product', type: 'relationship', relationTo: 'products', required: true },
                {
                  name: 'variant',
                  label: 'Finish or size (optional)',
                  type: 'relationship',
                  relationTo: 'variants',
                  filterOptions: ({ siblingData }) => {
                    const product = (siblingData as { product?: unknown })?.product
                    return product ? { product: { equals: product } } : true
                  },
                },
                rupees('priceMinor', 'Launch price'),
              ],
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              ...rupees('maxDiscountMinor', 'Most off per order'),
              admin: {
                condition: offerIs('percent', 'fixed', 'buy-x-get-y'),
                components: { Field: '@/fields/money/RupeeInput#RupeeInput' },
              },
            } as Field,
            {
              ...rupees('minOrderMinor', 'Minimum order', 'The cart’s value before discounts'),
              admin: {
                condition: offerIs('percent', 'fixed', 'buy-x-get-y', 'free-shipping'),
                description: 'The cart’s value before discounts',
                components: { Field: '@/fields/money/RupeeInput#RupeeInput' },
              },
            } as Field,
          ],
        },
      ],
    },
    {
      name: 'appliesTo',
      type: 'group',
      label: 'Covers',
      admin: {
        description: 'Enquire-only products are always left out.',
      },
      fields: [
        {
          name: 'mode',
          type: 'radio',
          defaultValue: 'all',
          options: [
            { value: 'all', label: 'Whole store' },
            { value: 'categories', label: 'Categories' },
            { value: 'products', label: 'Chosen products' },
          ],
          admin: { layout: 'horizontal' },
        },
        {
          name: 'categories',
          type: 'relationship',
          relationTo: 'categories',
          hasMany: true,
          admin: { condition: coversIs('categories'), description: 'Subcategories are included' },
        },
        {
          name: 'products',
          type: 'relationship',
          relationTo: 'products',
          hasMany: true,
          admin: { condition: coversIs('products') },
        },
        {
          name: 'excludeProducts',
          label: 'Leave out',
          type: 'relationship',
          relationTo: 'products',
          hasMany: true,
        },
      ],
    },
    {
      name: 'rules',
      type: 'group',
      label: 'Rules',
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'combinesWithCoupons',
              label: 'Works with coupons',
              type: 'checkbox',
              defaultValue: false,
            },
            {
              name: 'prepaidOnly',
              label: 'Only for orders paid online',
              type: 'checkbox',
              defaultValue: false,
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'perCustomerLimit',
              label: 'Orders per shopper',
              type: 'number',
              min: 1,
              admin: { description: 'Empty: no limit. Checked by phone and email.' },
            },
            {
              name: 'priority',
              type: 'number',
              defaultValue: 0,
              admin: { description: 'Breaks a tie when two schemes give the same price' },
            },
          ],
        },
      ],
    },
    {
      name: 'display',
      type: 'group',
      label: 'On the store',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'badgeText', label: 'Badge', type: 'text', maxLength: 30 },
            { name: 'announcementText', label: 'Announcement bar', type: 'text', maxLength: 120 },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'banner', type: 'relationship', relationTo: 'banners' },
            {
              name: 'landingPage',
              type: 'relationship',
              relationTo: 'pages',
              admin: { description: 'Or let the store list the products' },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'showBeforeStart',
              label: 'Show on the Offers page before it starts',
              type: 'checkbox',
              defaultValue: true,
            },
            {
              name: 'showCountdown',
              label: 'Show a countdown to the real end',
              type: 'checkbox',
              defaultValue: true,
            },
          ],
        },
      ],
    },
    {
      name: 'messages',
      type: 'group',
      label: 'Tell shoppers',
      admin: {
        description: 'An offer message to shoppers who agreed to offers, when it starts.',
        condition: () => true,
      },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'announceEmail',
              label: 'Email shoppers who opted in, when it starts',
              type: 'checkbox',
              defaultValue: false,
            },
            {
              name: 'announceWhatsApp',
              label: 'WhatsApp shoppers who opted in',
              type: 'checkbox',
              defaultValue: false,
            },
          ],
        },
        { name: 'campaign', type: 'text', admin: { hidden: true } },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [...SCHEME_STATUSES],
      admin: {
        position: 'sidebar',
        readOnly: true,
        components: { Field: '@/modules/promotions/admin/SchemeStatus#SchemeStatus' },
      },
      access: { update: () => false },
    },
    {
      name: 'preview',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: { Field: '@/modules/promotions/admin/SchemeSidebar#SchemeSidebar' },
      },
    },
    {
      name: 'stats',
      type: 'group',
      admin: { hidden: true },
      fields: [
        { name: 'orders', type: 'number', defaultValue: 0 },
        { name: 'salesMinor', type: 'number', defaultValue: 0 },
        { name: 'discountMinor', type: 'number', defaultValue: 0 },
        { name: 'updatedAt', type: 'date' },
      ],
    },
    { name: 'endedAt', type: 'date', admin: { hidden: true } },
    lastEditedByField(),
  ],
}
