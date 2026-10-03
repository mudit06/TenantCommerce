import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { withTransaction } from '@/lib/db/transaction'
import { changeStaffRoles, inviteStaff, removeFromStore } from '@/modules/identity'
import { createTenant, setFeature } from '@/modules/tenancy'
import type { Plan, Tenant } from '@/payload-types'

import {
  createPlatformUser,
  onboardingInput,
  reqAs,
  seedPlans,
  startPayload,
  stopPayload,
  userByEmail,
  type TestUser,
} from './helpers'

// Vendor CMS stage A (docs/progress.md): store content and catalog collections, their tenant
// isolation and role rules (docs/04, docs/05), feature switches (docs/08) and numbering.

let payload: Payload
let plans: Record<string, Plan>
let admin: TestUser
let support: TestUser
let storeA: Tenant
let storeB: Tenant
let ownerA: TestUser
let ownerB: TestUser

const idA = () => String(storeA.id)
const idB = () => String(storeB.id)

async function onboard(slug: string, planId: string, ownerEmail: string, industry?: string[]) {
  const req = await reqAs(payload, admin)
  return (
    await withTransaction(req, () =>
      createTenant(req, onboardingInput(slug, { planId, ownerEmail, industry })),
    )
  ).tenant
}

async function staff(email: string, roles: string[], tenantId: string): Promise<TestUser> {
  const req = await reqAs(payload, admin)
  await withTransaction(req, () =>
    inviteStaff(
      req,
      { email, name: email.split('@')[0]!, tenantId, roles: roles as never },
      { sendEmail: false },
    ),
  )
  return userByEmail(payload, email)
}

beforeAll(async () => {
  payload = await startPayload()
  plans = await seedPlans(payload)
  admin = await createPlatformUser(payload, 'admin@platform.test', 'super-admin')
  support = await createPlatformUser(payload, 'support@platform.test', 'support')
  storeA = await onboard('store-a', plans.enterprise!.id, 'owner@a.test') // hardware preset
  storeB = await onboard('store-b', plans.starter!.id, 'owner@b.test', ['clothing'])
  ownerA = await userByEmail(payload, 'owner@a.test')
  ownerB = await userByEmail(payload, 'owner@b.test')
})

afterAll(async () => {
  await stopPayload(payload)
})

describe('store defaults on onboarding', () => {
  it('creates settings, menus, a draft home page and draft policy pages for each store', async () => {
    const { docs: settings } = await payload.find({
      collection: 'site-settings',
      where: { tenant: { equals: idA() } },
      depth: 0,
    })
    expect(settings).toHaveLength(1)
    expect(settings[0]).toMatchObject({ storeName: 'Store store-a', orderPrefix: 'STO' })
    const { docs: pages } = await payload.find({
      collection: 'pages',
      where: { tenant: { equals: idA() } },
      draft: true,
      depth: 0,
      sort: 'slug',
    })
    expect(pages.map((page) => [page.slug, page._status])).toEqual([
      ['home', 'draft'],
      ['privacy', 'draft'],
      ['returns', 'draft'],
      ['shipping', 'draft'],
      ['terms', 'draft'],
      ['warranty', 'draft'],
    ])
    expect(settings[0]?.policies?.privacy).toBeTruthy()
    const nav = await payload.count({
      collection: 'navigation',
      where: { tenant: { equals: idB() } },
    })
    expect(nav.totalDocs).toBe(1)
  })
})

describe('catalog isolation and roles', () => {
  it('lets a store owner work only inside their own store', async () => {
    const created = await payload.create({
      collection: 'categories',
      data: { tenant: idA(), name: 'Basin mixers' },
      user: ownerA,
      overrideAccess: false,
    })
    expect(created.slug).toBe('basin-mixers')
    const seenByB = await payload.find({
      collection: 'categories',
      user: ownerB,
      overrideAccess: false,
    })
    expect(seenByB.docs).toHaveLength(0)
    await expect(
      payload.create({
        collection: 'categories',
        data: { tenant: idA(), name: 'Sneaky' },
        user: ownerB,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    await expect(
      payload.update({
        collection: 'categories',
        id: created.id,
        data: { name: 'Taken over' },
        user: ownerB,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('lets support read every store but change nothing', async () => {
    const { totalDocs } = await payload.count({
      collection: 'categories',
      user: support,
      overrideAccess: false,
    })
    expect(totalDocs).toBeGreaterThan(0)
    await expect(
      payload.create({
        collection: 'categories',
        data: { tenant: idA(), name: 'By support' },
        user: support,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('follows the permission matrix: catalog editors do catalog, content editors do pages', async () => {
    const catalog = await staff('catalog@a.test', ['catalog-editor'], idA())
    const content = await staff('content@a.test', ['content-editor'], idA())
    const orders = await staff('orders@a.test', ['order-manager'], idA())
    await expect(
      payload.create({
        collection: 'brands',
        data: { tenant: idA(), name: 'Aqua' },
        user: catalog,
        overrideAccess: false,
      }),
    ).resolves.toMatchObject({ slug: 'aqua' })
    await expect(
      payload.create({
        collection: 'brands',
        data: { tenant: idA(), name: 'Nope' },
        user: content,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    await expect(
      payload.create({
        collection: 'pages',
        data: { tenant: idA(), title: 'About us', _status: 'draft' },
        draft: true,
        user: content,
        overrideAccess: false,
      }),
    ).resolves.toMatchObject({ slug: 'about-us' })
    await expect(
      payload.create({
        collection: 'pages',
        data: { tenant: idA(), title: 'Not mine', _status: 'draft' },
        draft: true,
        user: catalog,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    // Order managers read the catalog but can't change it
    const { totalDocs } = await payload.count({
      collection: 'brands',
      user: orders,
      overrideAccess: false,
    })
    expect(totalDocs).toBe(1)
    await expect(
      payload.create({
        collection: 'brands',
        data: { tenant: idA(), name: 'X' },
        user: orders,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    // Store settings belong to owners and managers
    const { docs } = await payload.find({
      collection: 'site-settings',
      where: { tenant: { equals: idA() } },
      depth: 0,
    })
    await expect(
      payload.update({
        collection: 'site-settings',
        id: docs[0]!.id,
        data: { storeName: 'Renamed' },
        user: catalog,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('checks the role in the target store for someone who works in two stores', async () => {
    // Catalog editor in A, content editor in B: no catalog writes in B
    const req = await reqAs(payload, admin)
    await withTransaction(req, () =>
      inviteStaff(
        req,
        { email: 'catalog@a.test', name: 'catalog', tenantId: idB(), roles: ['content-editor'] },
        { sendEmail: false },
      ),
    )
    const both = await userByEmail(payload, 'catalog@a.test')
    await expect(
      payload.create({
        collection: 'brands',
        data: { tenant: idB(), name: 'Wrong store' },
        user: both,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    await expect(
      payload.create({
        collection: 'brands',
        data: { tenant: idA(), name: 'Right store' },
        user: both,
        overrideAccess: false,
      }),
    ).resolves.toBeTruthy()
  })
})

describe('categories', () => {
  it('allows the same slug in two stores but not twice in one', async () => {
    await payload.create({
      collection: 'categories',
      data: { tenant: idB(), name: 'Basin mixers' },
    })
    await expect(
      payload.create({ collection: 'categories', data: { tenant: idA(), name: 'Basin mixers' } }),
    ).rejects.toThrow()
  })

  it('builds breadcrumbs and refuses loops, deep trees and deleting a parent', async () => {
    const faucets = await payload.create({
      collection: 'categories',
      data: { tenant: idA(), name: 'Faucets' },
    })
    const mixers = await payload.create({
      collection: 'categories',
      data: { tenant: idA(), name: 'Wall mixers', parent: faucets.id },
    })
    const deck = await payload.create({
      collection: 'categories',
      data: { tenant: idA(), name: 'Concealed', parent: mixers.id },
    })
    expect(deck.breadcrumbs?.at(-1)?.url).toBe('/c/faucets/wall-mixers/concealed')
    await expect(
      payload.create({
        collection: 'categories',
        data: { tenant: idA(), name: 'Too deep', parent: deck.id },
      }),
    ).rejects.toThrow(/levels deep/)
    await expect(
      payload.update({ collection: 'categories', id: faucets.id, data: { parent: deck.id } }),
    ).rejects.toThrow(/under itself/)
    await expect(payload.delete({ collection: 'categories', id: faucets.id })).rejects.toThrow(
      /subcategories/,
    )
  })
})

describe('attribute sets', () => {
  it('fills codes and option values from labels', async () => {
    const set = await payload.create({
      collection: 'attribute-sets',
      data: {
        tenant: idA(),
        name: 'Faucets',
        attributes: [
          {
            label: 'Finish',
            type: 'color',
            isVariantAxis: true,
            isFilterable: true,
            options: [{ label: 'Matt black' }, { label: 'Chrome' }],
          },
          { label: 'Flow rate', type: 'number', unit: 'LPM' },
        ],
      },
    })
    expect(set.attributes?.map((a) => a.code)).toEqual(['finish', 'flow_rate'])
    expect(set.attributes?.[0]?.options?.map((o) => o.value)).toEqual(['matt-black', 'chrome'])
  })

  it('refuses duplicate codes, empty option lists and too many variant options', async () => {
    const make = (attributes: unknown[]) =>
      payload.create({
        collection: 'attribute-sets',
        data: { tenant: idA(), name: `Bad ${Math.random()}`, attributes: attributes as never },
      })
    await expect(
      make([
        { label: 'Size', code: 'size' },
        { label: 'Size 2', code: 'size' },
      ]),
    ).rejects.toThrow(/used twice/)
    await expect(make([{ label: 'Material', type: 'select', options: [] }])).rejects.toThrow(
      /at least one option/,
    )
    await expect(make([{ label: 'Width', type: 'number', isVariantAxis: true }])).rejects.toThrow(
      /finish or size options/,
    )
    const axis = (label: string) => ({
      label,
      type: 'select',
      isVariantAxis: true,
      options: [{ label: 'A' }],
    })
    await expect(make([axis('One'), axis('Two'), axis('Three'), axis('Four')])).rejects.toThrow(
      /At most 3/,
    )
  })
})

describe('enquiries', () => {
  it('numbers enquiries per store without gaps or repeats, even at the same moment', async () => {
    const make = (tenant: string, name: string) =>
      payload.create({
        collection: 'enquiries',
        data: { tenant, name, phone: '9825012345', type: 'general', status: 'new' },
      })
    const first = await make(idA(), 'First')
    expect(first.referenceNumber).toBe('ENQ-1')
    const burst = await Promise.all(Array.from({ length: 5 }, (_, i) => make(idA(), `Burst ${i}`)))
    expect(burst.map((e) => e.referenceNumber).sort()).toEqual([
      'ENQ-2',
      'ENQ-3',
      'ENQ-4',
      'ENQ-5',
      'ENQ-6',
    ])
    // Store B counts on its own
    expect((await make(idB(), 'Other store')).referenceNumber).toBe('ENQ-1')
    // The reference can't be edited
    const updated = await payload.update({
      collection: 'enquiries',
      id: first.id,
      data: { referenceNumber: 'ENQ-999', status: 'contacted' },
    })
    expect(updated).toMatchObject({ referenceNumber: 'ENQ-1', status: 'contacted' })
  })

  it('needs a phone or an email', async () => {
    await expect(
      payload.create({
        collection: 'enquiries',
        data: { tenant: idA(), name: 'Nobody', type: 'general', status: 'new' },
      }),
    ).rejects.toThrow(/phone number or an email/)
  })

  it('is closed to a store whose enquiries feature is off, and opens when switched on', async () => {
    // Clothing preset: enquiries off for store B
    await expect(
      payload.find({ collection: 'enquiries', user: ownerB, overrideAccess: false }),
    ).rejects.toThrow()
    await expect(
      payload.create({
        collection: 'enquiries',
        data: {
          tenant: idB(),
          name: 'Walk-in',
          phone: '9825012345',
          type: 'general',
          status: 'new',
        },
        user: ownerB,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    const req = await reqAs(payload, admin)
    await withTransaction(req, () =>
      setFeature(req, { tenantId: idB(), key: 'enquiries', enabled: true }),
    )
    const open = await payload.find({
      collection: 'enquiries',
      user: ownerB,
      overrideAccess: false,
    })
    expect(open.docs.map((e) => e.referenceNumber)).toEqual(['ENQ-1'])
    // Store A's owner still sees only store A
    const own = await payload.find({
      collection: 'enquiries',
      user: ownerA,
      overrideAccess: false,
      limit: 50,
    })
    expect(
      own.docs.every(
        (e) => String(typeof e.tenant === 'object' ? e.tenant?.id : e.tenant) === idA(),
      ),
    ).toBe(true)
  })
})

describe('dealers', () => {
  it('stores a map position and stays inside the store', async () => {
    const dealer = await payload.create({
      collection: 'dealers',
      data: {
        tenant: idA(),
        name: 'Shree Sanitation',
        type: 'dealer',
        address: 'Shop 4, Baner Road',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411045',
        phone: '+91 20 1234 5412',
        location: [73.7868, 18.559],
      },
      user: ownerA,
      overrideAccess: false,
    })
    expect(dealer.location).toEqual([73.7868, 18.559])
    const seenByB = await payload.find({
      collection: 'dealers',
      user: ownerB,
      overrideAccess: false,
    })
    expect(seenByB.docs).toHaveLength(0)
    await expect(
      payload.create({
        collection: 'dealers',
        data: {
          tenant: idA(),
          name: 'Bad pin',
          type: 'dealer',
          address: 'x',
          city: 'x',
          state: 'x',
          pincode: '012345',
          phone: '1',
        },
      }),
    ).rejects.toThrow()
  })
})

describe('staff and roles (owner)', () => {
  it('lets the owner change roles and remove staff, never leaving the store without an owner', async () => {
    const manager = await staff('manager@a.test', ['manager'], idA())
    const ownerReq = await reqAs(payload, ownerA)
    await withTransaction(ownerReq, () =>
      changeStaffRoles(ownerReq, {
        userId: String(manager.id),
        tenantId: idA(),
        roles: ['manager', 'catalog-editor'],
      }),
    )
    const after = await userByEmail(payload, 'manager@a.test')
    expect(after.tenants?.[0]?.roles).toEqual(['manager', 'catalog-editor'])

    // A manager can't manage staff
    const managerReq = await reqAs(payload, after)
    await expect(
      changeStaffRoles(managerReq, {
        userId: String(ownerA.id),
        tenantId: idA(),
        roles: ['support'],
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    // Another store's owner can't either
    const ownerBReq = await reqAs(payload, ownerB)
    await expect(
      removeFromStore(ownerBReq, { userId: String(manager.id), tenantId: idA() }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    // The only owner can't step down or be removed
    await expect(
      changeStaffRoles(ownerReq, {
        userId: String(ownerA.id),
        tenantId: idA(),
        roles: ['manager'],
      }),
    ).rejects.toMatchObject({ code: 'BUSINESS_RULE' })

    await withTransaction(ownerReq, () =>
      removeFromStore(ownerReq, { userId: String(manager.id), tenantId: idA() }),
    )
    const removed = await userByEmail(payload, 'manager@a.test')
    expect(removed.tenants ?? []).toHaveLength(0)
    const { docs: audit } = await payload.find({
      collection: 'audit-logs',
      where: { and: [{ action: { equals: 'staff_changed' } }, { tenant: { equals: idA() } }] },
    })
    expect(audit.map((row) => row.summary)).toEqual(
      expect.arrayContaining(['Removed manager@a.test from the store']),
    )
  })
})
