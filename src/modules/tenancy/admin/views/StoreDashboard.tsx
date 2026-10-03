import type { Payload } from 'payload'
import type { ReactNode } from 'react'

import { Card, Pill, UsageBar } from '@/admin/ui'
import { labelOf, TENANT_STATUS_TONE } from '@/admin/ui/tones'
import { formatDateWithWeekday } from '@/lib/dates'

import { staffCountsByTenant, usageOf } from '../data'

/**
 * What vendor staff see at /admin: their store, its status and plan usage, plus whatever the
 * admin shell adds per store (`extra`: the setup checklist). Sales figures arrive with orders
 * (docs/screens/vendor-cms.md `cms-dashboard`).
 */
export async function StoreDashboard({
  payload,
  tenantIds,
  userName,
  extra,
}: {
  payload: Payload
  tenantIds: string[]
  userName: string
  extra?: (tenant: { id: string; enabledFeatures: string[] }) => ReactNode
}) {
  const [{ docs: tenants }, staff] = await Promise.all([
    payload.find({
      collection: 'tenants',
      where: { id: { in: tenantIds } },
      depth: 1,
      pagination: false,
      overrideAccess: true,
    }),
    staffCountsByTenant(payload),
  ])
  return (
    <div className="te-page">
      <header className="te-page__header">
        <div>
          <h1 className="te-page__title">Hello, {userName.split(' ')[0]}</h1>
          <p className="te-page__subtitle">{formatDateWithWeekday(new Date())}</p>
        </div>
      </header>
      {tenants.map((tenant) => {
        const plan = typeof tenant.plan === 'object' ? tenant.plan : null
        const usage = usageOf(tenant, staff.get(String(tenant.id)) ?? 0)
        return (
          <div className="te-stack" key={tenant.id}>
            <Card
              actions={
                <Pill tone={TENANT_STATUS_TONE[tenant.status]}>{labelOf(tenant.status)}</Pill>
              }
              title={tenant.name}
            >
              {tenant.status === 'suspended' ? (
                <p className="te-text--danger">
                  This store is suspended. Shoppers see “store unavailable” and changes are paused.
                  Contact the platform team.
                </p>
              ) : null}
              <p className="te-muted">{plan ? `${plan.name} plan` : 'No plan'}</p>
              <UsageBar label="Products" limit={plan?.limits?.maxProducts} used={usage.products} />
              <UsageBar
                label="Staff users"
                limit={plan?.limits?.maxStaffUsers}
                used={usage.staff}
              />
              <UsageBar
                format={(n) => `${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })} GB`}
                label="Media storage"
                limit={plan?.limits?.maxStorageGB}
                used={usage.storageBytes / 1024 ** 3}
              />
            </Card>
            {extra?.({ id: String(tenant.id), enabledFeatures: tenant.enabledFeatures ?? [] })}
          </div>
        )
      })}
    </div>
  )
}
