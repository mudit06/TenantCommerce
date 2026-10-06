import type { CollectionConfig, Field } from 'payload'

import { nobody, ORDER_READ, tenantRoleOrPlatform } from '@/access'
import { shopperAddressGroup } from '@/fields/shopperAddress'

import {
  FULFILLMENT_STATUSES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from '../constants'

const readOnly = { readOnly: true }
const paise = (name: string, label?: string): Field => ({
  name,
  label,
  type: 'number',
  defaultValue: 0,
  admin: readOnly,
})

/**
 * One order (docs/06 `orders`, docs/11). Everything a shopper bought is a snapshot taken at
 * checkout: titles, prices, GST and discounts are never re-read from the catalogue, so an invoice
 * reprints the same forever. Created only by checkout and changed only by the order services
 * (`transition.ts`), which write the timeline; nobody edits an order through the API.
 */
export const Orders: CollectionConfig = {
  slug: 'orders',
  labels: { singular: 'Order', plural: 'Orders' },
  admin: {
    group: 'Sales',
    useAsTitle: 'orderNumber',
    defaultColumns: [
      'orderNumber',
      'placedAt',
      'contact',
      'totals',
      'paymentStatus',
      'fulfillmentStatus',
    ],
    listSearchableFields: ['orderNumber', 'contact.email', 'contact.phone', 'contact.name'],
  },
  defaultSort: '-placedAt',
  access: {
    read: tenantRoleOrPlatform({ roles: ORDER_READ, supportCanAccess: true }),
    create: nobody,
    update: nobody,
    delete: nobody,
  },
  indexes: [
    { fields: ['tenant', 'orderNumber'], unique: true },
    { fields: ['tenant', 'trackingCode'], unique: true },
    { fields: ['tenant', 'status', 'placedAt'] },
    { fields: ['tenant', 'fulfillmentStatus', 'placedAt'] },
    { fields: ['tenant', 'contact.email'] },
    { fields: ['tenant', 'contact.phone'] },
    { fields: ['status', 'expiresAt'] },
  ],
  fields: [
    {
      type: 'row',
      fields: [
        { name: 'orderNumber', type: 'text', required: true, admin: readOnly },
        {
          name: 'status',
          type: 'select',
          required: true,
          defaultValue: 'pending',
          options: [...ORDER_STATUSES],
          admin: readOnly,
        },
        {
          name: 'paymentStatus',
          label: 'Payment',
          type: 'select',
          required: true,
          defaultValue: 'pending',
          options: [...PAYMENT_STATUSES],
          admin: readOnly,
        },
        {
          name: 'fulfillmentStatus',
          label: 'Delivery',
          type: 'select',
          required: true,
          defaultValue: 'unfulfilled',
          options: [...FULFILLMENT_STATUSES],
          admin: readOnly,
        },
      ],
    },
    {
      name: 'contact',
      type: 'group',
      admin: readOnly,
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'name', type: 'text' },
            { name: 'email', type: 'email' },
            { name: 'phone', type: 'text' },
          ],
        },
      ],
    },
    {
      name: 'items',
      type: 'array',
      admin: readOnly,
      fields: [
        {
          // Plain ids, not relationships: the line is a snapshot and must outlive the product
          type: 'row',
          fields: [
            { name: 'productId', type: 'text' },
            { name: 'variantId', type: 'text' },
            { name: 'sku', type: 'text' },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'title', type: 'text', required: true },
            { name: 'options', label: 'Finish and size', type: 'text' },
            { name: 'imageUrl', type: 'text' },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'qty', type: 'number', required: true },
            paise('unitMinor', 'Unit price incl. GST (paise)'),
            paise('mrpMinor', 'MRP (paise)'),
            paise('discountMinor', 'Discount (paise)'),
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'hsnCode', label: 'HSN', type: 'text' },
            { name: 'gstRate', label: 'GST %', type: 'number' },
            paise('taxableMinor', 'Taxable (paise)'),
            paise('cgstMinor', 'CGST'),
            paise('sgstMinor', 'SGST'),
            paise('igstMinor', 'IGST'),
            paise('lineTotalMinor', 'Line total incl. GST'),
          ],
        },
        { name: 'weightGrams', type: 'number' },
      ],
    },
    {
      // Delivery charge and COD fee split across the lines at their rates (docs/11), as priced
      name: 'charges',
      type: 'json',
      admin: readOnly,
    },
    {
      name: 'totals',
      type: 'group',
      admin: readOnly,
      fields: [
        {
          type: 'row',
          fields: [
            paise('itemsMinor', 'Items'),
            paise('discountMinor', 'Discounts'),
            paise('subtotalMinor', 'Subtotal'),
            paise('shippingMinor', 'Delivery'),
            paise('codFeeMinor', 'COD fee'),
          ],
        },
        {
          type: 'row',
          fields: [
            paise('taxableMinor', 'Taxable value'),
            paise('cgstMinor', 'CGST'),
            paise('sgstMinor', 'SGST'),
            paise('igstMinor', 'IGST'),
            paise('taxMinor', 'GST'),
            paise('roundOffMinor', 'Round off'),
          ],
        },
        {
          type: 'row',
          fields: [
            paise('grandTotalMinor', 'Order total'),
            paise('paidMinor', 'Paid'),
            paise('refundedMinor', 'Refunded'),
          ],
        },
      ],
    },
    shopperAddressGroup('shippingAddress', 'Delivery address'),
    {
      type: 'row',
      fields: [
        {
          name: 'billingSameAsShipping',
          type: 'checkbox',
          defaultValue: true,
          admin: readOnly,
        },
        { name: 'buyerGstin', label: 'Buyer GSTIN', type: 'text', admin: readOnly },
        { name: 'buyerLegalName', label: 'Business name', type: 'text', admin: readOnly },
      ],
    },
    {
      ...shopperAddressGroup('billingAddress', 'Billing address'),
      admin: { condition: (data) => !data?.billingSameAsShipping, readOnly: true },
    },
    {
      type: 'row',
      fields: [
        { name: 'sellerStateCode', type: 'text', admin: readOnly },
        { name: 'placeOfSupplyStateCode', label: 'Place of supply', type: 'text', admin: readOnly },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'paymentMethod',
          type: 'select',
          required: true,
          options: [...PAYMENT_METHODS],
          admin: readOnly,
        },
        {
          name: 'paymentMode',
          type: 'select',
          options: ['test', 'live'],
          admin: { ...readOnly, description: 'Razorpay test orders charge nobody' },
        },
      ],
    },
    {
      name: 'shippingMethod',
      type: 'group',
      admin: readOnly,
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'source',
              type: 'select',
              options: [
                { value: 'shiprocket', label: 'Shiprocket live rate' },
                { value: 'rate-card', label: 'Store rate card' },
              ],
            },
            { name: 'zoneName', type: 'text' },
            { name: 'courierName', type: 'text' },
            { name: 'etaMinDays', type: 'number' },
            { name: 'etaMaxDays', type: 'number' },
          ],
        },
      ],
    },
    {
      name: 'appliedOffers',
      type: 'array',
      admin: readOnly,
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'kind', type: 'select', options: ['scheme', 'coupon'] },
            { name: 'ref', type: 'text' },
            { name: 'code', type: 'text' },
            { name: 'name', type: 'text' },
            paise('discountMinor', 'Discount'),
          ],
        },
      ],
    },
    { name: 'couponCode', type: 'text', admin: readOnly },
    { name: 'invoice', type: 'relationship', relationTo: 'invoices', admin: readOnly },
    {
      name: 'trackingCode',
      type: 'text',
      required: true,
      admin: { ...readOnly, description: 'The /t/<code> link in messages to the shopper' },
    },
    {
      name: 'whatsappOptIn',
      label: 'Agreed to order updates on WhatsApp',
      type: 'checkbox',
      defaultValue: false,
      admin: readOnly,
    },
    { name: 'notes', label: 'Note from the shopper', type: 'textarea', admin: readOnly },
    {
      type: 'row',
      fields: [
        {
          name: 'source',
          type: 'select',
          defaultValue: 'web',
          options: ['web', 'pwa', 'admin'],
          admin: readOnly,
        },
        { name: 'locale', type: 'text', defaultValue: 'en', admin: readOnly },
        { name: 'cartId', type: 'text', admin: { hidden: true } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'placedAt', type: 'date', admin: readOnly },
        { name: 'confirmedAt', type: 'date', admin: readOnly },
        { name: 'paidAt', type: 'date', admin: readOnly },
        { name: 'completedAt', type: 'date', admin: readOnly },
        { name: 'cancelledAt', type: 'date', admin: readOnly },
      ],
    },
    {
      name: 'expiresAt',
      type: 'date',
      admin: { ...readOnly, description: 'An unpaid online order is cancelled after this' },
    },
    { name: 'cancelReason', type: 'text', admin: readOnly },
    {
      // Where the order's stock stands (docs/11 "Stock"): held while waiting for payment, sold
      // once confirmed, given back when cancelled. Moved only by the inventory service.
      name: 'stockState',
      type: 'select',
      defaultValue: 'none',
      options: ['none', 'reserved', 'sold', 'released', 'restocked'],
      admin: { hidden: true },
    },
    { name: 'ip', type: 'text', admin: { hidden: true } },
    { name: 'userAgent', type: 'text', admin: { hidden: true } },
  ],
}
