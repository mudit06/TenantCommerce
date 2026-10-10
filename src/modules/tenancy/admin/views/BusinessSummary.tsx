import type { UIFieldServerComponent } from 'payload'

import { isPlatformStaff, isSuperAdmin } from '@/access'
import { Card } from '@/admin/ui'
import { formatDate } from '@/lib/dates'
import { GST_STATES, isGstStateCode } from '@/lib/gst/gstin'

import { INDUSTRIES } from '../../constants'
import { EditDetailsButton } from './EditDetailsButton'

/**
 * Business details read-only, as the wireframe's vendor overview shows them, with Edit opening
 * the form fields below (docs/screens/super-admin.md `sa-vendor`).
 */
export const BusinessSummary: UIFieldServerComponent = async ({ id, req }) => {
  if (!id || !isPlatformStaff(req.user)) return null
  const tenant = await req.payload
    .findByID({ collection: 'tenants', id, depth: 1, overrideAccess: true })
    .catch(() => null)
  if (!tenant) return null
  const state =
    tenant.stateCode && isGstStateCode(tenant.stateCode)
      ? `${GST_STATES[tenant.stateCode]} (${tenant.stateCode})`
      : '—'
  const address = tenant.registeredAddress
  const createdBy = typeof tenant.createdBy === 'object' ? tenant.createdBy?.name : null
  const rows: [string, React.ReactNode][] = [
    ['Legal name', tenant.legalName],
    [
      'GSTIN',
      <span className="te-mono" key="gstin">
        {tenant.gstin ?? '—'}
      </span>,
    ],
    [
      'PAN',
      <span className="te-mono" key="pan">
        {tenant.pan ?? '—'}
      </span>,
    ],
    ['GST state', state],
    [
      'Registered address',
      address
        ? [address.line1, address.line2, address.city, address.pincode].filter(Boolean).join(', ')
        : '—',
    ],
    [
      'Industry',
      (tenant.industry ?? [])
        .map((value) => INDUSTRIES.find((i) => i.value === value)?.label ?? value)
        .join(', ') || '—',
    ],
    ['Support email', tenant.supportEmail ?? '—'],
    ['Support phone', tenant.supportPhone ?? '—'],
    ['WhatsApp', tenant.whatsappNumber ?? '—'],
    [
      'Store address',
      <span className="te-mono" key="slug">
        {tenant.slug}
      </span>,
    ],
    ['Created', `${formatDate(tenant.createdAt)}${createdBy ? ` by ${createdBy}` : ''}`],
    ['Went live', tenant.activatedAt ? formatDate(tenant.activatedAt) : 'Not live yet'],
  ]
  return (
    <Card actions={isSuperAdmin(req.user) ? <EditDetailsButton /> : null} title="Business details">
      <dl className="te-dl te-dl--grid">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}
