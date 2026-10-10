import type { CollectionConfig } from 'payload'

import {
  ANY_STORE_ROLE,
  fieldSuperAdminOnly,
  nobody,
  STORE_ADMIN,
  tenantRoleOrPlatform,
} from '@/access'
import { moneyField } from '@/fields/money'

const HEX = /^#[0-9a-fA-F]{6}$/
const optional = (pattern: RegExp, message: string) => (value: string | null | undefined) =>
  !value || pattern.test(value.trim()) ? true : message

/** "INV" + "/26-27/" + 5 digits must stay within GST Rule 46's 16 characters (docs/06 invoices). */
export const INVOICE_PREFIX = /^[A-Z0-9]{1,4}$/
export const ORDER_PREFIX = /^[A-Z]{2,5}$/

/**
 * One per store (docs/06 site-settings, docs/screens Store settings): branding, contact, the
 * grievance officer and label defaults, invoice details, checkout and returns rules, analytics
 * and maintenance mode. Created for every new store on `tenant.created`.
 */
export const SiteSettings: CollectionConfig = {
  slug: 'site-settings',
  labels: { singular: 'Store settings', plural: 'Store settings' },
  admin: { group: 'Store', useAsTitle: 'storeName' },
  access: {
    read: tenantRoleOrPlatform({ roles: ANY_STORE_ROLE, supportCanAccess: true }),
    create: tenantRoleOrPlatform({ roles: STORE_ADMIN }),
    update: tenantRoleOrPlatform({ roles: STORE_ADMIN }),
    delete: nobody,
  },
  fields: [
    {
      // Jump to a section (the wireframe's links above the form)
      name: 'sections',
      type: 'ui',
      admin: {
        components: { Field: '@/modules/content/admin/SettingsSections#SettingsSections' },
        disableListColumn: true,
      },
    },
    {
      type: 'collapsible',
      label: 'Branding',
      admin: {
        initCollapsed: false,
        description: 'Layout and design are set in code by the platform team.',
      },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'storeName', label: 'Store name', type: 'text', required: true },
            {
              name: 'themeColor',
              label: 'Theme colour',
              type: 'text',
              admin: { placeholder: '#0F4C5C', description: 'Used for the phone app bar' },
              validate: optional(HEX, 'Use a colour like #0F4C5C'),
            },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'logo', type: 'upload', relationTo: 'media' },
            {
              name: 'logoDark',
              label: 'Logo for dark backgrounds',
              type: 'upload',
              relationTo: 'media',
            },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'favicon', label: 'Browser icon', type: 'upload', relationTo: 'media' },
            {
              name: 'pwaIcon',
              label: 'App icon (512 × 512)',
              type: 'upload',
              relationTo: 'media',
              admin: { description: 'Shown when shoppers install the store on their phone' },
            },
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Contact',
      admin: {
        initCollapsed: false,
        description: 'Shown in the footer, on invoices and on the contact page.',
      },
      fields: [
        {
          name: 'contact',
          type: 'group',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'email', type: 'email' },
                { name: 'phone', type: 'text' },
                {
                  name: 'whatsapp',
                  label: 'WhatsApp number',
                  type: 'text',
                  admin: { description: 'Used by the WhatsApp button' },
                },
              ],
            },
            { name: 'address', type: 'textarea' },
          ],
        },
        {
          name: 'social',
          label: 'Social links',
          type: 'group',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'instagram', type: 'text' },
                { name: 'facebook', type: 'text' },
                { name: 'youtube', label: 'YouTube', type: 'text' },
                { name: 'linkedin', label: 'LinkedIn', type: 'text' },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Grievance officer and labels',
      admin: {
        initCollapsed: false,
        description:
          'India’s e-commerce rules need a grievance officer on the store (complaints acknowledged in 48 hours). The label details prefill every product’s legal details.',
      },
      fields: [
        {
          name: 'grievanceOfficer',
          type: 'group',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'name', type: 'text' },
                { name: 'designation', type: 'text' },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'email', type: 'email' },
                { name: 'phone', type: 'text' },
              ],
            },
          ],
        },
        {
          name: 'legalDefaults',
          label: 'Product label defaults',
          type: 'group',
          fields: [
            { name: 'manufacturerName', label: 'Manufacturer name', type: 'text' },
            { name: 'manufacturerAddress', label: 'Manufacturer address', type: 'textarea' },
            { name: 'consumerCare', label: 'Consumer care', type: 'text' },
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'GST and invoices',
      admin: { initCollapsed: false, description: 'Printed on every invoice and credit note.' },
      fields: [
        {
          name: 'gstDetails',
          type: 'ui',
          admin: {
            components: { Field: '@/modules/content/admin/StoreGstDetails#StoreGstDetails' },
          },
        },
        {
          type: 'row',
          fields: [
            {
              name: 'orderPrefix',
              label: 'Order number prefix',
              type: 'text',
              required: true,
              access: { update: fieldSuperAdminOnly },
              admin: { description: 'Set at onboarding, for example AQV for AQV-10482' },
              validate: (value: string | null | undefined) =>
                !value || ORDER_PREFIX.test(value) ? true : '2 to 5 capital letters',
            },
          ],
        },
        {
          name: 'invoice',
          type: 'group',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'prefix',
                  label: 'Invoice prefix',
                  type: 'text',
                  defaultValue: 'INV',
                  admin: {
                    description:
                      'Up to 4 capital letters or digits: INV/26-27/00123 stays within GST’s 16 characters',
                  },
                  validate: (value: string | null | undefined) =>
                    !value || INVOICE_PREFIX.test(value)
                      ? true
                      : 'Up to 4 capital letters or digits',
                },
                { name: 'authorisedSignatory', label: 'Authorised signatory', type: 'text' },
              ],
            },
            { name: 'signature', type: 'upload', relationTo: 'media' },
            { name: 'footerNote', label: 'Footer note', type: 'textarea' },
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Checkout and returns',
      admin: { initCollapsed: false },
      fields: [
        {
          name: 'checkout',
          type: 'group',
          fields: [
            moneyField({ name: 'minOrderValue', label: 'Minimum order value' }),
            // Cash on delivery rules, edited on the Payments screen (docs/screens Payments).
            // COD is offered only when the platform's `cod` switch is on as well (docs/08).
            {
              name: 'codEnabled',
              label: 'Offer cash on delivery',
              type: 'checkbox',
              defaultValue: false,
              admin: { hidden: true },
            },
            {
              ...moneyField({ name: 'codMinOrder', label: 'COD minimum order' }),
              admin: { hidden: true },
            },
            {
              ...moneyField({ name: 'codMaxOrder', label: 'COD maximum order' }),
              admin: { hidden: true },
            },
            { ...moneyField({ name: 'codFee', label: 'COD fee' }), admin: { hidden: true } },
          ],
          admin: { description: 'Cash on delivery rules are set on the Payments screen.' },
        },
        {
          name: 'returns',
          type: 'group',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'windowDays',
                  label: 'Return window (days after delivery)',
                  type: 'number',
                  defaultValue: 7,
                  min: 0,
                  max: 90,
                },
                {
                  name: 'exchangeOnly',
                  label: 'Exchange only, no refunds',
                  type: 'checkbox',
                  defaultValue: false,
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Announcement bar',
      admin: { initCollapsed: false },
      fields: [
        {
          name: 'announcementBar',
          type: 'group',
          fields: [
            {
              name: 'enabled',
              label: 'Show the announcement bar',
              type: 'checkbox',
              defaultValue: false,
            },
            { name: 'text', type: 'text', maxLength: 120 },
            { name: 'linkUrl', label: 'Link (optional)', type: 'text' },
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Policies',
      admin: {
        initCollapsed: false,
        description:
          'The pages linked from the footer and checkout. A store should not launch with one in draft.',
      },
      fields: [
        {
          name: 'policies',
          type: 'group',
          fields: [
            {
              type: 'row',
              fields: [
                { name: 'shipping', type: 'relationship', relationTo: 'pages' },
                { name: 'returns', type: 'relationship', relationTo: 'pages' },
                { name: 'privacy', type: 'relationship', relationTo: 'pages' },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'terms', type: 'relationship', relationTo: 'pages' },
                { name: 'warranty', type: 'relationship', relationTo: 'pages' },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Search and analytics',
      admin: { initCollapsed: false },
      fields: [
        {
          name: 'seoDefaults',
          type: 'group',
          fields: [
            {
              name: 'titleTemplate',
              label: 'Page title pattern',
              type: 'text',
              admin: {
                description: '%s is replaced by the page name, for example “%s · Aquaverde”',
              },
            },
            {
              name: 'ogImage',
              label: 'Default share image',
              type: 'upload',
              relationTo: 'media',
            },
          ],
        },
        {
          name: 'analytics',
          type: 'group',
          admin: { description: 'Loaded only after the shopper accepts analytics cookies.' },
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'ga4Id',
                  label: 'Google Analytics 4 ID',
                  type: 'text',
                  validate: optional(/^G-[A-Z0-9]{4,}$/, 'Looks like G-XXXXXXX'),
                },
                {
                  name: 'metaPixelId',
                  label: 'Meta Pixel ID',
                  type: 'text',
                  validate: optional(/^\d{8,20}$/, 'Digits only'),
                },
                {
                  name: 'gtmId',
                  label: 'Google Tag Manager ID',
                  type: 'text',
                  validate: optional(/^GTM-[A-Z0-9]{4,}$/, 'Looks like GTM-XXXXXX'),
                },
              ],
            },
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Store status',
      admin: { initCollapsed: false },
      fields: [
        {
          name: 'maintenanceMode',
          label: 'Maintenance mode: show shoppers a “back soon” page',
          type: 'checkbox',
          defaultValue: false,
        },
      ],
    },
  ],
}
