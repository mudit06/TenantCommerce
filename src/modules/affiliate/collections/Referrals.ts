import type { CollectionConfig } from 'payload'

import { nobody } from '@/access'
import { featureGatedAccess } from '@/modules/tenancy'

import { REFERRAL_STATUSES } from '../constants'

/**
 * The commission ledger (docs/06 `referrals`): one row per referred order. Pending until the
 * order is delivered and its return window closes, then approved by the daily job; a cancelled
 * order reverses it and a refund reduces it. Plain ids (written inside order transactions).
 */
export const Referrals: CollectionConfig = {
  slug: 'referrals',
  admin: { hidden: true },
  access: {
    read: featureGatedAccess({
      feature: 'affiliate',
      roles: ['owner', 'manager', 'order-manager'],
      supportCanAccess: true,
    }),
    create: nobody,
    update: nobody,
    delete: nobody,
  },
  indexes: [
    { fields: ['tenant', 'order'], unique: true },
    { fields: ['tenant', 'affiliate', 'status'] },
    { fields: ['tenant', 'status', 'holdUntil'] },
  ],
  fields: [
    { name: 'affiliate', type: 'text', required: true },
    { name: 'order', type: 'text', required: true },
    { name: 'orderNumber', type: 'text' },
    { name: 'orderPlacedAt', type: 'date' },
    { name: 'via', type: 'select', options: ['link', 'coupon'] },
    /** The order's goods value after discounts, before GST, delivery and COD fee */
    { name: 'baseMinor', type: 'number', required: true },
    /** The effective rate, for display: the default rate, or mixed when category rates applied */
    { name: 'commissionPercent', type: 'number' },
    { name: 'rateNote', type: 'text' },
    /** The commission as worked out at the order, before adjustments */
    { name: 'grossMinor', type: 'number', required: true },
    /** What is owed now: gross less adjustments */
    { name: 'commissionMinor', type: 'number', required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [...REFERRAL_STATUSES],
    },
    /** Delivery plus the hold days; empty until the order is delivered */
    { name: 'holdUntil', type: 'date' },
    {
      name: 'adjustments',
      type: 'array',
      fields: [
        { name: 'reason', type: 'select', options: ['refund', 'return', 'cancel'] },
        { name: 'amountMinor', type: 'number' },
        { name: 'at', type: 'date' },
      ],
    },
    { name: 'approvedAt', type: 'date' },
    { name: 'payout', type: 'text' },
  ],
}
