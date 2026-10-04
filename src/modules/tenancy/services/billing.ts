import { addDays, addMonths, DEFAULT_TIMEZONE } from '@/lib/dates'
import { withGst } from '@/lib/money'

import type { BillingCycle, SubscriptionStatus } from '../constants'

// Pure billing maths for manual subscriptions (no database), so it is unit tested directly.

type PlanPrices = {
  priceMonthly: { amountMinor?: number | null }
  priceYearly?: { amountMinor?: number | null } | null
  /** Optional starting offer: the first payment covers `months` at `price` (before GST). */
  introOffer?: { price?: { amountMinor?: number | null } | null; months?: number | null } | null
}

export type SubscriptionLike = {
  status: SubscriptionStatus
  billingCycle?: BillingCycle | null
  currentPeriodStart?: string | Date | null
  currentPeriodEnd?: string | Date | null
  trialEndsAt?: string | Date | null
  payments?: readonly unknown[] | null
}

const toDate = (value: string | Date | null | undefined) => (value ? new Date(value) : null)

export function periodEnd(start: Date, cycle: BillingCycle, timeZone = DEFAULT_TIMEZONE): Date {
  return addMonths(start, cycle === 'yearly' ? 12 : 1, timeZone)
}

/** Price for one billing period, before GST, in paise. */
export function planPriceMinor(plan: PlanPrices, cycle: BillingCycle): number {
  const monthly = plan.priceMonthly.amountMinor ?? 0
  if (cycle === 'monthly') return monthly
  return plan.priceYearly?.amountMinor ?? monthly * 12
}

/** What one period costs the vendor: plan price plus 18% GST. */
export const amountDueMinor = (plan: PlanPrices, cycle: BillingCycle) =>
  withGst(planPriceMinor(plan, cycle))

/** Contribution to MRR (before GST): yearly plans count a twelfth. */
export function monthlyRecurringMinor(plan: PlanPrices, cycle: BillingCycle): number {
  return cycle === 'yearly'
    ? Math.round(planPriceMinor(plan, 'yearly') / 12)
    : planPriceMinor(plan, 'monthly')
}

/**
 * The status a subscription has at `now`. A trial or paid period that ended unpaid is past due
 * from the next day on (docs/screens Subscriptions rule 2); the daily job stores it, and screens
 * use this so they are right even between job runs.
 */
export function effectiveStatus(sub: SubscriptionLike, now: Date): SubscriptionStatus {
  if (sub.status === 'trialing') {
    const trialEnd = toDate(sub.trialEndsAt)
    return trialEnd && trialEnd <= now ? 'past_due' : 'trialing'
  }
  if (sub.status === 'active') {
    const end = toDate(sub.currentPeriodEnd)
    return end && end <= now ? 'past_due' : 'active'
  }
  return sub.status
}

/**
 * Where the next recorded payment's period starts: the end of the current period (paying ahead
 * or catching up), or today when a paused or cancelled subscription restarts.
 */
export function nextCoverageStart(sub: SubscriptionLike, now: Date): Date {
  if (sub.status === 'paused' || sub.status === 'cancelled') return now
  return toDate(sub.currentPeriodEnd) ?? toDate(sub.trialEndsAt) ?? now
}

/**
 * What a paused subscription returns to when it is resumed. A trial that hasn't ended carries on,
 * and so does a paid period that still covers today. Otherwise the subscription is past due from
 * today: the period is closed at the start of today, so the next payment covers today onwards and
 * the paused weeks are never billed.
 */
export function resumeState(
  sub: SubscriptionLike,
  now: Date,
  startOfToday: Date,
): Pick<SubscriptionLike, 'status' | 'currentPeriodStart' | 'currentPeriodEnd'> {
  const trialEnd = toDate(sub.trialEndsAt)
  const hasPaid = (sub.payments?.length ?? 0) > 0
  if (!hasPaid && trialEnd && trialEnd > now) return { status: 'trialing' }
  const end = toDate(sub.currentPeriodEnd)
  if (end && end > now) return { status: 'active' }
  const start = toDate(sub.currentPeriodStart)
  return {
    status: 'past_due',
    currentPeriodStart: (start && start < startOfToday ? start : startOfToday).toISOString(),
    currentPeriodEnd: startOfToday.toISOString(),
  }
}

export type PaymentTerms = {
  /** True when this payment takes the plan's introductory offer. */
  isIntro: boolean
  months: number
  /** Before GST */
  priceMinor: number
  /** Plus 18% GST: what the vendor pays */
  dueMinor: number
}

/**
 * What the next payment costs and how long it covers. A subscription's first payment takes the
 * plan's introductory offer when it has one (for example ₹9,999 for 3 months); after that each
 * payment covers one billing period at the plan price.
 */
export function nextPaymentTerms(sub: SubscriptionLike, plan: PlanPrices): PaymentTerms {
  const introPrice = plan.introOffer?.price?.amountMinor
  const introMonths = plan.introOffer?.months
  if ((sub.payments?.length ?? 0) === 0 && introPrice && introMonths) {
    return {
      isIntro: true,
      months: introMonths,
      priceMinor: introPrice,
      dueMinor: withGst(introPrice),
    }
  }
  const cycle = sub.billingCycle ?? 'monthly'
  return {
    isIntro: false,
    months: cycle === 'yearly' ? 12 : 1,
    priceMinor: planPriceMinor(plan, cycle),
    dueMinor: amountDueMinor(plan, cycle),
  }
}

export function coverageFor(
  sub: SubscriptionLike,
  now: Date,
  months = sub.billingCycle === 'yearly' ? 12 : 1,
  timeZone = DEFAULT_TIMEZONE,
) {
  const start = nextCoverageStart(sub, now)
  return { start, end: addMonths(start, months, timeZone) }
}

/** The last day a period covers, for "1 Oct to 31 Oct 2026" (period ends are exclusive). */
export const lastCoveredDay = (end: Date, timeZone = DEFAULT_TIMEZONE) => addDays(end, -1, timeZone)

export type SubscriptionWithPlan = SubscriptionLike & { plan: PlanPrices | null }

export type BillingSummary = {
  mrrMinor: number
  payingCount: number
  trialCount: number
  trialsEndingSoon: number
  pastDueCount: number
  pastDueOutstandingMinor: number
  renewingSoonCount: number
  renewingSoonMinor: number
  statusCounts: Record<SubscriptionStatus, number>
}

/** Figures for the platform dashboard and the Subscriptions page. "Soon" means 7 days. */
export function summarizeBilling(subs: readonly SubscriptionWithPlan[], now: Date): BillingSummary {
  const soon = addDays(now, 7)
  const summary: BillingSummary = {
    mrrMinor: 0,
    payingCount: 0,
    trialCount: 0,
    trialsEndingSoon: 0,
    pastDueCount: 0,
    pastDueOutstandingMinor: 0,
    renewingSoonCount: 0,
    renewingSoonMinor: 0,
    statusCounts: { trialing: 0, active: 0, past_due: 0, cancelled: 0, paused: 0 },
  }
  for (const sub of subs) {
    const status = effectiveStatus(sub, now)
    const cycle = sub.billingCycle ?? 'monthly'
    summary.statusCounts[status] += 1
    if (!sub.plan) continue
    if (status === 'active' || status === 'past_due') {
      summary.payingCount += 1
      summary.mrrMinor += monthlyRecurringMinor(sub.plan, cycle)
    }
    if (status === 'past_due') {
      summary.pastDueCount += 1
      summary.pastDueOutstandingMinor += nextPaymentTerms(sub, sub.plan).dueMinor
    }
    if (status === 'trialing') {
      summary.trialCount += 1
      const trialEnd = toDate(sub.trialEndsAt)
      if (trialEnd && trialEnd <= soon) summary.trialsEndingSoon += 1
    }
    if (status === 'active') {
      const end = toDate(sub.currentPeriodEnd)
      if (end && end <= soon) {
        summary.renewingSoonCount += 1
        summary.renewingSoonMinor += nextPaymentTerms(sub, sub.plan).dueMinor
      }
    }
  }
  return summary
}
