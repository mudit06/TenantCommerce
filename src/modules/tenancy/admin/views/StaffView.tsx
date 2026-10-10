import type { DocumentViewServerProps } from 'payload'

import { isPlatformStaff, isSuperAdmin } from '@/access'
import { Notice, UsageBar } from '@/admin/ui'
import { InviteToggle, StaffTable } from '@/modules/identity/admin'

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
  const full = max !== undefined && max !== null && staff.length >= max
  const canManage = isSuperAdmin(req.user)
  return (
    <div className="te-page te-page--tab">
      <div className="te-staff-head">
        <div className="te-staff-head__usage">
          <UsageBar label="Staff users" limit={max} used={staff.length} />
        </div>
        {canManage ? (
          <InviteToggle
            disabledReason={
              full ? 'The plan’s staff limit is reached. Change the plan first.' : undefined
            }
            tenantId={tenantId}
          />
        ) : null}
      </div>
      <div className="te-card te-card--table">
        <StaffTable
          canManage={canManage}
          canResetTwoStep={canManage}
          tenantId={tenantId}
          users={staff}
        />
      </div>
      <p className="te-muted te-small">
        Platform team can manage every vendor’s staff · Two-step resets are logged. Roles are per
        store; vendor owners manage the same list in their CMS.
      </p>
    </div>
  )
}
