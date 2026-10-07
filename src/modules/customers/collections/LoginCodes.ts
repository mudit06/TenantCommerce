import type { CollectionConfig } from 'payload'

import { nobody } from '@/access'

/**
 * One-time sign-in codes sent by email (docs/05 "Email OTP"): kept as an HMAC, 10 minutes,
 * 5 tries. A daily job deletes old ones.
 */
export const LoginCodes: CollectionConfig = {
  slug: 'login-codes',
  admin: { hidden: true },
  access: { read: nobody, create: nobody, update: nobody, delete: nobody },
  indexes: [{ fields: ['tenant', 'email', 'createdAt'] }],
  fields: [
    { name: 'email', type: 'text', required: true },
    { name: 'codeHash', type: 'text', required: true },
    { name: 'expiresAt', type: 'date', required: true, index: true },
    { name: 'attempts', type: 'number', defaultValue: 0 },
    { name: 'usedAt', type: 'date' },
    { name: 'ip', type: 'text' },
  ],
}
