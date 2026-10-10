import type { Payload, PayloadRequest } from 'payload'

// A dealer's map position from its pincode (docs/screens `cms-dealers` rule 2): the pincode
// directory's centre when it has one, else the middle of the store's other dealers in that
// pincode. Staff then drag the pin onto the shop. Never another store's dealers (docs/04).

export type Position = { latitude: number; longitude: number; from: 'directory' | 'dealers' }

export async function positionForPincode(
  payload: Payload,
  tenantId: string,
  pincode: string,
  req?: PayloadRequest,
): Promise<Position | null> {
  if (!/^[1-9][0-9]{5}$/.test(pincode)) return null
  const { docs: directory } = await payload.find({
    collection: 'pincodes',
    where: { pincode: { equals: pincode } },
    depth: 0,
    limit: 1,
    overrideAccess: true,
    req,
  })
  const entry = directory[0]
  if (typeof entry?.latitude === 'number' && typeof entry.longitude === 'number') {
    return { latitude: entry.latitude, longitude: entry.longitude, from: 'directory' }
  }
  const { docs: dealers } = await payload.find({
    collection: 'dealers',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { pincode: { equals: pincode } },
        { location: { exists: true } },
      ],
    },
    depth: 0,
    limit: 50,
    overrideAccess: true,
    req,
    select: { location: true },
  })
  const points = dealers
    .map((d) => d.location)
    .filter((p): p is [number, number] => Array.isArray(p) && p.length === 2)
  if (!points.length) return null
  const mean = (i: 0 | 1) => points.reduce((sum, p) => sum + p[i], 0) / points.length
  // Points are stored [longitude, latitude]
  return { latitude: mean(1), longitude: mean(0), from: 'dealers' }
}
