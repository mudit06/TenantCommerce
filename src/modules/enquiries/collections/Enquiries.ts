import { APIError, type CollectionConfig } from 'payload'

import { ENQUIRY_WORK, idOf, STORE_ADMIN } from '@/access'
import { nextNumber } from '@/modules/tax-invoicing'
import { featureGatedAccess, hiddenWithoutFeature } from '@/modules/tenancy'

import { ENQUIRY_STATUSES, ENQUIRY_TYPES } from '../constants'

const PINCODE = /^[1-9][0-9]{5}$/

/**
 * Every store form lands here: product questions, quote requests, dealership enquiries and the
 * contact form (docs/screens Enquiries). Staff can also log phone and walk-in enquiries.
 */
export const Enquiries: CollectionConfig = {
  slug: 'enquiries',
  labels: { singular: 'Enquiry', plural: 'Enquiries' },
  admin: {
    group: 'Sales',
    useAsTitle: 'referenceNumber',
    defaultColumns: [
      'referenceNumber',
      'name',
      'type',
      'productTitle',
      'status',
      'assignedTo',
      'createdAt',
    ],
    listSearchableFields: ['referenceNumber', 'name', 'phone', 'email', 'company'],
    hidden: hiddenWithoutFeature('enquiries'),
    components: { beforeListTable: ['@/modules/enquiries/admin/EnquiryTabs#EnquiryTabs'] },
  },
  defaultSort: '-createdAt',
  access: {
    read: featureGatedAccess({ feature: 'enquiries', roles: ENQUIRY_WORK, supportCanAccess: true }),
    create: featureGatedAccess({ feature: 'enquiries', roles: ENQUIRY_WORK }),
    update: featureGatedAccess({ feature: 'enquiries', roles: ENQUIRY_WORK }),
    delete: featureGatedAccess({ feature: 'enquiries', roles: STORE_ADMIN }),
  },
  indexes: [
    { fields: ['tenant', 'referenceNumber'], unique: true },
    { fields: ['tenant', 'status', 'createdAt'] },
  ],
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'referenceNumber',
          label: 'Reference',
          type: 'text',
          admin: { readOnly: true, description: 'Given on save, shown to the shopper' },
        },
        {
          name: 'type',
          type: 'select',
          required: true,
          defaultValue: 'general',
          options: [...ENQUIRY_TYPES],
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          defaultValue: 'new',
          options: [...ENQUIRY_STATUSES],
        },
        {
          name: 'assignedTo',
          type: 'relationship',
          relationTo: 'users',
          filterOptions: ({ data }) => {
            const tenantId = idOf(data?.tenant)
            return tenantId ? { 'tenants.tenant': { equals: tenantId } } : false
          },
        },
      ],
    },
    {
      name: 'reply',
      type: 'ui',
      admin: { components: { Field: '@/modules/enquiries/admin/EnquiryReply#EnquiryReply' } },
    },
    {
      type: 'collapsible',
      label: 'About',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'productTitle', label: 'Product', type: 'text' },
            { name: 'modelNumber', label: 'Model number', type: 'text' },
            { name: 'qty', label: 'Quantity', type: 'number', min: 1 },
          ],
        },
        { name: 'message', type: 'textarea' },
      ],
    },
    {
      type: 'collapsible',
      label: 'From',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'name', type: 'text', required: true },
            { name: 'company', type: 'text' },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'phone', type: 'text' },
            { name: 'email', type: 'email' },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'city', type: 'text' },
            {
              name: 'pincode',
              type: 'text',
              validate: (value: string | null | undefined) =>
                !value || PINCODE.test(value) ? true : 'Enter a 6-digit pincode',
            },
          ],
        },
        {
          name: 'consentToContact',
          label: 'Agreed to be contacted about this enquiry',
          type: 'checkbox',
          defaultValue: false,
        },
      ],
    },
    {
      name: 'internalNotes',
      label: 'Internal notes',
      type: 'array',
      labels: { singular: 'Note', plural: 'Notes' },
      admin: { description: 'Only your team sees these' },
      fields: [
        { name: 'text', type: 'textarea', required: true },
        {
          type: 'row',
          fields: [
            { name: 'by', type: 'relationship', relationTo: 'users', admin: { readOnly: true } },
            {
              name: 'at',
              type: 'date',
              admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } },
            },
          ],
        },
      ],
    },
    {
      name: 'source',
      type: 'group',
      admin: { readOnly: true, condition: (data) => Boolean(data?.source?.page) },
      fields: [
        { name: 'page', type: 'text' },
        {
          type: 'row',
          fields: [
            { name: 'utmSource', type: 'text' },
            { name: 'utmMedium', type: 'text' },
            { name: 'utmCampaign', type: 'text' },
          ],
        },
      ],
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data, originalDoc }) => {
        if (data && !(data.phone ?? originalDoc?.phone) && !(data.email ?? originalDoc?.email)) {
          throw new APIError(
            'Add a phone number or an email so the team can reply',
            400,
            undefined,
            true,
          )
        }
        return data
      },
    ],
    beforeChange: [
      async ({ data, operation, req }) => {
        // Stamp new notes with who wrote them and when
        const userId = req.user?.collection === 'users' ? req.user.id : undefined
        for (const note of (data.internalNotes ?? []) as Record<string, unknown>[]) {
          if (!note.at) {
            note.at = new Date().toISOString()
            note.by = userId
          }
        }
        if (operation === 'create') {
          const tenantId = idOf(data.tenant)
          if (!tenantId) throw new APIError('Choose the store first', 400, undefined, true)
          data.referenceNumber = `ENQ-${await nextNumber(req, tenantId, 'enquiry')}`
        } else {
          delete data.referenceNumber
        }
        return data
      },
    ],
  },
}
