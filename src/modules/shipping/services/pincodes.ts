import type { Payload } from 'payload'

import { GST_STATES, type GstStateCode } from '@/lib/gst/gstin'

// Pincode to city and GST state (docs/06 `pincodes`). The directory is the source when loaded;
// otherwise the pincode's first digits give the state for most of India (India Post circles).
// Where one prefix spans two states (Uttarakhand inside 24x and 26x, Puducherry inside 605, the
// north-east…) there is no guess, and the shopper's chosen state is used.

export const PINCODE_PATTERN = /^[1-9][0-9]{5}$/

type Range = [from: number, to: number, state: GstStateCode]

// Three-digit prefixes, inclusive. Ambiguous prefixes are left out on purpose.
const RANGES: Range[] = [
  [110, 110, '07'], // Delhi
  [121, 136, '06'], // Haryana
  [140, 159, '03'], // Punjab
  [171, 177, '02'], // Himachal Pradesh
  [180, 193, '01'], // Jammu and Kashmir
  [194, 194, '38'], // Ladakh
  [201, 243, '09'], // Uttar Pradesh
  [250, 261, '09'],
  [264, 285, '09'],
  [248, 249, '05'], // Uttarakhand (Dehradun, Haridwar)
  [263, 263, '05'],
  [301, 345, '08'], // Rajasthan
  [360, 395, '24'], // Gujarat
  [400, 402, '27'], // Maharashtra
  [403, 403, '30'], // Goa
  [404, 445, '27'],
  [450, 488, '23'], // Madhya Pradesh
  [490, 497, '22'], // Chhattisgarh
  [500, 509, '36'], // Telangana
  [515, 535, '37'], // Andhra Pradesh
  [560, 591, '29'], // Karnataka
  [600, 604, '33'], // Tamil Nadu
  [606, 643, '33'],
  [670, 681, '32'], // Kerala
  [683, 695, '32'],
  [700, 736, '19'], // West Bengal
  [737, 737, '11'], // Sikkim
  [738, 743, '19'],
  [744, 744, '35'], // Andaman and Nicobar Islands
  [751, 770, '21'], // Odisha
  [781, 788, '18'], // Assam
  [790, 792, '12'], // Arunachal Pradesh
  [793, 794, '17'], // Meghalaya
  [795, 795, '14'], // Manipur
  [796, 796, '15'], // Mizoram
  [797, 798, '13'], // Nagaland
  [799, 799, '16'], // Tripura
  [800, 812, '10'], // Bihar
  [814, 816, '20'], // Jharkhand
  [821, 821, '10'],
  [822, 822, '20'],
  [825, 835, '20'],
  [841, 855, '10'],
]

/** The state a pincode belongs to by its first three digits, or null where that isn't certain. */
export function stateFromPincodePrefix(pincode: string): GstStateCode | null {
  if (!PINCODE_PATTERN.test(pincode)) return null
  const prefix = Number(pincode.slice(0, 3))
  return RANGES.find(([from, to]) => prefix >= from && prefix <= to)?.[2] ?? null
}

export type PincodeInfo = {
  pincode: string
  stateCode: GstStateCode | null
  stateName: string | null
  city: string | null
  /** Whether the state comes from the directory (certain) or the prefix (a guess) */
  source: 'directory' | 'prefix' | 'unknown'
}

export async function lookupPincode(payload: Payload, pincode: string): Promise<PincodeInfo> {
  if (!PINCODE_PATTERN.test(pincode)) {
    return { pincode, stateCode: null, stateName: null, city: null, source: 'unknown' }
  }
  const { docs } = await payload.find({
    collection: 'pincodes',
    where: { pincode: { equals: pincode } },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  const row = docs[0]
  if (row) {
    const stateCode = row.stateCode as GstStateCode
    return {
      pincode,
      stateCode,
      stateName: GST_STATES[stateCode] ?? null,
      city: row.city ?? row.district ?? null,
      source: 'directory',
    }
  }
  const stateCode = stateFromPincodePrefix(pincode)
  return {
    pincode,
    stateCode,
    stateName: stateCode ? GST_STATES[stateCode] : null,
    city: null,
    source: stateCode ? 'prefix' : 'unknown',
  }
}
