import { APIError, type CollectionBeforeValidateHook, type TextField } from 'payload'

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

/**
 * Collection hook for slugs filled from another field (name or title): an empty slug is made
 * from it, so staff never have to type one. A slug that can't be made (a name with no letters
 * a to z) asks for one. Pair with `slugField({ required: false })`: a required field would make
 * the form ask before this hook runs.
 */
export const fillSlugFrom =
  (from: string): CollectionBeforeValidateHook =>
  ({ data, originalDoc }) => {
    if (!data) return data
    if (data.slug === undefined && originalDoc?.slug) return data
    let slug = typeof data.slug === 'string' ? data.slug.trim().toLowerCase() : ''
    if (!slug) slug = slugify(String(data[from] ?? originalDoc?.[from] ?? ''))
    if (!slug) {
      throw new APIError(
        'Add a web address (slug) using letters a to z, for example basin-mixers',
        400,
        undefined,
        true,
      )
    }
    data.slug = slug
    return data
  }
