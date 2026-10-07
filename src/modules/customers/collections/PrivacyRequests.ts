import type { CollectionConfig } from 'payload'

import { CUSTOMER_READ, nobody, tenantRoleOrPlatform } from '@/access'

import { PRIVACY_STATUSES, PRIVACY_TYPES } from '../constants'

/**
 * DPDP Act requests (docs/06 `privacy-requests`, docs/14): a shopper asks for their data, a
 * correction or deletion, and staff handle it from the Customers screen. Written through the
 * customers endpoints only, so each step is checked and timed.
 */
export const PrivacyRequests: CollectionConfig = {
  slug: 'privacy-requests',
  labels: { singular: 'Privacy request', plural: 'Privacy requests' },
  admin: { hidden: true },
  access: {
    read: tenantRoleOrPlatform({ roles: CUSTOMER_READ, supportCanAccess: true }),
    create: nobody,
    update: nobody,
    delete: nobody,
  },
  defaultSort: '-receivedAt',
  indexes: [{ fields: ['tenant', 'status', 'dueAt'] }],
  fields: [
    { name: 'type', type: 'select', required: true, options: [...PRIVACY_TYPES] },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'received',
      options: [...PRIVACY_STATUSES],
    },
    { name: 'customer', type: 'text' },
    {
      name: 'contact',
      type: 'group',
      fields: [
        { name: 'email', type: 'text' },
        { name: 'phone', type: 'text' },
      ],
    },
    { name: 'receivedAt', type: 'date', required: true },
    { name: 'dueAt', type: 'date', required: true },
    { name: 'handledBy', type: 'text' },
    { name: 'handledByName', type: 'text' },
    { name: 'notes', type: 'textarea' },
    { name: 'completedAt', type: 'date' },
  ],
}
