import { describe, expect, it } from 'vitest'

import {
  amountDueMinor,
  coverageFor,
  effectiveStatus,
  monthlyRecurringMinor,
  summarizeBilling,
} from '@/modules/tenancy/services/billing'
import { formatDate } from '@/lib/dates'

const growth = { priceMonthly: { amountMinor: 999_900 }, priceYearly: { amountMinor: 9_999_000 } }
const starter = { priceMonthly: { amountMinor: 499_900 }, priceYearly: null }
const now = new Date('2026-10-03T06:00:00Z')

describe('manual subscription billing', () => {
  it('charges the plan price plus 18% GST', () => {
    expect(amountDueMinor(growth, 'monthly')).toBe(1_179_882)
    expect(amountDueMinor(starter, 'yearly')).toBe(withGstYear(499_900 * 12))
  })

  it('counts yearly plans as a twelfth of the year in MRR', () => {
    expect(monthlyRecurringMinor(growth, 'yearly')).toBe(833_250)
    expect(monthlyRecurringMinor(growth, 'monthly')).toBe(999_900)
  })

  it('becomes past due once a trial or period ends unpaid', () => {
    expect(effectiveStatus({ status: 'trialing', trialEndsAt: '2026-10-01T18:30:00Z' }, now)).toBe(
      'past_due',
    )
    expect(effectiveStatus({ status: 'trialing', trialEndsAt: '2026-10-16T18:30:00Z' }, now)).toBe(
      'trialing',
    )
    expect(
      effectiveStatus({ status: 'active', currentPeriodEnd: '2026-10-02T18:30:00Z' }, now),
    ).toBe('past_due')
    expect(
      effectiveStatus({ status: 'paused', currentPeriodEnd: '2026-01-01T00:00:00Z' }, now),
    ).toBe('paused')
  })

  it('a payment covers the next period from where the current one ends', () => {
    const cover = coverageFor(
      { status: 'active', billingCycle: 'monthly', currentPeriodEnd: '2026-09-30T18:30:00Z' },
      now,
    )
    expect(formatDate(cover.start)).toBe('1 Oct 2026')
    expect(formatDate(cover.end)).toBe('1 Nov 2026')
  })

  it('a paused subscription restarts from today', () => {
    const cover = coverageFor({ status: 'paused', currentPeriodEnd: '2026-01-01T00:00:00Z' }, now)
    expect(cover.start).toEqual(now)
  })

  it('summarises MRR, trials and money owed for the dashboard', () => {
    const summary = summarizeBilling(
      [
        {
          status: 'active',
          billingCycle: 'monthly',
          currentPeriodEnd: '2026-10-31T18:30:00Z',
          plan: growth,
        },
        {
          status: 'active',
          billingCycle: 'monthly',
          currentPeriodEnd: '2026-09-30T18:30:00Z',
          plan: starter,
        },
        { status: 'trialing', trialEndsAt: '2026-10-06T18:30:00Z', plan: starter },
        { status: 'cancelled', plan: growth },
      ],
      now,
    )
    expect(summary.mrrMinor).toBe(999_900 + 499_900)
    expect(summary.payingCount).toBe(2)
    expect(summary.pastDueCount).toBe(1)
    expect(summary.pastDueOutstandingMinor).toBe(589_882)
    expect(summary.trialCount).toBe(1)
    expect(summary.trialsEndingSoon).toBe(1)
    expect(summary.statusCounts).toMatchObject({
      active: 1,
      past_due: 1,
      trialing: 1,
      cancelled: 1,
    })
  })
})

function withGstYear(minor: number) {
  return minor + Math.floor((minor * 1800 + 5000) / 10000)
}
