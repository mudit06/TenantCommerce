import { getTenantFromCookie } from '@payloadcms/plugin-multi-tenant/utilities'
import type { AdminViewServerProps } from 'payload'

import {
  isPlatformStaff,
  ROLE_SUMMARY,
  storeSessionOf,
  TENANT_ROLE_LABELS,
  TENANT_ROLES,
  tenantIdsWithRoles,
} from '@/access'
import { Card, Notice, UsageBar } from '@/admin/ui'
import { AdminScreen } from '@/admin/ui/AdminScreen'
import { requireSignedIn } from '@/admin/session/requireSignedIn'
import { adminUrl } from '@/admin/paths'

import { InviteForm } from './InviteForm'
import { StaffTable } from './StaffTable'

const MARK = { yes: '✓', read: 'read', no: '—' } as const

/** Staff and roles (docs/screens/vendor-cms.md `cms-staff`): owners invite and manage colleagues. */
export async function StoreStaffView(view: AdminViewServerProps) {
  return (
    <AdminScreen view={view}>
      <StoreStaff view={view} />
    </AdminScreen>
  )
}

async function StoreStaff({ view }: { view: AdminViewServerProps }) {
  const { req } = view.initPageResult
  requireSignedIn(req.user, adminUrl.staff)
  const owned = tenantIdsWithRoles(req.user, ['owner'])
  const selected = getTenantFromCookie(req.headers, 'text')
  // Our team works on a store's staff while managing that store (docs/05), or on the vendor's
  // Staff tab in the platform panel
  const session = storeSessionOf(req.user)
  const platform = isPlatformStaff(req.user)
  const tenantId = platform
    ? session?.mode === 'manage'
      ? session.tenantId
      : undefined
    : selected && owned.includes(String(selected))
      ? String(selected)
      : owned[0]
  if (!tenantId) {
    return (
      <div className="te-page">
        <Notice tone={platform ? 'info' : 'danger'}>
          {platform
            ? 'Open the store with “Manage store” to change its staff here, or use the vendor’s Staff tab.'
            : 'Only the store owner manages staff.'}
        </Notice>
      </div>
    )
  }
  const [tenant, { docs: staff }] = await Promise.all([
    req.payload.findByID({
      collection: 'tenants',
      id: tenantId,
      depth: 1,
      overrideAccess: true,
      req,
    }),
    req.payload.find({
      collection: 'users',
      where: { 'tenants.tenant': { equals: tenantId } },
      sort: 'name',
      depth: 0,
      pagination: false,
      overrideAccess: true,
      req,
    }),
  ])
  const max = typeof tenant.plan === 'object' ? tenant.plan?.limits?.maxStaffUsers : undefined
  const full = max !== undefined && max !== null && staff.length >= max
  return (
    <div className="te-page">
      <header className="te-page__header">
        <div>
          <h1 className="te-page__title">Staff and roles</h1>
          <p className="te-page__subtitle">
            {tenant.name} · {staff.length}
            {max ? ` of ${max}` : ''} staff accounts
          </p>
        </div>
      </header>
      <div className="te-grid te-grid--2-1">
        <div className="te-stack">
          <Card title="Staff">
            <UsageBar label="Staff accounts" limit={max} used={staff.length} />
            <StaffTable canManage tenantId={tenantId} users={staff} />
          </Card>
          <Card title="What each role can do">
            <div style={{ overflowX: 'auto' }}>
              <table className="te-table">
                <thead>
                  <tr>
                    <th />
                    {TENANT_ROLES.map((role) => (
                      <th key={role}>{TENANT_ROLE_LABELS[role]}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROLE_SUMMARY.map((row) => (
                    <tr key={row.area}>
                      <td>{row.area}</td>
                      {TENANT_ROLES.map((role) => (
                        <td
                          className={row.access[role] === 'no' ? 'te-muted' : undefined}
                          key={role}
                        >
                          {MARK[row.access[role]]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="te-muted te-small">
              One person can have more than one role. Payment keys, staff and payouts stay with the
              owner, so a manager can’t redirect payments or add accounts.
            </p>
          </Card>
        </div>
        <Card title="Invite staff">
          <InviteForm
            disabledReason={
              full
                ? 'Your plan’s staff limit is reached. Ask the platform team about a bigger plan.'
                : undefined
            }
            tenantId={tenantId}
          />
        </Card>
      </div>
    </div>
  )
}
