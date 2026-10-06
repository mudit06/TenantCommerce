import type { ShippingZone } from '@/payload-types'

import type { RateType } from '../constants'

// The vendor's own rate card (docs/06 `shipping-zones`, docs/screens Shipping zones): which zone
// a pincode is in, whether the store delivers and allows COD there, and the fee. Pure, so the
// pincode check, the cart and checkout agree, and it is unit-tested.

export type ZoneLike = Pick<
  ShippingZone,
  | 'id'
  | 'name'
  | 'isServiceable'
  | 'states'
  | 'pincodePrefixes'
  | 'rateType'
  | 'fee'
  | 'freeAbove'
  | 'baseWeightGrams'
  | 'perExtraKg'
  | 'valueBrackets'
  | 'codAllowed'
  | 'etaMinDays'
  | 'etaMaxDays'
  | 'sortOrder'
>

/**
 * The most specific zone for a pincode: one listing the pincode itself, then the longest
 * matching prefix, then one covering its state; ties go to the zone sorted first.
 */
export function zoneForPincode<Z extends ZoneLike>(
  zones: readonly Z[],
  pincode: string,
  stateCode: string | null,
): Z | null {
  let best: { zone: Z; score: number } | null = null
  const sorted = [...zones].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  for (const zone of sorted) {
    const prefixes = zone.pincodePrefixes ?? []
    const longest = prefixes
      .filter((prefix) => pincode.startsWith(prefix))
      .reduce((max, prefix) => Math.max(max, prefix.length), 0)
    // A whole pincode (6) beats any prefix, a prefix beats a state (1)
    const score =
      longest > 0
        ? 10 + longest
        : stateCode && (zone.states ?? []).includes(stateCode as never)
          ? 1
          : 0
    if (score > 0 && (!best || score > best.score)) best = { zone, score }
  }
  return best?.zone ?? null
}

const amount = (money: { amountMinor?: number | null } | null | undefined) =>
  money?.amountMinor ?? null

/**
 * The delivery fee (GST-inclusive) for an order of `subtotalMinor` (after discounts) weighing
 * `weightGrams`, or 0 above the zone's free-delivery amount.
 */
export function rateCardFee(
  zone: ZoneLike,
  { subtotalMinor, weightGrams }: { subtotalMinor: number; weightGrams: number },
): number {
  const freeAbove = amount(zone.freeAbove)
  if (freeAbove !== null && freeAbove > 0 && subtotalMinor >= freeAbove) return 0
  const base = amount(zone.fee) ?? 0
  switch ((zone.rateType ?? 'flat') as RateType) {
    case 'weight': {
      const covered = zone.baseWeightGrams ?? 0
      const extraKg = Math.max(0, Math.ceil((weightGrams - covered) / 1000))
      return base + extraKg * (amount(zone.perExtraKg) ?? 0)
    }
    case 'order-value': {
      const bracket = [...(zone.valueBrackets ?? [])]
        .filter((row) => (amount(row.from) ?? 0) <= subtotalMinor)
        .sort((a, b) => (amount(b.from) ?? 0) - (amount(a.from) ?? 0))[0]
      return bracket ? (amount(bracket.bracketFee) ?? 0) : base
    }
    default:
      return base
  }
}

export type DeliveryQuote = {
  serviceable: boolean
  codAllowed: boolean
  feeMinor: number
  zoneName: string | null
  etaMinDays: number | null
  etaMaxDays: number | null
}

/** What the pincode check and checkout show for an address, from the rate card alone. */
export function quoteFromRateCard(
  zones: readonly ZoneLike[],
  input: { pincode: string; stateCode: string | null; subtotalMinor: number; weightGrams: number },
): DeliveryQuote {
  const zone = zoneForPincode(zones, input.pincode, input.stateCode)
  // A store with no zones at all delivers everywhere for free until it sets them up
  if (!zone) {
    return zones.length === 0
      ? {
          serviceable: true,
          codAllowed: true,
          feeMinor: 0,
          zoneName: null,
          etaMinDays: null,
          etaMaxDays: null,
        }
      : {
          serviceable: false,
          codAllowed: false,
          feeMinor: 0,
          zoneName: null,
          etaMinDays: null,
          etaMaxDays: null,
        }
  }
  const serviceable = zone.isServiceable !== false
  return {
    serviceable,
    codAllowed: serviceable && zone.codAllowed !== false,
    feeMinor: serviceable ? rateCardFee(zone, input) : 0,
    zoneName: zone.name,
    etaMinDays: zone.etaMinDays ?? null,
    etaMaxDays: zone.etaMaxDays ?? null,
  }
}
