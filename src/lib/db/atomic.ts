import type { MongooseAdapter } from '@payloadcms/db-mongodb'
import type { CollectionSlug, PayloadRequest } from 'payload'

// Atomic counters and usage totals. Payload's update is read-modify-write, which can lose
// increments under concurrency; these go straight to MongoDB with $inc (docs/06 `counters`:
// "Incremented atomically with $inc + findOneAndUpdate"). The only place outside reports that
// touches the driver (docs/01 architecture rules).

async function sessionFor(req: PayloadRequest) {
  const id = await req.transactionID
  if (id === undefined || id === null) return undefined
  return (req.payload.db as unknown as MongooseAdapter).sessions[id]
}

function modelFor(req: PayloadRequest, collection: CollectionSlug) {
  const model = (req.payload.db as unknown as MongooseAdapter).collections[collection]
  if (!model) throw new Error(`No database model for "${collection}"`)
  return model
}

/**
 * Adds `by` to a numeric field on the document matching `filter` and returns the new value.
 * With `upsert`, a missing document is created with `insert` (plus the incremented field).
 *
 * `outsideTransaction`: hot single documents (a store's enquiry counter, its storage total)
 * are incremented outside the caller's transaction. Inside one, two requests at the same moment
 * hit a MongoDB write conflict and one fails; outside, $inc is still atomic and never conflicts.
 * The cost: if the caller's transaction then rolls back, the increment stays (a skipped number,
 * or a storage total a few bytes high until the nightly recount).
 */
export async function atomicIncrement(
  req: PayloadRequest,
  input: {
    collection: CollectionSlug
    filter: Record<string, unknown>
    field: string
    by?: number
    upsert?: boolean
    insert?: Record<string, unknown>
    set?: Record<string, unknown>
    outsideTransaction?: boolean
  },
): Promise<number> {
  const now = new Date()
  const result = await modelFor(req, input.collection)
    .findOneAndUpdate(
      input.filter,
      {
        $inc: { [input.field]: input.by ?? 1 },
        $set: { updatedAt: now, ...input.set },
        ...(input.upsert ? { $setOnInsert: { createdAt: now, ...input.insert } } : {}),
      },
      {
        new: true,
        upsert: Boolean(input.upsert),
        session: input.outsideTransaction ? undefined : await sessionFor(req),
        lean: true,
      },
    )
    .exec()
  if (!result) throw new Error(`Nothing to increment in "${input.collection}"`)
  const value = input.field
    .split('.')
    .reduce<unknown>((node, key) => (node as Record<string, unknown> | undefined)?.[key], result)
  return typeof value === 'number' ? value : 0
}

/**
 * Sets fields on one document directly (no read-modify-write), outside the caller's
 * transaction. Used for derived totals such as a store's product count, recomputed after a change.
 */
export async function atomicSet(
  req: PayloadRequest,
  input: {
    collection: CollectionSlug
    filter: Record<string, unknown>
    set: Record<string, unknown>
  },
): Promise<void> {
  await modelFor(req, input.collection)
    .updateOne(input.filter, { $set: { updatedAt: new Date(), ...input.set } })
    .exec()
}

/**
 * Reads one field that access control hides from every API (sealed connector secrets), straight
 * from the database. Server code only; the value never leaves the calling service.
 */
export async function readHiddenField(
  payload: PayloadRequest['payload'],
  input: { collection: CollectionSlug; id: string | number; field: string; req?: PayloadRequest },
): Promise<unknown> {
  const model = (payload.db as unknown as MongooseAdapter).collections[input.collection]
  if (!model) throw new Error(`No database model for "${input.collection}"`)
  const doc = (await model
    .findById(
      input.id,
      { [input.field]: 1 },
      { session: input.req ? await sessionFor(input.req) : undefined },
    )
    .lean()
    .exec()) as Record<string, unknown> | null
  return doc?.[input.field]
}

/** Writes fields that no API may write (sealed connector secrets), inside the caller's transaction. */
export async function writeHiddenFields(
  req: PayloadRequest,
  input: { collection: CollectionSlug; id: string | number; set: Record<string, unknown> },
): Promise<void> {
  await modelFor(req, input.collection)
    .updateOne({ _id: input.id }, { $set: input.set }, { session: await sessionFor(req) })
    .exec()
}

/**
 * One conditional update in the caller's transaction: changes the store's document `id` only if
 * it still matches `condition` (stock still available), and says whether it did. MongoDB
 * evaluates the condition and the update together, so two shoppers can't both take the last piece.
 */
export async function conditionalUpdate(
  req: PayloadRequest,
  input: {
    collection: CollectionSlug
    id: string
    tenantId: string
    condition?: Record<string, unknown>
    update: Record<string, unknown>
  },
): Promise<boolean> {
  // Mongoose casts the string ids to ObjectIds from the collection's schema
  const result = await modelFor(req, input.collection)
    .updateOne({ _id: input.id, tenant: input.tenantId, ...input.condition }, input.update, {
      session: await sessionFor(req),
    })
    .exec()
  return result.modifiedCount === 1
}
