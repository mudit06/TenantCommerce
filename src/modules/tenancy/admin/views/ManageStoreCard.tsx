import type { UIFieldServerComponent } from 'payload'

import { isSuperAdmin } from '@/access'
import { Card } from '@/admin/ui'

import { StoreAccessActions } from './StoreAccessActions'

const AREAS = [
  'Products',
  'Categories',
  'Customers',
  'Affiliates',
  'Orders',
  'Payments',
  'Inventory',
  'Schemes',
  'Coupons',
  'Commissions',
  'Order updates and offers',
  'Reports',
  'Pages and menus',
  'Staff and roles',
  'Settings',
]

/**
 * "Manage this store" on the vendor overview (docs/screens/super-admin.md `sa-vendor` rule 2):
 * what a super admin can change in the store's CMS, and the reason asked before opening it.
 */
export const ManageStoreCard: UIFieldServerComponent = async ({ id, req }) => {
  if (!id || !isSuperAdmin(req.user)) return null
  const tenant = await req.payload
    .findByID({
      collection: 'tenants',
      id,
      depth: 0,
      overrideAccess: true,
      select: { status: true },
    })
    .catch(() => null)
  if (!tenant || tenant.status === 'archived') return null
  return (
    <Card title="Manage this store">
      <ul className="te-chips" aria-label="What you can change">
        {AREAS.map((area) => (
          <li key={area}>{area}</li>
        ))}
        <li className="te-chips__later" title="Phase 2">
          Dealers, retailers, wholesalers, designers · P2
        </li>
      </ul>
      <StoreAccessActions canManage inline tenantId={String(id)} />
    </Card>
  )
}
