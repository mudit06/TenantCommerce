import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, PayloadRequest } from 'payload'

import { idOf, storeSessionOf } from '@/access'
import { recordAudit } from '@/modules/audit'

// Every change our team makes inside a store during "Manage store" lands in that store's audit
// log with the admin and the session's reason (docs/05). Only the collection, document and
// operation are kept: never the document itself, which may hold shopper data (docs/14).

async function audit(
  req: PayloadRequest,
  collection: string,
  doc: { id?: unknown; tenant?: unknown } | undefined,
  operation: 'create' | 'update' | 'delete',
) {
  const session = storeSessionOf(req.user)
  if (!session || session.mode !== 'manage') return
  await recordAudit(req, {
    action: 'store_managed_change',
    tenant: idOf(doc?.tenant) ?? session.tenantId,
    collectionSlug: collection,
    docId: idOf(doc?.id) ?? undefined,
    summary: `${operation === 'create' ? 'Created' : operation === 'update' ? 'Changed' : 'Deleted'} a ${collection} document while managing the store`,
    diff: { operation },
    reason: session.reason,
    actingAsPlatform: true,
  })
}

const afterChange: CollectionAfterChangeHook = async ({
  collection,
  doc,
  operation,
  req,
  context,
}) => {
  if (!context.skipAudit) await audit(req, collection.slug, doc, operation)
  return doc
}

const afterDelete: CollectionAfterDeleteHook = async ({ collection, doc, req, context }) => {
  if (!context.skipAudit) await audit(req, collection.slug, doc, 'delete')
  return doc
}

/** Adds the store-session audit hooks to a tenant-scoped collection. */
export function withStoreSessionAudit<T extends { hooks?: Record<string, unknown> }>(config: T): T {
  const hooks = (config.hooks ?? {}) as { afterChange?: unknown[]; afterDelete?: unknown[] }
  return {
    ...config,
    hooks: {
      ...hooks,
      afterChange: [...(hooks.afterChange ?? []), afterChange],
      afterDelete: [...(hooks.afterDelete ?? []), afterDelete],
    },
  }
}
