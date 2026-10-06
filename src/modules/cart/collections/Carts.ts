import type { CollectionConfig } from 'payload'

import { nobody, STORE_ADMIN, tenantRoleOrPlatform } from '@/access'
import { shopperAddressGroup } from '@/fields/shopperAddress'

/**
 * A shopper's cart (docs/06 `carts`). Holds what was picked and the checkout details typed so far;
 * prices are never stored here as truth, they are worked out again on every read and at checkout.
 * Found by the hash of the random token in the shopper's cart cookie.
 */
export const Carts: CollectionConfig = {
  slug: 'carts',
  admin: { hidden: true },
  access: {
    // Abandoned carts (stage C) are read by owners and managers; the storefront uses the server
    read: tenantRoleOrPlatform({ roles: STORE_ADMIN, supportCanAccess: true }),
    create: nobody,
    update: nobody,
    delete: nobody,
  },
  indexes: [
    { fields: ['tenant', 'tokenHash'], unique: true },
    { fields: ['tenant', 'status', 'lastActivityAt'] },
  ],
  fields: [
    { name: 'tokenHash', type: 'text', required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'active',
      options: ['active', 'converted', 'abandoned'],
    },
    {
      name: 'items',
      type: 'array',
      fields: [
        { name: 'product', type: 'relationship', relationTo: 'products', required: true },
        { name: 'variant', type: 'relationship', relationTo: 'variants' },
        { name: 'qty', type: 'number', required: true, min: 1 },
        { name: 'addedAt', type: 'date' },
      ],
    },
    {
      name: 'contact',
      type: 'group',
      fields: [
        { name: 'name', type: 'text' },
        { name: 'email', type: 'email' },
        { name: 'phone', type: 'text' },
      ],
    },
    { name: 'pincode', type: 'text' },
    shopperAddressGroup('shippingAddress'),
    { name: 'couponCode', type: 'text' },
    { name: 'lastActivityAt', type: 'date', index: true },
    { name: 'convertedOrder', type: 'relationship', relationTo: 'orders' },
    {
      name: 'expiresAt',
      type: 'date',
      admin: { description: 'Removed 30 days after the last change' },
    },
  ],
}
