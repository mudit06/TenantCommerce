import { describe, expect, it } from 'vitest'

import { stateFromPincodePrefix } from '@/modules/shipping/services/pincodes'
import {
  quoteFromRateCard,
  rateCardFee,
  zoneForPincode,
  type ZoneLike,
} from '@/modules/shipping/services/rateCard'

// The rate card on the Shipping zones wireframe: Gujarat flat ₹99 free above ₹999; West and
// South ₹149; North and East ₹149 up to 2 kg then ₹40 a kg, free above ₹1,999; remote pincodes
// ₹299 with no COD.

const money = (amountMinor: number) => ({ amountMinor, currency: 'INR' as const })

const zone = (overrides: Partial<ZoneLike> & { id: string; name: string }): ZoneLike => ({
  isServiceable: true,
  states: [],
  pincodePrefixes: [],
  rateType: 'flat',
  fee: money(0),
  freeAbove: undefined,
  baseWeightGrams: null,
  perExtraKg: undefined,
  valueBrackets: [],
  codAllowed: true,
  etaMinDays: null,
  etaMaxDays: null,
  sortOrder: 0,
  ...overrides,
})

const gujarat = zone({
  id: 'g',
  name: 'Gujarat',
  states: ['24'],
  fee: money(9_900),
  freeAbove: money(99_900),
  etaMinDays: 2,
  etaMaxDays: 3,
})
const westSouth = zone({
  id: 'w',
  name: 'West and South',
  states: ['27', '29', '33', '30'],
  fee: money(14_900),
  freeAbove: money(99_900),
})
const northEast = zone({
  id: 'n',
  name: 'North and East',
  states: ['07', '09', '19'],
  rateType: 'weight',
  fee: money(14_900),
  baseWeightGrams: 2000,
  perExtraKg: money(4_000),
  freeAbove: money(1_99_900),
})
const remote = zone({
  id: 'r',
  name: 'Remote areas',
  pincodePrefixes: ['4011', '744101'],
  fee: money(29_900),
  codAllowed: false,
  sortOrder: 9,
})
const blocked = zone({
  id: 'b',
  name: 'Not served',
  pincodePrefixes: ['403'],
  isServiceable: false,
})
const ZONES = [gujarat, westSouth, northEast, remote, blocked]

describe('zoneForPincode', () => {
  it('matches a state', () => {
    expect(zoneForPincode(ZONES, '411045', '27')?.name).toBe('West and South')
  })
  it('prefers a pincode prefix over the state, and a whole pincode over a prefix', () => {
    expect(zoneForPincode(ZONES, '401105', '27')?.name).toBe('Remote areas')
    const exact = zone({ id: 'e', name: 'One pincode', pincodePrefixes: ['401105'] })
    expect(zoneForPincode([...ZONES, exact], '401105', '27')?.name).toBe('One pincode')
  })
  it('finds nothing outside every zone', () => {
    expect(zoneForPincode(ZONES, '560001', '29')?.name).toBe('West and South')
    expect(zoneForPincode(ZONES, '781001', '18')).toBeNull()
  })
})

describe('rateCardFee', () => {
  it('charges flat fees and nothing above the free amount', () => {
    expect(rateCardFee(gujarat, { subtotalMinor: 50_000, weightGrams: 500 })).toBe(9_900)
    expect(rateCardFee(gujarat, { subtotalMinor: 99_900, weightGrams: 500 })).toBe(0)
  })
  it('adds a fee for every started kilo above the covered weight', () => {
    expect(rateCardFee(northEast, { subtotalMinor: 50_000, weightGrams: 2_000 })).toBe(14_900)
    expect(rateCardFee(northEast, { subtotalMinor: 50_000, weightGrams: 2_001 })).toBe(18_900)
    expect(rateCardFee(northEast, { subtotalMinor: 50_000, weightGrams: 4_500 })).toBe(26_900)
    expect(rateCardFee(northEast, { subtotalMinor: 2_00_000, weightGrams: 9_000 })).toBe(0)
  })
  it('takes the highest value bracket reached', () => {
    const byValue = zone({
      id: 'v',
      name: 'By value',
      rateType: 'order-value',
      fee: money(19_900),
      valueBrackets: [
        { from: money(50_000), bracketFee: money(9_900) },
        { from: money(1_00_000), bracketFee: money(4_900) },
      ],
    })
    expect(rateCardFee(byValue, { subtotalMinor: 20_000, weightGrams: 0 })).toBe(19_900)
    expect(rateCardFee(byValue, { subtotalMinor: 60_000, weightGrams: 0 })).toBe(9_900)
    expect(rateCardFee(byValue, { subtotalMinor: 1_50_000, weightGrams: 0 })).toBe(4_900)
  })
})

describe('quoteFromRateCard', () => {
  it('quotes delivery, COD and dates for a pincode', () => {
    expect(
      quoteFromRateCard(ZONES, {
        pincode: '360001',
        stateCode: '24',
        subtotalMinor: 50_000,
        weightGrams: 0,
      }),
    ).toEqual({
      serviceable: true,
      codAllowed: true,
      feeMinor: 9_900,
      zoneName: 'Gujarat',
      etaMinDays: 2,
      etaMaxDays: 3,
    })
  })
  it('turns COD off where the zone doesn’t allow it', () => {
    expect(
      quoteFromRateCard(ZONES, {
        pincode: '744101',
        stateCode: '35',
        subtotalMinor: 10_000,
        weightGrams: 0,
      }),
    ).toMatchObject({
      serviceable: true,
      codAllowed: false,
      feeMinor: 29_900,
    })
  })
  it('refuses blocked areas and places outside every zone', () => {
    expect(
      quoteFromRateCard(ZONES, {
        pincode: '403001',
        stateCode: '30',
        subtotalMinor: 0,
        weightGrams: 0,
      }).serviceable,
    ).toBe(false)
    expect(
      quoteFromRateCard(ZONES, {
        pincode: '781001',
        stateCode: '18',
        subtotalMinor: 0,
        weightGrams: 0,
      }).serviceable,
    ).toBe(false)
  })
  it('delivers everywhere for free while a store has no zones', () => {
    expect(
      quoteFromRateCard([], {
        pincode: '781001',
        stateCode: '18',
        subtotalMinor: 0,
        weightGrams: 0,
      }),
    ).toMatchObject({
      serviceable: true,
      feeMinor: 0,
    })
  })
})

describe('stateFromPincodePrefix', () => {
  it('knows the state of most pincodes from their first digits', () => {
    expect(stateFromPincodePrefix('110001')).toBe('07')
    expect(stateFromPincodePrefix('363642')).toBe('24')
    expect(stateFromPincodePrefix('411045')).toBe('27')
    expect(stateFromPincodePrefix('403001')).toBe('30')
    expect(stateFromPincodePrefix('560001')).toBe('29')
    expect(stateFromPincodePrefix('500001')).toBe('36')
    expect(stateFromPincodePrefix('737101')).toBe('11')
    expect(stateFromPincodePrefix('194101')).toBe('38')
  })
  it('doesn’t guess where a prefix spans two states', () => {
    expect(stateFromPincodePrefix('246001')).toBeNull()
    expect(stateFromPincodePrefix('605001')).toBeNull()
    expect(stateFromPincodePrefix('682551')).toBeNull()
  })
  it('ignores what isn’t a pincode', () => {
    expect(stateFromPincodePrefix('012345')).toBeNull()
    expect(stateFromPincodePrefix('4110')).toBeNull()
  })
})
