import type { UIFieldServerComponent } from 'payload'

import { isSuperAdmin } from '@/access'
import { Pill } from '@/admin/ui'
import { labelOf, TENANT_STATUS_TONE } from '@/admin/ui/tones'
import { formatDate } from '@/lib/dates'
import { GST_STATES, isGstStateCode } from '@/lib/gst/gstin'

import { INDUSTRIES } from '../../constants'
import { StatusActions } from './StatusActions'

/** Top of the vendor overview: who this is, its status and plan, and the store actions. */
export const VendorHeader: UIFieldServerComponent = async ({ id, req }) => {
  if (!id) return null
  const { payload } = req
  const tenant = await payload
    .findByID({ collection: 'tenants', id, depth: 1, overrideAccess: false, user: req.user })
    .catch(() => null)
  if (!tenant) return null
  const { docs: domains } = await payload.find({
    collection: 'tenant-domains',
    where: { and: [{ tenant: { equals: id } }, { isPrimary: { equals: true } }] },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const primary = domains[0]?.host
  const storeUrl = primary
    ? `${primary.endsWith('localhost') ? 'http' : 'https'}://${primary}${primary.endsWith('localhost') ? ':3000' : ''}`
    : undefined
  const plan = typeof tenant.plan === 'object' ? tenant.plan : null
  const industries = (tenant.industry ?? [])
    .map((value) => INDUSTRIES.find((industry) => industry.value === value)?.label ?? value)
    .join(', ')
  const state =
    tenant.stateCode && isGstStateCode(tenant.stateCode) ? GST_STATES[tenant.stateCode] : null
  const city = tenant.registeredAddress?.city

  return (
    <div className="te-vendor-header">
      <div className="te-vendor-header__meta">
        <Pill tone={TENANT_STATUS_TONE[tenant.status]}>
          Store {labelOf(tenant.status).toLowerCase()}
        </Pill>
        {plan ? <Pill tone="info">{plan.name} plan</Pill> : null}
        {primary ? (
          <span className="te-mono">{primary}</span>
        ) : (
          <span className="te-muted">No domain yet</span>
        )}
        <span className="te-muted">
          {[industries, [city, state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
        </span>
        {tenant.activatedAt ? (
          <span className="te-muted">Live since {formatDate(tenant.activatedAt)}</span>
        ) : null}
      </div>
      {isSuperAdmin(req.user) ? (
        <StatusActions status={tenant.status} storeUrl={storeUrl} tenantId={String(tenant.id)} />
      ) : null}
    </div>
  )
}
