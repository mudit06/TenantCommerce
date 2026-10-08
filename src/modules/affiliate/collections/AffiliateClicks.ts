import type { CollectionConfig } from 'payload'

import { nobody } from '@/access'

/** Daily click counters per affiliate (docs/06 `affiliate-clicks`), not one row per click. */
export const AffiliateClicks: CollectionConfig = {
  slug: 'affiliate-clicks',
  admin: { hidden: true },
  access: { read: nobody, create: nobody, update: nobody, delete: nobody },
  indexes: [{ fields: ['tenant', 'affiliate', 'date'], unique: true }],
  fields: [
    { name: 'affiliate', type: 'text', required: true },
    /** YYYY-MM-DD, India time */
    { name: 'date', type: 'text', required: true },
    { name: 'clicks', type: 'number', defaultValue: 0 },
  ],
}
