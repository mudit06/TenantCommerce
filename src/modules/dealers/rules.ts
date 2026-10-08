// The dealer locator's order (docs/screens storefront `st-dealers`): nearest first. With the
// phone's location, by distance. With a pincode, by how much of the pincode they share (India's
// pincodes run by region), and by distance from the dealers in or nearest that pincode when they
// have a map position. With a city or name, the dealers that match. No outside map service.

export type DealerPoint = {
  id: string
  name: string
  type: string
  city: string
  state: string
  pincode: string
  address: string
  /** [longitude, latitude], Payload's point */
  location: [number, number] | null
}

export type DealerQuery = { q?: string | null; lat?: number | null; lng?: number | null }

export type RankedDealer<T extends DealerPoint> = T & {
  distanceKm: number | null
  /** The distance is measured from nearby dealers, not the shopper */
  approximate: boolean
}

/** Great-circle distance in km between two [lng, lat] points */
export function distanceKm(a: [number, number], b: [number, number]): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b[1] - a[1])
  const dLng = rad(b[0] - a[0])
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[1])) * Math.cos(rad(b[1])) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)))
}

const sharedPrefix = (a: string, b: string) => {
  let n = 0
  while (n < Math.min(a.length, b.length) && a[n] === b[n]) n += 1
  return n
}

const located = (d: DealerPoint): d is DealerPoint & { location: [number, number] } =>
  Array.isArray(d.location) && d.location.length === 2 && d.location.every(Number.isFinite)

export function rankDealers<T extends DealerPoint>(
  dealers: readonly T[],
  query: DealerQuery,
): { dealers: RankedDealer<T>[]; matched: boolean } {
  const q = (query.q ?? '').trim()
  const byName = (a: T, b: T) => a.name.localeCompare(b.name)
  const withDistance = (list: readonly T[], from: [number, number] | null, approximate: boolean) =>
    list.map((d) => ({
      ...d,
      distanceKm: from && located(d) ? Math.round(distanceKm(from, d.location) * 10) / 10 : null,
      approximate,
    }))
  const nearestFirst = (a: RankedDealer<T>, b: RankedDealer<T>) =>
    (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity) || byName(a, b)

  if (Number.isFinite(query.lat) && Number.isFinite(query.lng)) {
    const from: [number, number] = [query.lng!, query.lat!]
    return { dealers: withDistance(dealers, from, false).sort(nearestFirst), matched: true }
  }

  if (/^[1-9]\d{5}$/.test(q)) {
    const best = Math.max(0, ...dealers.map((d) => sharedPrefix(d.pincode, q)))
    // Measure from the dealers that share the most of the pincode (at least its district)
    const anchors = dealers.filter((d) => sharedPrefix(d.pincode, q) === best && located(d))
    const from =
      best >= 3 && anchors.length
        ? ([
            anchors.reduce((s, d) => s + d.location![0], 0) / anchors.length,
            anchors.reduce((s, d) => s + d.location![1], 0) / anchors.length,
          ] as [number, number])
        : null
    const ranked = withDistance(dealers, from, true).sort((a, b) => {
      const pa = sharedPrefix(a.pincode, q)
      const pb = sharedPrefix(b.pincode, q)
      // Same district first; within it (or with a reference point) by distance
      if (from) return nearestFirst(a, b)
      return pb - pa || byName(a, b)
    })
    return { dealers: ranked, matched: best >= 3 }
  }

  if (q) {
    const needle = q.toLowerCase()
    const hits = dealers.filter((d) =>
      [d.name, d.city, d.state, d.address, d.pincode].some((v) => v.toLowerCase().includes(needle)),
    )
    if (hits.length) return { dealers: withDistance(hits, null, false).sort(byName), matched: true }
    return { dealers: withDistance(dealers, null, false).sort(byName), matched: false }
  }

  return {
    dealers: withDistance(dealers, null, false).sort(
      (a, b) => a.city.localeCompare(b.city) || byName(a, b),
    ),
    matched: true,
  }
}
