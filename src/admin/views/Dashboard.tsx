import type { AdminViewServerProps } from 'payload'

import { isPlatformStaff, isSuperAdmin, tenantIdsWithRoles } from '@/access'
import { PlatformDashboard, StoreDashboard } from '@/modules/tenancy/admin'

/** /admin: our team sees the platform dashboard, vendor staff see their store. */
export async function Dashboard(props: AdminViewServerProps) {
  const { req } = props.initPageResult
  const user = req.user
  const name = (user && 'name' in user && typeof user.name === 'string' && user.name) || 'there'
  if (isPlatformStaff(user)) {
    return <PlatformDashboard canEdit={isSuperAdmin(user)} payload={req.payload} userName={name} />
  }
  return (
    <StoreDashboard payload={req.payload} tenantIds={tenantIdsWithRoles(user)} userName={name} />
  )
}
