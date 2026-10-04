import type { Payload } from 'payload'

import { idOf } from '@/access'
import { calendarDaysBetween } from '@/lib/dates'
import type { Plan, Subscription, Tenant } from '@/payload-types'

import { USAGE_WARNING_RATIO } from '../constants'
import { effectiveStatus, summarizeBilling, type BillingSummary } from '../services/billing'

// Server-side loaders for the platform panel's custom screens. Platform-wide reads use
// overrideAccess, so every caller checks the viewer is platform staff first.

export type AttentionItem = {
  tenantId: string
  vendor: string
  message: string
  tag: string
  tone: 'danger' | 'warning' | 'info'
  tab?: 'billing' | 'staff' | 'connectors' | 'domains'
}

export type StaffCounts = Map<string, number>

export async function staffCountsByTenant(payload: Payload): Promise<StaffCounts> {
  const { docs } = await payload.find({
    collection: 'users',
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { tenants: true },
  })
  const counts: StaffCounts = new Map()
  for (const user of docs) {
    for (const row of user.tenants ?? []) {
      const id = idOf(row.tenant)
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1)
    }
  }
  return counts
}

export type UsageNumbers = {
  products: number
  staff: number
  storageBytes: number
  ordersThisMonth: number
}

export function usageOf(tenant: Tenant, staff: number): UsageNumbers {
  return {
    products: tenant.usage?.productsCount ?? 0,
    staff,
    storageBytes: tenant.usage?.storageBytes ?? 0,
    ordersThisMonth: tenant.usage?.ordersThisMonth ?? 0,
  }
}

/** Limits a store is at or above 90% of (docs/screens All vendors rule 2). */
export function limitWarnings(usage: UsageNumbers, plan: Plan | null): string[] {
  if (!plan?.limits) return []
  const checks: [string, number, number | null | undefined][] = [
    ['products', usage.products, plan.limits.maxProducts],
    ['staff users', usage.staff, plan.limits.maxStaffUsers],
    ['GB storage', usage.storageBytes / 1024 ** 3, plan.limits.maxStorageGB],
    ['orders this month', usage.ordersThisMonth, plan.limits.maxOrdersPerMonth],
  ]
  return checks
    .filter(([, used, limit]) => limit && used / limit >= USAGE_WARNING_RATIO)
    .map(([label, used, limit]) => {
      const percent = Math.round((used / (limit as number)) * 100)
      return `${Math.round(used).toLocaleString('en-IN')} of ${(limit as number).toLocaleString('en-IN')} ${label} used (${percent}%)`
    })
}

export type PlatformDashboardData = {
  counts: { all: number; active: number; draft: number; suspended: number; archived: number }
  liveTrialing: number
  livePaying: number
  billing: BillingSummary
  attention: AttentionItem[]
  recent: { tenant: Tenant; planName: string; subscriptionStatus: string | null }[]
}

export async function loadPlatformDashboard(
  payload: Payload,
  now = new Date(),
): Promise<PlatformDashboardData> {
  const [{ docs: tenants }, { docs: subs }, staff, { docs: invitedOwners }] = await Promise.all([
    payload.find({
      collection: 'tenants',
      depth: 1,
      pagination: false,
      overrideAccess: true,
      sort: '-createdAt',
    }),
    payload.find({
      collection: 'subscriptions',
      depth: 1,
      pagination: false,
      overrideAccess: true,
    }),
    staffCountsByTenant(payload),
    payload.find({
      collection: 'users',
      depth: 0,
      pagination: false,
      overrideAccess: true,
      where: { and: [{ status: { equals: 'invited' } }, { 'tenants.roles': { in: ['owner'] } }] },
    }),
  ])

  const subByTenant = new Map<string, Subscription>()
  for (const sub of subs) {
    const id = idOf(sub.tenant)
    if (id) subByTenant.set(id, sub)
  }

  const counts = { all: tenants.length, active: 0, draft: 0, suspended: 0, archived: 0 }
  let liveTrialing = 0
  let livePaying = 0
  const attention: AttentionItem[] = []

  for (const tenant of tenants) {
    counts[tenant.status] += 1
    const id = String(tenant.id)
    const sub = subByTenant.get(id)
    const status = sub ? effectiveStatus(sub, now) : null
    if (tenant.status === 'active') {
      if (status === 'trialing') liveTrialing += 1
      if (status === 'active' || status === 'past_due') livePaying += 1
    }
    if (tenant.status === 'archived') continue

    if (sub && status === 'past_due') {
      const since = sub.status === 'trialing' ? sub.trialEndsAt : sub.currentPeriodEnd
      const days = since ? Math.max(1, calendarDaysBetween(new Date(since), now)) : 0
      attention.push({
        tenantId: id,
        vendor: tenant.name,
        message: `Subscription past due for ${days} day${days === 1 ? '' : 's'}`,
        tag: 'Billing',
        tone: 'danger',
        tab: 'billing',
      })
    }
    if (sub && status === 'trialing' && sub.trialEndsAt) {
      const days = calendarDaysBetween(now, new Date(sub.trialEndsAt))
      if (days <= 7) {
        attention.push({
          tenantId: id,
          vendor: tenant.name,
          message:
            days <= 0 ? 'Trial ends today' : `Trial ends in ${days} day${days === 1 ? '' : 's'}`,
          tag: 'Trial',
          tone: 'warning',
          tab: 'billing',
        })
      }
    }
    const plan = typeof tenant.plan === 'object' ? tenant.plan : null
    for (const warning of limitWarnings(usageOf(tenant, staff.get(id) ?? 0), plan)) {
      attention.push({
        tenantId: id,
        vendor: tenant.name,
        message: warning,
        tag: 'Limit',
        tone: 'warning',
      })
    }
    if (tenant.status === 'draft') {
      attention.push({
        tenantId: id,
        vendor: tenant.name,
        message: 'Store is still a draft. Go live when it is ready',
        tag: 'Draft',
        tone: 'info',
      })
    }
  }

  for (const owner of invitedOwners) {
    for (const row of owner.tenants ?? []) {
      if (!row.roles?.includes('owner')) continue
      const tenant = tenants.find((t) => String(t.id) === idOf(row.tenant))
      if (!tenant || tenant.status === 'archived') continue
      attention.push({
        tenantId: String(tenant.id),
        vendor: tenant.name,
        message: `Owner ${owner.email} has not accepted the invite`,
        tag: 'Invite',
        tone: 'info',
        tab: 'staff',
      })
    }
  }

  const billing = summarizeBilling(
    subs.map((sub) => ({ ...sub, plan: typeof sub.plan === 'object' ? sub.plan : null })),
    now,
  )
  const order = { danger: 0, warning: 1, info: 2 }
  attention.sort((a, b) => order[a.tone] - order[b.tone])

  const recent = tenants.slice(0, 5).map((tenant) => {
    const sub = subByTenant.get(String(tenant.id))
    return {
      tenant,
      planName: typeof tenant.plan === 'object' && tenant.plan ? tenant.plan.name : '—',
      subscriptionStatus: sub ? effectiveStatus(sub, now) : null,
    }
  })

  return { counts, liveTrialing, livePaying, billing, attention, recent }
}
