import type { CollectionConfig } from 'payload'

import { ANY_STORE_ROLE, nobody } from '@/access'
import { featureGatedAccess, hiddenWithoutFeature } from '@/modules/tenancy'

import { COUPON_STATUSES } from '../occasions'
import { COUPON_TYPES } from '../rules'

/**
 * Codes shoppers type at the cart (docs/06 `coupons`, docs/screens Coupons). Saved through the
 * Coupons screen's endpoints, which check the code is unique in the store and log each change;
 * `usedCount` moves only with coupon-redemptions.
 */
export const Coupons: CollectionConfig = {
  slug: 'coupons',
  labels: { singular: 'Coupon', plural: 'Coupons' },
  admin: {
    group: 'Marketing',
    useAsTitle: 'code',
    hidden: hiddenWithoutFeature('coupons'),
    components: {
      views: {
        list: { Component: '@/modules/promotions/admin/CouponsView#CouponsView' },
      },
    },
  },
  defaultSort: '-createdAt',
  access: {
    read: featureGatedAccess({ feature: 'coupons', roles: ANY_STORE_ROLE, supportCanAccess: true }),
    create: nobody,
    update: nobody,
    delete: nobody,
  },
  indexes: [
    { fields: ['tenant', 'codeNormalized'], unique: true },
    { fields: ['tenant', 'batch.id'] },
    { fields: ['tenant', 'affiliate'] },
  ],
  fields: [
    { name: 'code', type: 'text', required: true },
    { name: 'codeNormalized', type: 'text', required: true },
    { name: 'description', label: 'Note for staff', type: 'text' },
    { name: 'type', type: 'select', required: true, options: [...COUPON_TYPES] },
    { name: 'percent', type: 'number' },
    { name: 'amountMinor', type: 'number' },
    { name: 'minOrderMinor', type: 'number' },
    { name: 'maxDiscountMinor', type: 'number' },
    {
      name: 'appliesTo',
      type: 'group',
      fields: [
        {
          name: 'mode',
          type: 'select',
          defaultValue: 'all',
          options: ['all', 'categories', 'products'],
        },
        { name: 'categories', type: 'text', hasMany: true },
        { name: 'products', type: 'text', hasMany: true },
      ],
    },
    { name: 'startsAt', type: 'date' },
    { name: 'endsAt', type: 'date' },
    { name: 'usageLimit', type: 'number' },
    { name: 'perCustomerLimit', type: 'number', defaultValue: 1 },
    { name: 'usedCount', type: 'number', defaultValue: 0 },
    { name: 'firstOrderOnly', type: 'checkbox', defaultValue: false },
    {
      name: 'paymentMethods',
      type: 'select',
      hasMany: true,
      options: [
        { value: 'razorpay', label: 'Paid online' },
        { value: 'cod', label: 'Cash on delivery' },
      ],
    },
    {
      name: 'visibility',
      type: 'select',
      defaultValue: 'private',
      options: [
        { value: 'public', label: 'Public' },
        { value: 'private', label: 'Private' },
      ],
    },
    // Plain ids: a coupon is read inside the order's transaction (docs/06 "Transactions")
    { name: 'scheme', type: 'text' },
    { name: 'affiliate', type: 'text' },
    {
      name: 'batch',
      type: 'group',
      fields: [
        { name: 'id', type: 'text' },
        { name: 'prefix', type: 'text' },
        { name: 'count', type: 'number' },
      ],
    },
    { name: 'status', type: 'select', defaultValue: 'active', options: [...COUPON_STATUSES] },
    { name: 'lastEditedBy', type: 'text' },
  ],
}
