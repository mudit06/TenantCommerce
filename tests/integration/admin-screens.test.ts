import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { withTransaction } from '@/lib/db/transaction'
import { moveCategory } from '@/modules/catalog/services/categoryTree'
import { categoryTree, productFiltersFrom, productRows, productsWhere } from '@/modules/catalog'
import { saveCodRules } from '@/modules/content'
import { positionForPincode } from '@/modules/dealers'
import { exportProducts } from '@/modules/imports/services/export'
import { toRows } from '@/modules/imports/services/cells'
import { loadSnapshot, planProducts } from '@/modules/imports/services/products'
import { placeOrder, placeOrderSchema } from '@/modules/orders'
import { ordersPlacedByStore, platformSales } from '@/modules/reports'
import { loadVendorRows } from '@/modules/tenancy/admin/vendorsData'
import type { Plan } from '@/payload-types'

import {
  createPlatformUser,
  reqAs,
  seedPlans,
  startPayload,
  stopPayload,
  type TestUser,
} from './helpers'
import { buildShop, sampleOrderInput, type Shop } from './shop'

// The services behind the wireframe screens built on 10 October 2026: the Products list's
// filters and rows, its export (which must import again unchanged), the Categories tree's moves,
// dealer positions from the pincode, and the platform dashboard's and All vendors' sales.

let payload: Payload
let plans: Record<string, Plan>
let admin: TestUser
let shop: Shop
let other: Shop

const params = (query: string) => productFiltersFrom(new URLSearchParams(query))

beforeAll(async () => {
  payload = await startPayload()
  plans = await seedPlans(payload)
  admin = await createPlatformUser(payload, 'admin@screens.test', 'super-admin')
  shop = await buildShop(payload, {
    admin,
    plan: plans.starter!,
    slug: 'scr-a',
    ownerEmail: 'a@scr.test',
  })
  other = await buildShop(payload, {
    admin,
    plan: plans.enterprise!,
    slug: 'scr-b',
    ownerEmail: 'b@scr.test',
  })
})

afterAll(async () => {
  await stopPayload(payload)
})

describe('Products list (cms-products)', () => {
  it('finds a product by an exact SKU in any case, and never another store’s', async () => {
    const where = await productsWhere(payload, shop.tenantId, params('q=av-bm-1120-mb'))
    const { docs } = await payload.find({ collection: 'products', where, overrideAccess: true })
    expect(docs.map((d) => String(d.id))).toEqual([shop.tap])
  })

  it('filters by stock from the finishes', async () => {
    const find = async (query: string) => {
      const where = await productsWhere(payload, shop.tenantId, params(query))
      const { docs } = await payload.find({ collection: 'products', where, overrideAccess: true })
      return docs.map((d) => String(d.id))
    }
    // The tap's finishes hold 3 + 1; the towel has no finishes, so no stock to filter on
    expect(await find('stock=in')).toEqual([shop.tap])
    expect(await find('stock=out')).toEqual([])
  })

  it('shows finishes, the price range and stock per row', async () => {
    const { docs } = await payload.find({
      collection: 'products',
      where: { tenant: { equals: shop.tenantId } },
      depth: 1,
      overrideAccess: true,
    })
    const rows = await productRows(payload, shop.tenantId, docs)
    const tap = rows.find((r) => r.id === shop.tap)!
    const towel = rows.find((r) => r.id === shop.towel)!
    expect(tap).toMatchObject({
      variants: '2 finishes',
      price: '₹5,190 – ₹5,490',
      stock: { qty: 4 },
    })
    expect(towel).toMatchObject({ variants: '1', price: '₹1,050', stock: null })
  })
})

describe('Product export (Products “Export”)', () => {
  it('writes the import template’s columns and imports again with no changes or errors', async () => {
    const table = await exportProducts(payload, shop.tenantId, {
      tenant: { equals: shop.tenantId },
    })
    const [header] = table
    expect(header).toContain('option.finish')
    expect(header).toContain('product_handle')
    // The tap's two finishes, then the towel
    expect(table).toHaveLength(4)
    const { rows } = toRows(table)
    const snapshot = await loadSnapshot(payload, shop.tenantId)
    const plan = planProducts(snapshot, rows)
    expect(plan.errors).toEqual([])
    expect(plan.create).toBe(0)
    expect(plan.plans.every((p) => p.productId)).toBe(true)
  })
})

describe('Categories tree (cms-categories)', () => {
  it('reorders siblings and refuses a fourth level', async () => {
    const req = await reqAs(payload, shop.owner)
    const make = (name: string, parent?: string) =>
      payload.create({
        collection: 'categories',
        data: { tenant: shop.tenantId, name, ...(parent ? { parent } : {}) },
        overrideAccess: true,
      })
    const top = await make('Fittings')
    const mid = await make('Handles', String(top.id))
    const leaf = await make('Lever handles', String(mid.id))
    const loose = await make('Hooks')

    await withTransaction(req, () =>
      moveCategory(req, { id: String(loose.id), tenantId: shop.tenantId, parent: null, index: 0 }),
    )
    const tops = (await categoryTree(payload, shop.tenantId)).filter((n) => n.parent === null)
    expect(tops[0]!.id).toBe(String(loose.id))

    await expect(
      withTransaction(req, () =>
        moveCategory(req, {
          id: String(loose.id),
          tenantId: shop.tenantId,
          parent: String(leaf.id),
          index: 0,
        }),
      ),
    ).rejects.toThrow(/levels deep/)
  })

  it('counts products in a category and the ones under it', async () => {
    const nodes = await categoryTree(payload, shop.tenantId)
    expect(nodes.reduce((sum, n) => sum + (n.depth === 0 ? n.count : 0), 0)).toBe(2)
  })
})

describe('Dealer positions (cms-dealers)', () => {
  const dealer = (tenant: string, name: string, location?: [number, number]) =>
    payload.create({
      collection: 'dealers',
      data: {
        tenant,
        name,
        type: 'dealer',
        address: 'Baner Road',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411045',
        phone: '020 2729 0412',
        ...(location ? { location } : {}),
      },
      overrideAccess: true,
    })

  it('starts a new dealer at its store’s other dealers in the pincode, never another store’s', async () => {
    await dealer(other.tenantId, 'Other store’s dealer', [70.8, 22.3])
    expect(await positionForPincode(payload, shop.tenantId, '411045')).toBeNull()
    await dealer(shop.tenantId, 'Shree Sanitation', [73.7868, 18.559])
    const placed = await dealer(shop.tenantId, 'Baner Home Studio')
    expect(placed.location).toEqual([73.7868, 18.559])
  })

  it('prefers the pincode directory’s position when it has one', async () => {
    await payload.create({
      collection: 'pincodes',
      data: { pincode: '411045', city: 'Pune', stateCode: '27', latitude: 18.56, longitude: 73.78 },
      overrideAccess: true,
    })
    expect(await positionForPincode(payload, shop.tenantId, '411045')).toEqual({
      latitude: 18.56,
      longitude: 73.78,
      from: 'directory',
    })
  })
})

describe('Platform sales (sa-dashboard, sa-vendors)', () => {
  it('counts today’s orders and the month’s paid orders by store', async () => {
    const owner = await reqAs(payload, shop.owner)
    await withTransaction(owner, () =>
      saveCodRules(owner, {
        tenantId: shop.tenantId,
        codEnabled: true,
        codMinOrderMinor: null,
        codMaxOrderMinor: null,
        codFeeMinor: null,
      }),
    )
    const req = await reqAs(payload)
    const input = placeOrderSchema.parse(sampleOrderInput({ paymentMethod: 'cod' }))
    const { order } = await withTransaction(req, () =>
      placeOrder(req, shop.tenantId, { lines: [{ productId: shop.towel, qty: 1 }], input }),
    )
    // Cash collected on delivery counts as a sale from the day it comes in
    await payload.update({
      collection: 'orders',
      id: order.id,
      data: { paymentStatus: 'paid', paidAt: new Date().toISOString() },
      overrideAccess: true,
      context: { skipNotifications: true },
    })
    const total = order.totals?.grandTotalMinor ?? 0
    const sales = await platformSales(payload)
    expect(sales.ordersToday).toBe(1)
    expect(sales.gmvMinor).toBe(total)
    expect(sales.topStores[0]).toMatchObject({
      tenantId: shop.tenantId,
      orders: 1,
      salesMinor: total,
    })
    expect(sales.daily.reduce((sum, d) => sum + d.salesMinor, 0)).toBe(total)

    const placed = await ordersPlacedByStore(payload, new Date(Date.now() - 86_400_000))
    expect(placed.get(shop.tenantId)).toBe(1)
    expect(placed.get(other.tenantId)).toBeUndefined()
  })

  it('lists vendors with plan, orders in 30 days and the filters', async () => {
    const all = await loadVendorRows(payload, {
      tab: 'all',
      q: '',
      plan: '',
      industry: '',
      subscription: '',
    })
    expect(all.rows.find((r) => r.id === shop.tenantId)).toMatchObject({ orders30: 1, products: 2 })
    const starter = await loadVendorRows(payload, {
      tab: 'all',
      q: '',
      plan: String(plans.starter!.id),
      industry: '',
      subscription: '',
    })
    expect(starter.rows.map((r) => r.id)).toEqual([shop.tenantId])
    const search = await loadVendorRows(payload, {
      tab: 'all',
      q: 'scr-b',
      plan: '',
      industry: '',
      subscription: '',
    })
    expect(search.rows.map((r) => r.id)).toEqual([other.tenantId])
  })
})
