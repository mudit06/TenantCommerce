import type { Payload, PayloadRequest } from 'payload'

import {
  PRICE_HELP,
  rupeesToPaise,
  same,
  wholeNumber,
  yesNo,
  type Row,
  type RowError,
} from './cells'

// Stock and prices, and dealer lists (docs/screens CSV import rule 4): the same check-then-import
// flow as products, matched on SKU (or the model number for a product without finishes), and
// on name and pincode for dealers.

const money = (amountMinor: number) => ({ amountMinor, currency: 'INR' as const })

export type SimplePlan = {
  line: number
  collection: 'variants' | 'products' | 'dealers'
  id: string | null
  data: Record<string, unknown>
}

type Result = {
  plans: SimplePlan[]
  errors: RowError[]
  rows: number
  create: number
  update: number
}

export async function planStock(
  payload: Payload,
  tenantId: string,
  rows: Row[],
  req?: PayloadRequest,
): Promise<Result> {
  const scope = { tenant: { equals: tenantId } }
  const [variants, products] = await Promise.all([
    payload.find({
      collection: 'variants',
      where: scope,
      depth: 0,
      limit: 100_000,
      pagination: false,
      overrideAccess: true,
      select: { sku: true },
      req,
    }),
    payload.find({
      collection: 'products',
      where: scope,
      depth: 0,
      limit: 50_000,
      pagination: false,
      overrideAccess: true,
      select: { modelNumber: true },
      req,
    }),
  ])
  const errors: RowError[] = []
  const plans: SimplePlan[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    const c = row.cells
    const err = (column: string, message: string) =>
      errors.push({ row: row.line, column, message, value: c[column] ?? '' })
    const sku = (c.sku ?? '').toUpperCase()
    if (!sku) {
      err('sku', 'Give the SKU (or the model number of a product without finishes).')
      continue
    }
    if (seen.has(sku)) {
      err('sku', `SKU ${sku} appears twice in this file.`)
      continue
    }
    seen.add(sku)
    const variant = variants.docs.find((v) => v.sku === sku)
    const product = variant ? null : products.docs.find((p) => same(p.modelNumber, c.sku))
    if (!variant && !product) {
      err('sku', `No finish, size or product has the SKU ${sku}.`)
      continue
    }
    const price = rupeesToPaise(c.price ?? '')
    const mrp = rupeesToPaise(c.mrp ?? '')
    const stock = wholeNumber(c.stock_qty ?? '')
    if (price === undefined) err('price', PRICE_HELP)
    if (mrp === undefined) err('mrp', PRICE_HELP.replace('Price', 'MRP'))
    if (stock === undefined) err('stock_qty', 'Stock is a whole number, like 12.')
    if (stock !== null && stock !== undefined && product) {
      err('stock_qty', 'Stock is kept per finish or size; this product has none.')
    }
    if (errors.some((e) => e.row === row.line)) continue
    const data = {
      ...(price ? { price: money(price) } : {}),
      ...(mrp ? { compareAtPrice: money(mrp) } : {}),
      ...(stock !== null && stock !== undefined ? { stockQty: stock } : {}),
    }
    if (!Object.keys(data).length) {
      err('price', 'Nothing to change: give a price, MRP or stock.')
      continue
    }
    plans.push({
      line: row.line,
      collection: variant ? 'variants' : 'products',
      id: String((variant ?? product)!.id),
      data,
    })
  }
  return { plans, errors, rows: rows.length, create: 0, update: plans.length }
}

const DEALER_TYPES = [
  ['dealer', 'Dealer'],
  ['distributor', 'Distributor'],
  ['showroom', 'Showroom'],
  ['service-centre', 'Service centre'],
  ['experience-centre', 'Experience centre'],
] as const

export async function planDealers(
  payload: Payload,
  tenantId: string,
  rows: Row[],
  req?: PayloadRequest,
): Promise<Result> {
  const { docs: dealers } = await payload.find({
    collection: 'dealers',
    where: { tenant: { equals: tenantId } },
    depth: 0,
    limit: 10_000,
    pagination: false,
    overrideAccess: true,
    select: { name: true, pincode: true },
    req,
  })
  const errors: RowError[] = []
  const plans: SimplePlan[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    const c = row.cells
    const err = (column: string, message: string) =>
      errors.push({ row: row.line, column, message, value: c[column] ?? '' })
    for (const column of ['name', 'address', 'city', 'state', 'pincode', 'phone']) {
      if (!c[column]) err(column, `${column[0]!.toUpperCase()}${column.slice(1)} is required.`)
    }
    if (c.pincode && !/^[1-9]\d{5}$/.test(c.pincode)) err('pincode', 'A 6-digit pincode.')
    const type = c.type
      ? DEALER_TYPES.find(([value, label]) => same(value, c.type) || same(label, c.type))?.[0]
      : 'dealer'
    if (!type) err('type', `Type is one of: ${DEALER_TYPES.map(([, l]) => l).join(', ')}.`)
    const lat = c.latitude ? Number(c.latitude) : null
    const lng = c.longitude ? Number(c.longitude) : null
    if ((lat === null) !== (lng === null)) err('latitude', 'Give both latitude and longitude.')
    if (lat !== null && !(lat >= 6 && lat <= 38)) err('latitude', 'Latitude in India is 6 to 38.')
    if (lng !== null && !(lng >= 68 && lng <= 98))
      err('longitude', 'Longitude in India is 68 to 98.')
    const show = yesNo(c.show_on_store ?? '')
    if (show === undefined) err('show_on_store', 'Show on store is yes or no.')
    if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.email)) err('email', 'Check the email.')
    const key = `${(c.name ?? '').toLowerCase()}|${c.pincode}`
    if (seen.has(key)) err('name', 'This dealer appears twice in this file.')
    seen.add(key)
    if (errors.some((e) => e.row === row.line)) continue
    const existing = dealers.find((d) => same(d.name, c.name) && d.pincode === c.pincode)
    plans.push({
      line: row.line,
      collection: 'dealers',
      id: existing ? String(existing.id) : null,
      data: {
        name: c.name,
        type,
        address: c.address,
        city: c.city,
        state: c.state,
        pincode: c.pincode,
        phone: c.phone,
        email: c.email || null,
        hours: c.hours || null,
        ...(lat !== null && lng !== null ? { location: [lng, lat] } : {}),
        ...(show !== null ? { isActive: show } : {}),
      },
    })
  }
  return {
    plans,
    errors,
    rows: rows.length,
    create: plans.filter((p) => !p.id).length,
    update: plans.filter((p) => p.id).length,
  }
}

export async function applySimplePlan(req: PayloadRequest, tenantId: string, plan: SimplePlan) {
  if (plan.id) {
    await req.payload.update({
      collection: plan.collection,
      id: plan.id,
      data: plan.data as never,
      overrideAccess: true,
      req,
    })
    return { created: 0, updated: 1 }
  }
  await req.payload.create({
    collection: plan.collection,
    data: { ...plan.data, tenant: tenantId } as never,
    overrideAccess: true,
    req,
  })
  return { created: 1, updated: 0 }
}
