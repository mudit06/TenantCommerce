import type { CollectionConfig } from 'payload'

import { nobody } from '@/access'

/**
 * Signed-in shopper sessions (docs/06 `customer-sessions`, ADR 0003). Only the token's SHA-256
 * is kept; the token lives in an HTTP-only cookie on the store's own domain.
 */
export const CustomerSessions: CollectionConfig = {
  slug: 'customer-sessions',
  admin: { hidden: true },
  access: { read: nobody, create: nobody, update: nobody, delete: nobody },
  indexes: [{ fields: ['tenant', 'customer'] }],
  fields: [
    { name: 'customer', type: 'text', required: true },
    { name: 'tokenHash', type: 'text', required: true, unique: true },
    { name: 'userAgent', type: 'text' },
    { name: 'ip', type: 'text' },
    { name: 'expiresAt', type: 'date', required: true, index: true },
    { name: 'lastSeenAt', type: 'date' },
    { name: 'revokedAt', type: 'date' },
  ],
}
