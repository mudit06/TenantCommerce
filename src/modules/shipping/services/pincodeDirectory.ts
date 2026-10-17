import { GST_STATES, type GstStateCode } from '@/lib/gst/gstin'

import { PINCODE_PATTERN, stateFromPincodePrefix } from './pincodes'

// Reads the government's All India Pincode Directory (data.gov.in, docs/06 `pincodes`) into one
// row per pincode. The file has a row per post office, in upper case, and its columns and state
// spellings changed between releases, so headers are matched by name and states by a loose key.

export type DirectoryRow = {
  pincode: string
  city: string | null
  district: string | null
  stateCode: GstStateCode
  latitude: number | null
  longitude: number | null
}

export type DirectoryResult = {
  rows: DirectoryRow[]
  /** Post office rows read */
  offices: number
  /** Post office rows left out, by reason */
  skipped: { badPincode: number; unknownState: number }
  /** State spellings no code was found for, with how often they came up */
  unknownStates: Record<string, number>
}

/** "THE DADRA & NAGAR HAVELI" -> "dadraandnagarhaveli": spacing, case and "&" don't matter */
const stateKey = (name: string) =>
  name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/^the\s+/, '')
    .replace(/[^a-z]/g, '')

const STATE_BY_KEY = new Map<string, GstStateCode>([
  ...Object.entries(GST_STATES).map(
    ([code, name]) => [stateKey(name), code as GstStateCode] as const,
  ),
  // Older releases and India Post's own spellings
  [stateKey('Chattisgarh'), '22'],
  [stateKey('Orissa'), '21'],
  [stateKey('Pondicherry'), '34'],
  [stateKey('Uttaranchal'), '05'],
  [stateKey('Dadra and Nagar Haveli'), '26'],
  [stateKey('Daman and Diu'), '26'],
  [stateKey('Andaman and Nicobar'), '35'],
])

/** "NEW DELHI" -> "New Delhi"; short words inside a name stay lower case ("Sri Potti Sriramulu Nellore") */
export function titleCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(
      /(^|[\s(-])([a-z])/g,
      (_, before: string, letter: string) => before + letter.toUpperCase(),
    )
    .replace(/ (And|Of) /g, (word) => word.toLowerCase())
}

/** A coordinate inside India's bounding box, else null (the file has "NA" and swapped values) */
function coordinates(lat: string | undefined, lng: string | undefined) {
  const latitude = Number(lat)
  const longitude = Number(lng)
  const valid =
    lat?.trim() &&
    lng?.trim() &&
    latitude >= 6 &&
    latitude <= 38 &&
    longitude >= 68 &&
    longitude <= 98
  return valid ? { latitude, longitude } : null
}

/** The CSV's rows (header first) as one directory row per pincode. */
export function readPincodeDirectory(table: string[][]): DirectoryResult {
  const [header, ...offices] = table
  const result: DirectoryResult = {
    rows: [],
    offices: offices.length,
    skipped: { badPincode: 0, unknownState: 0 },
    unknownStates: {},
  }
  if (!header) return result
  const names = header.map((h) =>
    h
      .trim()
      .toLowerCase()
      .replace(/[^a-z]/g, ''),
  )
  const column = (...candidates: string[]) => names.findIndex((n) => candidates.includes(n))
  const at = {
    pincode: column('pincode'),
    district: column('district', 'districtname'),
    state: column('statename', 'state'),
    latitude: column('latitude'),
    longitude: column('longitude'),
  }
  if (at.pincode < 0 || at.state < 0)
    throw new Error(
      'This file has no "pincode" or "statename" column. Is it the pincode directory?',
    )

  const byPincode = new Map<string, DirectoryRow>()
  for (const office of offices) {
    const pincode = office[at.pincode]?.trim() ?? ''
    if (!PINCODE_PATTERN.test(pincode)) {
      result.skipped.badPincode += 1
      continue
    }
    const stateName = office[at.state]?.trim() ?? ''
    const stateCode = STATE_BY_KEY.get(stateKey(stateName)) ?? stateFromPincodePrefix(pincode)
    if (!stateCode) {
      result.skipped.unknownState += 1
      result.unknownStates[stateName] = (result.unknownStates[stateName] ?? 0) + 1
      continue
    }
    const districtRaw = at.district >= 0 ? (office[at.district] ?? '').trim() : ''
    const district =
      districtRaw && districtRaw.toUpperCase() !== 'NA' ? titleCase(districtRaw) : null
    const place = coordinates(office[at.latitude], office[at.longitude])
    const row = byPincode.get(pincode)
    if (!row) {
      byPincode.set(pincode, {
        pincode,
        city: district,
        district,
        stateCode,
        latitude: place?.latitude ?? null,
        longitude: place?.longitude ?? null,
      })
      continue
    }
    // Later post offices fill what the first one lacked
    if (!row.district && district) row.city = row.district = district
    if (row.latitude === null && place) Object.assign(row, place)
  }
  result.rows = [...byPincode.values()]
  return result
}
