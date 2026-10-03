import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import {
  isPlatformStaff,
  isSuperAdmin,
  platformStaffOrOwnTenant,
  tenantIdsWithRoles,
  tenantRoleOrPlatform,
} from '@/access'

const user = (data: Record<string, unknown>) => ({
  collection: 'users',
  id: 'u1',
  status: 'active',
  ...data,
})
const call = (access: ReturnType<typeof tenantRoleOrPlatform>, u: unknown) =>
  access({ req: { user: u } as unknown as PayloadRequest })

describe('access functions (docs/05)', () => {
  const owner = user({
    tenants: [
      { tenant: 'A', roles: ['owner'] },
      { tenant: 'B', roles: ['catalog-editor'] },
    ],
  })

  it('recognises platform roles, and a disabled account has none', () => {
    expect(isSuperAdmin(user({ platformRole: 'super-admin' }))).toBe(true)
    expect(isPlatformStaff(user({ platformRole: 'support' }))).toBe(true)
    expect(isSuperAdmin(user({ platformRole: 'super-admin', status: 'disabled' }))).toBe(false)
    expect(isSuperAdmin({ collection: 'customers', platformRole: 'super-admin' })).toBe(false)
  })

  it('finds the stores where a user holds a role', () => {
    expect(tenantIdsWithRoles(owner, ['owner'])).toEqual(['A'])
    expect(tenantIdsWithRoles(owner)).toEqual(['A', 'B'])
    expect(
      tenantIdsWithRoles(
        user({ status: 'disabled', tenants: [{ tenant: 'A', roles: ['owner'] }] }),
      ),
    ).toEqual([])
  })

  it('scopes store staff to their stores and keeps support read-only by default', () => {
    const access = tenantRoleOrPlatform({ roles: ['owner', 'manager'] })
    expect(call(access, owner)).toEqual({ tenant: { in: ['A'] } })
    expect(call(access, user({ tenants: [{ tenant: 'B', roles: ['support'] }] }))).toBe(false)
    expect(call(access, user({ platformRole: 'super-admin' }))).toBe(true)
    expect(call(access, user({ platformRole: 'support' }))).toBe(false)
    expect(
      call(
        tenantRoleOrPlatform({ roles: ['owner'], supportCanAccess: true }),
        user({ platformRole: 'support' }),
      ),
    ).toBe(true)
    expect(call(access, null)).toBe(false)
  })

  it('platform rows: our team sees all, owners see their own store', () => {
    const access = platformStaffOrOwnTenant(['owner'])
    expect(call(access, user({ platformRole: 'support' }))).toBe(true)
    expect(call(access, owner)).toEqual({ tenant: { in: ['A'] } })
  })
})
