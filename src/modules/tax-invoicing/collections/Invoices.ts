import type { CollectionConfig } from 'payload'

import { nobody, ORDER_READ, tenantRoleOrPlatform } from '@/access'

/**
 * GST tax invoices and credit notes (docs/06 `invoices`, docs/11 "GST invoice"). A snapshot of
 * seller, buyer, lines and totals at the time of issue; the PDF is drawn from it on demand, so a
 * reprint is always identical. Numbers run per store per financial year with no gaps.
 */
export const Invoices: CollectionConfig = {
  slug: 'invoices',
  admin: { hidden: true, useAsTitle: 'number' },
  access: {
    read: tenantRoleOrPlatform({ roles: ORDER_READ, supportCanAccess: true }),
    create: nobody,
    update: nobody,
    delete: nobody,
  },
  indexes: [
    { fields: ['tenant', 'number'], unique: true },
    { fields: ['tenant', 'order'] },
    { fields: ['tenant', 'issuedAt'] },
  ],
  fields: [
    { name: 'order', type: 'relationship', relationTo: 'orders', required: true },
    {
      name: 'type',
      type: 'select',
      required: true,
      options: [
        { value: 'tax-invoice', label: 'Tax invoice' },
        { value: 'credit-note', label: 'Credit note' },
      ],
    },
    { name: 'number', type: 'text', required: true },
    { name: 'financialYear', type: 'text', required: true },
    { name: 'issuedAt', type: 'date', required: true },
    {
      name: 'againstInvoice',
      type: 'relationship',
      relationTo: 'invoices',
      admin: { description: 'The invoice a credit note corrects' },
    },
    { name: 'seller', type: 'json', required: true },
    { name: 'buyer', type: 'json', required: true },
    { name: 'placeOfSupply', type: 'json', required: true },
    { name: 'lines', type: 'json', required: true },
    { name: 'totals', type: 'json', required: true },
    { name: 'amountInWords', type: 'text', required: true },
    { name: 'irn', type: 'text', admin: { description: 'E-invoicing, later' } },
  ],
}
