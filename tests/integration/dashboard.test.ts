import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { loadEnquirySummary, loadStoreAttention } from '@/admin/views/storeHomeData'
import { withTransaction } from '@/lib/db/transaction'
import { createTenant } from '@/modules/tenancy'
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

// Store dashboard data (docs/screens/vendor-cms.md `cms-dashboard`): every card reads only its
// own store (docs/04) and the attention list reflects that store's state.

let payload: Payload
let plans: Record<string, Plan>
let admin: TestUser
let storeA: Tenant
let storeB: Tenant
let ownerA: TestUser

async function onboard(slug: string, ownerEmail: string) {
  const req = await reqAs(payload, admin)
  return (
    await withTransaction(req, () =>
      createTenant(req, onboardingInput(slug, { planId: String(plans.starter!.id), ownerEmail })),
    )
  ).tenant
}

async function enquiry(tenant: Tenant, name: string, status: string, hoursAgo: number) {
  const doc = await payload.create({
    collection: 'enquiries',
    data: { tenant: tenant.id, type: 'bulk', name, phone: '9876543210', status } as never,
    overrideAccess: true,
  })
  const at = new Date(Date.now() - hoursAgo * 3_600_000).toISOString()
  await payload.db.updateOne({
    collection: 'enquiries',
    where: { id: { equals: doc.id } },
    data: { createdAt: at, updatedAt: at },
  })
}

beforeAll(async () => {
  payload = await startPayload()
  plans = await seedPlans(payload)
  admin = await createPlatformUser(payload, 'admin@platform.test', 'super-admin')
  storeA = await onboard('dash-a', 'owner@dash-a.test')
  storeB = await onboard('dash-b', 'owner@dash-b.test')
  ownerA = await userByEmail(payload, 'owner@dash-a.test')
  await enquiry(storeA, 'Asha in store A', 'new', 50)
  await enquiry(storeA, 'Arjun in store A', 'contacted', 3)
  await enquiry(storeB, 'Bina in store B', 'new', 60)
})

afterAll(async () => {
  await stopPayload(payload)
})

describe('store dashboard data', () => {
  it('counts enquiries of its own store only', async () => {
    const summary = await loadEnquirySummary(
      payload,
      String(storeA.id),
      String(ownerA.id),
      new Date(),
    )
    expect(summary.newCount).toBe(1)
    expect(summary.inProgress).toBe(1)
    expect(summary.waitingOverADay).toBe(1)
    expect(summary.latest.map((doc) => doc.name)).toEqual(['Asha in store A'])
    expect(summary.daily).toHaveLength(14)
    expect(summary.daily.reduce((sum, day) => sum + day.count, 0)).toBe(2)
  })

  it('lists what needs the owner, from this store', async () => {
    const now = new Date()
    const enquiries = await loadEnquirySummary(payload, String(storeA.id), String(ownerA.id), now)
    const items = await loadStoreAttention({
      payload,
      tenantId: String(storeA.id),
      roles: ['owner'],
      userId: String(ownerA.id),
      now,
      enquiries,
      catalog: null,
      canWriteCatalog: true,
    })
    const waiting = items.find((item) => item.key === 'enquiries-waiting')
    expect(waiting?.text).toBe('1 enquiry waiting more than a day for a reply')
    expect(waiting?.detail).toContain('Asha in store A')
    expect(JSON.stringify(items)).not.toContain('store B')
  })

  it('shows a catalog editor no owner-only items', async () => {
    const items = await loadStoreAttention({
      payload,
      tenantId: String(storeA.id),
      roles: ['catalog-editor'],
      userId: String(ownerA.id),
      now: new Date(),
      enquiries: null,
      catalog: null,
      canWriteCatalog: true,
    })
    expect(items.map((item) => item.key)).not.toContain('trial')
    expect(items.map((item) => item.key)).not.toContain('invites')
  })
})
