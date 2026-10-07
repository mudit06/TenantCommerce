import type { Payload, PayloadRequest } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { withTransaction } from '@/lib/db/transaction'
import { saveCodRules } from '@/modules/content'
import {
  createSession,
  customerAddresses,
  customerOrder,
  customerOrders,
  loginWithPassword,
  readSession,
  revokeAllSessions,
  saveAddress,
  sendLoginCode,
  setPassword,
  verifyLoginCode,
} from '@/modules/customers'
import { assertCustomerAccess } from '@/modules/customers/services/access'
import {
  exportCustomerData,
  recordPrivacyRequest,
  updatePrivacyRequest,
} from '@/modules/customers/services/privacy'
import { placeOrder, placeOrderSchema } from '@/modules/orders'
import type { Customer, Order, Plan } from '@/payload-types'

import {
  createPlatformUser,
  inStoreSession,
  reqAs,
  seedPlans,
  startPayload,
  stopPayload,
  type TestUser,
} from './helpers'
import { buildShop, sampleOrderInput, type Shop } from './shop'

// Shopper accounts (docs/05 "customers", ADR 0003): the email code creates the account and
// brings guest orders in, codes expire after 5 wrong tries, passwords are optional, sessions
// belong to one store, and one store never sees another's shoppers. Privacy requests export
// and delete what the store holds.

let payload: Payload
let plans: Record<string, Plan>
let admin: TestUser
let shopA: Shop
let shopB: Shop
const sent: { to: string; subject: string; text: string }[] = []

const EMAIL = 'rahul.k@example.com'

const system = () => reqAs(payload)
const tx = async <T>(fn: (req: PayloadRequest) => Promise<T>) => {
  const req = await system()
  return withTransaction(req, () => fn(req))
}

/** The 6-digit code in the last email to `to` */
const lastCode = (to: string) => {
  const mail = [...sent].reverse().find((m) => m.to === to)
  return mail?.text.match(/\b(\d{6})\b/)?.[1] ?? ''
}

async function placeGuestCod(shop: Shop, email = EMAIL): Promise<Order> {
  const input = placeOrderSchema.parse(
    sampleOrderInput({ contact: { name: 'Rahul Kulkarni', email, phone: '+91 98765 43210' } }),
  )
  return (
    await tx((req) =>
      placeOrder(req, shop.tenantId, {
        lines: [{ productId: shop.towel, qty: 1 }],
        input,
        live: null,
      }),
    )
  ).order
}

async function signInWithCode(shop: Shop, email = EMAIL): Promise<Customer> {
  const store = { storeName: `Store ${shop.tenantId}`, ip: '10.0.0.1' }
  await tx((req) => sendLoginCode(req, shop.tenantId, email, store))
  const code = lastCode(email)
  expect(code).toMatch(/^\d{6}$/)
  return tx((req) => verifyLoginCode(req, shop.tenantId, email, code, { ip: '10.0.0.1' }))
}

beforeAll(async () => {
  payload = await startPayload()
  // Capture emails instead of printing them
  payload.sendEmail = (async (message: { to: string; subject: string; text: string }) => {
    sent.push(message)
  }) as typeof payload.sendEmail
  plans = await seedPlans(payload)
  admin = await createPlatformUser(payload, 'admin@platform.test', 'super-admin')
  shopA = await buildShop(payload, {
    admin,
    plan: plans.starter!,
    slug: 'acct-a',
    ownerEmail: 'a@acct.test',
  })
  shopB = await buildShop(payload, {
    admin,
    plan: plans.starter!,
    slug: 'acct-b',
    ownerEmail: 'b@acct.test',
  })
  for (const shop of [shopA, shopB]) {
    const req = await reqAs(payload, shop.owner)
    await withTransaction(req, () =>
      saveCodRules(req, {
        tenantId: shop.tenantId,
        codEnabled: true,
        codMinOrderMinor: null,
        codMaxOrderMinor: null,
        codFeeMinor: null,
      }),
    )
  }
})

afterAll(async () => {
  await stopPayload(payload)
})

describe('email code sign-in', () => {
  let guestOrder: Order
  let customer: Customer

  it('creates the account and brings guest orders placed with the email', async () => {
    guestOrder = await placeGuestCod(shopA)
    customer = await signInWithCode(shopA)
    expect(customer.email).toBe(EMAIL)
    expect(customer.emailVerified).toBe(true)
    const orders = await customerOrders(payload, shopA.tenantId, String(customer.id))
    expect(orders.map((o) => o.orderNumber)).toEqual([guestOrder.orderNumber])
    const fresh = await payload.findByID({
      collection: 'customers',
      id: customer.id,
      overrideAccess: true,
    })
    // Name and phone from the order; stats from its orders
    expect(fresh.name).toBe('Rahul Kulkarni')
    expect(fresh.phone).toBe('+919876543210')
    expect(fresh.ordersCount).toBe(1)
    expect(fresh.totalSpentMinor).toBe(guestOrder.totals?.grandTotalMinor)
  })

  it('keeps the code as a hash, sends it in the store’s name, and uses it once', async () => {
    const { docs } = await payload.find({
      collection: 'login-codes',
      where: { tenant: { equals: shopA.tenantId } },
      overrideAccess: true,
    })
    expect(docs[0]!.codeHash).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(docs)).not.toContain(lastCode(EMAIL))
    expect(sent.at(-1)!.subject).toContain(`Store ${shopA.tenantId}`)
    await expect(
      tx((req) => verifyLoginCode(req, shopA.tenantId, EMAIL, lastCode(EMAIL))),
    ).rejects.toThrow(/expired/)
  })

  it('answers the same for a new email, and waits 30 seconds between codes', async () => {
    const first = await tx((req) =>
      sendLoginCode(req, shopA.tenantId, 'new.person@example.com', { storeName: 'A' }),
    )
    expect(first.maskedEmail).toBe('n•••@example.com')
    const again = await tx((req) =>
      sendLoginCode(req, shopA.tenantId, 'new.person@example.com', { storeName: 'A' }),
    )
    expect(again.waitSeconds).toBeGreaterThan(0)
    expect(sent.filter((m) => m.to === 'new.person@example.com')).toHaveLength(1)
  })

  it('locks a code after 5 wrong tries', async () => {
    const email = 'tries@example.com'
    await tx((req) => sendLoginCode(req, shopA.tenantId, email, { storeName: 'A' }))
    const right = lastCode(email)
    const wrong = right === '000000' ? '111111' : '000000'
    for (let i = 0; i < 5; i++) {
      await expect(
        tx((req) => verifyLoginCode(req, shopA.tenantId, email, wrong)),
      ).rejects.toThrow()
    }
    await expect(tx((req) => verifyLoginCode(req, shopA.tenantId, email, right))).rejects.toThrow(
      /expired/,
    )
  })

  it('makes the same email a separate account in another store', async () => {
    const other = await signInWithCode(shopB)
    expect(other.id).not.toBe(customer.id)
    // Store A's guest order never joins store B's account
    expect(await customerOrders(payload, shopB.tenantId, String(other.id))).toEqual([])
    expect(
      await customerOrder(payload, shopB.tenantId, String(other.id), guestOrder.orderNumber),
    ).toBeNull()
  })
})

describe('sessions and passwords', () => {
  let customer: Customer

  beforeAll(async () => {
    customer = (
      await payload.find({
        collection: 'customers',
        where: { and: [{ tenant: { equals: shopA.tenantId } }, { email: { equals: EMAIL } }] },
        overrideAccess: true,
      })
    ).docs[0]!
  })

  it('opens a session in its own store only, and logs out everywhere', async () => {
    const { token } = await tx((req) =>
      createSession(req, shopA.tenantId, String(customer.id), { ip: '10.0.0.1' }),
    )
    const session = await readSession(payload, shopA.tenantId, token)
    expect(session?.customer.email).toBe(EMAIL)
    expect(session?.customer).not.toHaveProperty('passwordHash')
    expect(await readSession(payload, shopB.tenantId, token)).toBeNull()
    const { docs } = await payload.find({
      collection: 'customer-sessions',
      where: { customer: { equals: String(customer.id) } },
      overrideAccess: true,
    })
    expect(docs.some((d) => d.tokenHash === token)).toBe(false)
    await tx((req) => revokeAllSessions(req, shopA.tenantId, String(customer.id)))
    expect(await readSession(payload, shopA.tenantId, token)).toBeNull()
  })

  it('sets a password, then signs in with it; a wrong one gets one message', async () => {
    await tx((req) =>
      setPassword(req, shopA.tenantId, String(customer.id), { password: 'Long-enough-2026' }),
    )
    const signedIn = await tx((req) =>
      loginWithPassword(req, shopA.tenantId, EMAIL, 'Long-enough-2026'),
    )
    expect(signedIn.id).toBe(customer.id)
    expect(signedIn).not.toHaveProperty('passwordHash')
    await expect(
      tx((req) => loginWithPassword(req, shopA.tenantId, EMAIL, 'wrong-password-1')),
    ).rejects.toThrow('That email or password isn’t right.')
    await expect(
      tx((req) => loginWithPassword(req, shopA.tenantId, 'nobody@example.com', 'whatever-1234')),
    ).rejects.toThrow('That email or password isn’t right.')
    // Store B's account with the same email has no password
    await expect(
      tx((req) => loginWithPassword(req, shopB.tenantId, EMAIL, 'Long-enough-2026')),
    ).rejects.toThrow('That email or password isn’t right.')
    // Changing it needs the current one
    await expect(
      tx((req) =>
        setPassword(req, shopA.tenantId, String(customer.id), {
          password: 'Another-long-2026',
          current: 'not-it',
        }),
      ),
    ).rejects.toThrow(/current password/)
  })

  it('never shows the password hash through the API', async () => {
    const req = await reqAs(payload, shopA.owner)
    const { docs } = await payload.find({
      collection: 'customers',
      where: { tenant: { equals: shopA.tenantId } },
      overrideAccess: false,
      user: shopA.owner,
      req,
    })
    expect(docs.length).toBeGreaterThan(0)
    for (const doc of docs) expect(doc.passwordHash).toBeUndefined()
  })
})

describe('addresses and isolation', () => {
  it('saves addresses per account; the first is the default', async () => {
    const customer = await signInWithCode(shopA, 'addr@example.com')
    const address = {
      name: 'Asha',
      phone: '98765 43210',
      line1: 'Plot 4, MG Road',
      city: 'Pune',
      stateCode: '27',
      pincode: '411001',
    }
    const first = await tx((req) => saveAddress(req, shopA.tenantId, String(customer.id), address))
    expect(first.isDefault).toBe(true)
    expect(first.address?.phone).toBe('+919876543210')
    await tx((req) =>
      saveAddress(req, shopA.tenantId, String(customer.id), {
        ...address,
        isDefault: true,
        line1: 'Office',
      }),
    )
    const all = await customerAddresses(payload, shopA.tenantId, String(customer.id))
    expect(all.filter((a) => a.isDefault).map((a) => a.address?.line1)).toEqual(['Office'])
    // Another account can't change it
    const other = await signInWithCode(shopA, 'other@example.com')
    await expect(
      tx((req) => saveAddress(req, shopA.tenantId, String(other.id), address, String(first.id))),
    ).rejects.toThrow('Address not found')
  })

  it('shows store B’s owner none of store A’s customers', async () => {
    const req = await reqAs(payload, shopB.owner)
    const { docs } = await payload.find({
      collection: 'customers',
      overrideAccess: false,
      user: shopB.owner,
      req,
    })
    expect(
      docs.every(
        (d) => (typeof d.tenant === 'object' ? d.tenant?.id : d.tenant) === shopB.tenantId,
      ),
    ).toBe(true)
    expect(() => assertCustomerAccess(req, shopA.tenantId, false)).toThrow()
    expect(() =>
      assertCustomerAccess(
        { user: inStoreSession(admin, shopA.tenantId, 'view') } as PayloadRequest,
        shopA.tenantId,
        true,
      ),
    ).toThrow(/Manage store/)
  })
})

describe('privacy requests', () => {
  it('exports the shopper’s data, then deletes the account but keeps the orders', async () => {
    const owner = await reqAs(payload, shopA.owner)
    const request = await withTransaction(owner, () =>
      recordPrivacyRequest(owner, shopA.tenantId, { type: 'export', email: EMAIL }),
    )
    expect(request.customer).toBeTruthy()
    expect(new Date(request.dueAt).getTime()).toBeGreaterThan(Date.now() + 29 * 86_400_000)
    const data = await exportCustomerData(owner, shopA.tenantId, String(request.id))
    expect(data.account).toMatchObject({ email: EMAIL })
    expect(data.account).not.toHaveProperty('passwordHash')
    expect(data.orders.length).toBeGreaterThan(0)

    const deletion = await withTransaction(owner, () =>
      recordPrivacyRequest(owner, shopA.tenantId, { type: 'deletion', email: EMAIL }),
    )
    await withTransaction(owner, () =>
      updatePrivacyRequest(owner, shopA.tenantId, String(deletion.id), { status: 'in_progress' }),
    )
    await withTransaction(owner, () =>
      updatePrivacyRequest(owner, shopA.tenantId, String(deletion.id), { status: 'done' }),
    )
    const { docs: left } = await payload.find({
      collection: 'customers',
      where: { and: [{ tenant: { equals: shopA.tenantId } }, { email: { equals: EMAIL } }] },
      overrideAccess: true,
    })
    expect(left).toEqual([])
    const { docs: orders } = await payload.find({
      collection: 'orders',
      where: {
        and: [{ tenant: { equals: shopA.tenantId } }, { 'contact.email': { equals: EMAIL } }],
      },
      overrideAccess: true,
    })
    expect(orders.length).toBeGreaterThan(0)
    expect(orders.every((o) => !o.customer)).toBe(true)
    // Store B's account with the same email is untouched
    const { totalDocs } = await payload.count({
      collection: 'customers',
      where: { and: [{ tenant: { equals: shopB.tenantId } }, { email: { equals: EMAIL } }] },
      overrideAccess: true,
    })
    expect(totalDocs).toBe(1)
    // A closed request stays closed
    await expect(
      withTransaction(owner, () =>
        updatePrivacyRequest(owner, shopA.tenantId, String(deletion.id), { status: 'rejected' }),
      ),
    ).rejects.toThrow(/closed/)
  })
})
