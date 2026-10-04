import sharp from 'sharp'
import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { withTransaction } from '@/lib/db/transaction'
import { generateVariants } from '@/modules/catalog'
import { createStoreEnquiry, storeEnquirySchema } from '@/modules/enquiries'
import { createTenant, setFeature } from '@/modules/tenancy'
import type { Plan, Product, Tenant } from '@/payload-types'

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

// Products and variants (ADR 0006) and the storefront enquiry path, per store.

let payload: Payload
let plans: Record<string, Plan>
let admin: TestUser
let storeA: Tenant
let storeB: Tenant
let ownerA: TestUser
let ownerB: TestUser
let categoryA: string
let photoA: string

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

const draftProduct = (overrides: Partial<Product> = {}) => ({
  tenant: idA(),
  title: 'Feather pull handle',
  modelNumber: 'HOPH-504',
  primaryCategory: categoryA,
  status: 'draft' as const,
  purchaseMode: 'enquire' as const,
  attributes: {
    size: ['8-inch', '10-inch'],
    finish: ['antique', 'rose-gold', 'black-matt'],
    material: 'stainless-steel',
  },
  ...overrides,
})

beforeAll(async () => {
  payload = await startPayload()
  plans = await seedPlans(payload)
  admin = await createPlatformUser(payload, 'admin@platform.test', 'super-admin')
  storeA = await onboard('store-a', plans.enterprise!.id, 'owner@a.test')
  storeB = await onboard('store-b', plans.starter!.id, 'owner@b.test', ['clothing'])
  ownerA = await userByEmail(payload, 'owner@a.test')
  ownerB = await userByEmail(payload, 'owner@b.test')
  const set = await payload.create({
    collection: 'attribute-sets',
    data: {
      tenant: idA(),
      name: 'Door handles',
      attributes: [
        {
          label: 'Size',
          type: 'select',
          isVariantAxis: true,
          isFilterable: true,
          options: [
            { label: '8 inch', value: '8-inch' },
            { label: '10 inch', value: '10-inch' },
            { label: '12 inch', value: '12-inch' },
          ],
        },
        {
          label: 'Finish',
          type: 'color',
          isVariantAxis: true,
          options: [{ label: 'Antique' }, { label: 'Rose gold' }, { label: 'Black matt' }],
        },
        {
          label: 'Material',
          type: 'select',
          isRequired: true,
          options: [{ label: 'Stainless steel' }, { label: 'Brass' }],
        },
      ],
    },
  })
  const parent = await payload.create({
    collection: 'categories',
    data: { tenant: idA(), name: 'Door hardware', attributeSet: set.id },
  })
  // Pull handles inherit the parent's attribute set
  categoryA = String(
    (
      await payload.create({
        collection: 'categories',
        data: { tenant: idA(), name: 'Pull handles', parent: parent.id },
      })
    ).id,
  )
  const png = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#c98b6b' } })
    .png()
    .toBuffer()
  photoA = String(
    (
      await payload.create({
        collection: 'media',
        data: { tenant: idA(), alt: 'Handle' },
        file: { data: png, mimetype: 'image/png', name: 'handle.png', size: png.length },
      })
    ).id,
  )
})

afterAll(async () => {
  await payload
    .delete({ collection: 'media', where: { id: { equals: photoA } } })
    .catch(() => undefined)
  await stopPayload(payload)
})

describe('products', () => {
  it('checks specifications against the category’s attribute set (inherited from the parent)', async () => {
    const product = await payload.create({
      collection: 'products',
      data: draftProduct(),
      user: ownerA,
      overrideAccess: false,
    })
    expect(product.slug).toBe('feather-pull-handle')
    expect(product.legal?.countryOfOrigin).toBe('IN')
    await expect(
      payload.create({
        collection: 'products',
        data: draftProduct({
          modelNumber: 'X1',
          title: 'Bad',
          attributes: { finish: ['gold'], colour: 'red' },
        }),
      }),
    ).rejects.toThrow(/not one of its options.*|not a field/)
  })

  it('goes active only with a photo, label details and the required specifications', async () => {
    await expect(
      payload.create({
        collection: 'products',
        data: draftProduct({
          title: 'No photo',
          modelNumber: 'A1',
          status: 'active',
          attributes: {},
        }),
      }),
    ).rejects.toThrow(/Material is required.*|photo|label details/)
    const live = await payload.create({
      collection: 'products',
      data: draftProduct({
        title: 'Live handle',
        modelNumber: 'A2',
        status: 'active',
        gallery: [photoA],
        legal: {
          genericName: 'Door pull handle',
          netQuantity: '1 piece',
          countryOfOrigin: 'IN',
          madeBy: 'manufacturer',
          madeByName: 'Store A Pvt Ltd',
          madeByAddress: 'Mumbai',
        },
      }),
    })
    expect(live.status).toBe('active')
    // Selling online needs a price and HSN code
    await expect(
      payload.update({ collection: 'products', id: live.id, data: { purchaseMode: 'buy' } }),
    ).rejects.toThrow(/selling price and an HSN code/)
  })

  it('keeps the store’s product count current', async () => {
    const tenant = await payload.findByID({ collection: 'tenants', id: idA(), depth: 0 })
    const { totalDocs } = await payload.count({
      collection: 'products',
      where: { tenant: { equals: idA() } },
    })
    expect(tenant.usage?.productsCount).toBe(totalDocs)
  })

  it('stays inside its store', async () => {
    const seenByB = await payload.find({
      collection: 'products',
      user: ownerB,
      overrideAccess: false,
    })
    expect(seenByB.docs).toHaveLength(0)
    await expect(
      payload.create({
        collection: 'products',
        data: draftProduct({ title: 'Sneaky', modelNumber: 'S1' }),
        user: ownerB,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })
})

describe('variants', () => {
  it('creates every combination of the ticked options once', async () => {
    const product = (
      await payload.find({
        collection: 'products',
        where: { modelNumber: { equals: 'HOPH-504' } },
        limit: 1,
      })
    ).docs[0]!
    const req = await reqAs(payload, ownerA)
    const first = await withTransaction(req, () => generateVariants(req, product))
    expect(first).toEqual({ created: 6, existing: 0 })
    const again = await withTransaction(req, () => generateVariants(req, product))
    expect(again).toEqual({ created: 0, existing: 6 })
    const { docs } = await payload.find({
      collection: 'variants',
      where: { product: { equals: product.id } },
      sort: 'sortOrder',
    })
    expect(docs[0]).toMatchObject({
      title: '8 inch · Antique',
      sku: 'HOPH-504-8-INCH-ANTIQUE',
      tenant: expect.anything(),
    })
  })

  it('refuses options the product isn’t offered in, and products of another store', async () => {
    const product = (
      await payload.find({
        collection: 'products',
        where: { modelNumber: { equals: 'HOPH-504' } },
        limit: 1,
      })
    ).docs[0]!
    await expect(
      payload.create({
        collection: 'variants',
        data: {
          product: product.id,
          options: { size: '12-inch', finish: 'antique' },
          status: 'active',
        },
      }),
    ).rejects.toThrow(/offered in/)
    await expect(
      payload.create({
        collection: 'variants',
        data: {
          tenant: idB(),
          product: product.id,
          options: { size: '8-inch', finish: 'antique' },
          sku: 'X-1',
          status: 'active',
        },
        user: ownerB,
        overrideAccess: false,
      }),
    ).rejects.toThrow()
  })

  it('deleting a product deletes its variants', async () => {
    const product = (
      await payload.find({
        collection: 'products',
        where: { modelNumber: { equals: 'HOPH-504' } },
        limit: 1,
      })
    ).docs[0]!
    await payload.delete({ collection: 'products', id: product.id })
    const { totalDocs } = await payload.count({
      collection: 'variants',
      where: { product: { equals: product.id } },
    })
    expect(totalDocs).toBe(0)
  })
})

describe('storefront enquiries', () => {
  const input = storeEnquirySchema.parse({
    type: 'product',
    name: 'Rakesh Mehta',
    phone: '98250 12345',
    qty: '40',
    productTitle: 'Live handle',
    modelNumber: 'A2',
    message: 'Options: Size: 10 inch',
    consent: true,
  })

  it('saves to the store from the request host only while its enquiries feature is on', async () => {
    const saved = await createStoreEnquiry(payload, idA(), input)
    expect(saved).toEqual({ referenceNumber: 'ENQ-1' })
    // Clothing preset: enquiries off for store B
    expect(await createStoreEnquiry(payload, idB(), input)).toEqual({ disabled: true })
    const req = await reqAs(payload, admin)
    await withTransaction(req, () =>
      setFeature(req, { tenantId: idB(), key: 'enquiries', enabled: true }),
    )
    expect(await createStoreEnquiry(payload, idB(), input)).toEqual({ referenceNumber: 'ENQ-1' })
  })

  it('needs consent and a way to reply', () => {
    expect(
      storeEnquirySchema.safeParse({ name: 'A B', phone: '9825012345', consent: false }).success,
    ).toBe(false)
    const noContact = storeEnquirySchema.safeParse({ name: 'A B', consent: true })
    expect(noContact.success).toBe(false)
  })
})
