import { describe, expect, it } from 'vitest'

import { safeRedirect } from '@/modules/identity/admin/safeRedirect'

describe('after sign-in redirect (sa-login)', () => {
  it('keeps addresses inside the admin', () => {
    expect(safeRedirect('/admin/collections/tenants')).toBe('/admin/collections/tenants')
    expect(safeRedirect('/admin/team')).toBe('/admin/team')
    expect(safeRedirect('/admin')).toBe('/admin')
  })

  it('sends anything else to the dashboard', () => {
    expect(safeRedirect('https://evil.example/admin')).toBe('/admin')
    expect(safeRedirect('//evil.example')).toBe('/admin')
    expect(safeRedirect('/administrator')).toBe('/admin')
    expect(safeRedirect('/admin/login?redirect=/admin')).toBe('/admin')
    expect(safeRedirect(undefined)).toBe('/admin')
    expect(safeRedirect(['/admin/team'])).toBe('/admin')
  })
})
