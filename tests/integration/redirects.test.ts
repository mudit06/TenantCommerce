import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { Plan } from '@/payload-types'

import { createPlatformUser, seedPlans, startPayload, stopPayload, type TestUser } from './helpers'
import { buildShop, type Shop } from './shop'

// Slug redirects (docs/12 "changing a slug creates a redirect"): the old address follows the
// product, chains collapse, an address used again stops redirecting, and stores never mix.

let payload: Payload
let plans: Record<string, Plan>
let admin: TestUser
let shopA: Shop
let shopB: Shop

const redirectsOf = async (tenantId: string) =>
  Object.fromEntries(
    (
      await payload.find({
        collection: 'redirects',
        where: { tenant: { equals: tenantId } },
        pagination: false,
        overrideAccess: true,
      })
    ).docs.map((r) => [r.from, r.to]),
  )

const rename = (id: string, slug: string) =>
  payload.update({ collection: 'products', id, data: { slug }, overrideAccess: true })

beforeAll(async () => {
  payload = await startPayload()
  plans = await seedPlans(payload)
  admin = await createPlatformUser(payload, 'admin@platform.test', 'super-admin')
  shopA = await buildShop(payload, {
    admin,
    plan: plans.starter!,
    slug: 'red-a',
    ownerEmail: 'a@red.test',
  })
  shopB = await buildShop(payload, {
    admin,
    plan: plans.starter!,
    slug: 'red-b',
    ownerEmail: 'b@red.test',
  })
})

afterAll(async () => {
  await stopPayload(payload)
})

describe('slug redirects', () => {
  it('keeps old product addresses working, without chains or loops', async () => {
    const towel = await payload.findByID({
      collection: 'products',
      id: shopA.towel,
      overrideAccess: true,
    })
    const first = `/products/${towel.slug}`
    await rename(shopA.towel, 'bath-towel')
    expect(await redirectsOf(shopA.tenantId)).toEqual({ [first]: '/products/bath-towel' })

    await rename(shopA.towel, 'soft-bath-towel')
    // A → B then B → C: both old addresses go straight to C
    expect(await redirectsOf(shopA.tenantId)).toEqual({
      [first]: '/products/soft-bath-towel',
      '/products/bath-towel': '/products/soft-bath-towel',
    })

    await rename(shopA.towel, 'bath-towel')
    // Back to an old address: it is live again and doesn't redirect to itself
    expect(await redirectsOf(shopA.tenantId)).toEqual({
      [first]: '/products/bath-towel',
      '/products/soft-bath-towel': '/products/bath-towel',
    })
    expect(await redirectsOf(shopB.tenantId)).toEqual({})
  })

  it('takes hand-made redirects for a vendor’s old site, tidied', async () => {
    const made = await payload.create({
      collection: 'redirects',
      data: { tenant: shopB.tenantId, from: '/old-site/towel.html/', to: '/products/x' },
      overrideAccess: true,
    })
    expect(made).toMatchObject({ from: '/old-site/towel.html', reason: 'manual' })
    await expect(
      payload.create({
        collection: 'redirects',
        data: { tenant: shopB.tenantId, from: 'https://elsewhere.com', to: '/' },
        overrideAccess: true,
      }),
    ).rejects.toThrow()
  })
})
