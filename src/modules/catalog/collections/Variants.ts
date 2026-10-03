import { APIError, type CollectionConfig } from 'payload'

import { CATALOG_READ, CATALOG_WRITE, idOf, tenantRoleOrPlatform } from '@/access'
import { moneyField } from '@/fields/money'

import { axesForProduct } from '../services/variants'
import { variantOptionProblems, variantSku, variantTitle } from '../services/productAttributes'

const SKU = /^[A-Z0-9][A-Z0-9._/-]{0,63}$/

/**
 * One sellable version of a product: a finish, a size, or both (docs/06 `variants`). Its
 * options must be values the product is offered in. Price and stock arrive with online selling.
 */
export const Variants: CollectionConfig = {
  slug: 'variants',
  labels: { singular: 'Variant', plural: 'Variants' },
  admin: {
    group: 'Catalog',
    useAsTitle: 'sku',
    defaultColumns: ['sku', 'title', 'product', 'stockQty', 'status'],
    listSearchableFields: ['sku', 'title', 'barcode'],
    description: 'Usually created from a product’s “Finishes and sizes” tab.',
  },
  defaultSort: 'sortOrder',
  access: {
    read: tenantRoleOrPlatform({ roles: CATALOG_READ, supportCanAccess: true }),
    create: tenantRoleOrPlatform({ roles: CATALOG_WRITE }),
    update: tenantRoleOrPlatform({ roles: CATALOG_WRITE }),
    delete: tenantRoleOrPlatform({ roles: CATALOG_WRITE }),
  },
  indexes: [
    { fields: ['tenant', 'sku'], unique: true },
    { fields: ['tenant', 'product', 'sortOrder'] },
  ],
  fields: [
    { name: 'product', type: 'relationship', relationTo: 'products', required: true },
    {
      name: 'options',
      type: 'json',
      admin: {
        components: { Field: '@/modules/catalog/admin/VariantOptionsField#VariantOptionsField' },
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'sku',
          label: 'SKU',
          type: 'text',
          admin: { description: 'Filled from the model number and options if empty' },
          validate: (value: string | null | undefined) =>
            !value || SKU.test(value) ? true : 'Capital letters, numbers, - . / and _ only',
        },
        { name: 'title', type: 'text', admin: { readOnly: true, description: 'From the options' } },
        { name: 'barcode', label: 'Barcode (EAN)', type: 'text' },
      ],
    },
    {
      type: 'row',
      fields: [
        moneyField({
          name: 'price',
          label: 'Price incl. GST',
          description: 'Empty: the product’s price',
        }),
        moneyField({ name: 'compareAtPrice', label: 'MRP' }),
      ],
    },
    {
      name: 'images',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      filterOptions: { mimeType: { contains: 'image' } },
      admin: { description: 'Photos of this finish. Empty: the product’s photos' },
    },
    {
      type: 'row',
      fields: [
        { name: 'stockQty', label: 'In stock', type: 'number', defaultValue: 0, min: 0 },
        { name: 'lowStockThreshold', label: 'Alert me below', type: 'number', min: 0 },
        { name: 'weightGrams', label: 'Weight (g)', type: 'number', min: 0 },
        {
          name: 'allowBackorder',
          label: 'Allow orders when out of stock',
          type: 'checkbox',
          defaultValue: false,
        },
      ],
    },
    {
      type: 'row',
      fields: [
        {
          name: 'status',
          type: 'select',
          required: true,
          defaultValue: 'active',
          options: [
            { label: 'Active', value: 'active' },
            { label: 'Hidden', value: 'inactive' },
          ],
        },
        { name: 'sortOrder', type: 'number', defaultValue: 0 },
      ],
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        const productId = idOf(data.product ?? originalDoc?.product)
        const product = productId
          ? await req.payload
              .findByID({
                collection: 'products',
                id: productId,
                depth: 0,
                overrideAccess: true,
                req,
              })
              .catch(() => null)
          : null
        if (!product) throw new APIError('Choose the product', 400, undefined, true)
        const tenantId = idOf(data.tenant ?? originalDoc?.tenant)
        if (tenantId && tenantId !== idOf(product.tenant)) {
          throw new APIError('The product belongs to another store', 400, undefined, true)
        }
        data.tenant = idOf(product.tenant)
        const axes = await axesForProduct(req, product)
        const options = (data.options ?? originalDoc?.options ?? {}) as Record<string, string>
        const problems = variantOptionProblems(axes, options)
        if (problems.length > 0) throw new APIError(problems.join('. '), 400, undefined, true)
        data.title = variantTitle(axes, options) || product.title
        data.sku =
          (data.sku ?? originalDoc?.sku ?? '').trim().toUpperCase() ||
          variantSku(product.modelNumber, axes, options)
        return data
      },
    ],
  },
}
