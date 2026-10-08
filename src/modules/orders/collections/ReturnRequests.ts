import type { CollectionConfig } from 'payload'

import { nobody, ORDER_READ, tenantRoleOrPlatform } from '@/access'

import { RETURN_REASONS, RETURN_STATUSES } from '../constants'

/**
 * A shopper's request to return items of a delivered order (docs/11 "Returns and exchanges"):
 * the items, reason and photos, then staff approve (with pickup instructions) or reject (with a
 * reason), mark it received, and refund through the order's Refund. Written by the services only.
 * Plain ids (written inside order transactions).
 */
export const ReturnRequests: CollectionConfig = {
  slug: 'return-requests',
  labels: { singular: 'Return', plural: 'Returns' },
  admin: { hidden: true },
  defaultSort: '-createdAt',
  access: {
    read: tenantRoleOrPlatform({ roles: ORDER_READ, supportCanAccess: true }),
    create: nobody,
    update: nobody,
    delete: nobody,
  },
  indexes: [{ fields: ['tenant', 'order'] }, { fields: ['tenant', 'status', 'createdAt'] }],
  fields: [
    { name: 'order', type: 'text', required: true },
    { name: 'orderNumber', type: 'text', required: true },
    { name: 'customer', type: 'text' },
    {
      name: 'items',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        { name: 'orderItemId', type: 'text', required: true },
        { name: 'title', type: 'text', required: true },
        { name: 'options', type: 'text' },
        { name: 'qty', type: 'number', required: true, min: 1 },
        /** What the shopper paid for these pieces, incl. GST (the refund's starting point) */
        { name: 'amountMinor', type: 'number' },
      ],
    },
    { name: 'reason', type: 'select', required: true, options: [...RETURN_REASONS] },
    { name: 'note', type: 'textarea' },
    { name: 'photos', type: 'text', hasMany: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'requested',
      options: [...RETURN_STATUSES],
    },
    /** To the shopper: how the item is picked up or where to send it */
    { name: 'pickupNote', type: 'textarea' },
    { name: 'rejectReason', type: 'text' },
    { name: 'decidedBy', type: 'text' },
    { name: 'decidedAt', type: 'date' },
    { name: 'receivedAt', type: 'date' },
    { name: 'refund', type: 'text' },
  ],
}
