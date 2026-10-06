import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  connectorOverview,
  loadConnector,
  saveConnector,
  setConnectorAllowed,
  testConnector,
} from '@/connectors'
import { withTransaction } from '@/lib/db/transaction'
import { createTenant } from '@/modules/tenancy'
import type { Plan, Tenant } from '@/payload-types'

import {
  createPlatformUser,
  inStoreSession,
  onboardingInput,
  reqAs,
  seedPlans,
  startPayload,
  stopPayload,
  userByEmail,
  type TestUser,
} from './helpers'

// Connector setup (docs/09): who may enter keys, encryption at rest, the plan and our team's
// "Allowed" switch, tenant isolation, and the Test connection health.

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

const razorpayInput = (tenantId: string, secrets: Record<string, string> = {}) => ({
  tenantId,
  mode: 'test' as const,
  public: { keyId: 'rzp_test_AbCdEfGh1234' },
  secrets: { keySecret: 'secret-one', webhookSecret: 'hook-one', ...secrets },
})

async function asOwner(
  user: TestUser,
  run: (req: Awaited<ReturnType<typeof reqAs>>) => Promise<unknown>,
) {
  const req = await reqAs(payload, user)
  return withTransaction(req, () => run(req) as Promise<unknown>)
}

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
        onboardingInput('conn-a', { planId: String(plans.starter!.id), ownerEmail: 'a@a.test' }),
      ),
    )
  ).tenant
  storeB = (
    await withTransaction(req, () =>
      createTenant(
        req,
        onboardingInput('conn-b', { planId: String(plans.starter!.id), ownerEmail: 'b@b.test' }),
      ),
    )
  ).tenant
  ownerA = await userByEmail(payload, 'a@a.test')
  ownerB = await userByEmail(payload, 'b@b.test')
})

afterAll(async () => {
  await stopPayload(payload)
})

describe('saving keys', () => {
  it('lets the owner save Razorpay keys and keeps the secrets encrypted', async () => {
    await asOwner(ownerA, (req) => saveConnector(req, 'razorpay', razorpayInput(idA())))
    const raw = await payload.db.collections['connector-configs']!.findOne({
      provider: 'razorpay',
    }).lean()
    const sealed = (raw as { secretSealed?: string }).secretSealed ?? ''
    expect(sealed.startsWith('v1.')).toBe(true)
    expect(sealed).not.toContain('secret-one')
    const ctx = await loadConnector(payload, idA(), 'razorpay')
    expect(ctx?.secret).toEqual({ keySecret: 'secret-one', webhookSecret: 'hook-one' })
    expect(ctx?.public.keyId).toBe('rzp_test_AbCdEfGh1234')
    expect(ctx?.mode).toBe('test')
  })

  it('never returns the sealed secret through the API, even to the owner', async () => {
    const { docs } = await payload.find({
      collection: 'connector-configs',
      user: ownerA,
      overrideAccess: false,
    })
    expect(docs).toHaveLength(1)
    expect(docs[0]).not.toHaveProperty('secretSealed')
    expect(docs[0]?.savedSecrets).toEqual(['keySecret', 'webhookSecret'])
  })

  it('keeps a saved secret when the form leaves it empty, and replaces it when typed', async () => {
    await asOwner(ownerA, (req) =>
      saveConnector(req, 'razorpay', { ...razorpayInput(idA()), secrets: { keySecret: '' } }),
    )
    expect((await loadConnector(payload, idA(), 'razorpay'))?.secret.keySecret).toBe('secret-one')
    await asOwner(ownerA, (req) =>
      saveConnector(req, 'razorpay', {
        ...razorpayInput(idA()),
        secrets: { keySecret: 'secret-two' },
      }),
    )
    const ctx = await loadConnector(payload, idA(), 'razorpay')
    expect(ctx?.secret).toEqual({ keySecret: 'secret-two', webhookSecret: 'hook-one' })
  })

  it('checks the visible fields and the required secrets', async () => {
    await expect(
      asOwner(ownerB, (req) =>
        saveConnector(req, 'razorpay', {
          tenantId: idB(),
          public: { keyId: 'not-a-key' },
          secrets: {},
        }),
      ),
    ).rejects.toMatchObject({
      fields: {
        keyId: expect.stringContaining('rzp_'),
        keySecret: expect.any(String),
        webhookSecret: expect.any(String),
      },
    })
  })

  it('refuses other roles, other stores and our team outside a manage session', async () => {
    const req = await reqAs(payload, ownerB)
    await expect(saveConnector(req, 'razorpay', razorpayInput(idA()))).rejects.toMatchObject({
      httpStatus: 403,
    })
    const adminReq = await reqAs(payload, admin)
    await expect(saveConnector(adminReq, 'razorpay', razorpayInput(idB()))).rejects.toMatchObject({
      httpStatus: 403,
    })
    const viewing = await reqAs(payload, inStoreSession(support, idB(), 'view'))
    await expect(saveConnector(viewing, 'razorpay', razorpayInput(idB()))).rejects.toMatchObject({
      httpStatus: 403,
    })
    // A super admin managing the store sets up keys with the vendor (docs/09 WhatsApp manual mode)
    await asOwner(inStoreSession(admin, idB(), 'manage'), (r) =>
      saveConnector(r, 'razorpay', razorpayInput(idB(), { keySecret: 'b-secret' })),
    )
    expect((await loadConnector(payload, idB(), 'razorpay'))?.secret.keySecret).toBe('b-secret')
  })

  it('keeps each store’s connectors to itself', async () => {
    const { docs } = await payload.find({
      collection: 'connector-configs',
      user: ownerB,
      overrideAccess: false,
    })
    expect(
      docs.map((doc) => String(typeof doc.tenant === 'object' ? doc.tenant?.id : doc.tenant)),
    ).toEqual([idB()])
    const writes = await payload
      .create({
        collection: 'connector-configs',
        data: { tenant: idB(), provider: 'shiprocket', kind: 'shipping' },
        user: ownerB,
        overrideAccess: false,
      })
      .catch((error: unknown) => error)
    expect(writes).toBeInstanceOf(Error)
  })

  it('gives one WhatsApp number to one store only', async () => {
    const whatsapp = (tenantId: string) => ({
      tenantId,
      public: { phoneNumberId: '1093000004471', wabaId: '2287000001190' },
      secrets: { accessToken: 'token', appSecret: 'app-secret' },
    })
    await asOwner(ownerA, (req) => saveConnector(req, 'meta-whatsapp', whatsapp(idA())))
    await expect(
      asOwner(ownerB, (req) => saveConnector(req, 'meta-whatsapp', whatsapp(idB()))),
    ).rejects.toMatchObject({ httpStatus: 409 })
  })

  it('generates a webhook token for providers that use one', async () => {
    await asOwner(ownerA, (req) =>
      saveConnector(req, 'shiprocket', {
        tenantId: idA(),
        public: { pickupLocation: 'Primary', pickupPincode: '363642', courierMode: 'auto' },
        secrets: { apiEmail: 'api@a.test', apiPassword: 'pw' },
      }),
    )
    const { connectors } = await connectorOverview(payload, idA())
    const shiprocket = connectors.find((row) => row.provider.key === 'shiprocket')!
    expect(shiprocket.webhookToken).toMatch(/^[A-Za-z0-9_-]{32}$/)
    expect(shiprocket.webhookUrl).toBe(`http://localhost:3000/api/webhooks/courier/${idA()}`)
  })
})

describe('the Allowed switch', () => {
  it('stops a provider our team switched off, and lets it back when allowed again', async () => {
    await asOwner(admin, (req) => setConnectorAllowed(req, idA(), 'razorpay', false))
    expect(await loadConnector(payload, idA(), 'razorpay')).toBeNull()
    await expect(
      asOwner(ownerA, (req) => saveConnector(req, 'razorpay', razorpayInput(idA()))),
    ).rejects.toMatchObject({ code: 'FEATURE_NOT_IN_PLAN' })
    const { connectors } = await connectorOverview(payload, idA())
    expect(connectors.find((row) => row.provider.key === 'razorpay')?.availability).toMatchObject({
      inPlan: true,
      blocked: true,
      allowed: false,
    })
    await asOwner(admin, (req) => setConnectorAllowed(req, idA(), 'razorpay', true))
    expect((await loadConnector(payload, idA(), 'razorpay'))?.secret.keySecret).toBe('secret-two')
  })

  it('is for super admins only and can’t go beyond the plan', async () => {
    const supportReq = await reqAs(payload, support)
    await expect(setConnectorAllowed(supportReq, idA(), 'razorpay', false)).rejects.toMatchObject({
      httpStatus: 403,
    })
    await payload.update({
      collection: 'plans',
      id: plans.starter!.id,
      data: { allowedConnectors: ['manual'] },
      overrideAccess: true,
    })
    await expect(
      asOwner(admin, (req) => setConnectorAllowed(req, idA(), 'shiprocket', true)),
    ).rejects.toMatchObject({ code: 'FEATURE_NOT_IN_PLAN' })
    expect(await loadConnector(payload, idA(), 'shiprocket')).toBeNull()
    await payload.update({
      collection: 'plans',
      id: plans.starter!.id,
      data: { allowedConnectors: plans.starter!.allowedConnectors },
      overrideAccess: true,
    })
  })

  it('shows SMS as not available yet', async () => {
    const { connectors } = await connectorOverview(payload, idA())
    expect(connectors.find((row) => row.provider.key === 'msg91')?.availability.available).toBe(
      false,
    )
  })
})

describe('Test connection', () => {
  it('keeps the result as health and the secret readable afterwards', async () => {
    const calls: string[] = []
    const fakeFetch = (async (url: string, init?: RequestInit) => {
      calls.push(
        `${init?.method ?? 'GET'} ${url} ${new Headers(init?.headers).get('authorization')}`,
      )
      return new Response(JSON.stringify({ items: [] }), { status: 200 })
    }) as typeof fetch
    const req = await reqAs(payload, ownerA)
    const result = await testConnector(req, 'razorpay', idA(), fakeFetch)
    expect(result.ok).toBe(true)
    expect(calls[0]).toBe(
      `GET https://api.razorpay.com/v1/orders?count=1 Basic ${Buffer.from('rzp_test_AbCdEfGh1234:secret-two').toString('base64')}`,
    )
    const { connectors } = await connectorOverview(payload, idA())
    const health = connectors.find((row) => row.provider.key === 'razorpay')?.health
    expect(health?.lastTestOk).toBe(true)
    expect((await loadConnector(payload, idA(), 'razorpay'))?.secret.keySecret).toBe('secret-two')
  })

  it('reports refused keys in words, and a key in the wrong mode before calling', async () => {
    const refused = (async () =>
      new Response(JSON.stringify({ error: { description: 'Authentication failed' } }), {
        status: 401,
      })) as unknown as typeof fetch
    const req = await reqAs(payload, ownerA)
    expect(await testConnector(req, 'razorpay', idA(), refused)).toMatchObject({
      ok: false,
      message: expect.stringContaining('refused'),
    })
    await asOwner(ownerA, (r) =>
      saveConnector(r, 'razorpay', { ...razorpayInput(idA()), mode: 'live', secrets: {} }),
    )
    const never = (async () => {
      throw new Error('should not call')
    }) as unknown as typeof fetch
    expect(await testConnector(req, 'razorpay', idA(), never)).toMatchObject({
      ok: false,
      message: expect.stringContaining('test key ID'),
    })
  })
})

describe('cash on delivery rules', () => {
  it('saves the owner’s rules inside a transaction and reads them back', async () => {
    const { getCodRules, saveCodRules } = await import('@/modules/content')
    await asOwner(ownerA, (req) =>
      saveCodRules(req, {
        tenantId: idA(),
        codEnabled: true,
        codMinOrderMinor: 49_900,
        codMaxOrderMinor: 25_00_000,
        codFeeMinor: 4_900,
      }),
    )
    expect(await getCodRules(payload, idA())).toEqual({
      codEnabled: true,
      codMinOrderMinor: 49_900,
      codMaxOrderMinor: 25_00_000,
      codFeeMinor: 4_900,
    })
    // Other settings in the same group are kept
    const { docs } = await payload.find({
      collection: 'site-settings',
      where: { tenant: { equals: idA() } },
      overrideAccess: true,
    })
    expect(docs[0]?.checkout?.codFee?.amountMinor).toBe(4_900)
  })

  it('refuses a maximum below the minimum', async () => {
    const { codRulesSchema } = await import('@/modules/content')
    const parsed = codRulesSchema.safeParse({
      tenantId: idA(),
      codEnabled: true,
      codMinOrderMinor: 5_000,
      codMaxOrderMinor: 1_000,
      codFeeMinor: null,
    })
    expect(parsed.success).toBe(false)
  })
})
