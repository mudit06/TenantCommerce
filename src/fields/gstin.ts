import type { TextField } from 'payload'

import { normalizeGstin, parseGstin } from '@/lib/gst/gstin'

export function gstinField(overrides: Partial<Omit<TextField, 'type'>> = {}): TextField {
  return {
    name: 'gstin',
    label: 'GSTIN',
    type: 'text',
    admin: { description: 'PAN and state fill in from the GSTIN' },
    hooks: {
      beforeValidate: [({ value }) => (typeof value === 'string' ? normalizeGstin(value) : value)],
    },
    validate: (value: string | null | undefined) => {
      if (!value) return true
      const check = parseGstin(value)
      return check.valid ? true : check.reason
    },
    ...overrides,
  } as TextField
}
