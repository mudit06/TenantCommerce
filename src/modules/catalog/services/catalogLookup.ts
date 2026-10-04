import type { Payload, PayloadRequest } from 'payload'

import { idOf } from '@/access'
import type { AttributeSet, Category } from '@/payload-types'

import { MAX_CATEGORY_DEPTH } from '../constants'

/**
 * The attribute set that applies to a category: its own, or the nearest parent's (docs/screens
 * Categories). Reads with overrideAccess, so callers pass ids already scoped to one store.
 */
export async function attributeSetForCategory(
  payload: Payload,
  categoryId: string | null | undefined,
  req?: PayloadRequest,
): Promise<AttributeSet | null> {
  let id = categoryId ?? null
  for (let level = 0; id && level < MAX_CATEGORY_DEPTH; level += 1) {
    const category: Category | null = await payload
      .findByID({ collection: 'categories', id, depth: 1, overrideAccess: true, req })
      .catch(() => null)
    if (!category) return null
    if (category.attributeSet && typeof category.attributeSet === 'object')
      return category.attributeSet
    id = idOf(category.parent)
  }
  return null
}
