import type { Payload, PayloadRequest } from 'payload'

import { idOf } from '@/access'
import { AppError } from '@/lib/errors'

import { MAX_CATEGORY_DEPTH } from '../constants'

// The Categories screen's tree (docs/screens/vendor-cms.md `cms-categories`): every category in
// menu order with how many products sit in it and under it, and moving one by drag and drop.
// The order here is the order in menus and category tiles (rule 3).

export type TreeNode = {
  id: string
  name: string
  parent: string | null
  depth: number
  /** Products whose main category is this one or one under it */
  count: number
  visible: boolean
  path: string | null
}

export async function categoryTree(payload: Payload, tenantId: string): Promise<TreeNode[]> {
  const scope = { tenant: { equals: tenantId } }
  const [{ docs: categories }, { docs: products }] = await Promise.all([
    payload.find({
      collection: 'categories',
      where: scope,
      sort: 'sortOrder',
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { name: true, parent: true, sortOrder: true, isVisible: true, breadcrumbs: true },
    }),
    payload.find({
      collection: 'products',
      where: { and: [scope, { status: { not_equals: 'archived' } }] },
      depth: 0,
      pagination: false,
      limit: 50_000,
      overrideAccess: true,
      select: { primaryCategory: true },
    }),
  ])
  const direct = new Map<string, number>()
  for (const product of products) {
    const id = idOf(product.primaryCategory)
    if (id) direct.set(id, (direct.get(id) ?? 0) + 1)
  }
  const children = new Map<string | null, typeof categories>()
  for (const category of categories) {
    const parent = idOf(category.parent) ?? null
    children.set(parent, [...(children.get(parent) ?? []), category])
  }
  const out: TreeNode[] = []
  const walk = (parent: string | null, depth: number): number => {
    let total = 0
    for (const category of children.get(parent) ?? []) {
      const id = String(category.id)
      const node: TreeNode = {
        id,
        name: category.name,
        parent,
        depth,
        count: 0,
        visible: category.isVisible !== false,
        path: category.breadcrumbs?.at(-1)?.url ?? null,
      }
      out.push(node)
      node.count = (direct.get(id) ?? 0) + walk(id, depth + 1)
      total += node.count
    }
    return total
  }
  walk(null, 0)
  return out
}

/**
 * Moves a category under `parent` (null: top level) at `index` among its new siblings, and
 * numbers those siblings 10, 20, 30… Saved with the person's own access, so the usual checks
 * apply (their store, no loops, at most three levels).
 */
export async function moveCategory(
  req: PayloadRequest,
  input: { id: string; tenantId: string; parent: string | null; index: number },
) {
  const nodes = await categoryTree(req.payload, input.tenantId)
  const moving = nodes.find((node) => node.id === input.id)
  if (!moving) throw new AppError('NOT_FOUND', 'Category not found', 404)
  if (input.parent && !nodes.some((node) => node.id === input.parent)) {
    throw new AppError('NOT_FOUND', 'Parent category not found', 404)
  }
  // Its own depth below it must still fit under the new parent
  const below = (id: string): number =>
    Math.max(0, ...nodes.filter((n) => n.parent === id).map((n) => 1 + below(n.id)))
  const parentDepth = input.parent ? nodes.find((n) => n.id === input.parent)!.depth + 1 : 0
  if (parentDepth + 1 + below(input.id) > MAX_CATEGORY_DEPTH) {
    throw new AppError(
      'BUSINESS_RULE',
      `Categories go at most ${MAX_CATEGORY_DEPTH} levels deep`,
      422,
    )
  }
  const siblings = nodes
    .filter((node) => node.parent === input.parent && node.id !== input.id)
    .map((node) => node.id)
  siblings.splice(Math.max(0, Math.min(input.index, siblings.length)), 0, input.id)
  const save = (id: string, data: Record<string, unknown>) =>
    req.payload.update({
      collection: 'categories',
      id,
      data,
      overrideAccess: false,
      user: req.user,
      req,
    })
  if (moving.parent !== input.parent) await save(input.id, { parent: input.parent })
  for (const [index, id] of siblings.entries()) await save(id, { sortOrder: (index + 1) * 10 })
}
