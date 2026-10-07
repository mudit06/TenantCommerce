import type { CollectionConfig } from 'payload'

import {
  fieldPlatformStaffOnly,
  nobody,
  ORDER_READ,
  STORE_ADMIN,
  tenantRoleOrPlatform,
} from '@/access'

import { MILESTONE_KEYS } from '../milestones'

const time = (value: unknown) =>
  typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
    ? true
    : 'Use 24-hour time, for example 21:00'

/**
 * Order updates, one per store (docs/06 `notification-settings`, docs/screens Order updates):
 * the channels for each step, the packed delay, quiet hours and who hears when a channel breaks.
 * Created with the defaults (docs/18) the first time it is read.
 */
export const NotificationSettings: CollectionConfig = {
  slug: 'notification-settings',
  labels: { singular: 'Order update settings', plural: 'Order update settings' },
  // Changed on the Order updates screen (/admin/order-updates), not Payload's form
  admin: { hidden: true },
  access: {
    read: tenantRoleOrPlatform({ roles: ORDER_READ, supportCanAccess: true }),
    create: tenantRoleOrPlatform({ roles: STORE_ADMIN }),
    update: tenantRoleOrPlatform({ roles: STORE_ADMIN }),
    delete: nobody,
  },
  fields: [
    {
      name: 'milestones',
      type: 'array',
      fields: [
        { name: 'key', type: 'select', required: true, options: MILESTONE_KEYS },
        { name: 'email', type: 'select', defaultValue: 'off', options: ['on', 'off'] },
        { name: 'whatsapp', type: 'select', defaultValue: 'off', options: ['on', 'off'] },
        { name: 'sms', type: 'select', defaultValue: 'off', options: ['on', 'fallback', 'off'] },
      ],
    },
    { name: 'packedDelayMinutes', type: 'number', defaultValue: 15, min: 0, max: 240 },
    {
      name: 'quietHours',
      type: 'group',
      fields: [
        { name: 'enabled', type: 'checkbox', defaultValue: true },
        { name: 'start', type: 'text', defaultValue: '21:00', validate: time },
        { name: 'end', type: 'text', defaultValue: '09:00', validate: time },
      ],
    },
    {
      name: 'whatsappOptInDefault',
      label: 'Tick the WhatsApp box at checkout by default',
      type: 'checkbox',
      defaultValue: true,
    },
    {
      name: 'staffAlertEmails',
      label: 'Email me when a channel breaks',
      type: 'text',
      hasMany: true,
    },
    {
      name: 'limits',
      type: 'group',
      // Platform limits: only our team changes them (docs/14 "SMS pumping")
      access: { update: fieldPlatformStaffOnly },
      fields: [
        { name: 'perRecipientPerDay', type: 'number', defaultValue: 10, min: 1, max: 50 },
        { name: 'smsPerDay', type: 'number', defaultValue: 2000, min: 0 },
      ],
    },
  ],
}
