import type { CollectionConfig } from 'payload'

import { nobody, superAdminOnly, isPlatformStaff } from '@/access'
import { CONNECTOR_PROVIDERS } from '@/connectors/core/providers'
import { moneyField } from '@/fields/money'
import { recordAudit } from '@/modules/audit'
import { FEATURES } from '@/modules/features'

import { switchOffFeaturesOutsidePlan } from '../services/features'

/** Subscription tiers: the ceiling for features, connectors and limits (docs/06, docs/08). */
export const Plans: CollectionConfig = {
  slug: 'plans',
  labels: { singular: 'Plan', plural: 'Plans' },
  admin: {
    // The platform panel is our team's; vendor staff use their store CMS (docs/screens)
    hidden: ({ user }) => !isPlatformStaff(user),
    useAsTitle: 'name',
    defaultColumns: ['name', 'code', 'priceMonthly', 'isActive'],
    group: 'Billing',
    description:
      'A plan is a ceiling, not a switch: features in a plan stay off until switched on per vendor.',
  },
  access: {
    read: ({ req }) => Boolean(req.user),
    create: superAdminOnly,
    update: superAdminOnly,
    // Plans are deactivated, never deleted: subscriptions point at them
    delete: nobody,
  },
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'name', type: 'text', required: true },
        {
          name: 'code',
          type: 'text',
          required: true,
          unique: true,
          admin: { description: 'Short permanent key, for example growth' },
          validate: (value: string | null | undefined) =>
            !value || /^[a-z0-9-]+$/.test(value) ? true : 'Lowercase letters, numbers, hyphens',
        },
      ],
    },
    {
      type: 'row',
      fields: [
        moneyField({ name: 'priceMonthly', label: 'Price per month (before GST)', required: true }),
        moneyField({ name: 'priceYearly', label: 'Price per year (before GST)' }),
      ],
    },
    {
      name: 'limits',
      type: 'group',
      admin: { description: 'Checked on the server. Stores are warned at 90% of a limit.' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'maxProducts', type: 'number', required: true, min: 0 },
            { name: 'maxStaffUsers', type: 'number', required: true, min: 1 },
            { name: 'maxStorageGB', type: 'number', required: true, min: 0 },
            {
              name: 'maxOrdersPerMonth',
              type: 'number',
              min: 0,
              admin: { description: 'Empty means no limit' },
            },
          ],
        },
      ],
    },
    {
      name: 'allowedModules',
      label: 'Features allowed',
      type: 'select',
      hasMany: true,
      options: FEATURES.map((feature) => ({
        value: feature.key,
        label: feature.phase === 'mvp' ? feature.label : `${feature.label} (Phase 2)`,
      })),
    },
    {
      name: 'allowedConnectors',
      label: 'Connectors allowed',
      type: 'select',
      hasMany: true,
      options: CONNECTOR_PROVIDERS.map((provider) => ({
        value: provider.key,
        label: provider.label,
      })),
    },
    { name: 'isActive', type: 'checkbox', defaultValue: true, admin: { position: 'sidebar' } },
    { name: 'sortOrder', type: 'number', defaultValue: 0, admin: { position: 'sidebar' } },
  ],
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        if (operation === 'update') {
          // Removing a feature from a plan switches it off for that plan's stores; data stays
          const removed = ((previousDoc?.allowedModules ?? []) as string[]).filter(
            (key) => !((doc.allowedModules ?? []) as string[]).includes(key),
          )
          if (removed.length > 0) {
            await switchOffFeaturesOutsidePlan(req, { planId: String(doc.id), keys: removed })
          }
        }
        await recordAudit(req, {
          action: 'plan_edited',
          collectionSlug: 'plans',
          docId: String(doc.id),
          summary: `${operation === 'create' ? 'Created' : 'Edited'} plan ${doc.name}`,
        })
      },
    ],
  },
}
