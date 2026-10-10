import { APIError, type CollectionConfig } from 'payload'

import { CATALOG_READ, CATALOG_WRITE, tenantRoleOrPlatform } from '@/access'

import { ATTRIBUTE_TYPES } from '../constants'
import { attributeSetProblems, optionValueFrom } from '../services/attributeSets'

/**
 * The specification fields for one kind of product (docs/06, docs/screens Attribute sets): their
 * type and unit, and whether each is a store filter, a variant option (finish, size, colour) or
 * shown in compare. One tool for every industry: faucets, locks and kurtas get different fields
 * with no code change.
 */
export const AttributeSets: CollectionConfig = {
  slug: 'attribute-sets',
  labels: { singular: 'Attribute set', plural: 'Attribute sets' },
  admin: {
    group: 'Catalog',
    useAsTitle: 'name',
    defaultColumns: ['name', 'updatedAt'],
    description:
      'Specification fields per kind of product. “Filter” adds it to the store’s filters; “Variant option” makes each value its own SKU.',
    components: {
      views: {
        // docs/screens Attribute sets: the sets beside the chosen set's fields
        list: { Component: '@/modules/catalog/admin/AttributeSetsNav#AttributeSetsList' },
      },
    },
  },
  access: {
    read: tenantRoleOrPlatform({ roles: CATALOG_READ, supportCanAccess: true }),
    create: tenantRoleOrPlatform({ roles: CATALOG_WRITE }),
    update: tenantRoleOrPlatform({ roles: CATALOG_WRITE }),
    delete: tenantRoleOrPlatform({ roles: CATALOG_WRITE }),
  },
  indexes: [{ fields: ['tenant', 'name'], unique: true }],
  fields: [
    {
      // The store's sets beside this one (styles put this column on the left)
      name: 'sets',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: { Field: '@/modules/catalog/admin/AttributeSetsNav#AttributeSetsNav' },
        disableListColumn: true,
      },
    },
    {
      // The wireframe's fields table and options, live from the form below
      name: 'summary',
      type: 'ui',
      admin: {
        components: { Field: '@/modules/catalog/admin/AttributeTable#AttributeTable' },
        disableListColumn: true,
      },
    },
    { name: 'name', type: 'text', required: true, admin: { placeholder: 'Faucets' } },
    {
      name: 'attributes',
      label: 'Fields',
      type: 'array',
      labels: { singular: 'Field', plural: 'Fields' },
      admin: { initCollapsed: false },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'label', type: 'text', required: true, admin: { placeholder: 'Flow rate' } },
            {
              name: 'code',
              type: 'text',
              admin: {
                placeholder: 'flow_rate',
                description: 'Filled from the label if empty. Don’t change it later',
              },
            },
            {
              name: 'type',
              type: 'select',
              required: true,
              defaultValue: 'text',
              options: [...ATTRIBUTE_TYPES],
            },
            { name: 'unit', type: 'text', admin: { placeholder: 'mm, LPM, years' } },
            {
              name: 'group',
              type: 'text',
              admin: {
                placeholder: 'Technical, Dimensions…',
                description: 'Section on the product page',
              },
            },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'isFilterable', label: 'Filter', type: 'checkbox', defaultValue: false },
            {
              name: 'isVariantAxis',
              label: 'Variant option (finish, size, colour)',
              type: 'checkbox',
              defaultValue: false,
            },
            {
              name: 'isComparable',
              label: 'Compare (Phase 2)',
              type: 'checkbox',
              defaultValue: false,
            },
            { name: 'isRequired', label: 'Required', type: 'checkbox', defaultValue: false },
          ],
        },
        {
          name: 'options',
          type: 'array',
          labels: { singular: 'Option', plural: 'Options' },
          admin: {
            condition: (_, sibling) => ['select', 'multiselect', 'color'].includes(sibling?.type),
          },
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'label',
                  type: 'text',
                  required: true,
                  admin: { placeholder: 'Matt black' },
                },
                {
                  name: 'value',
                  type: 'text',
                  admin: { placeholder: 'matt-black (filled from the label)' },
                },
                {
                  name: 'swatchHex',
                  label: 'Swatch colour',
                  type: 'text',
                  admin: { placeholder: '#1F1F1F' },
                  validate: (value: string | null | undefined) =>
                    !value || /^#[0-9a-fA-F]{6}$/.test(value) ? true : 'Use a colour like #1F1F1F',
                },
                { name: 'swatchImage', label: 'Swatch photo', type: 'upload', relationTo: 'media' },
              ],
            },
          ],
        },
      ],
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data }) => {
        // Codes and option values default from their labels
        for (const attribute of (data?.attributes ?? []) as Record<string, unknown>[]) {
          if (!attribute.code && typeof attribute.label === 'string') {
            attribute.code = optionValueFrom(attribute.label)
              .replace(/-/g, '_')
              .replace(/^(\d)/, 'a_$1')
          }
          for (const option of (attribute.options ?? []) as Record<string, unknown>[]) {
            if (!option.value && typeof option.label === 'string')
              option.value = optionValueFrom(option.label)
          }
        }
        return data
      },
    ],
    beforeChange: [
      ({ data }) => {
        const problems = attributeSetProblems(data.attributes ?? [])
        if (problems.length > 0) throw new APIError(problems.join('. '), 400, undefined, true)
        return data
      },
    ],
  },
}
