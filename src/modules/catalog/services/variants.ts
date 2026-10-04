import type { PayloadRequest } from 'payload'

import { idOf } from '@/access'
import { AppError } from '@/lib/errors'
import type { Product } from '@/payload-types'

import { attributeSetForCategory } from './catalogLookup'
import {
  combinations,
  variantAxes,
  variantSku,
  variantTitle,
  type VariantAxis,
} from './productAttributes'

/** More combinations than this is a sign the options are wrong, not a real range. */
export const MAX_GENERATED_VARIANTS = 120

/** A product's variant options (finish, size…) with the values it is offered in. */
export async function axesForProduct(
  req: PayloadRequest,
  product: Product,
): Promise<VariantAxis[]> {
  const set = await attributeSetForCategory(req.payload, idOf(product.primaryCategory), req)
  if (!set) return []
  return variantAxes(set.attributes ?? [], (product.attributes ?? {}) as Record<string, unknown>)
}

/**
 * Creates a variant for every combination of the product's offered options that doesn't exist
 * yet (docs/screens Product editor, "Finishes, prices and stock"). Existing variants are kept.
 */
export async function generateVariants(
  req: PayloadRequest,
  product: Product,
): Promise<{ created: number; existing: number }> {
  const axes = await axesForProduct(req, product)
  if (axes.length === 0) {
    throw new AppError(
      'BUSINESS_RULE',
      'This product has no finish or size options. Mark fields as “Variant option” in its attribute set first.',
      409,
    )
  }
  const rows = combinations(axes)
  if (rows.length > MAX_GENERATED_VARIANTS) {
    throw new AppError(
      'BUSINESS_RULE',
      `That makes ${rows.length} variants. Untick some options in Specifications (at most ${MAX_GENERATED_VARIANTS}).`,
      409,
    )
  }
  const { docs: current } = await req.payload.find({
    collection: 'variants',
    where: { product: { equals: product.id } },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  const key = (options: Record<string, unknown>) =>
    axes.map((axis) => String(options[axis.code] ?? '')).join('|')
  const have = new Set(
    current.map((variant) => key((variant.options ?? {}) as Record<string, unknown>)),
  )
  let created = 0
  for (const [index, options] of rows.entries()) {
    if (have.has(key(options))) continue
    await req.payload.create({
      collection: 'variants',
      data: {
        tenant: idOf(product.tenant) ?? undefined,
        product: product.id,
        options,
        title: variantTitle(axes, options),
        sku: variantSku(product.modelNumber, axes, options),
        status: 'active',
        stockQty: 0,
        sortOrder: index,
      },
      overrideAccess: true,
      req,
    })
    created += 1
  }
  return { created, existing: current.length }
}
