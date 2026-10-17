import { commitTransaction, initTransaction, killTransaction, type PayloadRequest } from 'payload'

// The parts of @payloadcms/db-mongodb used here (mongoose is not a direct dependency)
type MongoAdapter = {
  connection?: {
    collection: (name: string) => {
      findOne: (
        filter: object,
        options: { session: unknown; projection: object },
      ) => Promise<unknown>
    }
  }
  sessions?: Record<string, unknown>
}

/**
 * Sends one read on a new transaction before any other work. Mongo starts the transaction on its
 * first command; if that first step is two commands at once (a paginated find sends its count and
 * its query together), one of them can arrive without the start flag and fail with
 * NoSuchTransaction (QA SAP-1017 D3: a duplicate invite answered 500 instead of 409).
 */
async function startOnServer(req: PayloadRequest): Promise<void> {
  const db = req.payload.db as unknown as MongoAdapter
  const session = typeof req.transactionID === 'string' ? db.sessions?.[req.transactionID] : null
  if (!session || !db.connection) return
  await db.connection
    .collection('users')
    .findOne({ _id: null }, { session, projection: { _id: 1 } })
}

/**
 * Runs `work` in one database transaction on `req` (Mongo replica set). Every Local API call
 * inside must pass the same `req`. Nested calls join the outer transaction.
 */
export async function withTransaction<T>(req: PayloadRequest, work: () => Promise<T>): Promise<T> {
  const owns = await initTransaction(req)
  try {
    if (owns) await startOnServer(req)
    const result = await work()
    if (owns) await commitTransaction(req)
    return result
  } catch (error) {
    if (owns) await killTransaction(req)
    throw error
  }
}
