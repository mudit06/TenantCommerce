import type { CollectionConfig } from 'payload'

import { nobody, platformStaffOrOwnTenant, superAdminOnly, isPlatformStaff } from '@/access'

import { BILLING_CYCLES, BILLING_MODES, PAYMENT_METHODS, SUBSCRIPTION_STATUSES } from '../constants'

const label = (value: string) => (value.charAt(0).toUpperCase() + value.slice(1)).replace(/_/g, ' ')

/**
 * A store's subscription to a plan (docs/06). One per store. Billing is manual in the MVP:
 * our team records bank transfers and UPI payments through `recordSubscriptionPayment`, which
 * moves the period forward. Every field is read-only in the admin; changes go through the
 * billing actions so the history stays complete.
 */
export const Subscriptions: CollectionConfig = {
  slug: 'subscriptions',
  labels: { singular: 'Subscription', plural: 'Subscriptions' },
  admin: {
    // The platform panel is our team's; vendor staff use their store CMS (docs/screens)
    hidden: ({ user }) => !isPlatformStaff(user),
    useAsTitle: 'vendorName',
    defaultColumns: ['vendorName', 'plan', 'status', 'billingMode', 'currentPeriodEnd'],
    group: 'Billing',
    description: 'Manual billing in the MVP (automatic with Razorpay Subscriptions in Phase 2).',
    components: {
      views: {
        // docs/screens Subscriptions: figures, status tabs and the billing desk's table
        list: { Component: '@/modules/tenancy/admin/views/SubscriptionsList#SubscriptionsList' },
      },
    },
  },
  access: {
    read: platformStaffOrOwnTenant(['owner']),
    create: nobody,
    update: superAdminOnly,
    delete: nobody,
  },
  fields: [
    {
      name: 'billingPanel',
      type: 'ui',
      admin: {
        components: {
          Field: '@/modules/tenancy/admin/views/SubscriptionBillingField#SubscriptionBillingField',
        },
        disableListColumn: true,
      },
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: true,
      unique: true,
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'vendorName',
      type: 'text',
      admin: { readOnly: true, hidden: true },
    },
    {
      name: 'plan',
      type: 'relationship',
      relationTo: 'plans',
      required: true,
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      index: true,
      options: SUBSCRIPTION_STATUSES.map((value) => ({ value, label: label(value) })),
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'billingCycle',
      type: 'select',
      required: true,
      defaultValue: 'monthly',
      options: BILLING_CYCLES.map((value) => ({ value, label: label(value) })),
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'billingMode',
      type: 'select',
      required: true,
      defaultValue: 'manual',
      options: BILLING_MODES.map((value) => ({ value, label: label(value) })),
      admin: { readOnly: true, position: 'sidebar' },
    },
    { name: 'currentPeriodStart', type: 'date', admin: { readOnly: true, hidden: true } },
    {
      name: 'currentPeriodEnd',
      type: 'date',
      index: true,
      admin: { readOnly: true, hidden: true, date: { displayFormat: 'd MMM yyyy' } },
    },
    { name: 'trialEndsAt', type: 'date', admin: { readOnly: true, hidden: true } },
    { name: 'providerSubscriptionId', type: 'text', admin: { readOnly: true, hidden: true } },
    {
      name: 'payments',
      type: 'array',
      admin: { readOnly: true, hidden: true },
      fields: [
        { name: 'amountMinor', type: 'number', required: true },
        { name: 'paidOn', type: 'date', required: true },
        {
          name: 'method',
          type: 'select',
          required: true,
          options: PAYMENT_METHODS.map(({ value, label: text }) => ({ value, label: text })),
        },
        { name: 'reference', type: 'text' },
        {
          name: 'coversPeriod',
          type: 'group',
          fields: [
            { name: 'start', type: 'date' },
            { name: 'end', type: 'date' },
          ],
        },
        { name: 'recordedBy', type: 'relationship', relationTo: 'users' },
      ],
    },
    {
      name: 'history',
      type: 'array',
      admin: { readOnly: true, hidden: true },
      fields: [
        { name: 'at', type: 'date', required: true },
        { name: 'event', type: 'text', required: true },
        { name: 'amountMinor', type: 'number' },
        { name: 'reference', type: 'text' },
        { name: 'by', type: 'relationship', relationTo: 'users' },
        { name: 'data', type: 'json' },
      ],
    },
  ],
}
