import { idOf, PLATFORM_ROLE_LABELS, TENANT_ROLE_LABELS, type TenantRole } from '@/access'
import { adminUrl } from '@/admin/paths'
import { Empty, Pill } from '@/admin/ui'
import { calendarDaysBetween, formatDayMonth, formatTime } from '@/lib/dates'
import type { User } from '@/payload-types'

import { MemberActions } from './MemberActions'
import { ResendInviteButton } from './ResendInviteButton'
import { ResetTwoStepButton } from './ResetTwoStepButton'

/** "Today 09:05", "Yesterday", "28 Sep" (the wireframes' Last sign-in) */
function lastSignIn(at: string | null | undefined, now = new Date()): string {
  if (!at) return 'Never'
  const days = calendarDaysBetween(new Date(at), now)
  if (days === 0) return `Today ${formatTime(at)}`
  if (days === 1) return 'Yesterday'
  return formatDayMonth(at)
}

/**
 * Staff list for a store's Staff and roles, the vendor's Staff tab or our Team screen
 * (docs/screens `cms-staff`, `sa-vendor-staff`, `sa-team`): name, email, roles, two-step and
 * last sign-in, with the actions the viewer may take.
 */
export function StaffTable({
  users,
  tenantId,
  canManage,
  canResetTwoStep = false,
}: {
  users: User[]
  tenantId?: string
  canManage: boolean
  /** Super admins reset two-step for someone who lost their phone */
  canResetTwoStep?: boolean
}) {
  if (users.length === 0) return <Empty>No one yet.</Empty>
  return (
    <div className="te-table-scroll">
      <table className="te-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>{tenantId ? 'Roles' : 'Role'}</th>
            <th>Two-step</th>
            <th>Last sign-in</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const storeRoles = tenantId
              ? ((user.tenants ?? []).find((row) => idOf(row.tenant) === tenantId)?.roles ?? [])
              : []
            const roles: string[] = tenantId
              ? storeRoles.map((role) => TENANT_ROLE_LABELS[role as TenantRole])
              : user.platformRole
                ? [PLATFORM_ROLE_LABELS[user.platformRole]]
                : []
            const owner = tenantId
              ? storeRoles.includes('owner')
              : user.platformRole === 'super-admin'
            return (
              <tr key={user.id}>
                <td>
                  <a className="te-table__primary" href={adminUrl.user(user.id)}>
                    {user.name}
                  </a>
                  {user.status === 'invited' ? (
                    <div className="te-small te-text--warning">Invite sent, not accepted yet</div>
                  ) : user.status === 'disabled' ? (
                    <div className="te-small te-muted">Disabled</div>
                  ) : null}
                </td>
                <td className="te-small">{user.email}</td>
                <td>
                  <span className="te-pill-row">
                    {roles.length
                      ? roles.map((role, index) => (
                          <Pill key={role} tone={owner && index === 0 ? 'success' : 'neutral'}>
                            {role}
                          </Pill>
                        ))
                      : '—'}
                  </span>
                </td>
                <td>
                  {user.twoFactorEnabled ? (
                    <Pill tone="success">On</Pill>
                  ) : (
                    <Pill tone="neutral">Off</Pill>
                  )}
                </td>
                <td className="te-nowrap">
                  {user.status === 'invited' ? '—' : lastSignIn(user.lastLoginAt)}
                </td>
                <td className="te-cell-actions">
                  {canManage && user.status === 'invited' ? (
                    <ResendInviteButton userId={String(user.id)} />
                  ) : null}
                  {canResetTwoStep && user.twoFactorEnabled ? (
                    <ResetTwoStepButton name={user.name} userId={String(user.id)} />
                  ) : null}
                  {canManage && tenantId && !user.platformRole ? (
                    <MemberActions
                      name={user.name}
                      roles={storeRoles}
                      tenantId={tenantId}
                      userId={String(user.id)}
                    />
                  ) : null}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
