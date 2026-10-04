// GSTIN: 2-digit state code + 10-character PAN + entity number + 'Z' + check character.
// The state code decides CGST + SGST (same state) or IGST (other state) on every invoice.

export const GST_STATES = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory',
} as const

export type GstStateCode = keyof typeof GST_STATES

export const GST_STATE_OPTIONS = Object.entries(GST_STATES).map(([code, name]) => ({
  label: `${name} (${code})`,
  value: code,
}))

export const isGstStateCode = (value: string): value is GstStateCode => value in GST_STATES

const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/

/** The check character for the first 14 characters of a GSTIN (base-36 Luhn mod N). */
export function gstinCheckCharacter(first14: string): string {
  let sum = 0
  for (let i = 0; i < 14; i += 1) {
    const value = CHARSET.indexOf(first14.charAt(i))
    if (value < 0) throw new TypeError(`Invalid GSTIN character "${first14.charAt(i)}"`)
    const product = value * (i % 2 === 0 ? 1 : 2)
    sum += Math.floor(product / 36) + (product % 36)
  }
  return CHARSET.charAt((36 - (sum % 36)) % 36)
}

export const normalizeGstin = (value: string) => value.trim().toUpperCase()

export type GstinCheck =
  | { valid: true; gstin: string; pan: string; stateCode: GstStateCode; stateName: string }
  | { valid: false; reason: string }

export function parseGstin(input: string): GstinCheck {
  const gstin = normalizeGstin(input)
  if (!GSTIN_PATTERN.test(gstin)) {
    return { valid: false, reason: 'A GSTIN has 15 characters, for example 24AAKCB1234F1Z5' }
  }
  const stateCode = gstin.slice(0, 2)
  if (!isGstStateCode(stateCode)) {
    return { valid: false, reason: `${stateCode} is not a GST state code` }
  }
  if (gstinCheckCharacter(gstin.slice(0, 14)) !== gstin.charAt(14)) {
    return { valid: false, reason: 'The last character does not match. Check for a typing mistake' }
  }
  return {
    valid: true,
    gstin,
    pan: gstin.slice(2, 12),
    stateCode,
    stateName: GST_STATES[stateCode],
  }
}

export const isValidPan = (value: string) => PAN_PATTERN.test(value.trim().toUpperCase())
