import type { CollectionConfig } from 'payload'

import { nobody } from '@/access'
import { featureGatedAccess, hiddenWithoutFeature } from '@/modules/tenancy'

import { AFFILIATE_STATUSES, PROMOTES_ON } from '../constants'

/**
 * People who promote the store for a commission (docs/06 `affiliates`). Written only by the
 * affiliate services: shoppers apply from the store, staff approve, set rates and record payouts.
 * Payout details and PAN are encrypted (`*Sealed`, docs/14) and shown masked. Plain ids for the
 * customer and coupon (docs/06 "Transactions").
 */
export const Affiliates: CollectionConfig = {
  slug: 'affiliates',
  labels: { singular: 'Affiliate', plural: 'Affiliates' },
  admin: {
    group: 'Marketing',
    useAsTitle: 'name',
    hidden: hiddenWithoutFeature('affiliate'),
    components: {
      views: { list: { Component: '@/modules/affiliate/admin/AffiliatesView#AffiliatesView' } },
    },
  },
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
    { fields: ['tenant', 'code'], unique: true },
    { fields: ['tenant', 'customer'], unique: true },
    { fields: ['tenant', 'status'] },
  ],
  fields: [
    { name: 'customer', type: 'text', required: true },
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'phone', type: 'text' },
    /** Used in /r/CODE; upper case letters and digits */
    { name: 'code', type: 'text', required: true },
    /** The affiliate's personal coupon (a coupons id), optional */
    { name: 'coupon', type: 'text' },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'applied',
      options: [...AFFILIATE_STATUSES],
    },
    {
      name: 'application',
      type: 'group',
      fields: [
        { name: 'promotesOn', type: 'select', options: [...PROMOTES_ON] },
        { name: 'profileUrl', type: 'text' },
        { name: 'audienceNote', type: 'textarea' },
        { name: 'appliedAt', type: 'date' },
        { name: 'termsAcceptedAt', type: 'date' },
      ],
    },
    { name: 'commissionPercent', type: 'number', min: 0, max: 50 },
    {
      name: 'categoryRates',
      type: 'array',
      fields: [
        { name: 'category', type: 'text', required: true },
        { name: 'categoryName', type: 'text' },
        { name: 'percent', type: 'number', required: true, min: 0, max: 50 },
      ],
    },
    /** `{ method: upi|bank, upiId?, accountNumber?, ifsc?, accountName? }`, encrypted */
    { name: 'payoutSealed', type: 'text', admin: { hidden: true } },
    { name: 'payoutMasked', type: 'text' },
    { name: 'panSealed', type: 'text', admin: { hidden: true } },
    { name: 'panMasked', type: 'text' },
    { name: 'gstin', type: 'text' },
    { name: 'rejectReason', type: 'text' },
    { name: 'approvedBy', type: 'text' },
    { name: 'approvedAt', type: 'date' },
    { name: 'notes', type: 'textarea' },
  ],
}
