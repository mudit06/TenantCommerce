import type { Payload } from 'payload'

import { idOf } from '@/access'
import { ordersPlacedByStore } from '@/modules/reports'
import type { Plan, Subscription, Tenant } from '@/payload-types'

import { INDUSTRIES, TENANT_STATUSES, USAGE_WARNING_RATIO } from '../constants'
import { effectiveStatus } from '../services/billing'

// All vendors (docs/screens/super-admin.md `sa-vendors`): every store with its plan, store and
// subscription status, products used against the plan and orders in the last 30 days. The
// platform has hundreds of stores at most, so they are read once and filtered here; the screen
// and its CSV export share this. Platform staff only: callers check the viewer.

export type VendorRow = {
  id: string
  name: string
  slug: string
  host: string | null
  industry: string
  industries: string[]
  planId: string | null
  planName: string
  status: Tenant['status']
  subscription: string | null
  products: number
  maxProducts: number | null
  /** At or above 90% of the plan's product limit (rule 2) */
  nearLimit: boolean
  orders30: number
  createdAt: string
  gstin: string | null
}

export type VendorFilters = {
  tab: string
  q: string
  plan: string
  industry: string
  subscription: string
}

export const INDUSTRY_LABEL = new Map<string, string>(INDUSTRIES.map((i) => [i.value, i.label]))

export function vendorFiltersFrom(params: URLSearchParams): VendorFilters {
  return {
    tab: params.get('tab') ?? 'all',
    q: (params.get('q') ?? '').trim().toLowerCase(),
    plan: params.get('plan') ?? '',
    industry: params.get('industry') ?? '',
    subscription: params.get('subscription') ?? '',
  }
}

export async function loadVendorRows(payload: Payload, filters: VendorFilters, now = new Date()) {
  const [{ docs: tenants }, { docs: subs }, { docs: domains }, { docs: plans }, orders] =
    await Promise.all([
      payload.find({
        collection: 'tenants',
        depth: 1,
        pagination: false,
        overrideAccess: true,
        sort: '-createdAt',
      }),
      payload.find({
        collection: 'subscriptions',
        depth: 0,
        pagination: false,
        overrideAccess: true,
      }),
      payload.find({
        collection: 'tenant-domains',
        where: { isPrimary: { equals: true } },
        depth: 0,
        pagination: false,
        overrideAccess: true,
        select: { tenant: true, host: true },
      }),
      payload.find({
        collection: 'plans',
        depth: 0,
        pagination: false,
        overrideAccess: true,
        sort: 'priceMonthly',
        select: { name: true },
      }),
      ordersPlacedByStore(payload, new Date(now.getTime() - 30 * 86_400_000)),
    ])

  const subOf = new Map<string, Subscription>()
  for (const sub of subs) {
    const id = idOf(sub.tenant)
    if (id) subOf.set(id, sub)
  }
  const hostOf = new Map(domains.map((d) => [idOf(d.tenant) ?? '', d.host]))

  const all: VendorRow[] = tenants.map((tenant) => {
    const id = String(tenant.id)
    const plan = typeof tenant.plan === 'object' ? (tenant.plan as Plan | null) : null
    const sub = subOf.get(id)
    const products = tenant.usage?.productsCount ?? 0
    const maxProducts = plan?.limits?.maxProducts ?? null
    return {
      id,
      name: tenant.name,
      slug: tenant.slug,
      host: hostOf.get(id) ?? null,
      industries: tenant.industry ?? [],
      industry: (tenant.industry ?? []).map((v) => INDUSTRY_LABEL.get(v) ?? v).join(', '),
      planId: plan ? String(plan.id) : null,
      planName: plan?.name ?? '—',
      status: tenant.status,
      subscription: sub ? effectiveStatus(sub, now) : null,
      products,
      maxProducts,
      nearLimit: Boolean(maxProducts && products / maxProducts >= USAGE_WARNING_RATIO),
      orders30: orders.get(id) ?? 0,
      createdAt: tenant.createdAt,
      gstin: tenant.gstin ?? null,
    }
  })

  // Tab counts follow the other filters, as on every list screen
  const matches = (row: VendorRow) =>
    (!filters.q ||
      [row.name, row.slug, row.gstin ?? '', row.host ?? ''].some((text) =>
        text.toLowerCase().includes(filters.q),
      )) &&
    (!filters.plan || row.planId === filters.plan) &&
    (!filters.industry || row.industries.includes(filters.industry)) &&
    (!filters.subscription ||
      (filters.subscription === 'none'
        ? !row.subscription
        : row.subscription === filters.subscription))
  const filtered = all.filter(matches)
  const counts: Record<string, number> = { all: filtered.length }
  for (const status of TENANT_STATUSES) {
    counts[status] = filtered.filter((row) => row.status === status).length
  }
  const rows =
    filters.tab === 'all' ? filtered : filtered.filter((row) => row.status === filters.tab)

  return {
    rows,
    counts,
    totals: {
      stores: all.length,
      live: all.filter((row) => row.status === 'active').length,
    },
    plans: plans.map((plan) => ({ value: String(plan.id), label: plan.name })),
  }
}
