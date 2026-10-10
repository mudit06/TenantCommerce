import type { CollectionConfig, TextField } from 'payload'

import { ANY_STORE_ROLE, CONTENT_WRITE, idOf, tenantRoleOrPlatform } from '@/access'
import { BLOCK_FEATURE, PAGE_BLOCKS } from '@/blocks'
import {
  lastEditedByField,
  publishedAtField,
  recordEditor,
  recordPublishedAt,
} from '@/fields/editedBy'
import { seoFields } from '@/fields/seo'
import { fillSlugFrom, slugField } from '@/fields/slug'
import { getTenantFeatures } from '@/modules/tenancy'

import { pagePreviewUrl } from '../services/preview'

const ADMIN_COMPONENTS = '@/modules/content/admin'

/** A store's slugs are unique: a duplicated page gets its own address until staff rename it. */
const withCopySlug = (field: TextField): TextField => ({
  ...field,
  hooks: {
    ...field.hooks,
    beforeDuplicate: [
      ({ value }) => (value ? `${value}-copy-${Math.random().toString(36).slice(2, 6)}` : value),
    ],
  },
})

/**
 * Content pages built from blocks: the home page, landing pages and policies (docs/screens
 * Pages and Page builder). Drafts, versions and scheduled publishing come from Payload. The
 * template decides the page's structure on the store (a landing page is blocks only; default and
 * policy pages put the title above the blocks), never the vendor's look, which is code.
 */
export const Pages: CollectionConfig = {
  slug: 'pages',
  labels: { singular: 'Page', plural: 'Pages' },
  admin: {
    group: 'Content',
    useAsTitle: 'title',
    // Store staff aren't developers: no raw JSON tab in the editor
    hideAPIURL: true,
    defaultColumns: ['title', 'slug', 'template', '_status', 'updatedAt'],
    listSearchableFields: ['title', 'slug'],
    description:
      'Versions are kept for every save. Policy pages are linked from the footer and checkout.',
    components: {
      // Pages list with status and template tabs, search and "Create page" (docs/screens Pages)
      views: { list: { Component: `${ADMIN_COMPONENTS}/PagesList#PagesList` } },
    },
    // The draft in the store's own storefront code, beside the editor (Page builder rule 4)
    livePreview: {
      url: ({ data, req }) => pagePreviewUrl(req, data),
      breakpoints: [
        { name: 'phone', label: 'Phone', width: 390, height: 844 },
        { name: 'tablet', label: 'Tablet', width: 820, height: 1180 },
        { name: 'desktop', label: 'Desktop', width: 1440, height: 900 },
      ],
    },
  },
  versions: {
    drafts: { schedulePublish: true },
    maxPerDoc: 30,
  },
  access: {
    read: tenantRoleOrPlatform({ roles: ANY_STORE_ROLE, supportCanAccess: true }),
    create: tenantRoleOrPlatform({ roles: CONTENT_WRITE }),
    update: tenantRoleOrPlatform({ roles: CONTENT_WRITE }),
    delete: tenantRoleOrPlatform({ roles: CONTENT_WRITE }),
  },
  indexes: [{ fields: ['tenant', 'slug'], unique: true }],
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      hooks: { beforeDuplicate: [({ value }) => (value ? `${value} (copy)` : value)] },
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          description:
            'Pick blocks, fill them in and put them in order. How each block looks comes from your store’s design.',
          fields: [
            {
              name: 'layout',
              label: 'Blocks on this page',
              // "Add block", "Remove block" in the builder's menus
              labels: { singular: 'Block', plural: 'Blocks' },
              type: 'blocks',
              blocks: PAGE_BLOCKS,
              // A compact list of blocks, one opened at a time for its settings (wireframe)
              admin: { initCollapsed: true },
              // Blocks of optional features only while the feature is on; ones already on the
              // page stay valid (the store hides them while their feature is off)
              filterOptions: async ({ data, req, siblingData }) => {
                const tenantId = idOf(data?.tenant)
                if (!tenantId) return true
                const { enabled } = await getTenantFeatures(req.payload, tenantId)
                const present = new Set(
                  (
                    ((siblingData as { layout?: unknown } | undefined)?.layout ?? []) as {
                      blockType?: string
                    }[]
                  ).map((b) => b.blockType),
                )
                return PAGE_BLOCKS.map((block) => block.slug).filter((slug) => {
                  const feature = BLOCK_FEATURE[slug]
                  return !feature || enabled.has(feature as never) || present.has(slug)
                })
              },
            },
          ],
        },
        {
          label: 'SEO',
          description: 'How this page shows in Google and when it is shared on WhatsApp.',
          fields: [
            {
              name: 'seoPreview',
              type: 'ui',
              admin: { components: { Field: `${ADMIN_COMPONENTS}/SeoPreview#SeoPreview` } },
            },
            seoFields(),
          ],
        },
      ],
    },
    {
      name: 'template',
      label: 'Page type',
      type: 'select',
      required: true,
      defaultValue: 'default',
      options: [
        { label: 'Default', value: 'default' },
        { label: 'Landing', value: 'landing' },
        { label: 'Policy', value: 'policy' },
      ],
      admin: {
        position: 'sidebar',
        components: { Field: `${ADMIN_COMPONENTS}/TemplatePicker#TemplatePicker` },
      },
    },
    withCopySlug(
      slugField({
        required: false,
        label: 'Web address (slug)',
        admin: {
          position: 'sidebar',
          description:
            'Filled from the title. Store address: /pages/<slug>. The home page uses “home”.',
        },
      }),
    ),
    publishedAtField(),
    lastEditedByField(),
  ],
  hooks: {
    beforeValidate: [fillSlugFrom('title')],
    beforeChange: [recordEditor, recordPublishedAt],
  },
}
