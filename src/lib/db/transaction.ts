import { commitTransaction, initTransaction, killTransaction, type PayloadRequest } from 'payload'

/**
 * Runs `work` in one database transaction on `req` (Mongo replica set). Every Local API call
 * inside must pass the same `req`. Nested calls join the outer transaction.
 */
export async function withTransaction<T>(req: PayloadRequest, work: () => Promise<T>): Promise<T> {
  const owns = await initTransaction(req)
  try {
    const result = await work()
    if (owns) await commitTransaction(req)
    return result
  } catch (error) {
    if (owns) await killTransaction(req)
    throw error
  }
}
