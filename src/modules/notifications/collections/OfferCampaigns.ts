import type { CollectionConfig } from 'payload'

import { nobody } from '@/access'
import { featureGatedAccess, hiddenWithoutFeature } from '@/modules/tenancy'

export const CAMPAIGN_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'sending', label: 'Sending' },
  { value: 'sent', label: 'Sent' },
  { value: 'cancelled', label: 'Cancelled' },
] as const

/**
 * An offer message to shoppers who asked for offers (docs/06 `offer-campaigns`, docs/screens
 * Offer messages). Written through the Offer messages screen's endpoints only; the send job
 * writes one notification log per shopper and channel.
 */
export const OfferCampaigns: CollectionConfig = {
  slug: 'offer-campaigns',
  labels: { singular: 'Offer message', plural: 'Offer messages' },
  admin: {
    group: 'Marketing',
    useAsTitle: 'title',
    hidden: hiddenWithoutFeature('offer-messages'),
    components: {
      views: {
        list: { Component: '@/modules/notifications/admin/OfferMessagesView#OfferMessagesView' },
      },
    },
  },
  defaultSort: '-sendAt',
  access: {
    read: featureGatedAccess({
      feature: 'offer-messages',
      roles: ['owner', 'manager', 'content-editor'],
      supportCanAccess: true,
    }),
    create: nobody,
    update: nobody,
    delete: nobody,
  },
  indexes: [{ fields: ['tenant', 'status', 'sendAt'] }, { fields: ['tenant', 'scheme'] }],
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'scheme', type: 'text' },
    { name: 'schemeName', type: 'text' },
    { name: 'subject', type: 'text', required: true },
    /** "our Diwali offer is on: 10% off all faucets and showers, up to ₹1,500" */
    { name: 'headline', type: 'text', required: true },
    /** "Ends Mon, 9 Nov." */
    { name: 'detail', type: 'text' },
    { name: 'buttonLabel', type: 'text', defaultValue: 'Shop the offer' },
    /** The page on the store the button opens, after the domain: "offers/diwali-2026" */
    { name: 'linkPath', type: 'text', defaultValue: 'offers' },
    {
      name: 'audience',
      type: 'select',
      defaultValue: 'all',
      options: [
        { value: 'all', label: 'Everyone who agreed to offers' },
        { value: 'wishlist', label: 'Shoppers with these products in their wishlist' },
        { value: 'lapsed', label: 'No order in the last 90 days' },
      ],
    },
    {
      name: 'channels',
      type: 'select',
      hasMany: true,
      defaultValue: ['email'],
      options: [
        { value: 'email', label: 'Email' },
        { value: 'whatsapp', label: 'WhatsApp' },
      ],
    },
    { name: 'sendAt', type: 'date', required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [...CAMPAIGN_STATUSES],
    },
    {
      name: 'stats',
      type: 'group',
      fields: [
        { name: 'email', type: 'number', defaultValue: 0 },
        { name: 'whatsapp', type: 'number', defaultValue: 0 },
        { name: 'skipped', type: 'number', defaultValue: 0 },
      ],
    },
    { name: 'sentAt', type: 'date' },
    { name: 'createdBy', type: 'text' },
  ],
}
