import type { CollectionConfig } from 'payload'

import { nobody } from '@/access'
import { featureGatedAccess, hiddenWithoutFeature } from '@/modules/tenancy'

import { REJECTION_REASONS, REVIEW_STATUSES } from '../constants'

const REVIEW_ROLES = ['owner', 'manager', 'content-editor', 'support'] as const

/**
 * A buyer's review of one delivered order item (docs/06 `reviews`). Written by the storefront
 * service only and never edited by staff: they approve, reject with a reason, or reply.
 * Plain ids for product, order and customer: written inside a transaction (docs/06).
 */
export const Reviews: CollectionConfig = {
  slug: 'reviews',
  labels: { singular: 'Review', plural: 'Reviews' },
  admin: {
    group: 'Marketing',
    useAsTitle: 'title',
    hidden: hiddenWithoutFeature('reviews'),
    components: {
      views: { list: { Component: '@/modules/reviews/admin/ReviewsView#ReviewsView' } },
    },
  },
  defaultSort: '-createdAt',
  access: {
    read: featureGatedAccess({ feature: 'reviews', roles: REVIEW_ROLES, supportCanAccess: true }),
    create: nobody,
    update: nobody,
    delete: nobody,
  },
  indexes: [
    { fields: ['tenant', 'orderItem'], unique: true },
    { fields: ['tenant', 'product', 'status', 'createdAt'] },
    { fields: ['tenant', 'status', 'createdAt'] },
  ],
  fields: [
    { name: 'product', type: 'text', required: true },
    { name: 'productTitle', type: 'text' },
    { name: 'variant', type: 'text' },
    { name: 'variantLabel', type: 'text' },
    { name: 'order', type: 'text', required: true },
    { name: 'orderNumber', type: 'text' },
    { name: 'orderItem', type: 'text', required: true },
    { name: 'customer', type: 'text' },
    { name: 'displayName', type: 'text', required: true },
    { name: 'city', type: 'text' },
    { name: 'rating', type: 'number', required: true, min: 1, max: 5 },
    { name: 'title', type: 'text' },
    { name: 'body', type: 'textarea' },
    { name: 'photos', type: 'relationship', relationTo: 'media', hasMany: true, maxRows: 4 },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [...REVIEW_STATUSES],
    },
    { name: 'rejectionReason', type: 'select', options: [...REJECTION_REASONS] },
    {
      name: 'reply',
      type: 'group',
      fields: [
        { name: 'text', type: 'textarea' },
        { name: 'by', type: 'text' },
        { name: 'at', type: 'date' },
      ],
    },
    { name: 'source', type: 'select', options: ['account', 'review-email'] },
    { name: 'handledBy', type: 'text' },
    { name: 'publishedAt', type: 'date' },
  ],
}
