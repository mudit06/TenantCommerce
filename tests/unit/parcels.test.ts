import { describe, expect, it } from 'vitest'

import { parcelMove, rollUpFulfillment } from '@/modules/orders/services/parcels'
import {
  creditLines,
  financialYear,
  invoiceNumber,
  type InvoiceLine,
} from '@/modules/tax-invoicing/services/invoices'

// The parcel journey (docs/11) and the invoice numbering rules, without a database.

describe('parcelMove', () => {
  it('allows the journey forward, skipping steps', () => {
    expect(parcelMove('packed', 'shipped')).toBe('ok')
    expect(parcelMove('shipped', 'delivered')).toBe('ok')
    expect(parcelMove('delivery_failed', 'out_for_delivery')).toBe('ok')
  })
  it('ignores repeats and late backward moves', () => {
    expect(parcelMove('shipped', 'shipped')).toBe('repeat')
    expect(parcelMove('out_for_delivery', 'shipped')).toBe('backward')
  })
  it('refuses impossible moves', () => {
    expect(parcelMove('packed', 'lost')).toBe('invalid')
    expect(parcelMove('delivered', 'rto_initiated')).toBe('backward')
    expect(parcelMove('shipped', 'cancelled')).toBe('invalid')
  })
})

describe('rollUpFulfillment', () => {
  const items = [
    { id: 'a', qty: 2 },
    { id: 'b', qty: 1 },
  ]
  const parcel = (status: string, lines: [string, number][]) => ({
    status: status as never,
    items: lines.map(([orderItemId, qty]) => ({ orderItemId, qty })),
  })
  it('is unfulfilled with no parcels and follows the least advanced parcel', () => {
    expect(rollUpFulfillment(items, [])).toBe('unfulfilled')
    expect(
      rollUpFulfillment(items, [
        parcel('packed', [
          ['a', 2],
          ['b', 1],
        ]),
      ]),
    ).toBe('packed')
    expect(
      rollUpFulfillment(items, [
        parcel('delivered', [['a', 2]]),
        parcel('out_for_delivery', [['b', 1]]),
      ]),
    ).toBe('out_for_delivery')
  })
  it('is partly shipped while some items have no parcel', () => {
    expect(rollUpFulfillment(items, [parcel('shipped', [['a', 2]])])).toBe('partially_shipped')
    expect(rollUpFulfillment(items, [parcel('delivered', [['a', 1]])])).toBe('partially_shipped')
  })
  it('is delivered when every piece is', () => {
    expect(
      rollUpFulfillment(items, [
        parcel('delivered', [
          ['a', 2],
          ['b', 1],
        ]),
      ]),
    ).toBe('delivered')
  })
  it('shows parcels coming back or lost first, and ignores cancelled ones', () => {
    expect(
      rollUpFulfillment(items, [
        parcel('rto_initiated', [
          ['a', 2],
          ['b', 1],
        ]),
      ]),
    ).toBe('rto')
    expect(
      rollUpFulfillment(items, [
        parcel('rto_delivered', [
          ['a', 2],
          ['b', 1],
        ]),
      ]),
    ).toBe('returned')
    expect(
      rollUpFulfillment(items, [
        parcel('cancelled', [
          ['a', 2],
          ['b', 1],
        ]),
      ]),
    ).toBe('unfulfilled')
  })
})

describe('invoice numbers', () => {
  it('knows the financial year in India’s time zone', () => {
    expect(financialYear(new Date('2026-04-01T00:00:00+05:30'))).toBe('2026-27')
    expect(financialYear(new Date('2026-03-31T23:59:00+05:30'))).toBe('2025-26')
    expect(financialYear(new Date('2027-03-31T20:00:00Z'))).toBe('2027-28')
  })
  it('fits GST’s 16 characters', () => {
    expect(invoiceNumber('INV', '2026-27', 482)).toBe('INV/26-27/00482')
    expect(invoiceNumber('HOMO', '2026-27', 1)).toHaveLength(16)
    expect(() => invoiceNumber('TOOLONG', '2026-27', 1)).toThrow()
  })
})

describe('creditLines', () => {
  const line = (totalMinor: number, ratePercent: number): InvoiceLine => ({
    description: 'x',
    hsnCode: '8481',
    qty: 1,
    unit: 'Nos',
    unitMinor: totalMinor,
    grossMinor: totalMinor,
    discountMinor: 0,
    taxableMinor: 0,
    ratePercent,
    cgstMinor: 0,
    sgstMinor: 0,
    igstMinor: 0,
    totalMinor,
  })
  it('copies the lines for a full refund', () => {
    const lines = [line(1_18_000, 18), line(1_05_000, 5)]
    expect(creditLines(lines, 2_23_000, false)).toEqual(lines)
  })
  it('spreads a part refund by value, each part taxed at its rate', () => {
    const credited = creditLines([line(1_18_000, 18), line(1_18_000, 5)], 1_18_000, true)
    expect(credited.map((l) => l.totalMinor)).toEqual([59_000, 59_000])
    expect(credited[0]).toMatchObject({ taxableMinor: 50_000, cgstMinor: 4_500, sgstMinor: 4_500 })
    expect(credited.reduce((sum, l) => sum + l.totalMinor, 0)).toBe(1_18_000)
  })
})
