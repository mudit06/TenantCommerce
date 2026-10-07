import { APIError, type CollectionConfig } from 'payload'

import { CATALOG_READ, CATALOG_WRITE, idOf, tenantRoleOrPlatform } from '@/access'
import { lastEditedByField, recordEditor } from '@/fields/editedBy'
import { moneyField } from '@/fields/money'
import { seoFields } from '@/fields/seo'
import { fillSlugFrom, slugField } from '@/fields/slug'
import { assertProductCapacity, setProductCount, userHasFeature } from '@/modules/tenancy'

import { GST_RATES, HSN_CODE, MADE_BY, PRODUCT_STATUSES, PURCHASE_MODES } from '../constants'
import { attributeSetForCategory } from '../services/catalogLookup'
import { compactValues, productAttributeProblems } from '../services/productAttributes'

const YOUTUBE = /^https:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{6,}/

/**
 * Products (ADR 0006, docs/06 `products`, docs/screens Product editor). Specifications are
 * checked against the main category's attribute set; finishes and sizes become variants.
 */
export const Products: CollectionConfig = {
  slug: 'products',
  labels: { singular: 'Product', plural: 'Products' },
  admin: {
    group: 'Catalog',
    useAsTitle: 'title',
    defaultColumns: ['title', 'modelNumber', 'primaryCategory', 'status', 'updatedAt'],
    listSearchableFields: ['title', 'modelNumber', 'searchKeywords'],
    description: 'Products need a main category: it decides the specification fields.',
  },
  versions: { maxPerDoc: 20 },
  defaultSort: '-updatedAt',
  access: {
    read: tenantRoleOrPlatform({ roles: CATALOG_READ, supportCanAccess: true }),
    create: tenantRoleOrPlatform({ roles: CATALOG_WRITE }),
    update: tenantRoleOrPlatform({ roles: CATALOG_WRITE }),
    delete: tenantRoleOrPlatform({ roles: CATALOG_WRITE }),
  },
  indexes: [
    { fields: ['tenant', 'slug'], unique: true },
    { fields: ['tenant', 'status', 'primaryCategory'] },
    { fields: ['tenant', 'modelNumber'] },
  ],
  fields: [
    {
      type: 'row',
      fields: [
        {
          name: 'title',
          type: 'text',
          required: true,
          admin: { placeholder: 'Laser-cut stainless steel aldrop' },
        },
        {
          name: 'modelNumber',
          label: 'Model number',
          type: 'text',
          required: true,
          admin: { placeholder: 'HOAL-101' },
        },
      ],
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Basics',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'primaryCategory',
                  label: 'Main category',
                  type: 'relationship',
                  relationTo: 'categories',
                  required: true,
                  admin: { description: 'Decides the specification fields' },
                },
                {
                  name: 'categories',
                  label: 'Also show in',
                  type: 'relationship',
                  relationTo: 'categories',
                  hasMany: true,
                },
                { name: 'brand', type: 'relationship', relationTo: 'brands' },
              ],
            },
            { name: 'shortDescription', type: 'textarea', maxLength: 300 },
            {
              name: 'highlights',
              type: 'array',
              maxRows: 8,
              labels: { singular: 'Highlight', plural: 'Highlights' },
              fields: [{ name: 'text', type: 'text', required: true }],
            },
            { name: 'description', type: 'richText' },
          ],
        },
        {
          label: 'Photos and videos',
          fields: [
            {
              name: 'gallery',
              label: 'Photos',
              type: 'upload',
              relationTo: 'media',
              hasMany: true,
              filterOptions: { mimeType: { contains: 'image' } },
              admin: { description: 'The first photo is the main one' },
            },
            {
              name: 'videos',
              type: 'array',
              maxRows: 5,
              admin: { condition: (_d, _s, { user }) => userHasFeature(user, 'product-videos') },
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'url',
                      label: 'YouTube link',
                      type: 'text',
                      required: true,
                      validate: (value: string | null | undefined) =>
                        !value || YOUTUBE.test(value) ? true : 'Paste a YouTube link',
                    },
                    {
                      name: 'type',
                      type: 'select',
                      defaultValue: 'demo',
                      options: [
                        { label: 'Installation', value: 'installation' },
                        { label: 'Demo', value: 'demo' },
                        { label: 'Promotion', value: 'promo' },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Specifications',
          fields: [
            {
              name: 'attributes',
              label: 'Specifications',
              type: 'json',
              admin: {
                components: { Field: '@/modules/catalog/admin/AttributesField#AttributesField' },
              },
            },
          ],
        },
        {
          label: 'Finishes and sizes',
          description:
            'Each combination of the options ticked in Specifications (finish, size…) is a variant with its own code, price and stock.',
          fields: [
            {
              name: 'generateVariants',
              type: 'ui',
              admin: {
                components: {
                  Field: '@/modules/catalog/admin/GenerateVariantsButton#GenerateVariantsButton',
                },
              },
            },
            {
              name: 'variants',
              type: 'join',
              collection: 'variants',
              on: 'product',
              defaultSort: 'sortOrder',
              admin: { defaultColumns: ['title', 'sku', 'price', 'stockQty', 'status'] },
            },
          ],
        },
        {
          label: 'Price and GST',
          fields: [
            {
              type: 'row',
              fields: [
                moneyField({
                  name: 'price',
                  label: 'Selling price incl. GST',
                  description: 'Variants can set their own',
                }),
                moneyField({ name: 'compareAtPrice', label: 'MRP' }),
              ],
            },
            {
              type: 'row',
              fields: [
                {
                  name: 'gstRate',
                  label: 'GST rate (%)',
                  type: 'select',
                  defaultValue: '18',
                  options: GST_RATES.map((rate) => ({ label: `${rate}%`, value: String(rate) })),
                },
                {
                  name: 'hsnCode',
                  label: 'HSN code',
                  type: 'text',
                  validate: (value: string | null | undefined) =>
                    !value || HSN_CODE.test(value) ? true : 'HSN codes have 4, 6 or 8 digits',
                },
              ],
            },
            {
              type: 'row',
              fields: [
                { name: 'weightGrams', label: 'Weight (g)', type: 'number', min: 0 },
                {
                  name: 'dimensions',
                  label: 'Size in box (mm)',
                  type: 'group',
                  fields: [
                    {
                      type: 'row',
                      fields: [
                        { name: 'lengthMm', label: 'Length', type: 'number', min: 0 },
                        { name: 'widthMm', label: 'Width', type: 'number', min: 0 },
                        { name: 'heightMm', label: 'Height', type: 'number', min: 0 },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          label: 'Label details',
          description:
            'Legal Metrology details shown on the product page. Maker details default from Store settings.',
          fields: [
            {
              name: 'legal',
              type: 'group',
              label: false,
              fields: [
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'genericName',
                      label: 'Generic name',
                      type: 'text',
                      admin: { placeholder: 'Door aldrop' },
                    },
                    {
                      name: 'netQuantity',
                      label: 'Net quantity',
                      type: 'text',
                      defaultValue: '1 piece',
                    },
                    {
                      name: 'countryOfOrigin',
                      label: 'Country of origin (ISO code)',
                      type: 'text',
                      defaultValue: 'IN',
                      validate: (value: string | null | undefined) =>
                        !value || /^[A-Z]{2}$/.test(value)
                          ? true
                          : 'Two capital letters, for example IN',
                    },
                  ],
                },
                {
                  type: 'row',
                  fields: [
                    {
                      name: 'madeBy',
                      label: 'Made by',
                      type: 'select',
                      defaultValue: 'manufacturer',
                      options: [...MADE_BY],
                    },
                    { name: 'madeByName', label: 'Name', type: 'text' },
                  ],
                },
                { name: 'madeByAddress', label: 'Address', type: 'textarea' },
                { name: 'consumerCare', label: 'Consumer care', type: 'text' },
              ],
            },
          ],
        },
        {
          label: 'Documents and related',
          fields: [
            {
              name: 'documents',
              type: 'relationship',
              relationTo: 'product-documents',
              hasMany: true,
            },
            {
              name: 'relatedProducts',
              label: 'Goes well with',
              type: 'relationship',
              relationTo: 'products',
              hasMany: true,
              maxRows: 8,
            },
          ],
        },
        {
          label: 'Search engines',
          fields: [
            slugField({
              required: false,
              admin: { description: 'Filled from the title. Store address: /products/<slug>' },
            }),
            {
              name: 'searchKeywords',
              type: 'text',
              admin: { description: 'Other words shoppers use, separated by commas' },
            },
            seoFields(),
          ],
        },
      ],
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [...PRODUCT_STATUSES],
      admin: { position: 'sidebar' },
    },
    {
      name: 'purchaseMode',
      label: 'How shoppers buy',
      type: 'select',
      required: true,
      defaultValue: 'enquire',
      options: [...PURCHASE_MODES],
      admin: {
        position: 'sidebar',
        description:
          'Online checkout arrives in stage B; until then every product shows “Request a quote”.',
      },
    },
    {
      name: 'isFeatured',
      label: 'Featured',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar' },
    },
    {
      // Published reviews only, kept by the reviews module (docs/06 `reviews`); never edited here
      name: 'rating',
      type: 'group',
      admin: { hidden: true },
      access: { create: () => false, update: () => false },
      fields: [
        { name: 'average', type: 'number' },
        { name: 'count', type: 'number', defaultValue: 0 },
      ],
    },
    lastEditedByField(),
  ],
  hooks: {
    beforeValidate: [fillSlugFrom('title')],
    beforeChange: [
      recordEditor,
      async ({ data, operation, originalDoc, req }) => {
        const tenantId = idOf(data.tenant ?? originalDoc?.tenant)
        if (!tenantId) throw new APIError('Choose the store first', 400, undefined, true)
        if (operation === 'create') {
          const { totalDocs } = await req.payload.count({
            collection: 'products',
            where: { tenant: { equals: tenantId } },
            overrideAccess: true,
            req,
          })
          await assertProductCapacity(req, tenantId, totalDocs)
        }

        const merged = { ...originalDoc, ...data }
        const going = merged.status === 'active'
        const problems: string[] = []

        // Specifications against the main category's attribute set
        const set = await attributeSetForCategory(req.payload, idOf(merged.primaryCategory), req)
        const values = (merged.attributes ?? {}) as Record<string, unknown>
        if (set) {
          problems.push(
            ...productAttributeProblems(set.attributes ?? [], values, { requireRequired: going }),
          )
          data.attributes = compactValues(values)
        } else if (Object.keys(compactValues(values)).length > 0) {
          problems.push(
            'The main category has no attribute set, so the product can’t have specifications',
          )
        }

        // Label details default from Store settings
        const legal = { ...(originalDoc?.legal ?? {}), ...(data.legal ?? {}) }
        if (!legal.madeByName || !legal.madeByAddress || !legal.consumerCare) {
          const { docs } = await req.payload.find({
            collection: 'site-settings',
            where: { tenant: { equals: tenantId } },
            depth: 0,
            limit: 1,
            overrideAccess: true,
            req,
          })
          const defaults = docs[0]?.legalDefaults
          legal.madeByName ||= defaults?.manufacturerName
          legal.madeByAddress ||= defaults?.manufacturerAddress
          legal.consumerCare ||= defaults?.consumerCare
        }
        data.legal = legal

        if (going) {
          if (
            !legal.genericName ||
            !legal.netQuantity ||
            !legal.countryOfOrigin ||
            !legal.madeByName ||
            !legal.madeByAddress
          ) {
            problems.push(
              'Fill in the label details (generic name, net quantity, country of origin, maker name and address) before making the product active',
            )
          }
          if (!(merged.gallery ?? []).length)
            problems.push('Add at least one photo before making the product active')
          if (
            merged.purchaseMode !== 'enquire' &&
            (!merged.price?.amountMinor || !merged.hsnCode)
          ) {
            problems.push('Products sold online need a selling price and an HSN code')
          }
        }
        if (problems.length > 0) throw new APIError(problems.join('. '), 400, undefined, true)
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation !== 'create') return doc
        const tenantId = idOf(doc.tenant)
        if (tenantId) {
          const { totalDocs } = await req.payload.count({
            collection: 'products',
            where: { tenant: { equals: tenantId } },
            overrideAccess: true,
            req,
          })
          await setProductCount(req, tenantId, totalDocs)
        }
        return doc
      },
    ],
    afterDelete: [
      async ({ doc, req }) => {
        await req.payload.delete({
          collection: 'variants',
          where: { product: { equals: doc.id } },
          overrideAccess: true,
          req,
        })
        const tenantId = idOf(doc.tenant)
        if (tenantId) {
          const { totalDocs } = await req.payload.count({
            collection: 'products',
            where: { tenant: { equals: tenantId } },
            overrideAccess: true,
            req,
          })
          await setProductCount(req, tenantId, totalDocs)
        }
      },
    ],
  },
}
