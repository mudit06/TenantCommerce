import type { UIFieldServerComponent } from 'payload'

import { Card, UsageBar } from '@/admin/ui'

/** Plan usage meters (docs/screens Vendor overview). Vendors see the same meters in their CMS. */
export const PlanUsage: UIFieldServerComponent = async ({ id, req }) => {
  if (!id) return null
  const { payload } = req
  const tenant = await payload
    .findByID({ collection: 'tenants', id, depth: 1, overrideAccess: false, user: req.user })
    .catch(() => null)
  if (!tenant) return null
  const plan = typeof tenant.plan === 'object' ? tenant.plan : null
  const { totalDocs: staff } = await payload.count({
    collection: 'users',
    where: { 'tenants.tenant': { equals: id } },
    overrideAccess: true,
  })
  const gb = (tenant.usage?.storageBytes ?? 0) / 1024 ** 3
  return (
    <Card className="te-card--sidebar" title="Plan usage">
      <UsageBar
        label="Products"
        limit={plan?.limits?.maxProducts}
        used={tenant.usage?.productsCount ?? 0}
      />
      <UsageBar label="Staff users" limit={plan?.limits?.maxStaffUsers} used={staff} />
      <UsageBar
        format={(n) => `${n.toLocaleString('en-IN', { maximumFractionDigits: 1 })} GB`}
        label="Storage"
        limit={plan?.limits?.maxStorageGB}
        used={gb}
      />
      <UsageBar
        label="Orders this month"
        limit={plan?.limits?.maxOrdersPerMonth}
        used={tenant.usage?.ordersThisMonth ?? 0}
      />
    </Card>
  )
}
