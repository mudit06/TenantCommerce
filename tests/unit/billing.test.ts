import { describe, expect, it } from 'vitest'

import {
  amountDueMinor,
  coverageFor,
  effectiveStatus,
  monthlyRecurringMinor,
  nextPaymentTerms,
  resumeState,
  summarizeBilling,
} from '@/modules/tenancy/services/billing'
import { formatDate } from '@/lib/dates'

const plan9999 = { priceMonthly: { amountMinor: 999_900 }, priceYearly: { amountMinor: 9_999_000 } }
const plan4999 = { priceMonthly: { amountMinor: 499_900 }, priceYearly: null }
const now = new Date('2026-10-03T06:00:00Z')

describe('manual subscription billing', () => {
  it('charges the plan price plus 18% GST', () => {
    expect(amountDueMinor(plan9999, 'monthly')).toBe(1_179_882)
    expect(amountDueMinor(plan4999, 'yearly')).toBe(withGstYear(499_900 * 12))
  })

  it('counts yearly plans as a twelfth of the year in MRR', () => {
    expect(monthlyRecurringMinor(plan9999, 'yearly')).toBe(833_250)
    expect(monthlyRecurringMinor(plan9999, 'monthly')).toBe(999_900)
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

  it('resuming returns to the trial or the running period, else past due from today', () => {
    const today = new Date('2026-10-02T18:30:00Z')
    // Paused during a trial that hasn't ended (QA SA-32: it used to become past due at once)
    expect(
      resumeState(
        {
          status: 'paused',
          trialEndsAt: '2026-10-16T18:30:00Z',
          currentPeriodEnd: '2026-10-16T18:30:00Z',
        },
        now,
        today,
      ),
    ).toEqual({ status: 'trialing' })
    // A period that still covers today carries on unchanged
    expect(
      resumeState(
        { status: 'paused', payments: [{}], currentPeriodEnd: '2026-11-01T18:30:00Z' },
        now,
        today,
      ),
    ).toEqual({ status: 'active' })
    // Ended while paused: past due from today, never an end before its start
    const ended = resumeState(
      {
        status: 'paused',
        payments: [{}],
        currentPeriodStart: '2026-08-01T18:30:00Z',
        currentPeriodEnd: '2026-09-01T18:30:00Z',
      },
      now,
      today,
    )
    expect(ended).toEqual({
      status: 'past_due',
      currentPeriodStart: '2026-08-01T18:30:00.000Z',
      currentPeriodEnd: today.toISOString(),
    })
    // The next payment then covers today onwards, not the paused weeks
    expect(coverageFor({ ...ended, billingCycle: 'monthly' }, now).start).toEqual(today)
  })

  it('the first payment takes the starting offer, later ones the monthly price', () => {
    const starter = {
      priceMonthly: { amountMinor: 349_900 },
      introOffer: { price: { amountMinor: 999_900 }, months: 3 },
    }
    const first = nextPaymentTerms({ status: 'trialing', payments: [] }, starter)
    expect(first).toEqual({ isIntro: true, months: 3, priceMinor: 999_900, dueMinor: 1_179_882 })
    const later = nextPaymentTerms({ status: 'active', payments: [{}] }, starter)
    expect(later).toEqual({ isIntro: false, months: 1, priceMinor: 349_900, dueMinor: 412_882 })
    const cover = coverageFor(
      {
        status: 'trialing',
        trialEndsAt: '2026-10-16T18:30:00Z',
        currentPeriodEnd: '2026-10-16T18:30:00Z',
      },
      now,
      first.months,
    )
    expect(formatDate(cover.start)).toBe('17 Oct 2026')
    expect(formatDate(cover.end)).toBe('17 Jan 2027')
  })

  it('a plan without an offer bills one period from the first payment', () => {
    expect(nextPaymentTerms({ status: 'trialing', payments: [] }, plan9999).isIntro).toBe(false)
  })

  it('summarises MRR, trials and money owed for the dashboard', () => {
    const summary = summarizeBilling(
      [
        {
          status: 'active',
          billingCycle: 'monthly',
          currentPeriodEnd: '2026-10-31T18:30:00Z',
          plan: plan9999,
        },
        {
          status: 'active',
          billingCycle: 'monthly',
          currentPeriodEnd: '2026-09-30T18:30:00Z',
          plan: plan4999,
        },
        { status: 'trialing', trialEndsAt: '2026-10-06T18:30:00Z', plan: plan4999 },
        { status: 'cancelled', plan: plan9999 },
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
