import type { Payload } from 'payload'

import { idOf } from '@/access'
import { formatDate } from '@/lib/dates'

import type { SubscriptionStatus } from '../constants'
import {
  effectiveStatus,
  lastCoveredDay,
  nextPaymentTerms,
  summarizeBilling,
} from '../services/billing'

// Subscriptions (docs/screens/super-admin.md `sa-subscriptions`): every vendor's subscription
// with its status as of today, what the next payment is and when the last one came. Shared by
// the screen and its CSV export; platform staff only (callers check).

export type SubscriptionRow = {
  id: string
  tenantId: string | null
  vendor: string
  plan: string
  status: SubscriptionStatus
  billingMode: string
  periodEnds: string
  /** The next payment including GST (the starting offer while it applies) */
  dueMinor: number | null
  lastPayment: string | null
}

export async function loadSubscriptionRows(payload: Payload, tab: string, now = new Date()) {
  const { docs } = await payload.find({
    collection: 'subscriptions',
    depth: 1,
    pagination: false,
    overrideAccess: true,
    sort: 'vendorName',
  })
  const subs = docs.map((sub) => ({ ...sub, plan: typeof sub.plan === 'object' ? sub.plan : null }))
  const summary = summarizeBilling(subs, now)
  const all: SubscriptionRow[] = subs.map((sub) => {
    const status = effectiveStatus(sub, now)
    const last = [...(sub.payments ?? [])].sort((a, b) => b.paidOn.localeCompare(a.paidOn))[0]
    const stopped = status === 'paused' || status === 'cancelled'
    return {
      id: String(sub.id),
      tenantId: idOf(sub.tenant),
      vendor: sub.vendorName ?? '—',
      plan: sub.plan?.name ?? '—',
      status,
      billingMode: stopped ? '—' : sub.billingMode === 'razorpay' ? 'Razorpay' : 'Manual',
      periodEnds: stopped
        ? '—'
        : sub.status === 'trialing' && sub.trialEndsAt
          ? `Trial ends ${formatDate(sub.trialEndsAt)}`
          : sub.currentPeriodEnd
            ? formatDate(lastCoveredDay(new Date(sub.currentPeriodEnd)))
            : '—',
      dueMinor: stopped || !sub.plan ? null : nextPaymentTerms(sub, sub.plan).dueMinor,
      lastPayment: last ? formatDate(last.paidOn) : null,
    }
  })
  // Past due first: the billing desk's work
  const order: Record<SubscriptionStatus, number> = {
    past_due: 0,
    trialing: 1,
    active: 2,
    paused: 3,
    cancelled: 4,
  }
  all.sort((a, b) => order[a.status] - order[b.status] || a.vendor.localeCompare(b.vendor))
  return {
    summary,
    rows: tab === 'all' ? all : all.filter((row) => row.status === tab),
    total: all.length,
  }
}
