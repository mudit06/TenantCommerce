import type { PayloadRequest } from 'payload'

import { atomicIncrement } from '@/lib/db/atomic'
import { AppError } from '@/lib/errors'

const GB = 1024 ** 3

/** Refuses an upload that would take the store past its plan's storage limit (docs/screens Media). */
export async function assertStorageAvailable(
  req: PayloadRequest,
  tenantId: string,
  addBytes: number,
): Promise<void> {
  const tenant = await req.payload
    .findByID({ collection: 'tenants', id: tenantId, depth: 1, overrideAccess: true, req })
    .catch(() => null)
  if (!tenant) throw new AppError('NOT_FOUND', 'Store not found', 404)
  const limitGB = typeof tenant.plan === 'object' ? tenant.plan?.limits?.maxStorageGB : undefined
  if (!limitGB) return
  const used = tenant.usage?.storageBytes ?? 0
  if (used + addBytes > limitGB * GB) {
    throw new AppError(
      'PLAN_LIMIT_REACHED',
      `This upload would pass the plan's ${limitGB} GB storage limit (${(used / GB).toFixed(2)} GB used). Delete unused files or change the plan.`,
      422,
    )
  }
}

/** Adds (or with a negative number removes) bytes from the store's storage meter. */
export async function adjustStorageUsage(
  req: PayloadRequest,
  tenantId: string,
  deltaBytes: number,
): Promise<void> {
  if (!deltaBytes) return
  await atomicIncrement(req, {
    collection: 'tenants',
    filter: { _id: tenantId },
    field: 'usage.storageBytes',
    by: deltaBytes,
    set: { 'usage.updatedAt': new Date() },
    // Several uploads at once would conflict on the store document inside their transactions.
    // Callers must not have changed this tenant document in the same transaction.
    outsideTransaction: true,
  })
}
