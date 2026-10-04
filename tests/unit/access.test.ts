import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import {
  isPlatformStaff,
  isSuperAdmin,
  platformStaffOrOwnTenant,
  storeSessionOf,
  tenantIdsWithRoles,
  tenantRoleOrPlatform,
  workspaceOf,
} from '@/access'
import { platformScreen, storeScreen } from '@/admin/workspace'

const user = (data: Record<string, unknown>) => ({
  collection: 'users',
  id: 'u1',
  status: 'active',
  ...data,
})
const call = (
  access: ReturnType<typeof tenantRoleOrPlatform>,
  u: unknown,
  data?: Record<string, unknown>,
) => access({ req: { user: u } as unknown as PayloadRequest, data })

const inTwoHours = () => new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
const session = (mode: 'manage' | 'view', tenant: unknown = 'A', endsAt = inTwoHours()) => ({
  storeSession: { tenant, mode, reason: 'Vendor asked for help', endsAt },
})

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
    expect(call(access, null)).toBe(false)
  })

  it('platform rows: our team sees all, owners see their own store', () => {
    const access = platformStaffOrOwnTenant(['owner'])
    expect(call(access, user({ platformRole: 'support' }))).toBe(true)
    expect(call(access, owner)).toEqual({ tenant: { in: ['A'] } })
  })

  it('keeps per-store platform data (feature switches) reachable from the platform panel', () => {
    expect(
      call(
        tenantRoleOrPlatform({ roles: ['owner'], platformOutsideStore: true }),
        user({ platformRole: 'super-admin' }),
      ),
    ).toBe(true)
    expect(
      call(
        tenantRoleOrPlatform({ roles: ['owner'], platformOutsideStore: true }),
        user({ platformRole: 'support' }),
      ),
    ).toBe(false)
  })
})

describe('store sessions: Manage store and View as support (docs/05)', () => {
  const read = tenantRoleOrPlatform({ roles: ['owner'], supportCanAccess: true })
  const write = tenantRoleOrPlatform({ roles: ['owner'] })
  const admin = user({ platformRole: 'super-admin' })
  const support = user({ platformRole: 'support' })

  it('gives our team no store data without a session', () => {
    expect(call(read, admin)).toBe(false)
    expect(call(write, admin)).toBe(false)
    expect(call(read, support)).toBe(false)
    expect(workspaceOf(admin)).toBe('platform')
    expect(workspaceOf(user({ tenants: [{ tenant: 'A', roles: ['owner'] }] }))).toBe('store')
  })

  it('scopes a super admin managing a store to that store, reads and writes', () => {
    const managing = user({ platformRole: 'super-admin', ...session('manage') })
    expect(workspaceOf(managing)).toBe('store')
    expect(call(read, managing)).toEqual({ tenant: { in: ['A'] } })
    expect(call(write, managing, { tenant: 'A' })).toEqual({ tenant: { in: ['A'] } })
    expect(call(write, managing, { tenant: 'B' })).toBe(false)
  })

  it('keeps View as support read-only, and support can never manage', () => {
    const viewing = user({ platformRole: 'super-admin', ...session('view') })
    expect(call(read, viewing)).toEqual({ tenant: { in: ['A'] } })
    expect(call(write, viewing)).toBe(false)
    const supportManaging = user({ platformRole: 'support', ...session('manage') })
    expect(storeSessionOf(supportManaging)?.mode).toBe('view')
    expect(call(write, supportManaging)).toBe(false)
  })

  it('ends a session at its end time and ignores sessions on store staff', () => {
    const expired = user({
      platformRole: 'super-admin',
      ...session('manage', 'A', new Date(Date.now() - 1000).toISOString()),
    })
    expect(storeSessionOf(expired)).toBeNull()
    expect(call(read, expired)).toBe(false)
    expect(storeSessionOf(user({ ...session('manage') }))).toBeNull()
  })

  it('reads the store name and features from a populated session', () => {
    const populated = user({
      platformRole: 'super-admin',
      ...session('manage', {
        id: 'A',
        name: 'Home Orbit',
        slug: 'home-orbit',
        enabledFeatures: ['enquiries'],
      }),
    })
    expect(storeSessionOf(populated)).toMatchObject({
      tenantId: 'A',
      tenantName: 'Home Orbit',
      enabledFeatures: ['enquiries'],
    })
  })

  it('shows each workspace only its own screens', () => {
    const store = storeScreen({ slug: 'pages', fields: [] }).admin?.hidden as (args: {
      user: unknown
    }) => boolean
    const platform = platformScreen({ slug: 'plans', fields: [] }).admin?.hidden as (args: {
      user: unknown
    }) => boolean
    const managing = user({ platformRole: 'super-admin', ...session('manage') })
    expect(store({ user: admin })).toBe(true)
    expect(store({ user: managing })).toBe(false)
    expect(platform({ user: admin })).toBe(false)
    expect(platform({ user: managing })).toBe(true)
  })
})
