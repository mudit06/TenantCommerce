import { describe, expect, it } from 'vitest'

import { financialYear, maskPan, maskPayout, tdsFor } from '@/modules/affiliate/rules'

// Affiliate payouts (docs/11 "Payout and TDS"): no TDS up to ₹20,000 in a financial year; past
// it, 2% (20% without PAN) on the whole year's amount, less what was already deducted.

describe('affiliate TDS', () => {
  it('deducts nothing until the year passes ₹20,000', () => {
    expect(
      tdsFor({
        grossMinor: 5_000_00,
        earlierGrossMinor: 15_000_00,
        earlierTdsMinor: 0,
        hasPan: true,
      }),
    ).toEqual({ tdsMinor: 0, percent: 0 })
  })

  it('takes 2% of the whole year once past it, including what was paid before', () => {
    // ₹15,000 earlier + ₹6,000 now = ₹21,000; 2% = ₹420, all on this payout
    expect(
      tdsFor({
        grossMinor: 6_000_00,
        earlierGrossMinor: 15_000_00,
        earlierTdsMinor: 0,
        hasPan: true,
      }),
    ).toEqual({ tdsMinor: 420_00, percent: 2 })
    // The next payout: 2% of ₹25,000 = ₹500, less the ₹420 already deducted
    expect(
      tdsFor({
        grossMinor: 4_000_00,
        earlierGrossMinor: 21_000_00,
        earlierTdsMinor: 420_00,
        hasPan: true,
      }),
    ).toEqual({ tdsMinor: 80_00, percent: 2 })
  })

  it('takes 20% without a PAN, never more than the payout', () => {
    expect(
      tdsFor({
        grossMinor: 1_000_00,
        earlierGrossMinor: 20_000_00,
        earlierTdsMinor: 0,
        hasPan: false,
      }),
    ).toEqual({ tdsMinor: 1_000_00, percent: 20 })
  })

  it('names the financial year from April, India time', () => {
    expect(financialYear(new Date('2026-10-08T10:00:00Z'))).toEqual({
      long: '2026-27',
      short: '26-27',
    })
    // 31 March 23:00 IST is still the old year; 1 April 00:30 IST is the new one
    expect(financialYear(new Date('2027-03-31T17:30:00Z')).long).toBe('2026-27')
    expect(financialYear(new Date('2027-03-31T19:00:00Z')).long).toBe('2027-28')
  })

  it('masks PAN and payout details', () => {
    expect(maskPan('ABCPS1234K')).toBe('ABCPS••••K')
    expect(maskPayout({ method: 'upi', upiId: 'riya.s@okaxis' })).toBe('UPI ri••••@okaxis')
    expect(
      maskPayout({
        method: 'bank',
        accountName: 'Riya Sharma',
        accountNumber: '50100123457731',
        ifsc: 'HDFC0001234',
      }),
    ).toBe('Bank ••••7731 · HDFC')
  })
})
