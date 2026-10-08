import type { Payload, PayloadRequest } from 'payload'

import { idOf } from '@/access'
import { slugify } from '@/fields/slug'
import { attributeSetForCategory, GST_RATES, type Attribute } from '@/modules/catalog'
import type { Product, Variant } from '@/payload-types'

import { PRICE_HELP, rupeesToPaise, same, wholeNumber, type Row, type RowError } from './cells'

// Products import (docs/12 "CSV import"): one row per finish or size, grouped into products by
// `product_handle` (or the model number). Rows are matched on SKU: an existing SKU updates its
// product and finish; a new SKU adds one; a product without finishes is matched on its model
// number. The plan is worked out the same way for the check and for the import, so the import
// re-checks against the store as it is then.

const SKU = /^[A-Z0-9][A-Z0-9._/-]{0,63}$/
const HSN = /^(\d{4}|\d{6}|\d{8})$/
const MODES = ['buy', 'enquire', 'both'] as const

type Money = { amountMinor: number; currency: 'INR' }
const money = (amountMinor: number): Money => ({ amountMinor, currency: 'INR' })

type CategoryNode = { id: string; name: string; parent: string | null }

export type Snapshot = {
  categories: CategoryNode[]
  brands: { id: string; name: string }[]
  products: Pick<Product, 'id' | 'modelNumber' | 'slug' | 'primaryCategory' | 'attributes'>[]
  variants: Pick<Variant, 'id' | 'sku' | 'product' | 'options'>[]
  /** Attribute sets by category id (inherited from parents) */
  sets: Map<string, { name: string; attributes: Attribute[] } | null>
  /** How many more products the plan allows (null: no limit) */
  room: number | null
}

export async function loadSnapshot(
  payload: Payload,
  tenantId: string,
  req?: PayloadRequest,
): Promise<Snapshot> {
  const scope = { tenant: { equals: tenantId } }
  const common = { depth: 0, pagination: false as const, overrideAccess: true, req }
  const [categories, brands, products, variants, tenant] = await Promise.all([
    payload.find({ collection: 'categories', where: scope, limit: 5000, ...common }),
    payload.find({ collection: 'brands', where: scope, limit: 2000, ...common }),
    payload.find({
      collection: 'products',
      where: scope,
      limit: 50_000,
      select: { modelNumber: true, slug: true, primaryCategory: true, attributes: true },
      ...common,
    }),
    payload.find({
      collection: 'variants',
      where: scope,
      limit: 100_000,
      select: { sku: true, product: true, options: true },
      ...common,
    }),
    payload.findByID({ collection: 'tenants', id: tenantId, depth: 1, overrideAccess: true, req }),
  ])
  const sets = new Map<string, { name: string; attributes: Attribute[] } | null>()
  for (const c of categories.docs) {
    const set = await attributeSetForCategory(payload, String(c.id), req)
    sets.set(
      String(c.id),
      set ? { name: set.name, attributes: (set.attributes ?? []) as Attribute[] } : null,
    )
  }
  const plan = typeof tenant.plan === 'object' ? tenant.plan : null
  const max = plan?.limits?.maxProducts ?? null
  return {
    categories: categories.docs.map((c) => ({
      id: String(c.id),
      name: c.name,
      parent: idOf(c.parent) ?? null,
    })),
    brands: brands.docs.map((b) => ({ id: String(b.id), name: b.name })),
    products: products.docs,
    variants: variants.docs,
    sets,
    room: max === null ? null : Math.max(0, max - products.docs.length),
  }
}

function findCategory(snapshot: Snapshot, path: string) {
  const parts = path
    .split('>')
    .map((p) => p.trim())
    .filter(Boolean)
  let parent: string | null = null
  let node: CategoryNode | undefined
  for (const part of parts) {
    node = snapshot.categories.find((c) => c.parent === parent && same(c.name, part))
    if (!node) {
      const near = snapshot.categories.find(
        (c) =>
          c.parent === parent &&
          (c.name.toLowerCase().startsWith(part.toLowerCase().slice(0, 4)) ||
            part.toLowerCase().startsWith(c.name.toLowerCase().slice(0, 4))),
      )
      return {
        node: null,
        problem: `Category “${part}” not found.${near ? ` Did you mean “${near.name}”?` : ' Add it in Catalog → Categories first.'}`,
      }
    }
    parent = node.id
  }
  return node ? { node, problem: null } : { node: null, problem: 'Give the category path.' }
}

/** An option of an attribute by its label or value, any case */
const optionOf = (attribute: Attribute, typed: string) =>
  (attribute.options ?? []).find((o) => same(o.label, typed) || same(o.value, typed))

const axisOf = (attributes: Attribute[], column: string) =>
  attributes.find(
    (a) =>
      a.isVariantAxis &&
      (same(a.code, column) || same(a.label, column) || same(a.code, column.replace(/\s+/g, '_'))),
  )

export type ProductPlan = {
  line: number
  /** The product to update, or null to create */
  productId: string | null
  product: Record<string, unknown>
  /** Axis values the product offers after the import */
  axisValues: Record<string, string[]>
  variants: {
    line: number
    variantId: string | null
    sku: string
    options: Record<string, string>
    price?: Money | null
    compareAtPrice?: Money | null
    stockQty?: number
  }[]
  creates: boolean
}

export function planProducts(
  snapshot: Snapshot,
  rows: Row[],
): { plans: ProductPlan[]; errors: RowError[]; rows: number; create: number; update: number } {
  const errors: RowError[] = []
  const err = (row: Row, column: string, message: string) =>
    errors.push({ row: row.line, column, message, value: row.cells[column] ?? '' })

  // SKUs twice in the file
  const seen = new Map<string, number>()
  for (const row of rows) {
    const sku = (row.cells.sku ?? '').toUpperCase()
    if (!sku) continue
    if (seen.has(sku)) err(row, 'sku', `SKU ${sku} appears twice in this file.`)
    else seen.set(sku, row.line)
  }

  const groups = new Map<string, Row[]>()
  for (const row of rows) {
    const key = (row.cells.product_handle || row.cells.model_number || row.cells.sku || '')
      .trim()
      .toLowerCase()
    if (!key) {
      err(row, 'product_handle', 'Give a product_handle (or model_number) to group the row.')
      continue
    }
    groups.set(key, [...(groups.get(key) ?? []), row])
  }

  const plans: ProductPlan[] = []
  let room = snapshot.room
  const variantBySku = new Map(snapshot.variants.map((v) => [v.sku, v]))
  for (const [handle, group] of groups) {
    const first = group[0]!
    const c = first.cells
    const before = errors.length
    // The product: by a known SKU, else by model number
    const knownVariant = group
      .map((r) => variantBySku.get((r.cells.sku ?? '').toUpperCase()))
      .find(Boolean)
    const existing =
      (knownVariant &&
        snapshot.products.find((p) => String(p.id) === idOf(knownVariant.product))) ||
      (c.model_number && snapshot.products.find((p) => same(p.modelNumber, c.model_number))) ||
      null
    const product: Record<string, unknown> = {}

    if (!existing) {
      if (!c.title) err(first, 'title', 'A new product needs its title on its first row.')
      if (!c.model_number) err(first, 'model_number', 'A new product needs a model number.')
      if (!c.category_path) err(first, 'category_path', 'A new product needs its category.')
    }
    if (c.title) product.title = c.title
    if (c.model_number) product.modelNumber = c.model_number
    let categoryId = existing ? idOf(existing.primaryCategory) : null
    if (c.category_path) {
      const { node, problem } = findCategory(snapshot, c.category_path)
      if (problem) err(first, 'category_path', problem)
      else {
        categoryId = node!.id
        product.primaryCategory = node!.id
      }
    }
    if (c.brand) {
      const brand = snapshot.brands.find((b) => same(b.name, c.brand))
      if (!brand) err(first, 'brand', `Brand “${c.brand}” not found. Add it in Catalog → Brands.`)
      else product.brand = brand.id
    }
    const price = rupeesToPaise(c.price ?? '')
    if (price === undefined) err(first, 'price', PRICE_HELP)
    const mrp = rupeesToPaise(c.mrp ?? '')
    if (mrp === undefined) err(first, 'mrp', PRICE_HELP.replace('Price', 'MRP'))
    if (c.gst_rate) {
      const rate = Number(c.gst_rate.replace('%', ''))
      if (!(GST_RATES as readonly number[]).includes(rate)) {
        err(first, 'gst_rate', `GST rate must be one of ${GST_RATES.join(', ')}.`)
      } else product.gstRate = String(rate)
    }
    if (c.hsn_code) {
      if (!HSN.test(c.hsn_code)) err(first, 'hsn_code', 'HSN code has 4, 6 or 8 digits.')
      else product.hsnCode = c.hsn_code
    } else if (!existing && price) {
      err(first, 'hsn_code', 'HSN code is required for GST invoices.')
    }
    if (c.purchase_mode) {
      const mode = MODES.find((m) => same(m, c.purchase_mode))
      if (!mode) err(first, 'purchase_mode', 'Purchase mode is buy, enquire or both.')
      else product.purchaseMode = mode
    } else if (!existing) product.purchaseMode = price ? 'both' : 'enquire'
    if (c.short_description) product.shortDescription = c.short_description.slice(0, 300)
    if (c.search_keywords) product.searchKeywords = c.search_keywords
    const weight = wholeNumber(c.weight_g ?? '')
    if (weight === undefined) err(first, 'weight_g', 'Weight is whole grams, like 1200.')
    else if (weight !== null) product.weightGrams = weight
    const legal: Record<string, string> = {}
    if (c.generic_name) legal.genericName = c.generic_name
    if (c.net_quantity) legal.netQuantity = c.net_quantity
    if (c.country_of_origin) {
      const country = c.country_of_origin.toUpperCase()
      if (country === 'INDIA' || country === 'IN') legal.countryOfOrigin = 'IN'
      else if (/^[A-Z]{2}$/.test(country)) legal.countryOfOrigin = country
      else err(first, 'country_of_origin', 'Country of origin as a two-letter code, like IN or CN.')
    }
    if (Object.keys(legal).length) product.legal = legal
    if (c.seo_title || c.seo_description) {
      product.seo = {
        ...(c.seo_title ? { title: c.seo_title.slice(0, 70) } : {}),
        ...(c.seo_description ? { description: c.seo_description.slice(0, 160) } : {}),
      }
    }

    // Finishes and sizes: option.<axis> columns against the category's attribute set
    const set = categoryId ? snapshot.sets.get(categoryId) : null
    const attributes = set?.attributes ?? []
    const optionColumns = Object.keys(c).filter((k) => k.startsWith('option.'))
    const axisValues: Record<string, string[]> = {}
    const current = (existing?.attributes ?? {}) as Record<string, unknown>
    for (const a of attributes.filter((x) => x.isVariantAxis && x.code)) {
      const offered = current[a.code!]
      axisValues[a.code!] = Array.isArray(offered) ? [...(offered as string[])] : []
    }
    const variants: ProductPlan['variants'] = []
    const hasOptions = group.some((r) => optionColumns.some((k) => r.cells[k]))
    if (hasOptions) {
      for (const row of group) {
        const rowBefore = errors.length
        const options: Record<string, string> = {}
        for (const column of optionColumns) {
          const typed = row.cells[column]
          if (!typed) continue
          const axis = axisOf(attributes, column.slice('option.'.length))
          if (!axis) {
            err(
              row,
              column,
              set
                ? `${column.slice(7)} isn’t a finish or size of the ${set.name} set.`
                : 'This product’s category has no attribute set with finishes or sizes.',
            )
            continue
          }
          const option = optionOf(axis, typed)
          if (!option?.value) {
            err(
              row,
              column,
              `“${typed}” is not a ${axis.label} option. Add it to the ${set?.name ?? ''} set or change the row.`,
            )
            continue
          }
          options[axis.code!] = option.value
          if (!axisValues[axis.code!]!.includes(option.value)) {
            axisValues[axis.code!]!.push(option.value)
          }
        }
        const sku = (row.cells.sku ?? '').toUpperCase()
        if (!sku) err(row, 'sku', 'Each finish or size needs its SKU.')
        else if (!SKU.test(sku)) {
          err(row, 'sku', 'SKU: capital letters, digits and - . / _ only, up to 64.')
        }
        const known = variantBySku.get(sku)
        if (known && existing && idOf(known.product) !== String(existing.id)) {
          err(row, 'sku', `SKU ${sku} belongs to another product.`)
        }
        const vPrice = rupeesToPaise(row.cells.price ?? '')
        if (row !== first && vPrice === undefined) err(row, 'price', PRICE_HELP)
        const vMrp = rupeesToPaise(row.cells.mrp ?? '')
        if (row !== first && vMrp === undefined) err(row, 'mrp', PRICE_HELP)
        const stock = wholeNumber(row.cells.stock_qty ?? '')
        if (stock === undefined) err(row, 'stock_qty', 'Stock is a whole number, like 12.')
        if (errors.length > rowBefore || errors.some((e) => e.row === row.line)) continue
        variants.push({
          line: row.line,
          variantId: known ? String(known.id) : null,
          sku,
          options,
          // The first row's price is the product's; a finish's own price only when it differs
          ...(row !== first && vPrice ? { price: money(vPrice) } : {}),
          ...(row !== first && vMrp ? { compareAtPrice: money(vMrp) } : {}),
          ...(stock !== null && stock !== undefined ? { stockQty: stock } : {}),
        })
      }
      if (!variants.length && errors.length === before) {
        err(first, 'sku', 'No finish or size could be read from these rows.')
      }
    }
    if (price) product.price = money(price)
    if (mrp) product.compareAtPrice = money(mrp)

    // Product-level problems skip the whole product; a bad finish row skips that row only
    const productErrors = errors.filter((e) => e.row === first.line)
    if (productErrors.length || (hasOptions && !variants.length)) continue
    if (!existing) {
      if (room !== null && room <= 0) {
        err(
          first,
          'product_handle',
          'Your plan’s product limit is reached; this product is skipped.',
        )
        continue
      }
      if (room !== null) room -= 1
      product.slug = slugify(c.product_handle || c.title || handle)
    }
    plans.push({
      line: first.line,
      productId: existing ? String(existing.id) : null,
      product,
      axisValues,
      variants,
      creates: !existing,
    })
  }
  // Rows each plan touches: its finishes, or its one row
  const rowsOf = (p: ProductPlan) => Math.max(1, p.variants.length)
  return {
    plans,
    errors,
    rows: rows.length,
    create: plans.filter((p) => p.creates).length,
    update: plans.filter((p) => !p.creates).reduce((n, p) => n + rowsOf(p), 0),
  }
}

/** Carries out one product's plan (in the caller's transaction). */
export async function applyProductPlan(
  req: PayloadRequest,
  tenantId: string,
  plan: ProductPlan,
  snapshot: Snapshot,
): Promise<{ created: number; updated: number }> {
  let created = 0
  let updated = 0
  const existing = plan.productId
    ? snapshot.products.find((p) => String(p.id) === plan.productId)
    : null
  const attributes = {
    ...((existing?.attributes ?? {}) as Record<string, unknown>),
    ...Object.fromEntries(Object.entries(plan.axisValues).filter(([, v]) => v.length)),
  }
  let productId = plan.productId
  if (!productId) {
    // A free address: the handle, or the handle with a number
    let slug = plan.product.slug as string
    for (let n = 2; snapshot.products.some((p) => p.slug === slug); n += 1) {
      slug = `${(plan.product.slug as string).slice(0, 44)}-${n}`
    }
    const doc = await req.payload.create({
      collection: 'products',
      data: { ...plan.product, slug, tenant: tenantId, status: 'draft', attributes } as never,
      overrideAccess: true,
      req,
    })
    productId = String(doc.id)
    snapshot.products.push({
      id: doc.id,
      modelNumber: doc.modelNumber,
      slug: doc.slug,
      primaryCategory: doc.primaryCategory,
      attributes: doc.attributes,
    })
    created += 1
  } else {
    await req.payload.update({
      collection: 'products',
      id: productId,
      data: { ...plan.product, attributes } as never,
      overrideAccess: true,
      req,
    })
    if (!plan.variants.length) updated += 1
  }
  for (const v of plan.variants) {
    const data = {
      options: v.options,
      sku: v.sku,
      ...(v.price ? { price: v.price } : {}),
      ...(v.compareAtPrice ? { compareAtPrice: v.compareAtPrice } : {}),
      ...(v.stockQty !== undefined ? { stockQty: v.stockQty } : {}),
    }
    if (v.variantId) {
      await req.payload.update({
        collection: 'variants',
        id: v.variantId,
        data: data as never,
        overrideAccess: true,
        req,
      })
      updated += 1
    } else {
      const doc = await req.payload.create({
        collection: 'variants',
        data: { ...data, tenant: tenantId, product: productId, status: 'active' } as never,
        overrideAccess: true,
        req,
      })
      snapshot.variants.push({ id: doc.id, sku: doc.sku, product: productId, options: doc.options })
      // A new product counts once; a new finish of an existing product counts on its own
      if (!plan.creates) created += 1
    }
  }
  return { created, updated }
}
