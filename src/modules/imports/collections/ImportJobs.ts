import type { CollectionConfig } from 'payload'

import { CATALOG_WRITE, nobody, tenantRoleOrPlatform } from '@/access'

import { IMPORT_KINDS, IMPORT_STATUSES } from '../constants'

/**
 * One uploaded CSV (docs/06 `import-jobs`, docs/12): its rows, the check's counts and errors, and
 * what the import did. Written by the import services only; the Import screen reads it.
 */
export const ImportJobs: CollectionConfig = {
  slug: 'import-jobs',
  admin: { hidden: true },
  access: {
    read: tenantRoleOrPlatform({ roles: CATALOG_WRITE, supportCanAccess: true }),
    create: nobody,
    update: nobody,
    delete: nobody,
  },
  indexes: [{ fields: ['tenant', 'createdAt'] }],
  fields: [
    { name: 'kind', type: 'select', required: true, options: [...IMPORT_KINDS] },
    { name: 'filename', type: 'text', required: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'checked',
      options: [...IMPORT_STATUSES],
    },
    { name: 'uploadedBy', type: 'text' },
    { name: 'uploadedByName', type: 'text' },
    /** The file as uploaded (kept so the import re-checks against the store's data), then cleared */
    { name: 'csv', type: 'textarea', admin: { hidden: true } },
    /** { rows, create, update, errorRows } from the check; { created, updated, skipped } after */
    { name: 'stats', type: 'json' },
    { name: 'result', type: 'json' },
    /** [{ row, column, message, value }] */
    { name: 'errors', type: 'json' },
    { name: 'startedAt', type: 'date' },
    { name: 'finishedAt', type: 'date' },
  ],
}
