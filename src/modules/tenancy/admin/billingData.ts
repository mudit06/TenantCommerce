import type { Payload } from 'payload'

import { formatDate, formatDateWithWeekday } from '@/lib/dates'
import type { Subscription } from '@/payload-types'

import { formatINR } from '@/lib/money'

import {
  amountDueMinor,
  coverageFor,
  effectiveStatus,
  lastCoveredDay,
  nextPaymentTerms,
  planPriceMinor,
} from '../services/billing'

export type BillingPanelData = {
  subscription: {
    id: string
    status: string
    planId: string
    planName: string
    billingCycle: 'monthly' | 'yearly'
    /** The plan's starting offer, while the subscription has not used it yet */
    introLabel: string | null
    /** Next payment: plus GST, and whether it is the starting offer */
    nextIsIntro: boolean
    billingMode: string
    /** Plan price for one billing period, before GST */
    priceMinor: number
    /** Plan price plus GST */
    planDueMinor: number
    /** What the next payment should be, plus GST (the starting offer while it applies) */
    nextDueMinor: number
    periodLabel: string | null
    nextRenewalLabel: string | null
    trialEndsLabel: string | null
    nextCoverLabel: string
    nextCoverMonth: string
  }
  plans: { id: string; name: string; priceMonthlyMinor: number }[]
  history: {
    at: string
    event: string
    amountMinor: number | null
    reference: string | null
    by: string | null
  }[]
}

export async function loadBillingPanel(
  payload: Payload,
  sub: Subscription,
): Promise<BillingPanelData | null> {
  const plan = typeof sub.plan === 'object' ? sub.plan : null
  if (!plan) return null
  const now = new Date()
  const cycle = sub.billingCycle ?? 'monthly'
  const terms = nextPaymentTerms(sub, plan)
  const cover = coverageFor(sub, now, terms.months)
  const [{ docs: plans }, users] = await Promise.all([
    payload.find({
      collection: 'plans',
      where: { isActive: { equals: true } },
      sort: 'sortOrder',
      depth: 0,
      pagination: false,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'users',
      where: {
        id: {
          in: (sub.history ?? [])
            .map((row) => (typeof row.by === 'object' ? row.by?.id : row.by))
            .filter(Boolean),
        },
      },
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { name: true },
    }),
  ])
  const nameOf = new Map(users.docs.map((user) => [String(user.id), user.name]))
  return {
    subscription: {
      id: String(sub.id),
      status: effectiveStatus(sub, now),
      planId: String(plan.id),
      planName: plan.name,
      billingCycle: cycle,
      billingMode: sub.billingMode,
      priceMinor: planPriceMinor(plan, cycle),
      planDueMinor: amountDueMinor(plan, cycle),
      nextDueMinor: terms.dueMinor,
      nextIsIntro: terms.isIntro,
      introLabel: terms.isIntro
        ? `${formatINR(terms.priceMinor)} + GST = ${formatINR(terms.dueMinor, { decimals: 'always' })} for the first ${terms.months} months, then the plan price`
        : null,
      periodLabel:
        sub.currentPeriodStart && sub.currentPeriodEnd && sub.status !== 'trialing'
          ? `${formatDate(sub.currentPeriodStart)} to ${formatDate(lastCoveredDay(new Date(sub.currentPeriodEnd)))}`
          : null,
      nextRenewalLabel:
        sub.currentPeriodEnd && sub.status === 'active'
          ? formatDateWithWeekday(sub.currentPeriodEnd)
          : null,
      trialEndsLabel:
        sub.trialEndsAt && sub.status === 'trialing'
          ? formatDateWithWeekday(sub.trialEndsAt)
          : null,
      nextCoverLabel: `${formatDate(cover.start)} to ${formatDate(lastCoveredDay(cover.end))}`,
      nextCoverMonth: new Intl.DateTimeFormat('en-IN', {
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      }).format(cover.start),
    },
    plans: plans.map((p) => ({
      id: String(p.id),
      name: p.name,
      priceMonthlyMinor: p.priceMonthly?.amountMinor ?? 0,
    })),
    history: [...(sub.history ?? [])]
      .sort((a, b) => b.at.localeCompare(a.at))
      .map((row) => {
        const byId = typeof row.by === 'object' ? row.by?.id : row.by
        return {
          at: row.at,
          event: row.event,
          amountMinor: row.amountMinor ?? null,
          reference: row.reference ?? null,
          by: byId ? (nameOf.get(String(byId)) ?? null) : null,
        }
      }),
  }
}
