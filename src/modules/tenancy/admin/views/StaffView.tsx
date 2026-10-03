import type { DocumentViewServerProps } from 'payload'

import { isPlatformStaff, isSuperAdmin } from '@/access'
import { Card, Notice, UsageBar } from '@/admin/ui'
import { InviteForm, StaffTable } from '@/modules/identity/admin'

/** Vendor detail, Staff tab (docs/screens/super-admin.md "Vendor staff"). */
export async function StaffView({ initPageResult }: DocumentViewServerProps) {
  const { req } = initPageResult
  const tenantId = initPageResult.docID ? String(initPageResult.docID) : null
  if (!isPlatformStaff(req.user) || !tenantId) return <Notice tone="danger">Our team only.</Notice>
  const [tenant, { docs: staff }] = await Promise.all([
    req.payload.findByID({ collection: 'tenants', id: tenantId, depth: 1, overrideAccess: true }),
    req.payload.find({
      collection: 'users',
      where: { 'tenants.tenant': { equals: tenantId } },
      sort: 'name',
      depth: 0,
      pagination: false,
      overrideAccess: true,
    }),
  ])
  const max = typeof tenant.plan === 'object' ? tenant.plan?.limits?.maxStaffUsers : undefined
  const full = max !== undefined && staff.length >= max
  const canManage = isSuperAdmin(req.user)
  return (
    <div className="te-page te-page--tab">
      <div className="te-grid te-grid--2-1">
        <Card title="Staff">
          <UsageBar label="Staff users" limit={max} used={staff.length} />
          <StaffTable canManage={canManage} tenantId={tenantId} users={staff} />
          <p className="te-muted te-small">
            Roles are per store: one person can work for two stores with different roles. Vendor
            owners manage the same list in their CMS.
          </p>
        </Card>
        {canManage ? (
          <Card title="Invite staff">
            <InviteForm
              disabledReason={
                full ? 'The plan’s staff limit is reached. Change the plan first.' : undefined
              }
              tenantId={tenantId}
            />
          </Card>
        ) : null}
      </div>
    </div>
  )
}
