import type { UIFieldServerComponent } from 'payload'

import { isPlatformStaff, isSuperAdmin } from '@/access'
import { primaryHostOf, storeUrlForHost } from '@/admin/store'
import { Pill } from '@/admin/ui'
import { labelOf, TENANT_STATUS_TONE } from '@/admin/ui/tones'
import { formatDate } from '@/lib/dates'
import { GST_STATES, isGstStateCode } from '@/lib/gst/gstin'

import { INDUSTRIES } from '../../constants'
import { StatusActions } from './StatusActions'
import { StoreAccessActions } from './StoreAccessActions'

/** Top of the vendor overview: who this is, its status and plan, and the store actions. */
export const VendorHeader: UIFieldServerComponent = async ({ id, req }) => {
  if (!id) return null
  const { payload } = req
  const tenant = await payload
    .findByID({ collection: 'tenants', id, depth: 1, overrideAccess: false, user: req.user })
    .catch(() => null)
  if (!tenant) return null
  const primary = await primaryHostOf(payload, String(id))
  const storeUrl = storeUrlForHost(primary)
  const plan = typeof tenant.plan === 'object' ? tenant.plan : null
  const industries = (tenant.industry ?? [])
    .map((value) => INDUSTRIES.find((industry) => industry.value === value)?.label ?? value)
    .join(', ')
  const state =
    tenant.stateCode && isGstStateCode(tenant.stateCode) ? GST_STATES[tenant.stateCode] : null
  const city = tenant.registeredAddress?.city
  // The store's own logo from its settings (vendors upload it in their CMS)
  const { docs: settings } = await payload.find({
    collection: 'site-settings',
    where: { tenant: { equals: id } },
    depth: 1,
    limit: 1,
    overrideAccess: true,
    select: { logo: true },
  })
  const logo = settings[0]?.logo
  const logoUrl =
    logo && typeof logo === 'object' ? (logo.sizes?.thumb?.url ?? logo.url ?? null) : null
  const initials = tenant.name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div className="te-vendor-header">
      <div className="te-vendor-header__identity">
        <span
          aria-hidden
          className="te-vendor-header__logo"
          style={logoUrl ? { backgroundImage: `url(${logoUrl})` } : undefined}
        >
          {logoUrl ? null : initials}
        </span>
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
      </div>
      <div className="te-vendor-header__actions">
        {isSuperAdmin(req.user) ? (
          <StatusActions status={tenant.status} storeUrl={storeUrl} tenantId={String(tenant.id)} />
        ) : null}
        {isPlatformStaff(req.user) && tenant.status !== 'archived' ? (
          // Work inside the store's own CMS (docs/05): a separate workspace, reason asked once
          <StoreAccessActions canManage={isSuperAdmin(req.user)} tenantId={String(tenant.id)} />
        ) : null}
      </div>
    </div>
  )
}
