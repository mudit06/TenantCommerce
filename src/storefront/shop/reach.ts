import type { ShopResult } from './actions'

const UNREACHABLE = 'We couldn’t reach the store just now. Please try again.'

/**
 * A shop action called from the browser, with a message when the request itself fails (offline,
 * or a response that isn't the action's: the server restarting or rebuilding). Without this the
 * button did nothing at all (QA P3-04-007: "Add to cart silently does nothing").
 */
export async function reach<T>(call: () => Promise<ShopResult<T>>): Promise<ShopResult<T>> {
  try {
    return await call()
  } catch {
    return { ok: false, message: UNREACHABLE }
  }
}
