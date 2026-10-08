import type { PayloadRequest } from 'payload'

import { atomicIncrement } from '@/lib/db/atomic'

/** Counter keys in use; invoices and credit notes restart every financial year. */
export type CounterKey =
  'enquiry' | 'order' | `invoice:${string}` | `credit-note:${string}` | `payout:${string}`

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

/**
 * The next invoice or credit note number, inside the caller's transaction: if the invoice can't
 * be saved the number isn't used either, so the series stays consecutive (GST rule 46). Two at
 * the same moment conflict and one transaction retries (see `withTransactionRetry`).
 */
export const nextConsecutiveNumber = (req: PayloadRequest, tenantId: string, key: CounterKey) =>
  atomicIncrement(req, {
    collection: 'counters',
    filter: { tenant: tenantId, key },
    field: 'value',
    upsert: true,
  })
