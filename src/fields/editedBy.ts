import type { CollectionBeforeChangeHook, DateField, TextField } from 'payload'

import { storeSessionOf } from '@/access'

// "Who changed it, and when did it go live" for content lists, the dashboard and version
// history (docs/screens Pages). Set on the server only: the API can't write these fields.

/** Name of the person behind a change, marked when our team made it inside a store. */
export function editorName(user: unknown): string | null {
  if (!user || typeof user !== 'object') return null
  const staff = user as { collection?: string; name?: unknown; email?: unknown }
  if (staff.collection !== 'users') return null
  const name =
    (typeof staff.name === 'string' && staff.name.trim()) ||
    (typeof staff.email === 'string' ? staff.email : '')
  if (!name) return null
  return storeSessionOf(user) ? `${name} (platform team)` : name
}

export const lastEditedByField = (): TextField => ({
  name: 'lastEditedBy',
  label: 'Last changed by',
  type: 'text',
  admin: { position: 'sidebar', readOnly: true },
  access: { create: () => false, update: () => false },
})

export const publishedAtField = (): DateField => ({
  name: 'publishedAt',
  label: 'Last published',
  type: 'date',
  admin: {
    position: 'sidebar',
    readOnly: true,
    date: { pickerAppearance: 'dayAndTime' },
  },
  access: { create: () => false, update: () => false },
})

/** Records the editor on every save, drafts included, so each version names its author. */
export const recordEditor: CollectionBeforeChangeHook = ({ data, req }) => {
  const name = editorName(req.user)
  if (name) data.lastEditedBy = name
  return data
}

/** Stamps the moment a document is published, by a person or by a scheduled publish job. */
export const recordPublishedAt: CollectionBeforeChangeHook = ({ data }) => {
  if (data._status === 'published') data.publishedAt = new Date().toISOString()
  return data
}
