import type { GroupField } from 'payload'

const URL_PATTERN = /^(https?:\/\/[^\s]+|\/[^\s]*|mailto:[^\s]+|tel:[+0-9 ]+)$/

/**
 * Where a menu item, button or banner goes: one of the store's pages, a category (follows slug
 * changes because it stores the id), a product, or any web address (docs/screens Menus rule 1).
 */
export function linkField({
  name = 'link',
  label,
  required = false,
}: { name?: string; label?: string; required?: boolean } = {}): GroupField {
  return {
    name,
    label,
    type: 'group',
    interfaceName: 'Link',
    admin: { hideGutter: true },
    fields: [
      {
        type: 'row',
        fields: [
          {
            name: 'type',
            label: 'Goes to',
            type: 'select',
            required,
            defaultValue: 'page',
            options: [
              { label: 'A page', value: 'page' },
              { label: 'A category', value: 'category' },
              { label: 'A product', value: 'product' },
              { label: 'A web address', value: 'url' },
            ],
          },
          {
            name: 'page',
            type: 'relationship',
            relationTo: 'pages',
            admin: { condition: (_, sibling) => sibling?.type === 'page' },
          },
          {
            name: 'category',
            type: 'relationship',
            relationTo: 'categories',
            admin: { condition: (_, sibling) => sibling?.type === 'category' },
          },
          {
            name: 'product',
            type: 'relationship',
            relationTo: 'products',
            admin: { condition: (_, sibling) => sibling?.type === 'product' },
          },
          {
            name: 'url',
            label: 'Web address',
            type: 'text',
            admin: {
              condition: (_, sibling) => sibling?.type === 'url',
              placeholder: 'https://… or /offers',
            },
            validate: (value: string | null | undefined) =>
              !value || URL_PATTERN.test(value.trim())
                ? true
                : 'Use a full address (https://…) or a path on this store (/…)',
          },
          {
            name: 'newTab',
            label: 'Open in a new tab',
            type: 'checkbox',
            admin: { condition: (_, sibling) => sibling?.type === 'url' },
          },
        ],
      },
    ],
  }
}
