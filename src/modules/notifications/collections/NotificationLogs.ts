import type { CollectionConfig } from 'payload'

import { nobody, ORDER_READ, tenantRoleOrPlatform } from '@/access'

import { CHANNELS, LOG_STATUSES, SKIP_REASONS } from '../milestones'

/**
 * Every shopper message, sent or not, and every WhatsApp reply (docs/06 `notification-logs`).
 * Written by the notifications module only; the order's Messages panel and the Order updates
 * screen read it. `dedupeKey` makes a repeated status, a double click or a retried webhook send
 * nothing new. Kept 90 days (the clean-up job).
 */
export const NotificationLogs: CollectionConfig = {
  slug: 'notification-logs',
  labels: { singular: 'Message', plural: 'Messages' },
  admin: { hidden: true },
  access: {
    read: tenantRoleOrPlatform({ roles: ORDER_READ, supportCanAccess: true }),
    create: nobody,
    update: nobody,
    delete: nobody,
  },
  indexes: [
    { fields: ['tenant', 'dedupeKey'], unique: true },
    { fields: ['tenant', 'order', 'createdAt'] },
    { fields: ['tenant', 'providerMessageId'] },
    { fields: ['tenant', 'to', 'createdAt'] },
  ],
  fields: [
    { name: 'direction', type: 'select', defaultValue: 'out', options: ['out', 'in'] },
    {
      name: 'kind',
      type: 'select',
      defaultValue: 'order',
      options: ['order', 'offer', 'test', 'staff', 'reply', 'review', 'cart'],
    },
    { name: 'milestone', type: 'text' },
    { name: 'variant', type: 'text' },
    { name: 'channel', type: 'select', required: true, options: [...CHANNELS] },
    { name: 'provider', type: 'select', options: ['resend', 'meta', 'dev-log'] },
    { name: 'to', type: 'text' },
    { name: 'order', type: 'relationship', relationTo: 'orders', index: true },
    { name: 'shipment', type: 'text' },
    { name: 'refund', type: 'text' },
    // Ids as text: only `order` is a relationship, because Payload checks every relationship of a
    // new row at once, and parallel queries inside one MongoDB transaction can abort it
    { name: 'template', type: 'text' },
    { name: 'dedupeKey', type: 'text', required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'queued',
      options: LOG_STATUSES.map(({ value, label }) => ({ value, label })),
    },
    {
      name: 'skipReason',
      type: 'select',
      options: SKIP_REASONS.map(({ value, label }) => ({ value, label })),
    },
    { name: 'providerMessageId', type: 'text' },
    { name: 'fallbackOf', type: 'text' },
    { name: 'resendOf', type: 'text' },
    {
      name: 'error',
      type: 'group',
      fields: [
        { name: 'code', type: 'text' },
        { name: 'message', type: 'text' },
      ],
    },
    { name: 'attempts', type: 'number', defaultValue: 0 },
    { name: 'sendAfter', type: 'date' },
    { name: 'sentAt', type: 'date' },
    { name: 'deliveredAt', type: 'date' },
    { name: 'readAt', type: 'date' },
    { name: 'failedAt', type: 'date' },
    /** What went out, as the shopper saw it (subject or WhatsApp text), for the Messages panel */
    { name: 'preview', type: 'textarea' },
    /** Inbound replies: the first 500 characters */
    { name: 'text', type: 'textarea' },
    { name: 'sentBy', type: 'text' },
  ],
}
