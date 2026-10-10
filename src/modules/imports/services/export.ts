import type { Payload, Where } from 'payload'

import { idOf } from '@/access'
import { toRupeesString } from '@/lib/money'
import { attributeSetForCategory, type Attribute } from '@/modules/catalog'

import { TEMPLATES } from '../constants'

// Product export (docs/12 "CSV import", Products "Export"): the products template's columns
// plus one option.<axis> column for each finish or size axis in the file, one row per finish
// (or one row for a product without finishes), so a file can be edited in a spreadsheet and
// imported again: rows match on SKU, products on their handle.

const BASE = TEMPLATES.products.columns.filter((column) => !column.startsWith('option.'))

export async function exportProducts(
  payload: Payload,
  tenantId: string,
  where: Where,
): Promise<string[][]> {
  const scope = { tenant: { equals: tenantId } }
  const common = { depth: 0, pagination: false as const, overrideAccess: true }
  const [{ docs: products }, { docs: categories }, { docs: brands }] = await Promise.all([
    payload.find({ collection: 'products', where, sort: 'title', limit: 10_000, ...common }),
    payload.find({ collection: 'categories', where: scope, limit: 5_000, ...common }),
    payload.find({ collection: 'brands', where: scope, limit: 2_000, ...common }),
  ])
  const { docs: variants } = products.length
    ? await payload.find({
        collection: 'variants',
        where: {
          and: [scope, { product: { in: products.map((p) => p.id) } }],
        },
        sort: 'sortOrder',
        limit: 100_000,
        ...common,
      })
    : { docs: [] }

  const categoryById = new Map(categories.map((c) => [String(c.id), c]))
  const pathOf = (id: string | null) => {
    const parts: string[] = []
    for (let c = id ? categoryById.get(id) : undefined, n = 0; c && n < 10; n += 1) {
      parts.unshift(c.name)
      const parent = idOf(c.parent)
      c = parent ? categoryById.get(parent) : undefined
    }
    return parts.join(' > ')
  }
  const brandName = new Map(brands.map((b) => [String(b.id), b.name]))

  // Option labels from each category's attribute set (the import reads labels or values)
  const sets = new Map<string, Attribute[]>()
  for (const id of new Set(products.map((p) => idOf(p.primaryCategory)).filter(Boolean))) {
    const set = await attributeSetForCategory(payload, id!)
    sets.set(id!, (set?.attributes ?? []) as Attribute[])
  }
  const labelOf = (categoryId: string | null, axis: string, value: string) => {
    const attribute = (categoryId ? sets.get(categoryId) : undefined)?.find((a) => a.code === axis)
    return attribute?.options?.find((o) => o.value === value)?.label ?? value
  }

  const axes = [
    ...new Set(variants.flatMap((v) => Object.keys((v.options ?? {}) as Record<string, string>))),
  ].sort()
  const header = [...BASE, ...axes.map((axis) => `option.${axis}`)]
  const rows: string[][] = [header]
  const money = (minor: number | null | undefined) => (minor ? toRupeesString(minor) : '')

  for (const product of products) {
    const categoryId = idOf(product.primaryCategory)
    const own = variants.filter((v) => idOf(v.product) === String(product.id))
    const productCells: Record<string, string> = {
      product_handle: product.slug ?? '',
      title: product.title,
      category_path: pathOf(categoryId),
      brand: brandName.get(idOf(product.brand) ?? '') ?? '',
      model_number: product.modelNumber,
      price: money(product.price?.amountMinor),
      mrp: money(product.compareAtPrice?.amountMinor),
      gst_rate: product.gstRate ?? '',
      hsn_code: product.hsnCode ?? '',
      purchase_mode: product.purchaseMode ?? '',
      short_description: product.shortDescription ?? '',
      search_keywords: product.searchKeywords ?? '',
      generic_name: product.legal?.genericName ?? '',
      net_quantity: product.legal?.netQuantity ?? '',
      country_of_origin: product.legal?.countryOfOrigin ?? '',
      weight_g: product.weightGrams ? String(product.weightGrams) : '',
      seo_title: product.seo?.title ?? '',
      seo_description: product.seo?.description ?? '',
    }
    if (!own.length) {
      rows.push(header.map((column) => productCells[column] ?? ''))
      continue
    }
    own.forEach((variant, index) => {
      const options = (variant.options ?? {}) as Record<string, string>
      // The first row carries the product; later rows only their finish's own details
      const cells: Record<string, string> =
        index === 0
          ? { ...productCells }
          : {
              product_handle: product.slug ?? '',
              price: money(variant.price?.amountMinor),
              mrp: money(variant.compareAtPrice?.amountMinor),
            }
      cells.sku = variant.sku ?? ''
      cells.stock_qty = String(variant.stockQty ?? 0)
      for (const axis of axes) {
        cells[`option.${axis}`] = options[axis] ? labelOf(categoryId, axis, options[axis]) : ''
      }
      rows.push(header.map((column) => cells[column] ?? ''))
    })
  }
  return rows
}
