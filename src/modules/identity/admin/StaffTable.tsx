import { idOf, PLATFORM_ROLE_LABELS, TENANT_ROLE_LABELS, type TenantRole } from '@/access'
import { adminUrl } from '@/admin/paths'
import { Empty, Pill } from '@/admin/ui'
import { formatDate } from '@/lib/dates'
import type { User } from '@/payload-types'

import { ResendInviteButton } from './ResendInviteButton'

const STATUS_TONE = { invited: 'warning', active: 'success', disabled: 'neutral' } as const

/** Staff list for a store's Staff tab or our Team screen (docs/screens Vendor staff, Team). */
export function StaffTable({
  users,
  tenantId,
  canManage,
}: {
  users: User[]
  tenantId?: string
  canManage: boolean
}) {
  if (users.length === 0) return <Empty>No one yet.</Empty>
  return (
    <table className="te-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>{tenantId ? 'Roles' : 'Role'}</th>
          <th>Status</th>
          <th>Last sign-in</th>
          <th aria-label="Actions" />
        </tr>
      </thead>
      <tbody>
        {users.map((user) => {
          const roles = tenantId
            ? ((user.tenants ?? []).find((row) => idOf(row.tenant) === tenantId)?.roles ?? [])
                .map((role) => TENANT_ROLE_LABELS[role as TenantRole])
                .join(', ')
            : user.platformRole
              ? PLATFORM_ROLE_LABELS[user.platformRole]
              : '—'
          return (
            <tr key={user.id}>
              <td>
                <a className="te-link" href={adminUrl.user(user.id)}>
                  {user.name}
                </a>
              </td>
              <td className="te-small">{user.email}</td>
              <td>{roles || '—'}</td>
              <td>
                <Pill tone={STATUS_TONE[user.status]}>
                  {user.status === 'invited'
                    ? 'Invite sent'
                    : user.status === 'active'
                      ? 'Active'
                      : 'Disabled'}
                </Pill>
              </td>
              <td>{user.lastLoginAt ? formatDate(user.lastLoginAt) : '—'}</td>
              <td>
                {canManage && user.status === 'invited' ? (
                  <ResendInviteButton userId={String(user.id)} />
                ) : null}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
