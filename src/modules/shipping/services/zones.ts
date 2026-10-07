import type { Payload, PayloadRequest } from 'payload'
import { z } from 'zod'

import { hasTenantRole, STORE_ADMIN, storeSessionOf } from '@/access'
import { AppError } from '@/lib/errors'
import { GST_STATES } from '@/lib/gst/gstin'
import { formatINR } from '@/lib/money'
import type { ShippingZone } from '@/payload-types'

import { RATE_TYPES } from '../constants'
import { deliveryQuote, type LiveRateSource, type StoreDeliveryQuote } from './delivery'
import { lookupPincode, PINCODE_PATTERN, type PincodeInfo } from './pincodes'
import type { ZoneLike } from './rateCard'

// The Shipping zones screen (docs/screens/vendor-cms.md `cms-shipping`): what each zone says in
// the table, saving a zone, and "Test a pincode". Owners and managers change zones (docs/05).

/** Who may change a store's zones: owner or manager, or our team managing the store. */
export function assertZoneAccess(req: PayloadRequest, tenantId: string, write: boolean) {
  if (!req.user) throw new AppError('UNAUTHENTICATED', 'Sign in first', 401)
  const session = storeSessionOf(req.user)
  if (session) {
    if (session.tenantId !== tenantId || (write && session.mode !== 'manage')) {
      throw new AppError('FORBIDDEN', 'Open this store with “Manage store” to change shipping', 403)
    }
    return
  }
  const roles = write ? STORE_ADMIN : [...STORE_ADMIN, 'order-manager' as const, 'support' as const]
  if (!hasTenantRole(req.user, tenantId, roles)) {
    throw new AppError('FORBIDDEN', 'Only owners and managers change shipping zones', 403)
  }
}

const rupees = (minor: number | null | undefined) => formatINR(minor ?? 0, { decimals: 'auto' })

/** "Flat ₹149", "₹149 up to 2 kg, then ₹40 per kg", "₹99 below ₹500, then ₹49" */
export function zoneFeeText(zone: ZoneLike): string {
  if (zone.isServiceable === false) return 'We don’t deliver'
  const fee = zone.fee?.amountMinor ?? 0
  switch (zone.rateType) {
    case 'weight': {
      const kg = (zone.baseWeightGrams ?? 0) / 1000
      return `${rupees(fee)} up to ${kg} kg, then ${rupees(zone.perExtraKg?.amountMinor)} per kg`
    }
    case 'order-value': {
      const brackets = [...(zone.valueBrackets ?? [])].sort(
        (a, b) => (a.from?.amountMinor ?? 0) - (b.from?.amountMinor ?? 0),
      )
      if (!brackets.length) return fee ? `Flat ${rupees(fee)}` : 'Free'
      return [
        `${rupees(fee)} below ${rupees(brackets[0]!.from?.amountMinor)}`,
        ...brackets.map(
          (row) => `${rupees(row.bracketFee?.amountMinor)} from ${rupees(row.from?.amountMinor)}`,
        ),
      ].join(', ')
    }
    default:
      return fee ? `Flat ${rupees(fee)}` : 'Free'
  }
}

/** "1 state", "9 states and 3 pincodes", "412 pincodes" */
export function zoneCoversText(zone: Pick<ZoneLike, 'states' | 'pincodePrefixes'>): string {
  const states = zone.states?.length ?? 0
  const pins = zone.pincodePrefixes?.length ?? 0
  const parts = [
    states ? `${states} state${states === 1 ? '' : 's'}` : null,
    pins ? `${pins} pincode${pins === 1 ? '' : 's'}` : null,
  ].filter(Boolean)
  return parts.length ? parts.join(' and ') : 'Nowhere yet'
}

/** "3 to 5 days", "2 days", "" */
export function etaText(min: number | null | undefined, max: number | null | undefined): string {
  if (min == null && max == null) return ''
  if (min == null || max == null || min === max)
    return `${max ?? min} day${(max ?? min) === 1 ? '' : 's'}`
  return `${min} to ${max} days`
}

const money = z.number().int().min(0).nullable()

export const zoneInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Name the zone').max(60),
    isServiceable: z.boolean().default(true),
    states: z.array(z.enum(Object.keys(GST_STATES) as [string, ...string[]])).default([]),
    pincodePrefixes: z
      .array(
        z
          .string()
          .trim()
          .regex(/^[1-9][0-9]{1,5}$/, 'Use 2 to 6 digits, without spaces'),
      )
      .max(2000)
      .default([]),
    rateType: z.enum(RATE_TYPES.map((r) => r.value) as [string, ...string[]]).default('flat'),
    feeMinor: money,
    freeAboveMinor: money,
    baseWeightGrams: z.number().int().min(0).nullable().optional(),
    perExtraKgMinor: money.optional(),
    valueBrackets: z
      .array(z.object({ fromMinor: z.number().int().min(0), feeMinor: z.number().int().min(0) }))
      .max(20)
      .default([]),
    codAllowed: z.boolean().default(true),
    etaMinDays: z.number().int().min(0).max(60).nullable(),
    etaMaxDays: z.number().int().min(0).max(60).nullable(),
    sortOrder: z.number().int().optional(),
  })
  .refine((zone) => zone.states.length > 0 || zone.pincodePrefixes.length > 0, {
    message: 'Pick at least one state or pincode',
    path: ['states'],
  })
  .refine(
    (zone) =>
      zone.etaMinDays == null || zone.etaMaxDays == null || zone.etaMinDays <= zone.etaMaxDays,
    { message: 'The first number of days must not be more than the second', path: ['etaMaxDays'] },
  )

export type ZoneInput = z.infer<typeof zoneInputSchema>

const moneyValue = (amountMinor: number | null | undefined) => ({
  amountMinor: amountMinor ?? null,
  currency: 'INR' as const,
})

function zoneData(input: ZoneInput) {
  return {
    name: input.name,
    isServiceable: input.isServiceable,
    states: input.states as ShippingZone['states'],
    pincodePrefixes: [...new Set(input.pincodePrefixes)],
    rateType: input.rateType as ShippingZone['rateType'],
    fee: moneyValue(input.feeMinor),
    freeAbove: moneyValue(input.freeAboveMinor),
    baseWeightGrams: input.baseWeightGrams ?? null,
    perExtraKg: moneyValue(input.perExtraKgMinor),
    valueBrackets: input.valueBrackets.map((row) => ({
      from: moneyValue(row.fromMinor),
      bracketFee: moneyValue(row.feeMinor),
    })),
    codAllowed: input.codAllowed,
    etaMinDays: input.etaMinDays,
    etaMaxDays: input.etaMaxDays,
    ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder }),
  }
}

/** Creates or changes a zone. The person's own collection access also applies (docs/04). */
export async function saveZone(
  req: PayloadRequest,
  tenantId: string,
  zoneId: string | null,
  input: ZoneInput,
): Promise<ShippingZone> {
  assertZoneAccess(req, tenantId, true)
  const data = zoneData(input)
  if (!zoneId) {
    const { totalDocs } = await req.payload.count({
      collection: 'shipping-zones',
      where: { tenant: { equals: tenantId } },
      overrideAccess: true,
      req,
    })
    return req.payload.create({
      collection: 'shipping-zones',
      data: { ...data, sortOrder: data.sortOrder ?? (totalDocs + 1) * 10, tenant: tenantId },
      overrideAccess: false,
      user: req.user,
      req,
    })
  }
  await zoneOf(req, tenantId, zoneId)
  return req.payload.update({
    collection: 'shipping-zones',
    id: zoneId,
    data,
    overrideAccess: false,
    user: req.user,
    req,
  })
}

export async function deleteZone(req: PayloadRequest, tenantId: string, zoneId: string) {
  assertZoneAccess(req, tenantId, true)
  await zoneOf(req, tenantId, zoneId)
  await req.payload.delete({
    collection: 'shipping-zones',
    id: zoneId,
    overrideAccess: false,
    user: req.user,
    req,
  })
}

async function zoneOf(req: PayloadRequest, tenantId: string, zoneId: string) {
  const { docs } = await req.payload.find({
    collection: 'shipping-zones',
    where: { and: [{ id: { equals: zoneId } }, { tenant: { equals: tenantId } }] },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  if (!docs[0]) throw new AppError('NOT_FOUND', 'Zone not found in this store', 404)
  return docs[0]
}

export type PincodeCheck = {
  place: PincodeInfo
  quote: StoreDeliveryQuote
  /** The rate card's free-delivery amount for the zone, when it has one */
  freeAboveMinor: number | null
}

/**
 * "Test a pincode": the same answer shoppers get on product pages and at checkout, for a typical
 * order (`subtotalMinor`, `weightGrams`), from Shiprocket when connected.
 */
export async function checkPincode(
  payload: Payload,
  tenantId: string,
  {
    pincode,
    subtotalMinor = 0,
    weightGrams = 500,
    cod = false,
    live,
  }: {
    pincode: string
    subtotalMinor?: number
    weightGrams?: number
    cod?: boolean
    live?: LiveRateSource | null
  },
): Promise<PincodeCheck> {
  if (!PINCODE_PATTERN.test(pincode))
    throw new AppError('VALIDATION_FAILED', 'Enter a 6-digit pincode', 400, {
      pincode: 'Enter a 6-digit pincode',
    })
  const place = await lookupPincode(payload, pincode)
  const quote = await deliveryQuote(
    payload,
    tenantId,
    { pincode, stateCode: place.stateCode, subtotalMinor, weightGrams },
    { live, cod },
  )
  const { docs } = await payload.find({
    collection: 'shipping-zones',
    where: { and: [{ tenant: { equals: tenantId } }, { name: { equals: quote.zoneName ?? '' } }] },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  return { place, quote, freeAboveMinor: docs[0]?.freeAbove?.amountMinor ?? null }
}
