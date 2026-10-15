import { describe, expect, it } from 'vitest'

import { adminAddress, adminHostnames, isAdminHost } from '@/lib/adminHost'

describe('admin only on its own address (docs/19)', () => {
  const production = adminHostnames('https://admin.tenantecom.in', true)
  const development = adminHostnames('http://localhost:3000', false)

  it('serves the admin on ADMIN_URL’s host, with or without a port', () => {
    expect(isAdminHost('admin.tenantecom.in', production)).toBe(true)
    expect(isAdminHost('ADMIN.tenantecom.in:443', production)).toBe(true)
    expect(isAdminHost('localhost:3000', development)).toBe(true)
    expect(isAdminHost('127.0.0.1:3000', development)).toBe(true)
  })

  it('never on a store’s domain', () => {
    expect(isAdminHost('homeorbit.in', production)).toBe(false)
    expect(isAdminHost('home-orbit.localhost:3000', development)).toBe(false)
    expect(isAdminHost('localhost', production)).toBe(false)
    expect(isAdminHost(null, production)).toBe(false)
    expect(isAdminHost('', development)).toBe(false)
  })

  it('sends the admin on a store’s domain to the admin’s own address', () => {
    expect(adminAddress('https://admin.tenantecom.in/')).toBe('https://admin.tenantecom.in/admin')
    expect(adminAddress('not a url')).toBe('http://localhost:3000/admin')
  })
})
