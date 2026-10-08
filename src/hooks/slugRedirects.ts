import type { CollectionAfterChangeHook, PayloadRequest, Where } from 'payload'

import { idOf } from '@/access'

// "Changing a slug creates a redirect" (docs/12, docs/screens Categories rule 2): when a product,
// category or page moves to a new store address, its old address keeps working. Chains are
// collapsed (A → B, then B → C makes A → C) and an address in use again stops redirecting.

export async function addRedirect(req: PayloadRequest, tenantId: string, from: string, to: string) {
  if (from === to) return
  const find = (where: Where) =>
    req.payload.find({
      collection: 'redirects',
      where: { and: [{ tenant: { equals: tenantId } }, where] },
      depth: 0,
      limit: 500,
      pagination: false,
      overrideAccess: true,
      req,
    })
  // The new address is live again: anything redirecting away from it stops
  for (const doc of (await find({ from: { equals: to } })).docs) {
    await req.payload.delete({ collection: 'redirects', id: doc.id, overrideAccess: true, req })
  }
  // Older addresses that pointed at the old one now point straight at the new one
  for (const doc of (await find({ to: { equals: from } })).docs) {
    if (doc.from === to) {
      await req.payload.delete({ collection: 'redirects', id: doc.id, overrideAccess: true, req })
    } else {
      await req.payload.update({
        collection: 'redirects',
        id: doc.id,
        data: { to },
        overrideAccess: true,
        req,
      })
    }
  }
  const existing = (await find({ from: { equals: from } })).docs[0]
  if (existing) {
    await req.payload.update({
      collection: 'redirects',
      id: existing.id,
      data: { to, reason: 'slug-change' },
      overrideAccess: true,
      req,
    })
  } else {
    await req.payload.create({
      collection: 'redirects',
      data: { tenant: tenantId, from, to, reason: 'slug-change' },
      overrideAccess: true,
      req,
    })
  }
}

/** An afterChange hook: `pathOf` gives a document's store address (or null when it has none). */
export const redirectOnMove =
  (pathOf: (doc: Record<string, unknown>) => string | null): CollectionAfterChangeHook =>
  async ({ doc, previousDoc, operation, req }) => {
    if (operation !== 'update' || !previousDoc) return doc
    const tenantId = idOf(doc.tenant)
    const before = pathOf(previousDoc)
    const after = pathOf(doc)
    if (tenantId && before && after && before !== after) {
      await addRedirect(req, tenantId, before, after)
    }
    return doc
  }

export const productPath = (doc: Record<string, unknown>) =>
  typeof doc.slug === 'string' && doc.slug ? `/products/${doc.slug}` : null

export const pagePath = (doc: Record<string, unknown>) =>
  typeof doc.slug === 'string' && doc.slug && doc.slug !== 'home' ? `/pages/${doc.slug}` : null

/** A category's address from its breadcrumbs (`/c/<parent>/<child>`, the nested-docs plugin) */
export const categoryPath = (doc: Record<string, unknown>) => {
  const crumbs = doc.breadcrumbs as { url?: string | null }[] | null | undefined
  const url = crumbs?.at(-1)?.url
  return typeof url === 'string' && url.startsWith('/c/') ? url : null
}

/** Adds the hook to a collection's existing afterChange hooks. */
export function withSlugRedirects<T extends { hooks?: Record<string, unknown> }>(
  config: T,
  pathOf: (doc: Record<string, unknown>) => string | null,
): T {
  const hooks = (config.hooks ?? {}) as { afterChange?: unknown[] }
  return {
    ...config,
    hooks: { ...config.hooks, afterChange: [...(hooks.afterChange ?? []), redirectOnMove(pathOf)] },
  }
}
