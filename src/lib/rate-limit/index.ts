// Sliding-window rate limits (docs/14 "Rate limits"). In memory per server instance for now;
// Upstash Redis replaces the store when the app runs on more than one instance (docs/02).

const hits = new Map<string, number[]>()

export type Limit = { max: number; windowMs: number }

export const LIMITS = {
  enquiry: { max: 5, windowMs: 10 * 60_000 },
  search: { max: 60, windowMs: 60_000 },
  checkout: { max: 10, windowMs: 10 * 60_000 },
} satisfies Record<string, Limit>

/** Records a hit for `key` and says whether it is within `limit`. */
export function allow(key: string, limit: Limit, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((at) => now - at < limit.windowMs)
  if (recent.length >= limit.max) {
    hits.set(key, recent)
    return false
  }
  recent.push(now)
  hits.set(key, recent)
  if (hits.size > 10_000) {
    for (const [k, list] of hits) if (list.every((at) => now - at >= limit.windowMs)) hits.delete(k)
  }
  return true
}
