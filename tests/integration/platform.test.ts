import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { idOf } from '@/access'
import { withTransaction } from '@/lib/db/transaction'
import { endStoreSession, inviteStaff, startStoreSession } from '@/modules/identity'
import {
  changeSubscriptionPlan,
  changeTenantStatus,
  createTenant,
  getTenantFeatures,
  isFeatureEnabled,
  recordSubscriptionPayment,
  refreshSubscriptionStatuses,
  setFeature,
} from '@/modules/tenancy'
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

let payload: Payload
let plans: Record<string, Plan>
let admin: TestUser
let support: TestUser
let storeA: Tenant
let storeB: Tenant
let ownerA: TestUser
let ownerB: TestUser

beforeAll(async () => {
  payload = await startPayload()
  plans = await seedPlans(payload)
  admin = await createPlatformUser(payload, 'admin@platform.test', 'super-admin')
  support = await createPlatformUser(payload, 'support@platform.test', 'support')
  const req = await reqAs(payload, admin)
  storeA = (
    await withTransaction(req, () =>
      createTenant(
        req,
        onboardingInput('store-a', { planId: plans.enterprise!.id, ownerEmail: 'owner@a.test' }),
      ),
    )
  ).tenant
  const reqB = await reqAs(payload, admin)
  storeB = (
    await withTransaction(reqB, () =>
      createTenant(
        reqB,
        onboardingInput('store-b', {
          planId: plans.starter!.id,
          ownerEmail: 'owner@b.test',
          industry: ['clothing'],
        }),
      ),
    )
  ).tenant
  ownerA = await userByEmail(payload, 'owner@a.test')
  ownerB = await userByEmail(payload, 'owner@b.test')
})

afterAll(async () => {
  await stopPayload(payload)
})

describe('onboarding (createTenant)', () => {
  it('creates a draft store with its subdomain, trial, feature switches and invited owner', async () => {
    expect(storeA.status).toBe('draft')
    expect(storeA.pan).toBe('AAPFU0939F')
    expect(storeA.stateCode).toBe('27')
    const { docs: domains } = await payload.find({
      collection: 'tenant-domains',
      where: { tenant: { equals: storeA.id } },
    })
    expect(domains.map((d) => [d.host, d.isPrimary])).toEqual([['store-a.test.local', true]])
    const { docs: subs } = await payload.find({
      collection: 'subscriptions',
      where: { tenant: { equals: storeA.id } },
    })
    expect(subs[0]).toMatchObject({ status: 'trialing', billingMode: 'manual' })
    expect(ownerA.status).toBe('invited')
    expect(ownerA.tenants?.[0]?.roles).toEqual(['owner'])
    const { enabled } = await getTenantFeatures(payload, String(storeA.id))
    expect(enabled.has('affiliate')).toBe(true) // hardware preset on Enterprise
    const b = await getTenantFeatures(payload, String(storeB.id))
    expect(b.enabled.has('affiliate')).toBe(false) // not in Starter
    expect(b.enabled.has('enquiries')).toBe(false) // clothing preset
    expect(b.enabled.has('size-guide')).toBe(true)
  })

  it('refuses a taken slug and leaves nothing behind', async () => {
    const req = await reqAs(payload, admin)
    await expect(
      withTransaction(req, () =>
        createTenant(
          req,
          onboardingInput('store-a', {
            planId: plans.enterprise!.id,
            ownerEmail: 'someone@x.test',
          }),
        ),
      ),
    ).rejects.toMatchObject({ code: 'CONFLICT' })
    const { totalDocs } = await payload.count({
      collection: 'users',
      where: { email: { equals: 'someone@x.test' } },
    })
    expect(totalDocs).toBe(0)
  })

  it('refuses reserved slugs and bad GSTINs, and only super admins onboard', async () => {
    const req = await reqAs(payload, admin)
    await expect(
      createTenant(
        req,
        onboardingInput('admin', { planId: plans.enterprise!.id, ownerEmail: 'x@x.test' }),
      ),
    ).rejects.toThrow()
    const bad = onboardingInput('store-z', { planId: plans.enterprise!.id, ownerEmail: 'z@x.test' })
    bad.business.gstin = '27AAPFU0939F1ZW'
    await expect(createTenant(req, bad)).rejects.toThrow()
    const supportReq = await reqAs(payload, support)
    await expect(
      createTenant(
        supportReq,
        onboardingInput('store-y', { planId: plans.enterprise!.id, ownerEmail: 'y@x.test' }),
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})

describe('tenant isolation (docs/04 mandatory tests)', () => {
  it('a store owner lists only their own store, switches, subscription and staff', async () => {
    const tenants = await payload.find({
      collection: 'tenants',
      user: ownerA,
      overrideAccess: false,
    })
    expect(tenants.docs.map((t) => t.slug)).toEqual(['store-a'])
    const flags = await payload.find({
      collection: 'feature-flags',
      user: ownerA,
      overrideAccess: false,
      limit: 100,
    })
    expect(flags.totalDocs).toBeGreaterThan(0)
    expect(new Set(flags.docs.map((f) => idOf(f.tenant)))).toEqual(new Set([String(storeA.id)]))
    const subs = await payload.find({
      collection: 'subscriptions',
      user: ownerA,
      overrideAccess: false,
    })
    expect(subs.docs.map((s) => idOf(s.tenant))).toEqual([storeA.id])
    const users = await payload.find({ collection: 'users', user: ownerA, overrideAccess: false })
    expect(users.docs.map((u) => u.email)).toEqual(['owner@a.test'])
    const audit = await payload.find({
      collection: 'audit-logs',
      user: ownerA,
      overrideAccess: false,
      limit: 100,
    })
    expect(audit.docs.every((a) => idOf(a.tenant) === storeA.id)).toBe(true)
  })

  it('cannot read or change another store’s documents by id', async () => {
    const { docs } = await payload.find({
      collection: 'feature-flags',
      where: { tenant: { equals: storeB.id } },
      limit: 1,
    })
    const flagB = docs[0]!
    await expect(
      payload.findByID({
        collection: 'feature-flags',
        id: flagB.id,
        user: ownerA,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    await expect(
      payload.update({
        collection: 'feature-flags',
        id: flagB.id,
        data: { config: {} },
        user: ownerA,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
    await expect(
      payload.findByID({
        collection: 'tenants',
        id: storeB.id,
        user: ownerA,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('internal notes are for our team only', async () => {
    await payload.update({
      collection: 'tenants',
      id: storeA.id,
      data: { notes: 'renewal call in March' },
    })
    const asOwner = await payload.findByID({
      collection: 'tenants',
      id: storeA.id,
      user: ownerA,
      overrideAccess: false,
    })
    expect(asOwner.notes).toBeUndefined()
    const asSupport = await payload.findByID({
      collection: 'tenants',
      id: storeA.id,
      user: support,
      overrideAccess: false,
    })
    expect(asSupport.notes).toBe('renewal call in March')
  })
})

describe('roles on feature switches (docs/05, docs/08)', () => {
  const flagOf = async (tenant: Tenant, key: string) =>
    (
      await payload.find({
        collection: 'feature-flags',
        where: { and: [{ tenant: { equals: tenant.id } }, { key: { equals: key } }] },
      })
    ).docs[0]!

  it('support reads every store but changes nothing', async () => {
    const flags = await payload.find({
      collection: 'feature-flags',
      user: support,
      overrideAccess: false,
      limit: 200,
    })
    expect(new Set(flags.docs.map((f) => idOf(f.tenant))).size).toBe(2)
    const flag = await flagOf(storeA, 'reviews')
    await expect(
      payload.update({
        collection: 'feature-flags',
        id: flag.id,
        data: { enabled: false },
        user: support,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('an owner edits a feature’s settings but never its switch or platform caps', async () => {
    const sizeGuide = await flagOf(storeA, 'size-guide')
    const after = await payload.update({
      collection: 'feature-flags',
      id: sizeGuide.id,
      data: { enabled: true },
      user: ownerA,
      overrideAccess: false,
    })
    expect(after.enabled).toBe(false)
    const offers = await flagOf(storeA, 'offer-messages')
    const config = offers.config as Record<string, unknown>
    const edited = await payload.update({
      collection: 'feature-flags',
      id: offers.id,
      data: { config: { ...config, maxPerShopperPerWeek: 1 } },
      user: ownerA,
      overrideAccess: false,
    })
    expect((edited.config as Record<string, unknown>).maxPerShopperPerWeek).toBe(1)
    await expect(
      payload.update({
        collection: 'feature-flags',
        id: offers.id,
        data: { config: { ...config, maxRecipientsPerCampaign: 999_999 } },
        user: ownerA,
        overrideAccess: false,
      }),
    ).rejects.toThrow(/platform team/)
  })

  it('setFeature respects dependencies, the plan and the phase', async () => {
    const req = await reqAs(payload, admin)
    const a = String(storeA.id)
    await expect(
      setFeature(req, { tenantId: a, key: 'offer-messages', enabled: false }),
    ).rejects.toMatchObject({
      code: 'FEATURE_DEPENDENCY',
    })
    await setFeature(req, { tenantId: a, key: 'offer-messages', enabled: false, cascade: true })
    expect(await isFeatureEnabled(payload, a, 'abandoned-cart')).toBe(false)
    await expect(
      setFeature(req, { tenantId: a, key: 'whatsapp-offers', enabled: true }),
    ).rejects.toMatchObject({
      code: 'FEATURE_DEPENDENCY',
    })
    await setFeature(req, { tenantId: a, key: 'whatsapp-offers', enabled: true, cascade: true })
    expect(await isFeatureEnabled(payload, a, 'whatsapp-offers')).toBe(true)
    expect(await isFeatureEnabled(payload, a, 'offer-messages')).toBe(true)
    await expect(
      setFeature(req, { tenantId: String(storeB.id), key: 'affiliate', enabled: true }),
    ).rejects.toMatchObject({ code: 'FEATURE_NOT_IN_PLAN' })
    await expect(
      setFeature(req, { tenantId: a, key: 'warranty', enabled: true }),
    ).rejects.toMatchObject({
      code: 'FEATURE_NOT_AVAILABLE',
    })
    const ownerReq = await reqAs(payload, ownerA)
    await expect(
      setFeature(ownerReq, { tenantId: a, key: 'coupons', enabled: false }),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
    })
  })
})

describe('billing and lifecycle', () => {
  it('records a payment, moves the period and activates the subscription', async () => {
    const req = await reqAs(payload, admin)
    const { docs } = await payload.find({
      collection: 'subscriptions',
      where: { tenant: { equals: storeA.id } },
    })
    const sub = docs[0]!
    const updated = await recordSubscriptionPayment(req, {
      subscriptionId: String(sub.id),
      amountMinor: 1_179_882,
      paidOn: new Date(),
      method: 'upi',
      reference: 'ref 9032',
    })
    expect(updated.status).toBe('active')
    expect(updated.currentPeriodStart).toBe(sub.trialEndsAt)
    expect(updated.payments).toHaveLength(1)
    expect(updated.history?.at(-1)?.event).toMatch(/^Payment recorded/)
  })

  it('marks an unpaid trial past due when it ends', async () => {
    const req = await reqAs(payload, admin)
    const changed = await refreshSubscriptionStatuses(req, new Date(Date.now() + 30 * 86_400_000))
    expect(changed).toBeGreaterThanOrEqual(1)
    const { docs } = await payload.find({
      collection: 'subscriptions',
      where: { tenant: { equals: storeB.id } },
    })
    expect(docs[0]!.status).toBe('past_due')
  })

  it('a Starter vendor’s first payment takes the 3-month starting offer', async () => {
    const req = await reqAs(payload, admin)
    const { docs } = await payload.find({
      collection: 'subscriptions',
      where: { tenant: { equals: storeB.id } },
    })
    const sub = docs[0]!
    const updated = await recordSubscriptionPayment(req, {
      subscriptionId: String(sub.id),
      amountMinor: 1_179_882, // ₹9,999 + 18% GST
      paidOn: new Date(),
      method: 'neft',
    })
    const start = new Date(updated.currentPeriodStart!)
    const end = new Date(updated.currentPeriodEnd!)
    const months =
      (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth()
    expect(months).toBe(3)
    expect(updated.status).toBe('active')
    expect(updated.history?.at(-1)?.event).toMatch(/introductory offer/)
  })

  it('changing plan switches off what the new plan does not allow', async () => {
    const req = await reqAs(payload, admin)
    const { docs } = await payload.find({
      collection: 'subscriptions',
      where: { tenant: { equals: storeA.id } },
    })
    await changeSubscriptionPlan(req, {
      subscriptionId: String(docs[0]!.id),
      planId: plans.starter!.id,
    })
    expect(await isFeatureEnabled(payload, String(storeA.id), 'affiliate')).toBe(false)
    const tenant = await payload.findByID({ collection: 'tenants', id: storeA.id, depth: 0 })
    expect(tenant.plan).toBe(plans.starter!.id)
  })

  it('follows the store lifecycle and needs a reason to suspend', async () => {
    const req = await reqAs(payload, admin)
    const id = String(storeB.id)
    await expect(
      changeTenantStatus(req, { tenantId: id, to: 'suspended', reason: 'x' }),
    ).rejects.toMatchObject({
      code: 'INVALID_TRANSITION',
    })
    await changeTenantStatus(req, { tenantId: id, to: 'active' })
    await expect(changeTenantStatus(req, { tenantId: id, to: 'suspended' })).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
    })
    const suspended = await changeTenantStatus(req, {
      tenantId: id,
      to: 'suspended',
      reason: 'Unpaid for 30 days',
    })
    expect(suspended.status).toBe('suspended')
    const { docs } = await payload.find({
      collection: 'audit-logs',
      where: {
        and: [{ tenant: { equals: storeB.id } }, { action: { equals: 'store_status_changed' } }],
      },
      sort: '-at',
    })
    expect(docs[0]).toMatchObject({ reason: 'Unpaid for 30 days', actingAsPlatform: true })
  })

  it('a status field edit outside the service is ignored', async () => {
    const updated = await payload.update({
      collection: 'tenants',
      id: storeB.id,
      data: { status: 'archived' },
      user: admin,
      overrideAccess: false,
    })
    expect(updated.status).toBe('suspended')
  })
})

describe('staff invites', () => {
  it('caps staff at the plan limit and lets owners invite only into their own store', async () => {
    // store-b is on Starter: 3 staff
    const ownerReqB = await reqAs(payload, ownerB)
    await inviteStaff(
      ownerReqB,
      { email: 'one@b.test', name: 'One', tenantId: String(storeB.id), roles: ['manager'] },
      { sendEmail: false },
    )
    await inviteStaff(
      ownerReqB,
      { email: 'two@b.test', name: 'Two', tenantId: String(storeB.id), roles: ['support'] },
      { sendEmail: false },
    )
    await expect(
      inviteStaff(
        ownerReqB,
        { email: 'three@b.test', name: 'Three', tenantId: String(storeB.id), roles: ['support'] },
        { sendEmail: false },
      ),
    ).rejects.toMatchObject({ code: 'PLAN_LIMIT_REACHED' })
    await expect(
      inviteStaff(
        ownerReqB,
        { email: 'spy@b.test', name: 'Spy', tenantId: String(storeA.id), roles: ['manager'] },
        { sendEmail: false },
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(
      inviteStaff(
        ownerReqB,
        { email: 'boss@b.test', name: 'Boss', platformRole: 'super-admin' },
        { sendEmail: false },
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('adds an existing person to a second store instead of a second account', async () => {
    const req = await reqAs(payload, admin)
    const result = await inviteStaff(
      req,
      {
        email: 'owner@b.test',
        name: 'Owner B',
        tenantId: String(storeA.id),
        roles: ['catalog-editor'],
      },
      { sendEmail: false },
    )
    expect(result.addedToExistingAccount).toBe(true)
    const user = await userByEmail(payload, 'owner@b.test')
    expect(user.tenants).toHaveLength(2)
  })

  it('support cannot give itself a store role (no self-escalation to owner)', async () => {
    const updated = await payload.update({
      collection: 'users',
      id: support.id,
      data: { tenants: [{ tenant: storeA.id, roles: ['owner'] }] },
      user: support,
      overrideAccess: false,
    })
    expect(updated.tenants ?? []).toHaveLength(0)
    const ownerSelf = await payload.update({
      collection: 'users',
      id: ownerA.id,
      data: { tenants: [{ tenant: storeB.id, roles: ['owner'] }], platformRole: 'super-admin' },
      user: ownerA,
      overrideAccess: false,
    })
    expect(ownerSelf.tenants?.map((row) => idOf(row.tenant))).toEqual([String(storeA.id)])
    expect(ownerSelf.platformRole ?? null).toBeNull()
  })

  it('enforces the 10-character password policy', async () => {
    await expect(
      payload.update({
        collection: 'users',
        id: ownerA.id,
        data: { password: 'short' },
        overrideAccess: true,
      }),
    ).rejects.toThrow(/10 characters/)
  })
})

describe('store sessions: Manage store and View as support (docs/05)', () => {
  it('opens a store for 2 hours with a reason, logs it, and closes it', async () => {
    const req = await reqAs(payload, admin)
    const opened = await withTransaction(req, () =>
      startStoreSession(req, {
        tenantId: String(storeA.id),
        mode: 'manage',
        reason: 'Vendor asked us to set up the home page',
      }),
    )
    expect(Date.parse(opened.endsAt) - Date.now()).toBeGreaterThan(119 * 60 * 1000)
    const reloaded = await userByEmail(payload, 'admin@platform.test')
    expect(idOf(reloaded.storeSession?.tenant)).toBe(String(storeA.id))
    const { docs } = await payload.find({
      collection: 'audit-logs',
      where: {
        and: [{ action: { equals: 'support_access' } }, { tenant: { equals: storeA.id } }],
      },
      sort: '-at',
    })
    expect(docs[0]).toMatchObject({ reason: 'Vendor asked us to set up the home page' })

    const endReq = await reqAs(payload, reloaded)
    await withTransaction(endReq, () => endStoreSession(endReq))
    const closed = await userByEmail(payload, 'admin@platform.test')
    expect(closed.storeSession?.tenant ?? null).toBeNull()
  })

  it('lets support only view, and nobody set a session through the API', async () => {
    const req = await reqAs(payload, support)
    await expect(
      startStoreSession(req, { tenantId: String(storeA.id), mode: 'manage', reason: 'Trying it' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    const ownerReq = await reqAs(payload, ownerA)
    await expect(
      startStoreSession(ownerReq, {
        tenantId: String(storeA.id),
        mode: 'view',
        reason: 'Not our team',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    const updated = await payload.update({
      collection: 'users',
      id: admin.id,
      data: {
        storeSession: {
          tenant: storeA.id,
          mode: 'manage',
          reason: 'sneaky',
          endsAt: new Date(Date.now() + 3600_000).toISOString(),
        },
      },
      user: admin,
      overrideAccess: false,
    })
    expect(updated.storeSession?.tenant ?? null).toBeNull()
  })
})
