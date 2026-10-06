import type { CollectionConfig } from 'payload'

import { nobody, ORDER_READ, tenantRoleOrPlatform } from '@/access'

import { ORDER_EVENT_TYPES } from '../constants'

/**
 * An order's timeline (docs/06 `order-events`): placed, paid, status changes, parcels, notes,
 * refunds, invoices and messages, with who and when. Append-only.
 */
export const OrderEvents: CollectionConfig = {
  slug: 'order-events',
  labels: { singular: 'Order event', plural: 'Order events' },
  admin: { hidden: true },
  defaultSort: 'at',
  access: {
    read: tenantRoleOrPlatform({ roles: ORDER_READ, supportCanAccess: true }),
    create: nobody,
    update: nobody,
    delete: nobody,
  },
  indexes: [{ fields: ['tenant', 'order', 'at'] }],
  fields: [
    { name: 'order', type: 'relationship', relationTo: 'orders', required: true, index: true },
    { name: 'type', type: 'select', required: true, options: [...ORDER_EVENT_TYPES] },
    { name: 'text', type: 'text', required: true },
    { name: 'from', type: 'text' },
    { name: 'to', type: 'text' },
    { name: 'byUser', type: 'relationship', relationTo: 'users' },
    {
      name: 'byLabel',
      type: 'text',
      admin: { description: 'Who did it when not a staff member: system, shopper, Razorpay…' },
    },
    { name: 'data', type: 'json' },
    { name: 'at', type: 'date', required: true },
  ],
}
