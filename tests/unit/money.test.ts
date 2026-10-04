import { describe, expect, it } from 'vitest'

import { moneyField } from '@/fields/money'
import {
  add,
  allocate,
  formatINR,
  formatINRCompact,
  fromRupees,
  multiply,
  percentOf,
  toRupeesString,
  withGst,
} from '@/lib/money'

describe('money in paise (ADR 0004)', () => {
  it('parses rupees typed by people without float error', () => {
    expect(fromRupees('11,798.82')).toBe(1_179_882)
    expect(fromRupees('₹ 4,999')).toBe(499_900)
    expect(fromRupees('0.1')).toBe(10)
    expect(fromRupees(1.1)).toBe(110)
    expect(fromRupees('-25.5')).toBe(-2_550)
  })

  it('rejects more than two decimals and junk', () => {
    expect(() => fromRupees('1.005')).toThrow()
    expect(() => fromRupees('abc')).toThrow()
    expect(() => fromRupees('')).toThrow()
  })

  it('round-trips through the input string', () => {
    for (const minor of [0, 1, 99, 100, 1_179_882, 24_999_00]) {
      expect(fromRupees(toRupeesString(minor))).toBe(minor)
    }
  })

  it('refuses floats in arithmetic', () => {
    expect(() => add(100, 0.5)).toThrow()
    expect(() => multiply(100, 1.5)).toThrow()
    expect(add(100, 250, 1)).toBe(351)
    expect(multiply(999_900, 3)).toBe(2_999_700)
  })

  it('takes GST percentages with half-up rounding to the paisa', () => {
    expect(percentOf(999_900, 18)).toBe(179_982)
    expect(withGst(999_900)).toBe(1_179_882) // ₹9,999 + 18% = ₹11,798.82
    expect(withGst(499_900)).toBe(589_882) // ₹4,999 + 18% = ₹5,898.82
    expect(percentOf(1_000, 0.25)).toBe(3) // 2.5 paise rounds half up
    expect(percentOf(333, 5)).toBe(17) // 16.65
  })

  it('allocates totals by largest remainder so parts always add up', () => {
    expect(allocate(100, [1, 1, 1])).toEqual([34, 33, 33])
    expect(allocate(1_000, [3, 7])).toEqual([300, 700])
    const parts = allocate(99_999, [123, 456, 789, 1])
    expect(parts.reduce((s, p) => s + p, 0)).toBe(99_999)
  })

  it('formats with Indian digit grouping and lakh/crore shorthand', () => {
    expect(formatINR(11_240_000)).toBe('₹1,12,400')
    expect(formatINR(1_179_882)).toBe('₹11,798.82')
    expect(formatINR(500, { decimals: 'always' })).toBe('₹5.00')
    expect(formatINRCompact(37_000_000)).toBe('₹3.70 L')
    expect(formatINRCompact(2_620_000_000)).toBe('₹2.62 Cr')
  })
})

describe('money field', () => {
  // Payload skips its own `min` and `required` checks when a field has a validate (QA SA-08)
  const validateOf = (required: boolean) => {
    const amount = moneyField({ name: 'price', required }).fields[0]
    if (!amount || !('validate' in amount) || typeof amount.validate !== 'function')
      throw new Error('no validate')
    return amount.validate as (value: number | null | undefined) => true | string
  }

  it('refuses negative and fractional paise', () => {
    expect(validateOf(false)(-500)).toBe('Amount can’t be negative')
    expect(validateOf(false)(10.5)).toBe('Amount must be whole paise')
    expect(validateOf(false)(0)).toBe(true)
    expect(validateOf(false)(100_000)).toBe(true)
  })

  it('needs an amount only when the field is required', () => {
    expect(validateOf(false)(null)).toBe(true)
    expect(validateOf(true)(null)).toBe('Enter an amount')
    expect(validateOf(true)(undefined)).toBe('Enter an amount')
  })
})
