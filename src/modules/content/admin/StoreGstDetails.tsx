import type { UIFieldServerComponent } from 'payload'

import { idOf } from '@/access'
import { GST_STATES, isGstStateCode } from '@/lib/gst/gstin'

/** GSTIN and legal name come from the vendor record our team created; vendors can't edit them. */
export const StoreGstDetails: UIFieldServerComponent = async ({ data, req }) => {
  const tenantId = idOf((data as { tenant?: unknown } | undefined)?.tenant)
  if (!tenantId) return null
  const tenant = await req.payload
    .findByID({ collection: 'tenants', id: tenantId, depth: 0, overrideAccess: true })
    .catch(() => null)
  if (!tenant) return null
  const state =
    tenant.stateCode && isGstStateCode(tenant.stateCode) ? GST_STATES[tenant.stateCode] : null
  return (
    <div className="te-notice te-notice--neutral" style={{ marginBottom: 24 }}>
      <dl className="te-dl">
        <dt>GSTIN</dt>
        <dd className="te-mono">
          {tenant.gstin ?? '—'}
          {state ? ` · ${state} (${tenant.stateCode})` : ''}
        </dd>
        <dt>Legal name</dt>
        <dd>{tenant.legalName}</dd>
      </dl>
      <p className="te-muted te-small" style={{ margin: '8px 0 0' }}>
        Set by the platform team. Ask them to change it.
      </p>
    </div>
  )
}
