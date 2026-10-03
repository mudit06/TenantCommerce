import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { idOf } from '@/access'
import { revalidate, tenantTag } from '@/lib/cache'

// Storefront data is cached per store under the tag t:<tenantId>:store (src/lib/data). Any
// change to a store's catalog or content clears that store's cache only (docs/04, docs/13).

export const storefrontTag = (tenantId: string) => tenantTag(tenantId, 'store')

const clear = (doc: { tenant?: unknown } | undefined) => {
  const tenantId = idOf(doc?.tenant)
  if (tenantId) revalidate(storefrontTag(tenantId))
}

export const revalidateStorefrontAfterChange: CollectionAfterChangeHook = ({
  doc,
  previousDoc,
}) => {
  clear(doc)
  if (idOf(previousDoc?.tenant) !== idOf(doc?.tenant)) clear(previousDoc)
  return doc
}

export const revalidateStorefrontAfterDelete: CollectionAfterDeleteHook = ({ doc }) => {
  clear(doc)
  return doc
}

/** Adds both hooks to a collection's existing hooks. */
export function withStorefrontRevalidation<T extends { hooks?: Record<string, unknown> }>(
  config: T,
): T {
  const hooks = (config.hooks ?? {}) as { afterChange?: unknown[]; afterDelete?: unknown[] }
  return {
    ...config,
    hooks: {
      ...hooks,
      afterChange: [...(hooks.afterChange ?? []), revalidateStorefrontAfterChange],
      afterDelete: [...(hooks.afterDelete ?? []), revalidateStorefrontAfterDelete],
    },
  }
}
