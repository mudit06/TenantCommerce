import type { TextField } from 'payload'

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)

export function slugField(overrides: Partial<Omit<TextField, 'type'>> = {}): TextField {
  return {
    name: 'slug',
    type: 'text',
    required: true,
    index: true,
    hooks: {
      beforeValidate: [
        ({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
      ],
    },
    validate: (value: string | null | undefined) =>
      !value || SLUG_PATTERN.test(value)
        ? true
        : 'Lowercase letters, numbers and single hyphens only',
    ...overrides,
  } as TextField
}
