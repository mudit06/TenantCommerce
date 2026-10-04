import type { CollectionSlug, Payload, Where } from 'payload'

import type { TenantRole } from '@/access'
import { adminUrl } from '@/admin/paths'
import type { Tone } from '@/admin/ui'
import type { IconName } from '@/admin/ui/icons'
import { addDays, calendarDaysBetween, formatDate, formatDayMonth, startOfDay } from '@/lib/dates'
import { effectiveStatus } from '@/modules/tenancy'
import type { Enquiry, Variant } from '@/payload-types'

// Data for the store dashboard's wireframe cards (docs/screens/vendor-cms.md `cms-dashboard`):
// enquiries, stock, and what needs the person's attention. Every read has an explicit tenant
// filter (docs/04); StoreHome decides what each role sees.

const IST_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' })
const dayKey = (date: Date | string) => IST_DAY.format(new Date(date))

const inStore = (tenantId: string, ...extra: Where[]): Where => ({
  and: [{ tenant: { equals: tenantId } }, ...extra],
})

const count = async (payload: Payload, collection: CollectionSlug, where: Where) =>
  (await payload.count({ collection, where, overrideAccess: true })).totalDocs

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n.toLocaleString('en-IN')} ${n === 1 ? one : many}`

// ---- Enquiries ---------------------------------------------------------------------------

export type EnquirySummary = {
  newCount: number
  newQuotes: number
  inProgress: number
  assignedToMe: number
  waitingOverADay: number
  latest: Enquiry[]
  oldestNew: Enquiry | null
  /** New enquiries per day for the last 14 days on the IST calendar, oldest first */
  daily: { label: string; count: number }[]
}

export async function loadEnquirySummary(
  payload: Payload,
  tenantId: string,
  userId: string,
  now: Date,
): Promise<EnquirySummary> {
  const n = (...extra: Where[]) => count(payload, 'enquiries', inStore(tenantId, ...extra))
  const isNew: Where = { status: { equals: 'new' } }
  const firstDay = addDays(startOfDay(now), -13)
  const dayAgo = new Date(now.getTime() - 86_400_000).toISOString()

  const [newCount, newQuotes, inProgress, assignedToMe, waitingOverADay, latest, oldest, recent] =
    await Promise.all([
      n(isNew),
      n(isNew, { type: { in: ['bulk', 'project'] } }),
      n({ status: { in: ['contacted', 'quoted'] } }),
      n({ status: { in: ['new', 'contacted', 'quoted'] } }, { assignedTo: { equals: userId } }),
      n(isNew, { createdAt: { less_than: dayAgo } }),
      payload.find({
        collection: 'enquiries',
        where: inStore(tenantId, isNew),
        sort: '-createdAt',
        limit: 4,
        depth: 0,
        overrideAccess: true,
      }),
      payload.find({
        collection: 'enquiries',
        where: inStore(tenantId, isNew),
        sort: 'createdAt',
        limit: 1,
        depth: 0,
        overrideAccess: true,
      }),
      payload.find({
        collection: 'enquiries',
        where: inStore(tenantId, { createdAt: { greater_than_equal: firstDay.toISOString() } }),
        select: { createdAt: true },
        depth: 0,
        pagination: false,
        overrideAccess: true,
      }),
    ])

  const perDay = new Map<string, number>()
  for (const doc of recent.docs) {
    const key = dayKey(doc.createdAt)
    perDay.set(key, (perDay.get(key) ?? 0) + 1)
  }
  const daily = Array.from({ length: 14 }, (_, index) => {
    const day = addDays(firstDay, index)
    return { label: formatDayMonth(day), count: perDay.get(dayKey(day)) ?? 0 }
  })

  return {
    newCount,
    newQuotes,
    inProgress,
    assignedToMe,
    waitingOverADay,
    latest: latest.docs,
    oldestNew: oldest.docs[0] ?? null,
    daily,
  }
}

// ---- Catalog -----------------------------------------------------------------------------

export type LowStockRow = { id: string; name: string; sku: string; stock: number; alertAt: number }

export type CatalogSummary = {
  total: number
  active: number
  draft: number
  /** Variants at or below their own "Alert me below" number, lowest stock first */
  lowStock: LowStockRow[]
  alertsSet: boolean
  drafts: { id: string; title: string; modelNumber: string; updatedAt: string }[]
}

export async function loadCatalogSummary(
  payload: Payload,
  tenantId: string,
): Promise<CatalogSummary> {
  const [total, active, draft, variants, drafts] = await Promise.all([
    count(payload, 'products', inStore(tenantId)),
    count(payload, 'products', inStore(tenantId, { status: { equals: 'active' } })),
    count(payload, 'products', inStore(tenantId, { status: { equals: 'draft' } })),
    payload.find({
      collection: 'variants',
      where: inStore(
        tenantId,
        { status: { equals: 'active' } },
        { lowStockThreshold: { greater_than: 0 } },
      ),
      select: { sku: true, title: true, stockQty: true, lowStockThreshold: true, product: true },
      populate: { products: { title: true } },
      depth: 1,
      pagination: false,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'products',
      where: inStore(tenantId, { status: { equals: 'draft' } }),
      select: { title: true, modelNumber: true, updatedAt: true },
      sort: '-updatedAt',
      limit: 5,
      depth: 0,
      overrideAccess: true,
    }),
  ])

  const lowStock = (variants.docs as Variant[])
    .filter((variant) => (variant.stockQty ?? 0) <= (variant.lowStockThreshold ?? 0))
    .map((variant) => {
      const product = typeof variant.product === 'object' ? variant.product : null
      return {
        id: String(variant.id),
        name: [product?.title, variant.title].filter(Boolean).join(' · ') || variant.sku || '',
        sku: variant.sku ?? '',
        stock: variant.stockQty ?? 0,
        alertAt: variant.lowStockThreshold ?? 0,
      }
    })
    .sort((a, b) => a.stock - b.stock)

  return {
    total,
    active,
    draft,
    lowStock,
    alertsSet: variants.docs.length > 0,
    drafts: drafts.docs.map((doc) => ({
      id: String(doc.id),
      title: doc.title,
      modelNumber: doc.modelNumber,
      updatedAt: doc.updatedAt,
    })),
  }
}

// ---- Needs your attention ----------------------------------------------------------------

export type AttentionItem = {
  key: string
  tone: Tone
  icon: IconName
  text: string
  detail?: string
  href?: string
}

/**
 * Store-level things to act on beyond pages (the dashboard adds its page items): plan payment,
 * maintenance mode, enquiries waiting, stock, plan limits, draft products and pending invites.
 * Each source is read only for the roles it concerns.
 */
export async function loadStoreAttention({
  payload,
  tenantId,
  roles,
  userId,
  now,
  enquiries,
  catalog,
  canWriteCatalog,
}: {
  payload: Payload
  tenantId: string
  roles: readonly TenantRole[]
  userId: string
  now: Date
  enquiries: EnquirySummary | null
  catalog: CatalogSummary | null
  canWriteCatalog: boolean
}): Promise<AttentionItem[]> {
  const isOwner = roles.includes('owner')
  const isAdmin = isOwner || roles.includes('manager')
  const [tenant, settings, subscription, invited, staff] = await Promise.all([
    payload.findByID({ collection: 'tenants', id: tenantId, depth: 1, overrideAccess: true }),
    isAdmin
      ? payload
          .find({
            collection: 'site-settings',
            where: inStore(tenantId),
            depth: 0,
            limit: 1,
            overrideAccess: true,
            select: { maintenanceMode: true },
          })
          .then((result) => result.docs[0] ?? null)
      : null,
    isOwner
      ? payload
          .find({
            collection: 'subscriptions',
            where: { tenant: { equals: tenantId } },
            sort: '-createdAt',
            limit: 1,
            depth: 0,
            overrideAccess: true,
          })
          .then((result) => result.docs[0] ?? null)
      : null,
    isOwner
      ? count(payload, 'users', {
          and: [{ 'tenants.tenant': { equals: tenantId } }, { status: { equals: 'invited' } }],
        })
      : 0,
    isAdmin ? count(payload, 'users', { 'tenants.tenant': { equals: tenantId } }) : 0,
  ])
  const plan = typeof tenant.plan === 'object' ? tenant.plan : null
  const items: AttentionItem[] = []

  if (subscription) {
    const status = effectiveStatus(subscription, now)
    if (status === 'past_due') {
      items.push({
        key: 'past-due',
        tone: 'danger',
        icon: 'card',
        text: 'Your plan payment is overdue',
        detail: 'Pay the platform team to keep your store running without interruption.',
      })
    } else if (status === 'trialing' && subscription.trialEndsAt) {
      if (calendarDaysBetween(now, new Date(subscription.trialEndsAt)) <= 7) {
        items.push({
          key: 'trial',
          tone: 'warning',
          icon: 'clock',
          text: `Your trial ends on ${formatDate(subscription.trialEndsAt)}`,
          detail: 'Ask the platform team about your plan so the store keeps running.',
        })
      }
    }
  }
  if (settings?.maintenanceMode) {
    items.push({
      key: 'maintenance',
      tone: 'warning',
      icon: 'wrench',
      text: 'Maintenance mode is on',
      detail: 'Shoppers see “store unavailable” until you switch it off in Settings.',
      href: adminUrl.collection('site-settings'),
    })
  }
  if (enquiries && enquiries.waitingOverADay > 0) {
    const oldest = enquiries.oldestNew
    items.push({
      key: 'enquiries-waiting',
      tone: 'warning',
      icon: 'enquiries',
      text: `${plural(enquiries.waitingOverADay, 'enquiry', 'enquiries')} waiting more than a day for a reply`,
      detail: oldest
        ? `Oldest: ${oldest.referenceNumber ?? 'an enquiry'} from ${oldest.name}, ${plural(
            Math.max(1, calendarDaysBetween(new Date(oldest.createdAt), now)),
            'day',
          )} ago`
        : undefined,
      href: adminUrl.filtered('enquiries', 'status', 'new'),
    })
  } else if (enquiries && enquiries.newCount > 0) {
    items.push({
      key: 'enquiries-new',
      tone: 'info',
      icon: 'enquiries',
      text: `${plural(enquiries.newCount, 'new enquiry', 'new enquiries')} waiting for a reply`,
      href: adminUrl.filtered('enquiries', 'status', 'new'),
    })
  }
  if (enquiries && enquiries.assignedToMe > 0) {
    items.push({
      key: 'assigned',
      tone: 'info',
      icon: 'staff',
      text: `${plural(enquiries.assignedToMe, 'open enquiry', 'open enquiries')} assigned to you`,
      href: adminUrl.filtered('enquiries', 'assignedTo', userId),
    })
  }
  if (catalog && catalog.lowStock.length > 0) {
    const out = catalog.lowStock.filter((row) => row.stock === 0).length
    items.push({
      key: 'low-stock',
      tone: 'warning',
      icon: 'products',
      text: `${plural(catalog.lowStock.length, 'variant')} at or below the stock alert`,
      detail: out > 0 ? `${plural(out, 'variant')} out of stock` : undefined,
      href: adminUrl.collection('variants'),
    })
  }
  if (isAdmin && plan?.limits) {
    const checks: [string, string, number, number | null | undefined][] = [
      ['products', 'products', tenant.usage?.productsCount ?? 0, plan.limits.maxProducts],
      ['staff', 'staff accounts', staff, plan.limits.maxStaffUsers],
      [
        'storage',
        'GB of storage',
        (tenant.usage?.storageBytes ?? 0) / 1024 ** 3,
        plan.limits.maxStorageGB,
      ],
    ]
    for (const [key, label, used, limit] of checks) {
      if (!limit || used / limit < 0.9) continue
      items.push({
        key: `limit-${key}`,
        tone: used >= limit ? 'danger' : 'warning',
        icon: 'chart',
        text: `${Math.round((used / limit) * 100)}% of your plan’s ${label} used`,
        detail: `${Math.round(used).toLocaleString('en-IN')} of ${limit.toLocaleString('en-IN')} on the ${plan.name} plan. The platform team can move you to a bigger plan.`,
      })
    }
  }
  if (catalog && canWriteCatalog && catalog.draft > 0) {
    items.push({
      key: 'draft-products',
      tone: 'neutral',
      icon: 'products',
      text: `${plural(catalog.draft, 'product')} still in draft`,
      detail: 'Drafts are not on the store. Add photos and label details, then set them active.',
      href: adminUrl.filtered('products', 'status', 'draft'),
    })
  }
  if (invited > 0) {
    items.push({
      key: 'invites',
      tone: 'neutral',
      icon: 'mail',
      text: `${plural(invited, 'staff invite')} not accepted yet`,
      detail: 'Resend the invite from Staff and roles if it has expired.',
      href: adminUrl.staff,
    })
  }
  return items
}
