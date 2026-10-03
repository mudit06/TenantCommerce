import type { Payload } from 'payload'

import { formatDate, formatDateWithWeekday } from '@/lib/dates'
import type { Subscription } from '@/payload-types'

import {
  amountDueMinor,
  coverageFor,
  effectiveStatus,
  lastCoveredDay,
  planPriceMinor,
} from '../services/billing'

export type BillingPanelData = {
  subscription: {
    id: string
    status: string
    planId: string
    planName: string
    billingCycle: 'monthly' | 'yearly'
    billingMode: string
    priceMinor: number
    dueMinor: number
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
  const cover = coverageFor(sub, now)
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
      dueMinor: amountDueMinor(plan, cycle),
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
