import type { CollectionConfig } from 'payload'

import { nobody, ORDER_READ, tenantRoleOrPlatform } from '@/access'

/**
 * Money given back on an order (docs/06 `refunds`, docs/11 "Refunds"): through Razorpay for
 * online payments, or recorded by staff with the bank or UPI reference for cash on delivery.
 * Never more than what the shopper paid for the lines refunded.
 */
export const Refunds: CollectionConfig = {
  slug: 'refunds',
  admin: { hidden: true },
  access: {
    read: tenantRoleOrPlatform({ roles: ORDER_READ, supportCanAccess: true }),
    create: nobody,
    update: nobody,
    delete: nobody,
  },
  indexes: [{ fields: ['tenant', 'order'] }],
  fields: [
    { name: 'order', type: 'relationship', relationTo: 'orders', required: true },
    { name: 'transaction', type: 'relationship', relationTo: 'transactions' },
    { name: 'amountMinor', type: 'number', required: true, min: 1 },
    { name: 'reason', type: 'text', required: true },
    { name: 'method', type: 'select', required: true, options: ['razorpay', 'manual'] },
    { name: 'providerRefundId', type: 'text', index: true },
    {
      name: 'reference',
      type: 'text',
      admin: { description: 'Bank transfer or UPI reference for a manual refund' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: ['pending', 'processed', 'failed'],
    },
    {
      name: 'lines',
      type: 'json',
      admin: { description: 'Order lines and quantities refunded, when not the whole order' },
    },
    { name: 'includesShipping', type: 'checkbox', defaultValue: false },
    { name: 'creditNote', type: 'relationship', relationTo: 'invoices' },
    { name: 'by', type: 'relationship', relationTo: 'users' },
    { name: 'processedAt', type: 'date' },
  ],
}
