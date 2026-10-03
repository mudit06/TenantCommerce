import type { CollectionConfig } from 'payload'

import { nobody, superAdminOnly } from '@/access'

/**
 * Gapless per-store numbers: enquiries now; orders, invoices and credit notes later (docs/06).
 * Changed only through `nextNumber` (atomic $inc), never by hand.
 */
export const Counters: CollectionConfig = {
  slug: 'counters',
  admin: { hidden: true, useAsTitle: 'key' },
  access: {
    read: superAdminOnly,
    create: nobody,
    update: nobody,
    delete: nobody,
  },
  indexes: [{ fields: ['tenant', 'key'], unique: true }],
  fields: [
    { name: 'key', type: 'text', required: true },
    { name: 'value', type: 'number', required: true, defaultValue: 0 },
  ],
}
