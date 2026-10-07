import type { CollectionConfig } from 'payload'

import { nobody, ORDER_READ, STORE_ADMIN, tenantRoleOrPlatform } from '@/access'

import { MILESTONE_KEYS, TEMPLATE_STATUSES } from '../milestones'

/**
 * WhatsApp templates, one per step, variant and language (docs/06 `notification-templates`):
 * the exact text Meta approved for this vendor and Meta's status. Seeded from the starter library
 * and changed only through "Submit to Meta" and "Sync templates". Email copy lives in code
 * (src/emails); SMS rows come with the MSG91 connector.
 */
export const NotificationTemplates: CollectionConfig = {
  slug: 'notification-templates',
  labels: { singular: 'Message template', plural: 'Message templates' },
  admin: { hidden: true, useAsTitle: 'milestone' },
  access: {
    read: tenantRoleOrPlatform({ roles: ORDER_READ, supportCanAccess: true }),
    create: tenantRoleOrPlatform({ roles: STORE_ADMIN }),
    update: tenantRoleOrPlatform({ roles: STORE_ADMIN }),
    delete: nobody,
  },
  indexes: [
    { fields: ['tenant', 'milestone', 'variant', 'channel', 'locale'], unique: true },
    { fields: ['tenant', 'whatsapp.name'] },
  ],
  fields: [
    { name: 'milestone', type: 'select', required: true, options: MILESTONE_KEYS },
    {
      name: 'category',
      type: 'select',
      defaultValue: 'utility',
      options: ['utility', 'marketing'],
    },
    {
      name: 'variant',
      type: 'select',
      defaultValue: 'default',
      options: ['default', 'prepaid', 'cod'],
    },
    { name: 'channel', type: 'select', required: true, options: ['whatsapp', 'sms'] },
    { name: 'locale', type: 'text', defaultValue: 'en' },
    { name: 'body', type: 'textarea', required: true },
    { name: 'variables', type: 'text', hasMany: true },
    { name: 'trackButton', type: 'checkbox', defaultValue: true },
    {
      name: 'whatsapp',
      type: 'group',
      fields: [
        { name: 'name', type: 'text' },
        { name: 'language', type: 'text', defaultValue: 'en' },
        { name: 'providerTemplateId', type: 'text' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      options: TEMPLATE_STATUSES.map(({ value, label }) => ({ value, label })),
    },
    { name: 'rejectionReason', type: 'text' },
    { name: 'submittedAt', type: 'date' },
    { name: 'lastSyncedAt', type: 'date' },
  ],
}
