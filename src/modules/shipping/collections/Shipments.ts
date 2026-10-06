import type { CollectionConfig } from 'payload'

import { nobody, ORDER_READ, tenantRoleOrPlatform } from '@/access'

import { FAILURE_REASONS, SHIPMENT_STATUSES } from '../constants'

/**
 * One parcel (docs/06 `shipments`, docs/11 "Parcel journey"). Moved only through the shipping
 * transition service, which ignores repeats and backward moves (late webhooks), appends the
 * parcel's events and the order's timeline, and rolls the order's delivery status up.
 */
export const Shipments: CollectionConfig = {
  slug: 'shipments',
  labels: { singular: 'Parcel', plural: 'Parcels' },
  admin: { hidden: true },
  access: {
    read: tenantRoleOrPlatform({ roles: ORDER_READ, supportCanAccess: true }),
    create: nobody,
    update: nobody,
    delete: nobody,
  },
  indexes: [
    { fields: ['tenant', 'order'] },
    { fields: ['tenant', 'status', 'updatedAt'] },
    { fields: ['tenant', 'awb'] },
  ],
  fields: [
    { name: 'order', type: 'relationship', relationTo: 'orders', required: true },
    {
      name: 'direction',
      type: 'select',
      required: true,
      defaultValue: 'forward',
      options: ['forward', 'return'],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'packed',
      options: [...SHIPMENT_STATUSES],
    },
    {
      name: 'items',
      type: 'array',
      fields: [
        { name: 'orderItemId', type: 'text', required: true },
        { name: 'title', type: 'text' },
        { name: 'sku', type: 'text' },
        { name: 'qty', type: 'number', required: true },
      ],
    },
    {
      name: 'package',
      type: 'group',
      fields: [
        { name: 'lengthMm', type: 'number' },
        { name: 'breadthMm', type: 'number' },
        { name: 'heightMm', type: 'number' },
        { name: 'weightGrams', type: 'number' },
      ],
    },
    { name: 'provider', type: 'select', defaultValue: 'manual', options: ['manual', 'shiprocket'] },
    { name: 'carrier', label: 'Courier', type: 'text' },
    { name: 'courierId', type: 'text' },
    { name: 'trackingNumber', type: 'text' },
    { name: 'trackingUrl', type: 'text' },
    { name: 'awb', type: 'text' },
    { name: 'providerOrderId', type: 'text' },
    { name: 'providerShipmentId', type: 'text' },
    { name: 'labelUrl', type: 'text' },
    { name: 'pickupScheduledFor', type: 'date' },
    { name: 'expectedDeliveryDate', type: 'date' },
    { name: 'codAmountMinor', type: 'number', defaultValue: 0 },
    { name: 'ewayBillNo', label: 'E-way bill number', type: 'text' },
    { name: 'attempts', type: 'number', defaultValue: 0 },
    { name: 'failureReason', type: 'select', options: [...FAILURE_REASONS] },
    {
      name: 'ndrAction',
      type: 'group',
      fields: [
        { name: 'action', type: 'select', options: ['re-attempt', 'return'] },
        { name: 'deferredDate', type: 'date' },
        { name: 'note', type: 'text' },
        { name: 'by', type: 'relationship', relationTo: 'users' },
        { name: 'at', type: 'date' },
      ],
    },
    {
      name: 'events',
      type: 'array',
      fields: [
        { name: 'status', type: 'text', required: true },
        { name: 'at', type: 'date', required: true },
        { name: 'source', type: 'select', options: ['staff', 'shiprocket', 'import', 'system'] },
        { name: 'by', type: 'relationship', relationTo: 'users' },
        { name: 'note', type: 'text' },
        { name: 'location', type: 'text' },
        {
          name: 'dedupeKey',
          type: 'text',
          admin: { description: 'Shiprocket: AWB + status + scan time' },
        },
      ],
    },
    { name: 'packedAt', type: 'date' },
    { name: 'shippedAt', type: 'date' },
    { name: 'outForDeliveryAt', type: 'date' },
    { name: 'deliveredAt', type: 'date' },
  ],
}
