import type { CollectionConfig } from 'payload'

import { nobody, ORDER_READ, tenantRoleOrPlatform } from '@/access'

/**
 * One payment attempt with a provider (docs/06 `transactions`): the Razorpay order, the payment
 * that settled it and every webhook event already handled (dedupe, docs/11 "Idempotency").
 */
export const Transactions: CollectionConfig = {
  slug: 'transactions',
  labels: { singular: 'Payment', plural: 'Payments' },
  admin: { hidden: true },
  access: {
    read: tenantRoleOrPlatform({ roles: ORDER_READ, supportCanAccess: true }),
    create: nobody,
    update: nobody,
    delete: nobody,
  },
  indexes: [
    { fields: ['tenant', 'order'] },
    { fields: ['tenant', 'provider', 'providerOrderId'], unique: true },
  ],
  fields: [
    { name: 'order', type: 'relationship', relationTo: 'orders', required: true },
    { name: 'provider', type: 'select', required: true, options: ['razorpay', 'cod', 'manual'] },
    { name: 'mode', type: 'select', options: ['test', 'live'] },
    { name: 'providerOrderId', type: 'text', required: true },
    { name: 'providerPaymentId', type: 'text', index: true },
    { name: 'amountMinor', type: 'number', required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'created',
      options: ['created', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded'],
    },
    {
      name: 'method',
      type: 'text',
      admin: { description: 'upi, card, netbanking, wallet, emi' },
    },
    { name: 'methodDetail', type: 'text', admin: { description: 'Bank or card network' } },
    { name: 'capturedAt', type: 'date' },
    { name: 'failureReason', type: 'text' },
    { name: 'refundedMinor', type: 'number', defaultValue: 0 },
    {
      name: 'processedEventIds',
      type: 'text',
      hasMany: true,
      admin: { description: 'Webhook events already handled' },
    },
    {
      name: 'raw',
      type: 'json',
      admin: { description: 'The last provider payload, without card or contact details' },
    },
  ],
}
