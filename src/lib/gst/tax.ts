// GST on GST-inclusive amounts (docs/11 "Pricing and totals"). Integer paise throughout; rates
// with up to two decimals (0.25%) are handled as basis points so no float reaches a result.

const toBasisPoints = (percent: number) => {
  const bp = Math.round(percent * 100)
  if (Math.abs(bp / 100 - percent) > 1e-9 || bp < 0) {
    throw new TypeError(`GST rate must be a percentage with at most two decimals, got ${percent}`)
  }
  return bp
}

/** round(a / b) for non-negative integers, half up, without floats. */
const divideRounded = (a: number, b: number) => Math.floor((2 * a + b) / (2 * b))

/**
 * Splits a GST-inclusive amount into its taxable value and the tax in it:
 * `taxable = round(amount × 100 / (100 + rate))`, `tax = amount − taxable`.
 */
export function splitInclusive(
  amountMinor: number,
  ratePercent: number,
): { taxableMinor: number; taxMinor: number } {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) {
    throw new TypeError(`amount must be whole, non-negative paise, got ${amountMinor}`)
  }
  const bp = toBasisPoints(ratePercent)
  const taxableMinor = divideRounded(amountMinor * 10_000, 10_000 + bp)
  return { taxableMinor, taxMinor: amountMinor - taxableMinor }
}

/** Same state: CGST + SGST (half each, the odd paisa to SGST). Other state: IGST. */
export function splitTax(
  taxMinor: number,
  intraState: boolean,
): { cgstMinor: number; sgstMinor: number; igstMinor: number } {
  if (!intraState) return { cgstMinor: 0, sgstMinor: 0, igstMinor: taxMinor }
  const cgstMinor = Math.floor(taxMinor / 2)
  return { cgstMinor, sgstMinor: taxMinor - cgstMinor, igstMinor: 0 }
}

/**
 * Goods whose rate depends on the price of one piece (clothing since 22 September 2025: 5% up
 * to ₹2,500 a piece, 18% above). Works out one piece's taxable value at the lower rate and uses
 * the higher rate when it is above the limit (docs/11 step 5).
 */
export type ValueRule = { maxUnitTaxableMinor: number; rateAbovePercent: number }

export function rateForPiece(
  netMinor: number,
  qty: number,
  ratePercent: number,
  rule?: ValueRule | null,
): number {
  if (!rule || qty <= 0) return ratePercent
  const perPiece = divideRounded(netMinor, qty)
  const { taxableMinor } = splitInclusive(perPiece, ratePercent)
  return taxableMinor > rule.maxUnitTaxableMinor ? rule.rateAbovePercent : ratePercent
}
