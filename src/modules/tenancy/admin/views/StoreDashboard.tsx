import type { Payload } from 'payload'

import { Card, Empty, Pill, UsageBar } from '@/admin/ui'
import { labelOf, TENANT_STATUS_TONE } from '@/admin/ui/tones'
import { formatDateWithWeekday } from '@/lib/dates'

import { staffCountsByTenant, usageOf } from '../data'

/**
 * What vendor staff see at /admin until the vendor CMS screens exist: their store, its plan
 * usage and status. The full store dashboard (docs/screens/vendor-cms.md) replaces it.
 */
export async function StoreDashboard({
  payload,
  tenantIds,
  userName,
}: {
  payload: Payload
  tenantIds: string[]
  userName: string
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
          <Card
            actions={<Pill tone={TENANT_STATUS_TONE[tenant.status]}>{labelOf(tenant.status)}</Pill>}
            key={tenant.id}
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
            <UsageBar label="Staff users" limit={plan?.limits?.maxStaffUsers} used={usage.staff} />
            <Empty>
              Catalog, orders and the rest of your CMS arrive in the next sprints. Your platform
              team will tell you when they are ready.
            </Empty>
          </Card>
        )
      })}
    </div>
  )
}
