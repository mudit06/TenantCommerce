import { createBreadcrumbsField, createParentField } from '@payloadcms/plugin-nested-docs'
import { APIError, type CollectionConfig } from 'payload'

import { CATALOG_READ, CATALOG_WRITE, idOf, tenantRoleOrPlatform } from '@/access'
import { seoFields } from '@/fields/seo'
import { fillSlugFrom, slugField } from '@/fields/slug'
import { userHasFeature } from '@/modules/tenancy'

import { MAX_CATEGORY_DEPTH } from '../constants'

/**
 * The category tree shoppers browse (docs/screens Categories). Parents and breadcrumbs come from
 * the nested-docs plugin; the store address is /c/<parent>/<child>.
 */
export const Categories: CollectionConfig = {
  slug: 'categories',
  labels: { singular: 'Category', plural: 'Categories' },
  admin: {
    group: 'Catalog',
    useAsTitle: 'name',
    defaultColumns: ['name', 'parent', 'attributeSet', 'sortOrder', 'isVisible'],
    listSearchableFields: ['name', 'slug'],
    description: 'Menus and category tiles follow the sort order (low numbers first).',
    components: {
      views: {
        // docs/screens Categories: the tree with product counts, drag to reorder or nest
        list: { Component: '@/modules/catalog/admin/CategoriesList#CategoriesList' },
      },
    },
  },
  defaultSort: 'sortOrder',
  access: {
    read: tenantRoleOrPlatform({ roles: CATALOG_READ, supportCanAccess: true }),
    create: tenantRoleOrPlatform({ roles: CATALOG_WRITE }),
    update: tenantRoleOrPlatform({ roles: CATALOG_WRITE }),
    delete: tenantRoleOrPlatform({ roles: CATALOG_WRITE }),
  },
  indexes: [
    { fields: ['tenant', 'slug'], unique: true },
    { fields: ['tenant', 'parent', 'sortOrder'] },
  ],
  fields: [
    {
      // The tree beside the form, as the wireframe (styles put this column on the left)
      name: 'tree',
      type: 'ui',
      admin: {
        position: 'sidebar',
        components: { Field: '@/modules/catalog/admin/CategoryTreeField#CategoryTreeField' },
        disableListColumn: true,
      },
    },
    { name: 'name', type: 'text', required: true, admin: { placeholder: 'Basin mixers' } },
    // Top level, where the nested-docs plugin looks for it
    createParentField('categories', {
      admin: { description: 'Empty for a top-level category' },
    }),
    {
      type: 'row',
      fields: [
        slugField({
          required: false,
          admin: { description: 'Filled from the name. Store address: /c/<parent>/<slug>' },
        }),
        {
          name: 'attributeSet',
          type: 'relationship',
          relationTo: 'attribute-sets',
          admin: { description: 'Specification fields and filters here. Empty: the parent’s set' },
        },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'image', label: 'Tile image', type: 'upload', relationTo: 'media' },
        { name: 'banner', type: 'upload', relationTo: 'media' },
      ],
    },
    { name: 'description', type: 'textarea' },
    {
      name: 'sizeChart',
      label: 'Size chart',
      type: 'upload',
      relationTo: 'media',
      admin: {
        condition: (_data, _sibling, { user }) => userHasFeature(user, 'size-guide'),
        description: 'Shown as “Size guide” on products in this category',
      },
    },
    {
      type: 'row',
      fields: [
        { name: 'isVisible', label: 'Show on store', type: 'checkbox', defaultValue: true },
        { name: 'sortOrder', type: 'number', defaultValue: 0, admin: { step: 1 } },
      ],
    },
    seoFields(),
    {
      name: 'storeLink',
      type: 'ui',
      admin: {
        components: { Field: '@/modules/catalog/admin/CategoryTreeField#CategoryStoreLink' },
        disableListColumn: true,
      },
    },
    // Kept up to date by the nested-docs plugin; the storefront reads it for URLs and breadcrumbs
    createBreadcrumbsField('categories', { admin: { hidden: true } }),
  ],
  hooks: {
    beforeValidate: [fillSlugFrom('name')],
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        // No loops (a category under its own child) and no deeper than MAX_CATEGORY_DEPTH
        const selfId = idOf(originalDoc?.id)
        let parentId = idOf(data.parent)
        let depth = 1
        while (parentId) {
          if (parentId === selfId) {
            throw new APIError(
              'A category can’t sit under itself or one of its own subcategories',
              400,
              undefined,
              true,
            )
          }
          depth += 1
          if (depth > MAX_CATEGORY_DEPTH) {
            throw new APIError(
              `Categories go at most ${MAX_CATEGORY_DEPTH} levels deep`,
              400,
              undefined,
              true,
            )
          }
          const parent = await req.payload
            .findByID({
              collection: 'categories',
              id: parentId,
              depth: 0,
              overrideAccess: true,
              req,
            })
            .catch(() => null)
          parentId = idOf(parent?.parent)
        }
        return data
      },
    ],
    beforeDelete: [
      async ({ id, req }) => {
        const { totalDocs } = await req.payload.count({
          collection: 'categories',
          where: { parent: { equals: id } },
          overrideAccess: true,
          req,
        })
        if (totalDocs > 0) {
          throw new APIError('Move or delete its subcategories first', 409, undefined, true)
        }
      },
    ],
  },
}
