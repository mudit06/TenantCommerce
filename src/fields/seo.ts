import type { GroupField } from 'payload'

/** Search engine fields (docs/13): title and description shown in Google, and the share image. */
export function seoFields(): GroupField {
  return {
    name: 'seo',
    label: 'Search engines',
    type: 'group',
    interfaceName: 'Seo',
    admin: { description: 'Leave empty to use the name and the store’s defaults.' },
    fields: [
      { name: 'title', label: 'Page title', type: 'text', maxLength: 70 },
      { name: 'description', label: 'Meta description', type: 'textarea', maxLength: 160 },
      { name: 'image', label: 'Share image', type: 'upload', relationTo: 'media' },
    ],
  }
}
