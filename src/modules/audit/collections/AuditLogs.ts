import type { CollectionConfig } from 'payload'

import { nobody, platformStaffOrOwnTenant } from '@/access'

import { AUDIT_ACTIONS } from '../constants'

/**
 * Append-only record of who changed what (docs/06, docs/14). Written by `recordAudit` only;
 * nobody can create, edit or delete through the API. `tenant` is empty for platform-wide
 * entries (our own team, plan edits). Viewer screen comes later; the vendor overview's
 * "Recent changes" card reads it.
 */
export const AuditLogs: CollectionConfig = {
  slug: 'audit-logs',
  labels: { singular: 'Audit log entry', plural: 'Audit log' },
  admin: {
    useAsTitle: 'action',
    defaultColumns: ['at', 'action', 'actor', 'tenant', 'reason'],
    group: 'Platform',
    // Viewer screen is "Later" (docs/17); entries surface on the vendor overview meanwhile
    hidden: true,
  },
  access: {
    create: nobody,
    read: platformStaffOrOwnTenant(['owner']),
    update: nobody,
    delete: nobody,
  },
  timestamps: false,
  indexes: [{ fields: ['tenant', 'at'] }],
  fields: [
    { name: 'tenant', type: 'relationship', relationTo: 'tenants', index: true },
    { name: 'actor', type: 'relationship', relationTo: 'users' },
    { name: 'actorRole', type: 'text' },
    {
      name: 'action',
      type: 'select',
      required: true,
      index: true,
      options: AUDIT_ACTIONS.map((value) => ({ value, label: value.replace(/_/g, ' ') })),
    },
    { name: 'summary', type: 'text', admin: { description: 'One line people can read' } },
    { name: 'collectionSlug', label: 'Collection', type: 'text' },
    { name: 'docId', type: 'text' },
    { name: 'diff', type: 'json' },
    { name: 'reason', type: 'text' },
    { name: 'actingAsPlatform', type: 'checkbox', defaultValue: false },
    { name: 'ip', type: 'text' },
    { name: 'at', type: 'date', required: true, index: true },
  ],
}
