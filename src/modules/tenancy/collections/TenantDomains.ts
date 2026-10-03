import type { CollectionConfig } from 'payload'

import { platformStaffOrOwnTenant, superAdminOnly } from '@/access'
import { recordAudit } from '@/modules/audit'

import { DOMAIN_TYPES, SSL_STATUSES } from '../constants'
import { revalidateHostMap } from '../services/cache'

const HOST_PATTERN =
  /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9-]{2,63}$|^[a-z0-9-]+\.localhost$/

/** Web addresses that open a store; the proxy maps request hosts to tenants from here (docs/04). */
export const TenantDomains: CollectionConfig = {
  slug: 'tenant-domains',
  labels: { singular: 'Domain', plural: 'Domains' },
  admin: {
    useAsTitle: 'host',
    defaultColumns: ['host', 'tenant', 'type', 'isPrimary', 'sslStatus'],
    // Managed from the vendor's Domains tab
    group: false,
  },
  access: {
    read: platformStaffOrOwnTenant(['owner', 'manager']),
    create: superAdminOnly,
    update: superAdminOnly,
    delete: superAdminOnly,
  },
  fields: [
    {
      name: 'host',
      type: 'text',
      required: true,
      unique: true,
      hooks: {
        beforeValidate: [
          ({ value }) =>
            typeof value === 'string' ? value.trim().toLowerCase().replace(/\.$/, '') : value,
        ],
      },
      validate: (value: string | null | undefined) =>
        !value || HOST_PATTERN.test(value) ? true : 'Enter a host name such as shop.example.in',
    },
    { name: 'tenant', type: 'relationship', relationTo: 'tenants', required: true, index: true },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'subdomain',
      options: DOMAIN_TYPES.map((value) => ({
        value,
        label: value === 'subdomain' ? 'Subdomain' : 'Custom',
      })),
    },
    { name: 'isPrimary', type: 'checkbox', defaultValue: false },
    {
      name: 'redirectToPrimary',
      type: 'checkbox',
      defaultValue: true,
      admin: { description: 'Send visitors on this host to the primary domain (301)' },
    },
    { name: 'verifiedAt', type: 'date' },
    {
      name: 'sslStatus',
      type: 'select',
      defaultValue: 'pending',
      options: SSL_STATUSES.map((value) => ({ value, label: value })),
    },
  ],
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, req, context }) => {
        if (doc.isPrimary && !previousDoc?.isPrimary) {
          // Only one primary per store
          await req.payload.update({
            collection: 'tenant-domains',
            where: {
              and: [
                { tenant: { equals: doc.tenant } },
                { id: { not_equals: doc.id } },
                { isPrimary: { equals: true } },
              ],
            },
            data: { isPrimary: false },
            overrideAccess: true,
            req,
            context: { skipAudit: true },
          })
        }
        revalidateHostMap()
        if (context.skipAudit) return
        await recordAudit(req, {
          action: 'domain_changed',
          tenant: typeof doc.tenant === 'object' ? String(doc.tenant.id) : String(doc.tenant),
          collectionSlug: 'tenant-domains',
          docId: String(doc.id),
          summary: `${previousDoc?.id ? 'Updated' : 'Added'} domain ${doc.host}`,
        })
      },
    ],
    afterDelete: [() => revalidateHostMap()],
  },
}
