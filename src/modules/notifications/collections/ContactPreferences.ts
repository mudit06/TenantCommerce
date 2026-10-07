import type { CollectionConfig } from 'payload'

import { CUSTOMER_READ, nobody, tenantRoleOrPlatform } from '@/access'

const consent = (name: string, sources: string[]) => ({
  name,
  type: 'group' as const,
  fields: [
    { name: 'optedIn', type: 'checkbox' as const, defaultValue: false },
    { name: 'at', type: 'date' as const },
    { name: 'source', type: 'select' as const, options: sources },
    { name: 'wordingVersion', type: 'text' as const },
    { name: 'optedOutAt', type: 'date' as const },
  ],
})

/**
 * What one phone number or email agreed to in this store (docs/06 `contact-preferences`): kept
 * by contact point, so it works for guests and STOP holds for every later order. Written by the
 * notifications module only (checkout, STOP and START replies, the tracking page).
 */
export const ContactPreferences: CollectionConfig = {
  slug: 'contact-preferences',
  labels: { singular: 'Contact preference', plural: 'Contact preferences' },
  admin: { hidden: true },
  access: {
    read: tenantRoleOrPlatform({ roles: CUSTOMER_READ, supportCanAccess: true }),
    create: nobody,
    update: nobody,
    delete: nobody,
  },
  indexes: [{ fields: ['tenant', 'type', 'value'], unique: true }],
  fields: [
    { name: 'type', type: 'select', required: true, options: ['phone', 'email'] },
    { name: 'value', type: 'text', required: true },
    consent('whatsapp', ['checkout', 'account', 'reply', 'tracking-page']),
    {
      name: 'sms',
      type: 'group',
      fields: [{ name: 'optedOutAt', type: 'date' }],
    },
    {
      name: 'offers',
      type: 'group',
      fields: [
        consent('whatsapp', ['checkout', 'signup', 'account', 'affiliate']),
        consent('email', ['checkout', 'signup', 'account', 'affiliate']),
      ],
    },
    {
      name: 'suppressed',
      type: 'group',
      fields: [
        { name: 'reason', type: 'select', options: ['bounce', 'complaint'] },
        { name: 'at', type: 'date' },
      ],
    },
    /** One automatic answer per 24 hours to a WhatsApp reply (docs/18 "Shopper replies") */
    { name: 'lastAutoReplyAt', type: 'date' },
  ],
}
