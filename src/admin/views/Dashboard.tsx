import type { AdminViewServerProps } from 'payload'

import { isSuperAdmin, workspaceOf } from '@/access'
import { PlatformDashboard } from '@/modules/tenancy/admin'

import { StoreHome } from './StoreHome'

/**
 * /admin: the platform dashboard for our team, the store dashboard for a store's staff and for
 * our team while a store session is open (docs/05).
 */
export async function Dashboard({ initPageResult }: AdminViewServerProps) {
  const { req, permissions } = initPageResult
  const user = req.user
  if (workspaceOf(user) === 'platform') {
    const name = (user && 'name' in user && typeof user.name === 'string' && user.name) || 'there'
    return <PlatformDashboard canEdit={isSuperAdmin(user)} payload={req.payload} userName={name} />
  }
  return <StoreHome payload={req.payload} permissions={permissions} user={user} />
}
