import type { CollectionConfig } from 'payload'

import { CUSTOMER_READ, nobody, tenantRoleOrPlatform } from '@/access'

/**
 * One use of a coupon (docs/06 `coupon-redemptions`): held when the order is placed, used when
 * it is confirmed, released if it is cancelled. Per-shopper limits count held and used rows by
 * phone and email.
 */
export const CouponRedemptions: CollectionConfig = {
  slug: 'coupon-redemptions',
  admin: { hidden: true },
  access: {
    read: tenantRoleOrPlatform({ roles: CUSTOMER_READ, supportCanAccess: true }),
    create: nobody,
    update: nobody,
    delete: nobody,
  },
  indexes: [
    { fields: ['tenant', 'coupon', 'status'] },
    { fields: ['tenant', 'order'], unique: true },
    { fields: ['tenant', 'contact.email'] },
    { fields: ['tenant', 'contact.phone'] },
  ],
  fields: [
    { name: 'coupon', type: 'text', required: true },
    { name: 'code', type: 'text' },
    { name: 'order', type: 'text', required: true },
    { name: 'customer', type: 'text' },
    {
      name: 'contact',
      type: 'group',
      fields: [
        { name: 'email', type: 'text' },
        { name: 'phone', type: 'text' },
      ],
    },
    { name: 'discountMinor', type: 'number', defaultValue: 0 },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'held',
      options: ['held', 'used', 'released'],
    },
  ],
}
