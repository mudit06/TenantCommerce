import type { CollectionConfig } from 'payload'

import { fieldPlatformStaffOnly, nobody, superAdminOnly, isPlatformStaff } from '@/access'
import { addressGroup } from '@/fields/address'
import { gstinField } from '@/fields/gstin'
import { slugField } from '@/fields/slug'
import { DEFAULT_TIMEZONE } from '@/lib/dates'
import { GST_STATE_OPTIONS, parseGstin } from '@/lib/gst/gstin'

import { recordAudit } from '@/modules/audit'
import { FEATURES } from '@/modules/features'

import { INDUSTRIES, RESERVED_SLUGS, TENANT_STATUSES } from '../constants'

const TENANT_VIEWS = '@/modules/tenancy/admin/views'

const tab = (path: string, label: string, order: number) => ({
  path: `/${path}` as const,
  tab: { href: `/${path}`, label, order },
})

/**
 * One vendor store (docs/04, docs/06). Created only through onboarding (`createTenant`), never
 * deleted from the admin: stores are suspended or archived, and hard deletes go through a
 * reviewed script after the retention period.
 */
/** Fields edited on the vendor overview, with the words Recent changes uses for them. */
const EDITABLE_DETAILS: Record<string, string> = {
  name: 'store name',
  legalName: 'legal name',
  gstin: 'GSTIN',
  pan: 'PAN',
  stateCode: 'GST state',
  registeredAddress: 'registered address',
  industry: 'industry',
  supportEmail: 'support email',
  supportPhone: 'support phone',
  whatsappNumber: 'WhatsApp number',
  defaultLocale: 'language',
  timezone: 'time zone',
  notes: 'internal notes',
}

const sameValue = (a: unknown, b: unknown) =>
  JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

export const Tenants: CollectionConfig = {
  slug: 'tenants',
  labels: { singular: 'Vendor', plural: 'All vendors' },
  admin: {
    // The platform panel is our team's; vendor staff use their store CMS (docs/screens)
    hidden: ({ user }) => !isPlatformStaff(user),
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'industry', 'plan', 'status', 'createdAt'],
    listSearchableFields: ['name', 'slug', 'gstin', 'legalName'],
    group: 'Vendors',
    components: {
      beforeListTable: [`${TENANT_VIEWS}/VendorListActions#VendorListActions`],
      views: {
        edit: {
          default: { tab: { label: 'Overview', order: 0 } },
          features: {
            Component: `${TENANT_VIEWS}/FeaturesView#FeaturesView`,
            ...tab('features', 'Features', 100),
          },
          connectors: {
            Component: `${TENANT_VIEWS}/ConnectorsView#ConnectorsView`,
            ...tab('connectors', 'Connectors', 200),
          },
          domains: {
            Component: `${TENANT_VIEWS}/DomainsView#DomainsView`,
            ...tab('domains', 'Domains', 300),
          },
          billing: {
            Component: `${TENANT_VIEWS}/BillingView#BillingView`,
            ...tab('billing', 'Billing', 400),
          },
          staff: {
            Component: `${TENANT_VIEWS}/StaffView#StaffView`,
            ...tab('staff', 'Staff', 500),
          },
          // The edit page's API and versions tabs are noise for this panel
          api: { tab: { condition: () => false } },
        },
      },
    },
  },
  access: {
    // The multi-tenant plugin narrows reads to the stores a vendor user belongs to
    read: ({ req }) => Boolean(req.user),
    // Only onboarding creates stores (same steps as scripts/create-tenant)
    create: nobody,
    update: superAdminOnly,
    delete: nobody,
  },
  fields: [
    {
      name: 'summary',
      type: 'ui',
      admin: {
        components: { Field: `${TENANT_VIEWS}/VendorHeader#VendorHeader` },
        disableListColumn: true,
      },
    },
    {
      type: 'collapsible',
      label: 'Business details',
      admin: { description: 'Legal details used on GST invoices.' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'name', label: 'Store name', type: 'text', required: true },
            { name: 'legalName', label: 'Legal name', type: 'text', required: true },
          ],
        },
        {
          type: 'row',
          fields: [
            gstinField(),
            {
              name: 'pan',
              label: 'PAN',
              type: 'text',
              admin: { description: 'From the GSTIN when there is one' },
            },
            {
              name: 'stateCode',
              label: 'State (GST code)',
              type: 'select',
              options: GST_STATE_OPTIONS,
              admin: { description: 'Same state: CGST + SGST. Other states: IGST' },
            },
          ],
        },
        addressGroup('registeredAddress', 'Registered address'),
        {
          name: 'industry',
          type: 'select',
          hasMany: true,
          required: true,
          options: INDUSTRIES.map(({ value, label }) => ({ value, label })),
        },
        {
          type: 'row',
          fields: [
            { name: 'supportEmail', type: 'email' },
            { name: 'supportPhone', type: 'text' },
            { name: 'whatsappNumber', label: 'WhatsApp number', type: 'text' },
          ],
        },
      ],
    },
    {
      type: 'collapsible',
      label: 'Store',
      fields: [
        {
          type: 'row',
          fields: [
            slugField({
              unique: true,
              admin: {
                description:
                  'Permanent. Names the subdomain and the vendor UI folder in code (src/storefront/vendors/<slug>).',
              },
              access: { update: () => false },
              validate: (value: string | null | undefined) => {
                if (!value) return 'Required'
                if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
                  return 'Lowercase letters, numbers and single hyphens only'
                }
                if (value.length < 3 || value.length > 40) return 'Use 3 to 40 characters'
                if (RESERVED_SLUGS.has(value)) return `"${value}" is reserved`
                return true
              },
            }),
            {
              name: 'defaultLocale',
              type: 'select',
              defaultValue: 'en',
              options: [{ label: 'English', value: 'en' }],
              admin: { description: 'More languages in Phase 2' },
            },
            {
              name: 'currency',
              type: 'select',
              defaultValue: 'INR',
              options: [{ label: 'INR (₹)', value: 'INR' }],
              admin: { readOnly: true, description: 'Fixed to INR in the MVP' },
            },
            {
              name: 'timezone',
              type: 'select',
              defaultValue: DEFAULT_TIMEZONE,
              options: [{ label: 'Asia/Kolkata', value: DEFAULT_TIMEZONE }],
            },
          ],
        },
        {
          name: 'enabledLocales',
          type: 'select',
          hasMany: true,
          defaultValue: ['en'],
          options: [{ label: 'English', value: 'en' }],
          admin: { hidden: true },
        },
      ],
    },
    {
      name: 'notes',
      label: 'Internal notes',
      type: 'textarea',
      admin: {
        description:
          'Visible to our team only. For example: prefers WhatsApp, renewal call in March.',
      },
      access: { read: fieldPlatformStaffOnly },
    },
    // ---- Sidebar --------------------------------------------------------------------------
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: TENANT_STATUSES.map((value) => ({
        value,
        label: value.charAt(0).toUpperCase() + value.slice(1),
      })),
      admin: {
        position: 'sidebar',
        readOnly: true,
        description: 'Changed with Go live, Suspend and Resume above',
      },
    },
    {
      name: 'plan',
      type: 'relationship',
      relationTo: 'plans',
      required: true,
      admin: { position: 'sidebar', readOnly: true, description: 'Changed from the Billing tab' },
    },
    {
      name: 'usagePanel',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: { Field: `${TENANT_VIEWS}/PlanUsage#PlanUsage` },
        disableListColumn: true,
      },
    },
    {
      name: 'recentChanges',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: { Field: `${TENANT_VIEWS}/RecentChanges#RecentChanges` },
        disableListColumn: true,
      },
    },
    {
      name: 'usage',
      type: 'group',
      admin: { hidden: true },
      access: { update: () => false },
      fields: [
        { name: 'productsCount', type: 'number', defaultValue: 0 },
        { name: 'staffCount', type: 'number', defaultValue: 0 },
        { name: 'storageBytes', type: 'number', defaultValue: 0 },
        { name: 'ordersThisMonth', type: 'number', defaultValue: 0 },
        { name: 'updatedAt', type: 'date' },
      ],
    },
    {
      // Effective features (plan AND switch AND dependencies), kept by syncEnabledFeatures
      name: 'enabledFeatures',
      type: 'select',
      hasMany: true,
      options: FEATURES.map((feature) => ({ value: feature.key, label: feature.label })),
      admin: { hidden: true },
      access: { create: () => false, update: () => false },
    },
    {
      name: 'dbRef',
      type: 'text',
      defaultValue: 'shared',
      admin: { hidden: true },
      access: { update: () => false },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      admin: { hidden: true },
      access: { update: () => false },
    },
    { name: 'activatedAt', type: 'date', admin: { hidden: true }, access: { update: () => false } },
    {
      name: 'presetAppliedAt',
      type: 'date',
      admin: { hidden: true },
      access: { update: () => false },
    },
  ],
  hooks: {
    beforeValidate: [
      // GSTIN fills in the PAN and the GST state code (docs/screens/super-admin.md, New vendor)
      ({ data }) => {
        if (!data || typeof data.gstin !== 'string' || data.gstin.trim() === '') return data
        const check = parseGstin(data.gstin)
        if (check.valid) {
          data.pan = check.pan
          data.stateCode = check.stateCode
          // A GSTIN is registered at the principal place of business, so the address is in that state
          if (data.registeredAddress && !data.registeredAddress.stateCode) {
            data.registeredAddress.stateCode = check.stateCode
          }
        }
        return data
      },
    ],
    afterChange: [
      // Edits on the vendor overview show under Recent changes (QA SA-13). Status, plan and
      // feature changes go through their services, which write their own entries.
      async ({ doc, previousDoc, operation, req }) => {
        if (operation !== 'update' || !req.user) return doc
        const changed = Object.entries(EDITABLE_DETAILS)
          .filter(([field]) => !sameValue(previousDoc?.[field], doc[field]))
          .map(([, label]) => label)
        if (changed.length === 0) return doc
        await recordAudit(req, {
          action: 'store_details_changed',
          tenant: String(doc.id),
          collectionSlug: 'tenants',
          docId: String(doc.id),
          summary: `Edited ${changed.join(', ')}`,
          // Field names only: notes and contact details stay out of the log (docs/14)
          diff: { fields: changed },
        })
        return doc
      },
    ],
    beforeChange: [
      ({ data, originalDoc, operation, context }) => {
        // Status moves only through changeTenantStatus, which checks the lifecycle
        if (
          operation === 'update' &&
          !context.allowStatusChange &&
          data.status &&
          originalDoc?.status &&
          data.status !== originalDoc.status
        ) {
          data.status = originalDoc.status
        }
        return data
      },
    ],
  },
}
