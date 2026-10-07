import type { CollectionConfig } from 'payload'

import { nobody } from '@/access'

/**
 * A signed-in shopper's saved products (docs/06 `wishlists`). Guests keep the list on their
 * device; it joins this one when they sign in. Only the storefront service writes it.
 */
export const Wishlists: CollectionConfig = {
  slug: 'wishlists',
  admin: { hidden: true },
  access: { read: nobody, create: nobody, update: nobody, delete: nobody },
  indexes: [{ fields: ['tenant', 'customer'], unique: true }],
  fields: [
    { name: 'customer', type: 'text', required: true },
    {
      name: 'items',
      type: 'array',
      fields: [
        { name: 'product', type: 'text', required: true },
        { name: 'variant', type: 'text' },
        { name: 'addedAt', type: 'date' },
      ],
    },
  ],
}
