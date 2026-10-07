import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { withTransaction } from '@/lib/db/transaction'
import { inviteStaff } from '@/modules/identity'
import { checkPincode, saveZone, zoneInputSchema } from '@/modules/shipping'
import type { Plan } from '@/payload-types'

import {
  createPlatformUser,
  inStoreSession,
  reqAs,
  seedPlans,
  startPayload,
  stopPayload,
  userByEmail,
  type TestUser,
} from './helpers'
import { buildShop, type Shop } from './shop'

// The Shipping zones screen (docs/screens/vendor-cms.md `cms-shipping`): owners and managers
// save zones, the pincode test answers as checkout does, and stores never see each other's.

let payload: Payload
let plans: Record<string, Plan>
let admin: TestUser
let shopA: Shop
let shopB: Shop

const zone = (overrides: Record<string, unknown> = {}) =>
  zoneInputSchema.parse({
    name: 'West and South',
    states: ['27', '30', '29'],
    rateType: 'flat',
    feeMinor: 14_900,
    freeAboveMinor: 99_900,
    codAllowed: true,
    etaMinDays: 3,
    etaMaxDays: 5,
    ...overrides,
  })

beforeAll(async () => {
  payload = await startPayload()
  plans = await seedPlans(payload)
  admin = await createPlatformUser(payload, 'admin@platform.test', 'super-admin')
  await payload.update({
    collection: 'plans',
    id: plans.starter!.id,
    data: { limits: { ...plans.starter!.limits, maxStaffUsers: 10 } },
  })
  shopA = await buildShop(payload, {
    admin,
    plan: plans.starter!,
    slug: 'zone-a',
    ownerEmail: 'a@zone.test',
  })
  shopB = await buildShop(payload, {
    admin,
    plan: plans.starter!,
    slug: 'zone-b',
    ownerEmail: 'b@zone.test',
  })
})

afterAll(async () => {
  await stopPayload(payload)
})

describe('shipping zones', () => {
  it('lets the owner add and change a zone, and the pincode test answers from it', async () => {
    const req = await reqAs(payload, shopA.owner)
    const created = await withTransaction(req, () => saveZone(req, shopA.tenantId, null, zone()))
    expect(created).toMatchObject({ name: 'West and South', fee: { amountMinor: 14_900 } })
    expect(
      String(
        created.tenant && typeof created.tenant === 'object' ? created.tenant.id : created.tenant,
      ),
    ).toBe(shopA.tenantId)

    const pune = await checkPincode(payload, shopA.tenantId, {
      pincode: '411045',
      subtotalMinor: 50_000,
    })
    expect(pune.place.stateName).toBe('Maharashtra')
    expect(pune.quote).toMatchObject({
      serviceable: true,
      codAllowed: true,
      feeMinor: 14_900,
      zoneName: 'West and South',
      etaMinDays: 3,
      etaMaxDays: 5,
      source: 'rate-card',
    })
    expect(pune.freeAboveMinor).toBe(99_900)

    // A pincode outside every zone isn't delivered once the store has zones
    const delhi = await checkPincode(payload, shopA.tenantId, { pincode: '110001' })
    expect(delhi.quote.serviceable).toBe(false)

    const req2 = await reqAs(payload, shopA.owner)
    await withTransaction(req2, () =>
      saveZone(
        req2,
        shopA.tenantId,
        String(created.id),
        zone({ codAllowed: false, pincodePrefixes: ['1100'] }),
      ),
    )
    const delhiNow = await checkPincode(payload, shopA.tenantId, { pincode: '110001' })
    expect(delhiNow.quote).toMatchObject({ serviceable: true, codAllowed: false })
  })

  it('keeps stores apart: the other store has no zones and can’t change this one', async () => {
    const other = await checkPincode(payload, shopB.tenantId, { pincode: '110001' })
    expect(other.quote).toMatchObject({ serviceable: true, zoneName: null, feeMinor: 0 })
    const { docs } = await payload.find({
      collection: 'shipping-zones',
      where: { tenant: { equals: shopA.tenantId } },
      overrideAccess: true,
    })
    const req = await reqAs(payload, shopB.owner)
    await expect(
      withTransaction(req, () => saveZone(req, shopA.tenantId, String(docs[0]!.id), zone())),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    // Even naming its own store, B can't reach A's zone by id
    await expect(
      withTransaction(req, () => saveZone(req, shopB.tenantId, String(docs[0]!.id), zone())),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('lets managers change zones, but not order managers or our team viewing as support', async () => {
    const invite = async (email: string, roles: string[]) => {
      const req = await reqAs(payload, admin)
      await withTransaction(req, () =>
        inviteStaff(
          req,
          { email, name: email, tenantId: shopA.tenantId, roles: roles as never },
          { sendEmail: false },
        ),
      )
      return userByEmail(payload, email)
    }
    const manager = await invite('m@zone.test', ['manager'])
    const orders = await invite('om@zone.test', ['order-manager'])
    const asManager = await reqAs(payload, manager)
    await expect(
      withTransaction(asManager, () =>
        saveZone(asManager, shopA.tenantId, null, zone({ name: 'Gujarat', states: ['24'] })),
      ),
    ).resolves.toMatchObject({ name: 'Gujarat' })
    const asOrders = await reqAs(payload, orders)
    await expect(
      withTransaction(asOrders, () =>
        saveZone(asOrders, shopA.tenantId, null, zone({ name: 'Nope' })),
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    const viewing = await reqAs(payload, inStoreSession(admin, shopA.tenantId, 'view'))
    await expect(
      withTransaction(viewing, () =>
        saveZone(viewing, shopA.tenantId, null, zone({ name: 'Nope' })),
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    const managing = await reqAs(payload, inStoreSession(admin, shopA.tenantId, 'manage'))
    await expect(
      withTransaction(managing, () =>
        saveZone(
          managing,
          shopA.tenantId,
          null,
          zone({ name: 'Remote areas', states: [], pincodePrefixes: ['194'] }),
        ),
      ),
    ).resolves.toMatchObject({ name: 'Remote areas' })
  })

  it('refuses a zone that covers nowhere or has its days backwards', () => {
    expect(() => zone({ states: [], pincodePrefixes: [] })).toThrow(/at least one state/)
    expect(() => zone({ etaMinDays: 6, etaMaxDays: 2 })).toThrow(/days/)
    expect(() => zone({ pincodePrefixes: ['41 10'] })).toThrow(/2 to 6 digits/)
  })
})
