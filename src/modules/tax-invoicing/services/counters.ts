import type { PayloadRequest } from 'payload'

import { atomicIncrement } from '@/lib/db/atomic'

/** Counter keys in use. Financial-year keys (`invoice:2026-27`) arrive with invoices. */
export type CounterKey = 'enquiry' | 'order'

/**
 * The next number for `key` in a store: 1, 2, 3… never repeated, even for two requests at the
 * same moment (one atomic $inc with upsert, outside the caller's transaction so they don't
 * conflict). A save that fails after taking a number leaves a gap; invoices, which must stay
 * consecutive (GST rule 46), will take theirs inside the transaction with a retry instead.
 */
export const nextNumber = (req: PayloadRequest, tenantId: string, key: CounterKey) =>
  atomicIncrement(req, {
    collection: 'counters',
    filter: { tenant: tenantId, key },
    field: 'value',
    upsert: true,
    outsideTransaction: true,
  })
