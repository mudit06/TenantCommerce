// Money is an integer number of minor units (paise for INR), never a float (ADR 0004).
// Rupees appear only at the edges: admin input, CSV, display.

export const CURRENCIES = ['INR'] as const
export type Currency = (typeof CURRENCIES)[number]

export type Money = {
  amountMinor: number
  currency: Currency
}

const MINOR_PER_MAJOR: Record<Currency, number> = { INR: 100 }

function assertMinor(value: number, name = 'amount'): void {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`${name} must be an integer number of paise, got ${value}`)
  }
}

/**
 * Parses rupees typed by a person ("11,798.82", "₹ 4,999", 4999.5) into paise.
 * Rejects more than two decimals instead of silently rounding.
 */
export function fromRupees(input: string | number): number {
  const text = (typeof input === 'number' ? String(input) : input).replace(/[₹,\s]/g, '')
  const match = /^(-)?(\d+)(?:\.(\d{1,2}))?$/.exec(text)
  if (!match) {
    throw new TypeError(`Not a rupee amount: "${input}"`)
  }
  const [, sign, rupees = '0', paise = ''] = match
  const minor = Number(rupees) * 100 + Number(paise.padEnd(2, '0'))
  assertMinor(minor)
  return sign ? -minor : minor
}

/** Paise to a plain decimal string ("11798.82"), for inputs and CSV, never for maths. */
export function toRupeesString(amountMinor: number): string {
  assertMinor(amountMinor)
  const sign = amountMinor < 0 ? '-' : ''
  const abs = Math.abs(amountMinor)
  const rupees = Math.floor(abs / 100)
  const paise = abs % 100
  return paise === 0 ? `${sign}${rupees}` : `${sign}${rupees}.${String(paise).padStart(2, '0')}`
}

export function add(...amounts: number[]): number {
  return amounts.reduce((sum, value) => {
    assertMinor(value)
    return sum + value
  }, 0)
}

export function subtract(a: number, b: number): number {
  assertMinor(a)
  assertMinor(b)
  return a - b
}

/** Unit price times an integer quantity. */
export function multiply(amountMinor: number, quantity: number): number {
  assertMinor(amountMinor)
  if (!Number.isInteger(quantity)) {
    throw new TypeError(`quantity must be an integer, got ${quantity}`)
  }
  return amountMinor * quantity
}

/**
 * A percentage of an amount, rounded half up to the paisa. Percent may have up to two
 * decimals (GST 0.25%), handled as basis points so no float reaches the result.
 */
export function percentOf(amountMinor: number, percent: number): number {
  assertMinor(amountMinor)
  const basisPoints = Math.round(percent * 100)
  if (Math.abs(basisPoints / 100 - percent) > 1e-9) {
    throw new TypeError(`percent supports at most two decimals, got ${percent}`)
  }
  const numerator = amountMinor * basisPoints
  const sign = numerator < 0 ? -1 : 1
  return sign * Math.floor((Math.abs(numerator) + 5000) / 10000)
}

/**
 * Splits a total across weights by largest remainder, so the parts always add up to the
 * total exactly (ADR 0004).
 */
export function allocate(totalMinor: number, weights: number[]): number[] {
  assertMinor(totalMinor)
  if (weights.length === 0) return []
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0)
  if (weightSum <= 0) {
    throw new RangeError('allocate needs at least one positive weight')
  }
  const exact = weights.map((weight) => (totalMinor * weight) / weightSum)
  const parts = exact.map((value) => Math.floor(value))
  let remainder = totalMinor - parts.reduce((sum, value) => sum + value, 0)
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index)
  for (let i = 0; remainder > 0; i = (i + 1) % order.length, remainder -= 1) {
    const slot = order[i]
    if (slot) parts[slot.index] = (parts[slot.index] ?? 0) + 1
  }
  return parts
}

type FormatOptions = {
  /** `auto` shows paise only when there are any (₹9,999 but ₹11,798.82). */
  decimals?: 'auto' | 'always' | 'never'
  currency?: Currency
}

/** ₹1,12,400 style, Indian digit grouping. */
export function formatINR(amountMinor: number, options: FormatOptions = {}): string {
  assertMinor(amountMinor)
  const { decimals = 'auto', currency = 'INR' } = options
  const perMajor = MINOR_PER_MAJOR[currency]
  const showPaise = decimals === 'always' || (decimals === 'auto' && amountMinor % perMajor !== 0)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: showPaise ? 2 : 0,
    maximumFractionDigits: decimals === 'never' ? 0 : 2,
  }).format(amountMinor / perMajor)
}

/** Lakh and crore shorthand for dashboards: ₹3.70 L, ₹2.62 Cr. */
export function formatINRCompact(amountMinor: number): string {
  assertMinor(amountMinor)
  const rupees = amountMinor / 100
  const abs = Math.abs(rupees)
  if (abs >= 1_00_00_000) return `₹${(rupees / 1_00_00_000).toFixed(2)} Cr`
  if (abs >= 1_00_000) return `₹${(rupees / 1_00_000).toFixed(2)} L`
  return formatINR(Math.round(amountMinor / 100) * 100, { decimals: 'never' })
}

export const GST_ON_SUBSCRIPTION_PERCENT = 18

/** Subscription price plus 18% GST (super admin billing screens). */
export function withGst(amountMinor: number, percent = GST_ON_SUBSCRIPTION_PERCENT): number {
  return add(amountMinor, percentOf(amountMinor, percent))
}
