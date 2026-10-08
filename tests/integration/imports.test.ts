import type { Payload, PayloadRequest } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { csvFile } from '@/lib/csv'
import { withTransaction } from '@/lib/db/transaction'
import { checkImport, runImport, startImport } from '@/modules/imports'
import type { Plan } from '@/payload-types'

import {
  createPlatformUser,
  reqAs,
  seedPlans,
  startPayload,
  stopPayload,
  type TestUser,
} from './helpers'
import { buildShop, type Shop } from './shop'

// CSV import (docs/12, docs/screens CSV import): the check changes nothing and explains each
// problem; the import creates and updates by SKU, skips bad rows, and stays in its own store.

let payload: Payload
let plans: Record<string, Plan>
let admin: TestUser
let shop: Shop
let other: Shop
let category: string

const asOwner = async <T>(s: Shop, fn: (req: PayloadRequest) => Promise<T>) => {
  const req = await reqAs(payload, s.owner)
  return withTransaction(req, () => fn(req))
}

const products = (tenantId: string) =>
  payload.find({
    collection: 'products',
    where: { tenant: { equals: tenantId } },
    pagination: false,
    overrideAccess: true,
  })

beforeAll(async () => {
  payload = await startPayload()
  plans = await seedPlans(payload)
  admin = await createPlatformUser(payload, 'admin@platform.test', 'super-admin')
  shop = await buildShop(payload, {
    admin,
    plan: plans.starter!,
    slug: 'imp-a',
    ownerEmail: 'a@imp.test',
  })
  other = await buildShop(payload, {
    admin,
    plan: plans.starter!,
    slug: 'imp-b',
    ownerEmail: 'b@imp.test',
  })
  const { docs } = await payload.find({
    collection: 'categories',
    where: { tenant: { equals: shop.tenantId } },
    overrideAccess: true,
  })
  category = docs.find((c) => c.name.startsWith('Bathroom'))!.name
})

afterAll(async () => {
  await stopPayload(payload)
})

describe('products import', () => {
  const header = [
    'product_handle',
    'title',
    'category_path',
    'model_number',
    'sku',
    'option.finish',
    'price',
    'mrp',
    'gst_rate',
    'hsn_code',
    'stock_qty',
  ]

  it('checks every row without changing anything, in plain words', async () => {
    const before = (await products(shop.tenantId)).totalDocs
    const csv = csvFile([
      header,
      // A new product with two finishes
      [
        'nova-mixer',
        'Nova basin mixer',
        category,
        'AV-NV-200',
        'AV-NV-200-CH',
        'Chrome',
        '3,450',
        '3990',
        '18',
        '8481',
        '6',
      ],
      ['nova-mixer', '', '', '', 'AV-NV-200-BM', 'Black matt', '3690', '', '', '', '2'],
      // An existing finish: new price and stock
      ['aria', '', '', 'AV-BM-1120', 'AV-BM-1120-CH', 'Chrome', '4990', '', '', '', '9'],
      // Problems
      [
        'bad-price',
        'Bad price',
        category,
        'AV-X-1',
        'AV-X-1-CH',
        'Chrome',
        '4,250/-',
        '',
        '18',
        '8481',
        '',
      ],
      [
        'bad-cat',
        'Bad category',
        `${category.slice(0, 6)}x`,
        'AV-X-2',
        'AV-X-2-CH',
        'Chrome',
        '100',
        '',
        '18',
        '8481',
        '',
      ],
      ['nova-mixer', '', '', '', 'AV-NV-200-GM', 'Gun Metal Grey', '', '', '', '', ''],
      ['dup', 'Dup', category, 'AV-X-3', 'AV-NV-200-CH', 'Chrome', '100', '', '18', '8481', ''],
    ])
    const job = await asOwner(shop, (req) =>
      checkImport(req, shop.tenantId, { kind: 'products', filename: 'oct.csv', csv }),
    )
    expect(job.stats).toMatchObject({ rows: 7, create: 1, update: 1, errorRows: 4 })
    const errors = job.errors as { row: number; column: string; message: string }[]
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          row: 5,
          column: 'price',
          message: expect.stringMatching(/rupees/),
        }),
        expect.objectContaining({
          row: 6,
          column: 'category_path',
          message: expect.stringMatching(/Did you mean/),
        }),
        expect.objectContaining({
          row: 7,
          column: 'option.finish',
          message: expect.stringMatching(/not a Finish option/),
        }),
        expect.objectContaining({
          row: 8,
          column: 'sku',
          message: expect.stringMatching(/appears twice/),
        }),
      ]),
    )
    expect((await products(shop.tenantId)).totalDocs).toBe(before)

    // Another store can't run it
    await expect(
      asOwner(other, (req) => startImport(req, other.tenantId, String(job.id))),
    ).rejects.toThrow()

    await asOwner(shop, (req) => startImport(req, shop.tenantId, String(job.id)))
    const result = await runImport(payload, String(job.id))
    expect(result).toEqual({ created: 1, updated: 1, skipped: 4 })

    const nova = (await products(shop.tenantId)).docs.find((p) => p.modelNumber === 'AV-NV-200')!
    expect(nova).toMatchObject({
      status: 'draft',
      slug: 'nova-mixer',
      gstRate: '18',
      hsnCode: '8481',
      price: { amountMinor: 3_45_000 },
      compareAtPrice: { amountMinor: 3_99_000 },
      attributes: { finish: ['chrome', 'black-matt'] },
    })
    const { docs: variants } = await payload.find({
      collection: 'variants',
      where: { product: { equals: nova.id } },
      sort: 'sku',
      overrideAccess: true,
    })
    expect(variants.map((v) => [v.sku, v.stockQty, v.price?.amountMinor ?? null])).toEqual([
      ['AV-NV-200-BM', 2, 3_69_000],
      ['AV-NV-200-CH', 6, null],
    ])
    const chrome = await payload.findByID({
      collection: 'variants',
      id: shop.chrome,
      overrideAccess: true,
    })
    expect(chrome.stockQty).toBe(9)
    expect((await products(other.tenantId)).docs.some((p) => p.modelNumber === 'AV-NV-200')).toBe(
      false,
    )
    const done = await payload.findByID({
      collection: 'import-jobs',
      id: job.id,
      overrideAccess: true,
    })
    expect(done).toMatchObject({ status: 'done', csv: null })
  })
})

describe('stock and dealers', () => {
  it('updates stock and prices by SKU or model number', async () => {
    const csv = csvFile([
      ['sku', 'price', 'mrp', 'stock_qty'],
      ['av-bm-1120-mb', '5600', '', '4'],
      ['Towel-model-unknown', '100', '', ''],
    ])
    const job = await asOwner(shop, (req) =>
      checkImport(req, shop.tenantId, { kind: 'stock', filename: 'stock.csv', csv }),
    )
    expect(job.stats).toMatchObject({ rows: 2, update: 1, errorRows: 1 })
    await asOwner(shop, (req) => startImport(req, shop.tenantId, String(job.id)))
    await runImport(payload, String(job.id))
    const black = await payload.findByID({
      collection: 'variants',
      id: shop.black,
      overrideAccess: true,
    })
    expect(black).toMatchObject({ stockQty: 4, price: { amountMinor: 5_60_000 } })
  })

  it('adds and updates dealers by name and pincode', async () => {
    const csv = csvFile([
      [
        'name',
        'type',
        'address',
        'city',
        'state',
        'pincode',
        'phone',
        'latitude',
        'longitude',
        'show_on_store',
      ],
      [
        'Shree Sanitation',
        'Dealer',
        'Baner Road',
        'Pune',
        'Maharashtra',
        '411045',
        '9876500011',
        '18.559',
        '73.7868',
        'yes',
      ],
      [
        'Aqua Studio',
        'Experience centre',
        'Aundh',
        'Pune',
        'Maharashtra',
        '41100',
        '9876500022',
        '',
        '',
        '',
      ],
    ])
    const job = await asOwner(shop, (req) =>
      checkImport(req, shop.tenantId, { kind: 'dealers', filename: 'dealers.csv', csv }),
    )
    expect(job.stats).toMatchObject({ rows: 2, create: 1, errorRows: 1 })
    await asOwner(shop, (req) => startImport(req, shop.tenantId, String(job.id)))
    await runImport(payload, String(job.id))
    const { docs } = await payload.find({
      collection: 'dealers',
      where: { tenant: { equals: shop.tenantId } },
      overrideAccess: true,
    })
    expect(docs).toHaveLength(1)
    expect(docs[0]).toMatchObject({
      name: 'Shree Sanitation',
      isActive: true,
      location: [73.7868, 18.559],
    })
  })
})
