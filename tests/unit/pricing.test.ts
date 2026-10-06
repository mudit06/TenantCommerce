import { describe, expect, it } from 'vitest'

import { rateForPiece, splitInclusive, splitTax } from '@/lib/gst/tax'
import { priceCart, type PriceLineInput } from '@/modules/cart/services/pricing'

// docs/11 "Pricing and totals": intra and inter-state, 0/5/18/40% rates, the clothing ₹2,500
// rule on both sides, quantities, rounding remainders, discounts, delivery and COD fee split
// across mixed rates.

const GUJARAT = '24'
const MAHARASHTRA = '27'

const line = (overrides: Partial<PriceLineInput> & { key: string }): PriceLineInput => ({
  qty: 1,
  unitMinor: 1_18_000,
  gstRatePercent: 18,
  ...overrides,
})

describe('splitInclusive', () => {
  it('takes the GST out of an inclusive price', () => {
    expect(splitInclusive(1_18_000, 18)).toEqual({ taxableMinor: 1_00_000, taxMinor: 18_000 })
    expect(splitInclusive(10_500, 5)).toEqual({ taxableMinor: 10_000, taxMinor: 500 })
    expect(splitInclusive(14_000, 40)).toEqual({ taxableMinor: 10_000, taxMinor: 4_000 })
    expect(splitInclusive(9_999, 0)).toEqual({ taxableMinor: 9_999, taxMinor: 0 })
  })

  it('rounds the taxable value half up and leaves the rest as tax', () => {
    // 2,36,40.00 at 18%: 20033.898… -> 20033.90 (the wireframe's order AQV-10482)
    expect(splitInclusive(23_64_000, 18)).toEqual({ taxableMinor: 20_03_390, taxMinor: 3_60_610 })
    expect(splitInclusive(1, 18)).toEqual({ taxableMinor: 1, taxMinor: 0 })
  })

  it('handles the 0.25% and 3% rates without floats', () => {
    expect(splitInclusive(1_00_250, 0.25)).toEqual({ taxableMinor: 1_00_000, taxMinor: 250 })
    expect(splitInclusive(1_03_000, 3)).toEqual({ taxableMinor: 1_00_000, taxMinor: 3_000 })
  })

  it('refuses fractions of a paisa and odd rates', () => {
    expect(() => splitInclusive(10.5, 18)).toThrow()
    expect(() => splitInclusive(100, 18.123)).toThrow()
  })
})

describe('splitTax', () => {
  it('splits within the state, the odd paisa to SGST', () => {
    expect(splitTax(3_607, true)).toEqual({ cgstMinor: 1_803, sgstMinor: 1_804, igstMinor: 0 })
  })
  it('is all IGST across states', () => {
    expect(splitTax(3_607, false)).toEqual({ cgstMinor: 0, sgstMinor: 0, igstMinor: 3_607 })
  })
})

describe('the clothing rule', () => {
  const rule = { maxUnitTaxableMinor: 2_50_000, rateAbovePercent: 18 }
  it('keeps 5% up to ₹2,500 a piece and takes 18% above', () => {
    // ₹2,625 incl. 5% = ₹2,500 taxable: at the limit, still 5%
    expect(rateForPiece(2_62_500, 1, 5, rule)).toBe(5)
    expect(rateForPiece(2_62_600, 1, 5, rule)).toBe(18)
    // Two pieces at ₹2,000 each stay at 5% though the line is ₹4,000
    expect(rateForPiece(4_00_000, 2, 5, rule)).toBe(5)
  })

  it('lets a discount bring a piece back under the limit', () => {
    const priced = priceCart({
      sellerStateCode: GUJARAT,
      lines: [
        line({
          key: 'kurta',
          unitMinor: 3_00_000,
          gstRatePercent: 5,
          valueRule: rule,
          discountMinor: 50_000,
        }),
      ],
    })
    expect(priced.lines[0]?.gstRatePercent).toBe(5)
    const full = priceCart({
      sellerStateCode: GUJARAT,
      lines: [line({ key: 'kurta', unitMinor: 3_00_000, gstRatePercent: 5, valueRule: rule })],
    })
    expect(full.lines[0]?.gstRatePercent).toBe(18)
  })
})

describe('priceCart', () => {
  it('prices the wireframe order: inter-state, all IGST', () => {
    const priced = priceCart({
      sellerStateCode: GUJARAT,
      placeOfSupplyStateCode: MAHARASHTRA,
      lines: [
        line({ key: 'mixer', unitMinor: 5_19_000 }),
        line({ key: 'wc', unitMinor: 18_45_000 }),
      ],
    })
    expect(priced.intraState).toBe(false)
    expect(priced.totals.grandTotalMinor).toBe(23_64_000)
    expect(priced.totals.cgstMinor + priced.totals.sgstMinor).toBe(0)
    expect(priced.totals.igstMinor).toBe(priced.totals.taxMinor)
    expect(priced.totals.taxableMinor + priced.totals.taxMinor).toBe(23_64_000)
  })

  it('splits CGST and SGST within the store’s state', () => {
    const priced = priceCart({
      sellerStateCode: GUJARAT,
      placeOfSupplyStateCode: GUJARAT,
      lines: [line({ key: 'a', unitMinor: 1_18_000, qty: 3 })],
    })
    expect(priced.lines[0]).toMatchObject({
      grossMinor: 3_54_000,
      netMinor: 3_54_000,
      taxableMinor: 3_00_000,
      cgstMinor: 27_000,
      sgstMinor: 27_000,
      igstMinor: 0,
    })
  })

  it('assumes the store’s state until the address is known, and says so', () => {
    const priced = priceCart({ sellerStateCode: GUJARAT, lines: [line({ key: 'a' })] })
    expect(priced.placeOfSupplyKnown).toBe(false)
    expect(priced.intraState).toBe(true)
  })

  it('works out GST on the price after discounts', () => {
    const priced = priceCart({
      sellerStateCode: GUJARAT,
      placeOfSupplyStateCode: MAHARASHTRA,
      lines: [line({ key: 'a', unitMinor: 1_18_000, qty: 2, discountMinor: 23_600 })],
    })
    expect(priced.lines[0]).toMatchObject({
      grossMinor: 2_36_000,
      discountMinor: 23_600,
      netMinor: 2_12_400,
      taxableMinor: 1_80_000,
      igstMinor: 32_400,
    })
    expect(priced.totals).toMatchObject({
      itemsMinor: 2_36_000,
      discountMinor: 23_600,
      subtotalMinor: 2_12_400,
      grandTotalMinor: 2_12_400,
    })
  })

  it('never lets a discount go below zero', () => {
    const priced = priceCart({
      sellerStateCode: GUJARAT,
      lines: [line({ key: 'a', unitMinor: 10_000, discountMinor: 50_000 })],
    })
    expect(priced.lines[0]).toMatchObject({ discountMinor: 10_000, netMinor: 0, taxMinor: 0 })
  })

  it('taxes the delivery charge at the goods’ rates, split by value across mixed rates', () => {
    const priced = priceCart({
      sellerStateCode: GUJARAT,
      placeOfSupplyStateCode: GUJARAT,
      shippingMinor: 14_900,
      lines: [
        // taxable ₹1,000 at 18% and ₹1,000 at 5%: the ₹149 splits evenly
        line({ key: 'tap', unitMinor: 1_18_000, gstRatePercent: 18 }),
        line({ key: 'towel', unitMinor: 1_05_000, gstRatePercent: 5 }),
      ],
    })
    const shipping = priced.charges.find((charge) => charge.kind === 'shipping')!
    expect(
      shipping.parts.map((part) => [part.lineKey, part.gstRatePercent, part.amountMinor]),
    ).toEqual([
      ['tap', 18, 7_450],
      ['towel', 5, 7_450],
    ])
    expect(shipping.parts.reduce((sum, part) => sum + part.amountMinor, 0)).toBe(14_900)
    expect(shipping.parts[0]).toMatchObject({ taxableMinor: 6_314, cgstMinor: 568, sgstMinor: 568 })
    expect(shipping.parts[1]).toMatchObject({ taxableMinor: 7_095, cgstMinor: 177, sgstMinor: 178 })
    expect(priced.totals.grandTotalMinor).toBe(1_18_000 + 1_05_000 + 14_900)
    expect(priced.totals.taxableMinor + priced.totals.taxMinor).toBe(priced.totals.grandTotalMinor)
  })

  it('adds the COD fee the same way and keeps every paisa', () => {
    const priced = priceCart({
      sellerStateCode: GUJARAT,
      placeOfSupplyStateCode: MAHARASHTRA,
      shippingMinor: 9_900,
      codFeeMinor: 4_900,
      lines: [
        line({ key: 'a', unitMinor: 33_333, qty: 3, gstRatePercent: 18 }),
        line({ key: 'b', unitMinor: 77_777, gstRatePercent: 40 }),
        line({ key: 'c', unitMinor: 1_111, gstRatePercent: 0 }),
      ],
    })
    expect(priced.totals.codFeeMinor).toBe(4_900)
    for (const charge of priced.charges) {
      expect(charge.parts.reduce((sum, part) => sum + part.amountMinor, 0)).toBe(charge.amountMinor)
      expect(charge.taxableMinor + charge.taxMinor).toBe(charge.amountMinor)
    }
    expect(priced.totals.grandTotalMinor).toBe(99_999 + 77_777 + 1_111 + 9_900 + 4_900)
    expect(priced.totals.taxableMinor + priced.totals.taxMinor).toBe(priced.totals.grandTotalMinor)
    expect(priced.totals.igstMinor).toBe(priced.totals.taxMinor)
  })

  it('spreads a delivery charge evenly when every item was free', () => {
    const priced = priceCart({
      sellerStateCode: GUJARAT,
      shippingMinor: 10_001,
      lines: [
        line({ key: 'a', unitMinor: 1_000, discountMinor: 1_000 }),
        line({ key: 'b', unitMinor: 1_000, discountMinor: 1_000 }),
      ],
    })
    expect(priced.charges[0]?.parts.map((part) => part.amountMinor)).toEqual([5_001, 5_000])
  })

  it('counts savings against MRP and discounts', () => {
    const priced = priceCart({
      sellerStateCode: GUJARAT,
      lines: [
        line({ key: 'a', unitMinor: 90_000, mrpMinor: 1_00_000, qty: 2, discountMinor: 5_000 }),
      ],
    })
    expect(priced.totals.savingsMinor).toBe(25_000)
  })

  it('refuses bad quantities and prices', () => {
    expect(() =>
      priceCart({ sellerStateCode: GUJARAT, lines: [line({ key: 'a', qty: 0 })] }),
    ).toThrow()
    expect(() =>
      priceCart({ sellerStateCode: GUJARAT, lines: [line({ key: 'a', qty: 1.5 })] }),
    ).toThrow()
    expect(() =>
      priceCart({ sellerStateCode: GUJARAT, lines: [line({ key: 'a', unitMinor: 99.5 })] }),
    ).toThrow()
  })
})
