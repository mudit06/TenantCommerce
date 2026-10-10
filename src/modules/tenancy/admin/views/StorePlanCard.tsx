import type { Payload } from 'payload'

import { Card, Pill, UsageBar } from '@/admin/ui'
import { labelOf, TENANT_STATUS_TONE } from '@/admin/ui/tones'

import { ordersThisMonth } from '@/modules/reports'

import { usageOf } from '../data'

/**
 * The store's plan and how much of it is used (docs/screens `cms-dashboard`, `sa-vendor` rule 3):
 * the same meters our team sees on the vendor overview.
 */
export async function StorePlanCard({ payload, tenantId }: { payload: Payload; tenantId: string }) {
  const [tenant, staff, orders] = await Promise.all([
    payload.findByID({ collection: 'tenants', id: tenantId, depth: 1, overrideAccess: true }),
    payload.count({
      collection: 'users',
      where: { 'tenants.tenant': { equals: tenantId } },
      overrideAccess: true,
    }),
    ordersThisMonth(payload, tenantId),
  ])
  const plan = typeof tenant.plan === 'object' ? tenant.plan : null
  const usage = usageOf(tenant, staff.totalDocs, orders)
  return (
    <Card
      actions={<Pill tone={TENANT_STATUS_TONE[tenant.status]}>{labelOf(tenant.status)}</Pill>}
      title={plan ? `${plan.name} plan` : 'Plan'}
    >
      <UsageBar label="Products" limit={plan?.limits?.maxProducts} used={usage.products} />
      <UsageBar label="Staff users" limit={plan?.limits?.maxStaffUsers} used={usage.staff} />
      <UsageBar
        format={(n) => `${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })} GB`}
        label="Media storage"
        limit={plan?.limits?.maxStorageGB}
        used={usage.storageBytes / 1024 ** 3}
      />
      <p className="te-muted te-small">Need more room? The platform team changes plans.</p>
    </Card>
  )
}
