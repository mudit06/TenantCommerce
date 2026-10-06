import type { CollectionConfig } from 'payload'

import { nobody } from '@/access'

/**
 * Checkout's Idempotency-Key (docs/11 "Idempotency"): a repeated request with the same key gets
 * the same answer; the same key with a different body is refused. Kept 24 hours.
 */
export const IdempotencyKeys: CollectionConfig = {
  slug: 'idempotency-keys',
  admin: { hidden: true },
  access: { read: nobody, create: nobody, update: nobody, delete: nobody },
  indexes: [{ fields: ['tenant', 'key'], unique: true }],
  fields: [
    { name: 'key', type: 'text', required: true },
    { name: 'route', type: 'text', required: true },
    { name: 'requestHash', type: 'text', required: true },
    { name: 'responseStatus', type: 'number' },
    { name: 'responseBody', type: 'json' },
    { name: 'expiresAt', type: 'date', required: true, index: true },
  ],
}
