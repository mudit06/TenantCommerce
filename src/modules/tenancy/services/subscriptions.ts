import type { PayloadRequest } from 'payload'

import { idOf, isSuperAdmin } from '@/access'
import { formatDate, startOfDay } from '@/lib/dates'
import { AppError } from '@/lib/errors'
import { formatINR } from '@/lib/money'
import { recordAudit } from '@/modules/audit'
import type { Plan, Subscription } from '@/payload-types'

import type { BillingCycle, PaymentMethod } from '../constants'
import { syncEnabledFeatures } from './featureSync'
import {
  coverageFor,
  effectiveStatus,
  lastCoveredDay,
  nextPaymentTerms,
  periodEnd,
  resumeState,
} from './billing'

type HistoryRow = NonNullable<Subscription['history']>[number]

const userId = (req: PayloadRequest) =>
  req.user && req.user.collection === 'users' ? req.user.id : undefined

const historyRow = (req: PayloadRequest, row: Omit<HistoryRow, 'at' | 'by'>): HistoryRow => ({
  at: new Date().toISOString(),
  by: userId(req),
  ...row,
})

function assertSuperAdmin(req: PayloadRequest) {
  if (req.user && !isSuperAdmin(req.user)) {
    throw new AppError('FORBIDDEN', 'Only super admins manage billing', 403)
  }
}

async function loadSubscription(req: PayloadRequest, id: string): Promise<Subscription> {
  const sub = await req.payload
    .findByID({ collection: 'subscriptions', id, depth: 1, overrideAccess: true, req })
    .catch(() => null)
  if (!sub) throw new AppError('NOT_FOUND', 'Subscription not found', 404)
  return sub
}

const planOf = (sub: Subscription): Plan => {
  if (!sub.plan || typeof sub.plan !== 'object') {
    throw new AppError('BUSINESS_RULE', 'Subscription has no plan loaded', 500)
  }
  return sub.plan
}

/** First subscription of a new store (onboarding). A trial of 0 days starts a paid period. */
export async function startSubscription(
  req: PayloadRequest,
  input: {
    tenantId: string
    vendorName: string
    planId: string
    trialDays: number
    billingCycle: BillingCycle
  },
): Promise<Subscription> {
  const now = new Date()
  const start = startOfDay(now)
  const trialEndsAt =
    input.trialDays > 0 ? new Date(start.getTime() + input.trialDays * 86_400_000) : null
  const end = trialEndsAt ?? periodEnd(start, input.billingCycle)
  return req.payload.create({
    collection: 'subscriptions',
    data: {
      tenant: input.tenantId,
      vendorName: input.vendorName,
      plan: input.planId,
      status: trialEndsAt ? 'trialing' : 'active',
      billingCycle: input.billingCycle,
      billingMode: 'manual',
      currentPeriodStart: start.toISOString(),
      currentPeriodEnd: end.toISOString(),
      trialEndsAt: trialEndsAt?.toISOString(),
      history: [
        historyRow(req, {
          event: trialEndsAt ? `Trial started, ${input.trialDays} days` : 'Subscription started',
        }),
      ],
    },
    overrideAccess: true,
    req,
  })
}

/**
 * Records a bank transfer or UPI payment (MVP manual billing). It covers the next period, so
 * the period moves forward and the status becomes active (docs/screens Vendor billing rule 3).
 */
export async function recordSubscriptionPayment(
  req: PayloadRequest,
  input: {
    subscriptionId: string
    amountMinor: number
    paidOn: Date
    method: PaymentMethod
    reference?: string
  },
): Promise<Subscription> {
  assertSuperAdmin(req)
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new AppError('VALIDATION_FAILED', 'Amount must be more than zero', 400, {
      amountMinor: 'Amount must be more than zero',
    })
  }
  const sub = await loadSubscription(req, input.subscriptionId)
  const now = new Date()
  const terms = nextPaymentTerms(sub, planOf(sub))
  const cover = coverageFor(sub, now, terms.months)
  const label = `${formatDate(cover.start)} to ${formatDate(lastCoveredDay(cover.end))}`
  const updated = await req.payload.update({
    collection: 'subscriptions',
    id: sub.id,
    data: {
      status: 'active',
      currentPeriodStart: cover.start.toISOString(),
      currentPeriodEnd: cover.end.toISOString(),
      payments: [
        ...(sub.payments ?? []),
        {
          amountMinor: input.amountMinor,
          paidOn: input.paidOn.toISOString(),
          method: input.method,
          reference: input.reference,
          coversPeriod: { start: cover.start.toISOString(), end: cover.end.toISOString() },
          recordedBy: userId(req),
        },
      ],
      history: [
        ...(sub.history ?? []),
        historyRow(req, {
          event: `Payment recorded${terms.isIntro ? ' (introductory offer)' : ''}, covers ${label}`,
          amountMinor: input.amountMinor,
          reference: [input.method.toUpperCase(), input.reference].filter(Boolean).join(' · '),
        }),
      ],
    },
    overrideAccess: true,
    req,
  })
  await recordAudit(req, {
    action: 'subscription_payment',
    tenant: idOf(sub.tenant),
    collectionSlug: 'subscriptions',
    docId: String(sub.id),
    summary: `Recorded ${formatINR(input.amountMinor)} covering ${label}`,
  })
  return updated
}

/**
 * Moves a store to another plan. Features the new plan doesn't allow are switched off; their
 * data stays (docs/screens Plans rule 3).
 */
export async function changeSubscriptionPlan(
  req: PayloadRequest,
  input: { subscriptionId: string; planId: string; billingCycle?: BillingCycle },
): Promise<Subscription> {
  assertSuperAdmin(req)
  const sub = await loadSubscription(req, input.subscriptionId)
  const from = planOf(sub)
  const to = await req.payload
    .findByID({ collection: 'plans', id: input.planId, depth: 0, overrideAccess: true, req })
    .catch(() => null)
  if (!to || !to.isActive) throw new AppError('NOT_FOUND', 'Plan not found or inactive', 404)
  const tenantId = idOf(sub.tenant)
  if (!tenantId) throw new AppError('BUSINESS_RULE', 'Subscription has no store', 500)

  const updated = await req.payload.update({
    collection: 'subscriptions',
    id: sub.id,
    data: {
      plan: to.id,
      billingCycle: input.billingCycle ?? sub.billingCycle,
      history: [
        ...(sub.history ?? []),
        historyRow(req, { event: `Plan changed, ${from.name} to ${to.name}` }),
      ],
    },
    overrideAccess: true,
    req,
  })
  await req.payload.update({
    collection: 'tenants',
    id: tenantId,
    data: { plan: to.id },
    overrideAccess: true,
    req,
  })
  const lost = ((from.allowedModules ?? []) as string[]).filter(
    (key) => !((to.allowedModules ?? []) as string[]).includes(key),
  )
  if (lost.length > 0) {
    // Scoped to this store: only its own flags are touched
    const { docs: flags } = await req.payload.find({
      collection: 'feature-flags',
      where: {
        and: [
          { tenant: { equals: tenantId } },
          { key: { in: lost } },
          { enabled: { equals: true } },
        ],
      },
      depth: 0,
      pagination: false,
      overrideAccess: true,
      req,
    })
    for (const flag of flags) {
      await req.payload.update({
        collection: 'feature-flags',
        id: flag.id,
        data: { enabled: false },
        overrideAccess: true,
        req,
      })
    }
  }
  await syncEnabledFeatures(req, tenantId)
  await recordAudit(req, {
    action: 'plan_changed',
    tenant: tenantId,
    collectionSlug: 'subscriptions',
    docId: String(sub.id),
    summary: `Plan changed from ${from.name} to ${to.name}`,
  })
  return updated
}

export type SubscriptionAction = 'pause' | 'resume' | 'cancel'

/** Pause, resume or cancel. Suspending the store itself stays a separate decision. */
export async function changeSubscriptionStatus(
  req: PayloadRequest,
  input: { subscriptionId: string; action: SubscriptionAction; reason?: string },
): Promise<Subscription> {
  assertSuperAdmin(req)
  const sub = await loadSubscription(req, input.subscriptionId)
  const now = new Date()
  const current = effectiveStatus(sub, now)
  const allowed: Record<SubscriptionAction, readonly string[]> = {
    pause: ['trialing', 'active', 'past_due'],
    resume: ['paused'],
    cancel: ['trialing', 'active', 'past_due', 'paused'],
  }
  if (!allowed[input.action].includes(current)) {
    throw new AppError(
      'INVALID_TRANSITION',
      `Cannot ${input.action} a ${current.replace('_', ' ')} subscription`,
      409,
    )
  }
  // Resuming returns to the trial or the paid period still running, else past due from today
  const data: Partial<Subscription> =
    input.action === 'resume'
      ? (resumeState(sub, now, startOfDay(now)) as Partial<Subscription>)
      : { status: input.action === 'pause' ? 'paused' : 'cancelled' }
  const event = { pause: 'Paused', resume: 'Resumed', cancel: 'Cancelled' }[input.action]
  const updated = await req.payload.update({
    collection: 'subscriptions',
    id: sub.id,
    data: {
      ...data,
      history: [
        ...(sub.history ?? []),
        historyRow(req, { event: input.reason ? `${event}: ${input.reason}` : event }),
      ],
    },
    overrideAccess: true,
    req,
  })
  await recordAudit(req, {
    action: 'subscription_status_changed',
    tenant: idOf(sub.tenant),
    collectionSlug: 'subscriptions',
    docId: String(sub.id),
    summary: `${event} the subscription`,
    reason: input.reason,
  })
  return updated
}

/** Daily job: store "past due" on periods that ended unpaid. Returns how many changed. */
export async function refreshSubscriptionStatuses(
  req: PayloadRequest,
  now = new Date(),
): Promise<number> {
  const { docs } = await req.payload.find({
    collection: 'subscriptions',
    where: { status: { in: ['trialing', 'active'] } },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  let changed = 0
  for (const sub of docs) {
    if (effectiveStatus(sub, now) !== 'past_due') continue
    await req.payload.update({
      collection: 'subscriptions',
      id: sub.id,
      data: {
        status: 'past_due',
        history: [
          ...(sub.history ?? []),
          historyRow(req, {
            event:
              sub.status === 'trialing'
                ? 'Trial ended unpaid, past due'
                : 'Period ended unpaid, past due',
          }),
        ],
      },
      overrideAccess: true,
      req,
    })
    changed += 1
  }
  return changed
}
