import { allocate } from '@/lib/money'
import { rateForPiece, splitInclusive, splitTax, type ValueRule } from '@/lib/gst/tax'

// Cart and order totals (docs/11 "Pricing and totals"). Pure: the server gathers prices, rates
// and discounts, this works out every line's GST and the totals. The browser never sends a price
// (CLAUDE.md rule 7); checkout runs the same function again before an order is placed.

export type PriceLineInput = {
  key: string
  qty: number
  /** One piece, GST-inclusive selling price (after a launch special price) */
  unitMinor: number
  /** MRP of one piece, for display */
  mrpMinor?: number | null
  gstRatePercent: number
  /** Clothing: a piece above the limit takes the higher rate (docs/11 step 5) */
  valueRule?: ValueRule | null
  /** This line's share of schemes and coupons, worked out by the promotions engine */
  discountMinor?: number
}

export type PricingInput = {
  lines: readonly PriceLineInput[]
  /** GST-inclusive delivery charge and COD fee, taxed at the goods' rates (docs/11) */
  shippingMinor?: number
  codFeeMinor?: number
  sellerStateCode: string
  /** The delivery address's state from the pincode directory; unknown until checkout */
  placeOfSupplyStateCode?: string | null
}

export type TaxSplit = {
  taxableMinor: number
  taxMinor: number
  cgstMinor: number
  sgstMinor: number
  igstMinor: number
}

export type PricedLine = TaxSplit & {
  key: string
  qty: number
  unitMinor: number
  mrpMinor: number | null
  grossMinor: number
  discountMinor: number
  /** What the shopper pays for the line, GST included */
  netMinor: number
  gstRatePercent: number
}

export type ChargePart = TaxSplit & { lineKey: string; gstRatePercent: number; amountMinor: number }

export type PricedCharge = TaxSplit & {
  kind: 'shipping' | 'cod'
  amountMinor: number
  /** The charge split across the lines by taxable value, each part at its line's rate */
  parts: ChargePart[]
}

export type PricedTotals = TaxSplit & {
  /** Σ gross: items before discounts */
  itemsMinor: number
  discountMinor: number
  /** Σ net: items after discounts, GST included */
  subtotalMinor: number
  shippingMinor: number
  codFeeMinor: number
  roundOffMinor: number
  grandTotalMinor: number
  /** Saving against MRP plus discounts, for "You save" */
  savingsMinor: number
}

export type PricingResult = {
  lines: PricedLine[]
  charges: PricedCharge[]
  totals: PricedTotals
  intraState: boolean
  placeOfSupplyKnown: boolean
}

const zero = (): TaxSplit => ({
  taxableMinor: 0,
  taxMinor: 0,
  cgstMinor: 0,
  sgstMinor: 0,
  igstMinor: 0,
})

const addSplit = (into: TaxSplit, part: TaxSplit) => {
  into.taxableMinor += part.taxableMinor
  into.taxMinor += part.taxMinor
  into.cgstMinor += part.cgstMinor
  into.sgstMinor += part.sgstMinor
  into.igstMinor += part.igstMinor
}

const assertPaise = (value: number, name: string) => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${name} must be whole, non-negative paise, got ${value}`)
  }
}

function taxOf(amountMinor: number, ratePercent: number, intraState: boolean): TaxSplit {
  const { taxableMinor, taxMinor } = splitInclusive(amountMinor, ratePercent)
  return { taxableMinor, taxMinor, ...splitTax(taxMinor, intraState) }
}

function priceCharge(
  kind: PricedCharge['kind'],
  amountMinor: number,
  lines: readonly PricedLine[],
  intraState: boolean,
): PricedCharge | null {
  if (amountMinor <= 0 || lines.length === 0) return null
  // Split by each line's taxable value; when everything was free, evenly
  const weights = lines.map((line) => line.taxableMinor)
  const shares = allocate(
    amountMinor,
    weights.some((weight) => weight > 0) ? weights : lines.map(() => 1),
  )
  const charge: PricedCharge = { kind, amountMinor, parts: [], ...zero() }
  lines.forEach((line, index) => {
    const share = shares[index] ?? 0
    if (share === 0) return
    const tax = taxOf(share, line.gstRatePercent, intraState)
    charge.parts.push({
      lineKey: line.key,
      gstRatePercent: line.gstRatePercent,
      amountMinor: share,
      ...tax,
    })
    addSplit(charge, tax)
  })
  return charge
}

export function priceCart(input: PricingInput): PricingResult {
  const placeOfSupplyKnown = Boolean(input.placeOfSupplyStateCode)
  // Until the address is known, show tax as if the shopper is in the store's state; checkout
  // prices again with the real place of supply
  const intraState =
    (input.placeOfSupplyStateCode ?? input.sellerStateCode) === input.sellerStateCode

  const lines = input.lines.map((line): PricedLine => {
    if (!Number.isInteger(line.qty) || line.qty <= 0) {
      throw new TypeError(`quantity must be a whole number above 0, got ${line.qty}`)
    }
    assertPaise(line.unitMinor, 'unit price')
    const grossMinor = line.unitMinor * line.qty
    const discountMinor = Math.min(line.discountMinor ?? 0, grossMinor)
    assertPaise(discountMinor, 'discount')
    const netMinor = grossMinor - discountMinor
    const gstRatePercent = rateForPiece(netMinor, line.qty, line.gstRatePercent, line.valueRule)
    return {
      key: line.key,
      qty: line.qty,
      unitMinor: line.unitMinor,
      mrpMinor: line.mrpMinor ?? null,
      grossMinor,
      discountMinor,
      netMinor,
      gstRatePercent,
      ...taxOf(netMinor, gstRatePercent, intraState),
    }
  })

  const shippingMinor = input.shippingMinor ?? 0
  const codFeeMinor = input.codFeeMinor ?? 0
  assertPaise(shippingMinor, 'delivery charge')
  assertPaise(codFeeMinor, 'COD fee')
  const charges = [
    priceCharge('shipping', shippingMinor, lines, intraState),
    priceCharge('cod', codFeeMinor, lines, intraState),
  ].filter((charge): charge is PricedCharge => charge !== null)

  const totals: PricedTotals = {
    itemsMinor: 0,
    discountMinor: 0,
    subtotalMinor: 0,
    shippingMinor: charges.find((c) => c.kind === 'shipping')?.amountMinor ?? 0,
    codFeeMinor: charges.find((c) => c.kind === 'cod')?.amountMinor ?? 0,
    roundOffMinor: 0,
    grandTotalMinor: 0,
    savingsMinor: 0,
    ...zero(),
  }
  for (const line of lines) {
    totals.itemsMinor += line.grossMinor
    totals.discountMinor += line.discountMinor
    totals.subtotalMinor += line.netMinor
    totals.savingsMinor +=
      line.discountMinor +
      Math.max(0, ((line.mrpMinor ?? line.unitMinor) - line.unitMinor) * line.qty)
    addSplit(totals, line)
  }
  for (const charge of charges) addSplit(totals, charge)
  totals.grandTotalMinor = totals.subtotalMinor + totals.shippingMinor + totals.codFeeMinor
  return { lines, charges, totals, intraState, placeOfSupplyKnown }
}
