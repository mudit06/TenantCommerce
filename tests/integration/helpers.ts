import { createLocalReq, getPayload, type Payload, type PayloadRequest } from 'payload'

import type { Plan, User } from '@/payload-types'

import { PLANS } from '../../scripts/seedData'

export type TestUser = User & { collection: 'users' }

export const asUser = (user: User): TestUser => ({ ...user, collection: 'users' })

export async function startPayload(): Promise<Payload> {
  const { default: config } = await import('@/payload.config')
  return getPayload({ config })
}

export async function stopPayload(payload: Payload) {
  await payload.db.connection.dropDatabase()
  await payload.destroy()
}

export async function seedPlans(payload: Payload): Promise<Record<string, Plan>> {
  const plans: Record<string, Plan> = {}
  for (const plan of PLANS) {
    plans[plan.code] = await payload.create({
      collection: 'plans',
      data: { ...plan, isActive: true },
    })
  }
  return plans
}

export async function createPlatformUser(
  payload: Payload,
  email: string,
  platformRole: 'super-admin' | 'support',
): Promise<TestUser> {
  const user = await payload.create({
    collection: 'users',
    data: {
      email,
      name: email.split('@')[0]!,
      password: 'Platform-Pass-2026',
      platformRole,
      status: 'active',
    },
    overrideAccess: true,
  })
  return asUser(user)
}

export const reqAs = (payload: Payload, user?: TestUser): Promise<PayloadRequest> =>
  createLocalReq(user ? { user } : {}, payload)

export async function userByEmail(payload: Payload, email: string): Promise<TestUser> {
  const { docs } = await payload.find({
    collection: 'users',
    where: { email: { equals: email } },
    overrideAccess: true,
  })
  if (!docs[0]) throw new Error(`No user ${email}`)
  return asUser(docs[0])
}

export const onboardingInput = (
  slug: string,
  overrides: { industry?: string[]; planId: string; ownerEmail: string; trialDays?: number },
) => ({
  business: {
    name: `Store ${slug}`,
    legalName: `${slug} Pvt Ltd`,
    gstin: '27AAPFU0939F1ZV',
    industry: overrides.industry ?? ['hardware'],
  },
  store: { slug },
  plan: {
    planId: overrides.planId,
    trialDays: overrides.trialDays ?? 14,
    billingCycle: 'monthly' as const,
  },
  owner: { name: `Owner ${slug}`, email: overrides.ownerEmail, sendInvite: false },
})

/** The user as our team member with an open store session (docs/05), for Local API calls. */
export const inStoreSession = (
  user: TestUser,
  tenantId: string,
  mode: 'manage' | 'view',
): TestUser => ({
  ...user,
  storeSession: {
    tenant: tenantId,
    mode,
    reason: 'Integration test',
    startedAt: new Date().toISOString(),
    endsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  },
})
