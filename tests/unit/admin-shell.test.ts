import { describe, expect, it } from 'vitest'

import { buildMenu, isActive } from '@/admin/nav/menu'
import { BLOCK_META } from '@/blocks/meta'
import { signPreviewToken, verifyPreviewToken } from '@/lib/preview-token'
import { storeOriginForHost } from '@/lib/storeOrigin'

// The admin shell (docs/screens vendor CMS and super admin "Menu") and the editor's draft
// preview links (docs/screens Page builder rule 4)

const keys = (sections: ReturnType<typeof buildMenu>) =>
  sections.flatMap((section) => section.items.map((item) => item.key))

describe('admin menu per workspace', () => {
  const visible = new Set(['pages', 'media', 'products', 'tenants', 'plans', 'users', 'enquiries'])

  it('shows a store only its CMS screens, and only those Payload lets the user see', () => {
    const menu = keys(
      buildMenu({
        workspace: 'store',
        visibleCollections: visible,
        isSuperAdmin: false,
        canManageStaff: false,
      }),
    )
    // Grouped as the wireframe: Catalog, Sales, Marketing, Content, Store, Insights
    expect(menu).toEqual(['dashboard', 'products', 'media', 'enquiries', 'pages'])
    expect(
      keys(
        buildMenu({
          workspace: 'store',
          visibleCollections: visible,
          isSuperAdmin: false,
          canManageStaff: true,
        }),
      ),
    ).toContain('staff')
  })

  it('shows each role its own screens, built ones following collection access', () => {
    const owner = buildMenu({
      workspace: 'store',
      visibleCollections: visible,
      isSuperAdmin: false,
      canManageStaff: true,
      storeRoles: ['owner'],
      features: ['affiliate'],
    })
    const items = owner.flatMap((section) => section.items)
    expect(owner.map((section) => section.label)).toEqual([
      undefined,
      'Catalog',
      'Sales',
      // Every Marketing screen is built now and follows collection access (none visible here)
      'Content',
      'Store',
      'Insights',
    ])
    expect(items.find((item) => item.key === 'import')).toMatchObject({ href: '/admin/import' })
    expect(items.some((item) => item.soon)).toBe(false)
    // Customers is built: it follows collection access like any other screen
    expect(items.map((item) => item.key)).not.toContain('customers')

    const editor = keys(
      buildMenu({
        workspace: 'store',
        visibleCollections: visible,
        isSuperAdmin: false,
        canManageStaff: false,
        storeRoles: ['content-editor'],
        features: ['affiliate'],
      }),
    )
    expect(editor).not.toContain('customers')
    expect(editor).not.toContain('affiliates')
    // A soon entry never counts as the current screen
    expect(isActive({ href: '' }, '/admin/account')).toBe(false)
  })

  it('shows our team only the platform panel outside a store session', () => {
    const menu = keys(
      buildMenu({
        workspace: 'platform',
        visibleCollections: visible,
        isSuperAdmin: true,
        canManageStaff: false,
      }),
    )
    expect(menu).toEqual(['dashboard', 'tenants', 'new-vendor', 'plans', 'team', 'users'])
    expect(
      keys(
        buildMenu({
          workspace: 'platform',
          visibleCollections: visible,
          isSuperAdmin: false,
          canManageStaff: false,
        }),
      ),
    ).not.toContain('new-vendor')
  })

  it('marks the current screen, the page type chooser under Pages', () => {
    const pages = { href: '/admin/collections/pages', alsoActive: ['/admin/new-page'] }
    expect(isActive(pages, '/admin/collections/pages/abc')).toBe(true)
    expect(isActive(pages, '/admin/new-page')).toBe(true)
    expect(isActive({ href: '/admin', exact: true }, '/admin/collections/pages')).toBe(false)
  })
})

describe('draft preview links', () => {
  const secret = 'a-secret-of-at-least-thirty-two-characters!'
  const now = Date.UTC(2026, 9, 4, 6, 0)

  it('accepts its own link for that page and store until it expires', async () => {
    const token = await signPreviewToken({ pageId: 'p1', tenantId: 't1' }, secret, now)
    expect(await verifyPreviewToken(token, secret, now + 1000)).toMatchObject({
      pageId: 'p1',
      tenantId: 't1',
    })
    expect(await verifyPreviewToken(token, secret, now + 9 * 3600_000)).toBeNull()
  })

  it('refuses a changed, forged or missing link', async () => {
    const token = await signPreviewToken({ pageId: 'p1', tenantId: 't1' }, secret, now)
    const [body, signature] = token.split('.')
    const otherBody = btoa(JSON.stringify({ p: 'p2', t: 't1', e: now + 3600_000 })).replace(
      /=+$/,
      '',
    )
    expect(await verifyPreviewToken(`${otherBody}.${signature}`, secret, now)).toBeNull()
    expect(
      await verifyPreviewToken(token, 'another-secret-of-thirty-two-characters', now),
    ).toBeNull()
    expect(await verifyPreviewToken(`${body}`, secret, now)).toBeNull()
    expect(await verifyPreviewToken(null, secret, now)).toBeNull()
  })

  it('points at the store’s own domain', () => {
    expect(storeOriginForHost('home-orbit.localhost', 'http://localhost:3000')).toBe(
      'http://home-orbit.localhost:3000',
    )
    expect(storeOriginForHost('shop.homeorbit.in')).toBe('https://shop.homeorbit.in')
  })
})

describe('page builder block rows', () => {
  it('names a block by its content', () => {
    expect(BLOCK_META.hero!.summary({ slides: [{ heading: 'Bathrooms that last' }] })).toBe(
      'Bathrooms that last',
    )
    expect(BLOCK_META.faq!.summary({ items: [{}, {}] })).toBe('2 questions')
    expect(BLOCK_META.faq!.summary({ heading: 'Help' })).toBe('Help')
  })
})
