import type { Payload } from 'payload'

import { idOf } from '@/access'
import { CONNECTOR_PROVIDERS } from '@/connectors'
import { monthRange, ordersPlacedByStore } from '@/modules/reports'
import { calendarDaysBetween, formatDateAndTime } from '@/lib/dates'
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

const PROVIDER_LABEL = new Map<string, string>(
  CONNECTOR_PROVIDERS.map((provider) => [provider.key, provider.label]),
)

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

/** `ordersThisMonth` is counted from the orders (reports module); there is no running counter. */
export function usageOf(tenant: Tenant, staff: number, ordersThisMonth: number): UsageNumbers {
  return {
    products: tenant.usage?.productsCount ?? 0,
    staff,
    storageBytes: tenant.usage?.storageBytes ?? 0,
    ordersThisMonth,
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
  recent: {
    tenant: Tenant
    planName: string
    subscriptionStatus: string | null
    invitedOwnerId: string | null
  }[]
  tenantById: Map<string, Tenant>
}

export async function loadPlatformDashboard(
  payload: Payload,
  now = new Date(),
): Promise<PlatformDashboardData> {
  const [
    { docs: tenants },
    { docs: subs },
    staff,
    { docs: invitedOwners },
    { docs: failing },
    { docs: templates },
    monthOrders,
  ] = await Promise.all([
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
    // Connectors whose webhooks are failing: payments may not be marked paid (rule 2)
    payload.find({
      collection: 'connector-configs',
      depth: 0,
      pagination: false,
      overrideAccess: true,
      where: {
        and: [
          { enabled: { equals: true } },
          { 'health.failingSince': { exists: true } },
          { 'health.failingSince': { not_equals: null } },
        ],
      },
      select: { tenant: true, provider: true, kind: true, health: true },
    }),
    // WhatsApp templates Meta rejected or paused: those messages stop going
    payload.find({
      collection: 'notification-templates',
      depth: 0,
      pagination: false,
      overrideAccess: true,
      where: { status: { in: ['rejected', 'paused'] } },
      select: {
        tenant: true,
        milestone: true,
        whatsapp: true,
        status: true,
        rejectionReason: true,
      },
    }),
    ordersPlacedByStore(payload, monthRange(null, now).from),
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
    for (const warning of limitWarnings(
      usageOf(tenant, staff.get(id) ?? 0, monthOrders.get(id) ?? 0),
      plan,
    )) {
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

  const tenantById = new Map(tenants.map((tenant) => [String(tenant.id), tenant]))
  for (const config of failing) {
    const tenant = tenantById.get(idOf(config.tenant) ?? '')
    if (!tenant || tenant.status === 'archived') continue
    const label = PROVIDER_LABEL.get(config.provider) ?? config.provider
    const since = config.health?.failingSince
    attention.push({
      tenantId: String(tenant.id),
      vendor: tenant.name,
      message: `${label} webhook failing${since ? ` since ${formatDateAndTime(since)}` : ''}${config.health?.lastError ? `: ${config.health.lastError}` : ''}`,
      tag:
        config.kind === 'payment'
          ? 'Payments'
          : config.kind === 'shipping'
            ? 'Shipping'
            : 'Messaging',
      tone: 'danger',
      tab: 'connectors',
    })
  }
  for (const template of templates) {
    const tenant = tenantById.get(idOf(template.tenant) ?? '')
    if (!tenant || tenant.status === 'archived') continue
    const name = template.whatsapp?.name ?? template.milestone
    attention.push({
      tenantId: String(tenant.id),
      vendor: tenant.name,
      message:
        template.status === 'paused'
          ? `Meta paused the WhatsApp “${name}” template`
          : `Meta rejected the WhatsApp “${name}” template${template.rejectionReason ? `: ${template.rejectionReason}` : ''}`,
      tag: 'Messaging',
      tone: 'warning',
      tab: 'connectors',
    })
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
    const invited = invitedOwners.find((owner) =>
      (owner.tenants ?? []).some(
        (row) => idOf(row.tenant) === String(tenant.id) && row.roles?.includes('owner'),
      ),
    )
    return {
      tenant,
      planName: typeof tenant.plan === 'object' && tenant.plan ? tenant.plan.name : '—',
      subscriptionStatus: sub ? effectiveStatus(sub, now) : null,
      invitedOwnerId: invited ? String(invited.id) : null,
    }
  })

  return { counts, liveTrialing, livePaying, billing, attention, recent, tenantById }
}
