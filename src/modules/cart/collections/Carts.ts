import type { CollectionConfig } from 'payload'

import { nobody, STORE_ADMIN, tenantRoleOrPlatform } from '@/access'
import { shopperAddressGroup } from '@/fields/shopperAddress'
import { hiddenWithoutFeature } from '@/modules/tenancy'

/**
 * A shopper's cart (docs/06 `carts`). Holds what was picked and the checkout details typed so far;
 * prices are never stored here as truth, they are worked out again on every read and at checkout.
 * Found by the hash of the random token in the shopper's cart cookie.
 */
export const Carts: CollectionConfig = {
  slug: 'carts',
  labels: { singular: 'Abandoned cart', plural: 'Abandoned carts' },
  admin: {
    group: 'Marketing',
    hidden: hiddenWithoutFeature('abandoned-cart'),
    components: {
      views: {
        // docs/screens Abandoned carts: our own screen; carts are never edited by hand
        list: { Component: '@/modules/cart/admin/AbandonedCartsView#AbandonedCartsView' },
      },
    },
  },
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
    { fields: ['tenant', 'abandonedAt'] },
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
    // The signed-in shopper's account (a plain id, docs/06 "Transactions")
    { name: 'customer', type: 'text' },
    { name: 'pincode', type: 'text' },
    shopperAddressGroup('shippingAddress'),
    { name: 'couponCode', type: 'text' },
    { name: 'lastActivityAt', type: 'date', index: true },
    // Abandoned cart reminders (docs/18, docs/screens Abandoned carts)
    { name: 'abandonedAt', type: 'date' },
    /** What was in it and its value incl. GST when it was left, for the Abandoned carts screen */
    { name: 'leftSummary', type: 'text' },
    { name: 'leftValueMinor', type: 'number' },
    {
      name: 'reminders',
      type: 'array',
      fields: [
        { name: 'step', type: 'number' },
        { name: 'channel', type: 'select', options: ['email', 'whatsapp'] },
        { name: 'to', type: 'text' },
        { name: 'at', type: 'date' },
      ],
    },
    /** Why no reminder went (no consent, the weekly series), for the Abandoned carts screen */
    { name: 'reminderNote', type: 'text' },
    { name: 'convertedOrder', type: 'relationship', relationTo: 'orders' },
    {
      name: 'expiresAt',
      type: 'date',
      admin: { description: 'Removed 30 days after the last change' },
    },
  ],
}
