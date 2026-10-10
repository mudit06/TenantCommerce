import type { CollectionSlug, Payload, Where } from 'payload'

import type { TenantRole } from '@/access'
import { adminUrl } from '@/admin/paths'
import type { Tone } from '@/admin/ui'
import type { IconName } from '@/admin/ui/icons'
import { addDays, calendarDaysBetween, formatDate, formatDayMonth, startOfDay } from '@/lib/dates'
import { soldOrders } from '@/modules/reports'
import { effectiveStatus } from '@/modules/tenancy'
import type { Enquiry, Order, Variant } from '@/payload-types'

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

// ---- Sales and orders to ship (order roles) ---------------------------------------------

/** Orders confirmed and not yet handed to a courier: the Orders screen's To pack and Packed. */
const TO_SHIP: Where = {
  and: [
    { status: { in: ['confirmed', 'processing'] } },
    { fulfillmentStatus: { in: ['unfulfilled', 'packed'] } },
  ],
}

export type SalesSummary = {
  ordersToday: number
  /** Of today's orders, how many still wait for a courier */
  ordersTodayToShip: number
  salesTodayMinor: number
  toShip: number
  oldestToShip: string | null
  /** Sales per day for the last 14 days on the IST calendar, oldest first */
  daily: { label: string; salesMinor: number }[]
  toShipRows: Order[]
}

export async function loadSalesSummary(
  payload: Payload,
  tenantId: string,
  now: Date,
): Promise<SalesSummary> {
  const today = startOfDay(now)
  const firstDay = addDays(today, -13)
  const placedToday: Where = {
    and: [
      { placedAt: { greater_than_equal: today.toISOString() } },
      { status: { not_equals: 'pending' } },
    ],
  }
  const [ordersToday, ordersTodayToShip, toShip, oldest, rows, sold] = await Promise.all([
    count(payload, 'orders', inStore(tenantId, placedToday)),
    count(payload, 'orders', inStore(tenantId, placedToday, TO_SHIP)),
    count(payload, 'orders', inStore(tenantId, TO_SHIP)),
    payload.find({
      collection: 'orders',
      where: inStore(tenantId, TO_SHIP),
      sort: 'placedAt',
      limit: 1,
      depth: 0,
      overrideAccess: true,
      select: { placedAt: true },
    }),
    payload.find({
      collection: 'orders',
      where: inStore(tenantId, TO_SHIP),
      sort: '-placedAt',
      limit: 5,
      depth: 0,
      overrideAccess: true,
      select: {
        orderNumber: true,
        contact: true,
        totals: true,
        paymentMethod: true,
        paymentStatus: true,
        placedAt: true,
      },
    }),
    soldOrders(payload, tenantId, firstDay, addDays(today, 1)),
  ])

  const daily = Array.from({ length: 14 }, (_, i) => {
    const day = addDays(firstDay, i)
    return { key: dayKey(day), label: formatDayMonth(day), salesMinor: 0 }
  })
  const byKey = new Map(daily.map((day) => [day.key, day]))
  for (const order of sold) {
    const day = order.paidAt ? byKey.get(dayKey(order.paidAt)) : undefined
    if (day) day.salesMinor += order.totals?.grandTotalMinor ?? 0
  }

  return {
    ordersToday,
    ordersTodayToShip,
    salesTodayMinor: daily.at(-1)?.salesMinor ?? 0,
    toShip,
    oldestToShip: oldest.docs[0]?.placedAt ?? null,
    daily: daily.map(({ label, salesMinor }) => ({ label, salesMinor })),
    toShipRows: rows.docs as Order[],
  }
}

// ---- Order updates sent today (docs/18) ---------------------------------------------------

const SENT = new Set(['sent', 'delivered', 'read', 'clicked'])

export type OrderUpdatesToday = {
  channel: 'whatsapp' | 'sms' | 'email'
  sent: number
  failed: number
  /** Failed messages that went again on another channel */
  fellBack: number
}[]

export async function loadOrderUpdatesToday(
  payload: Payload,
  tenantId: string,
  now: Date,
): Promise<OrderUpdatesToday> {
  const { docs } = await payload.find({
    collection: 'notification-logs',
    where: inStore(
      tenantId,
      { kind: { equals: 'order' } },
      { direction: { equals: 'out' } },
      { createdAt: { greater_than_equal: startOfDay(now).toISOString() } },
    ),
    depth: 0,
    limit: 10_000,
    pagination: false,
    overrideAccess: true,
    select: { channel: true, status: true, fallbackOf: true },
  })
  const fallbacks = new Set(docs.map((log) => log.fallbackOf).filter(Boolean))
  return (['whatsapp', 'sms', 'email'] as const).map((channel) => {
    const logs = docs.filter((log) => log.channel === channel)
    const failed = logs.filter((log) => log.status === 'failed')
    return {
      channel,
      sent: logs.filter((log) => SENT.has(log.status ?? '')).length,
      failed: failed.length,
      fellBack: failed.filter((log) => fallbacks.has(String(log.id))).length,
    }
  })
}

// ---- Offers and growth (switched-on features only) ---------------------------------------

export type GrowthSummary = {
  scheme?: {
    live: { id: string; name: string; orders: number; discountMinor: number; endsAt: string } | null
    next: { id: string; name: string; startsAt: string } | null
  }
  reviews?: { pending: number; oldest: string | null; averageThisMonth: number | null }
  affiliates?: { applications: number; pendingMinor: number; approvedMinor: number }
  carts?: { abandonedToday: number; recoveredToday: number; recoveredWeekMinor: number }
}

export async function loadGrowthSummary(
  payload: Payload,
  tenantId: string,
  features: readonly string[],
  now: Date,
): Promise<GrowthSummary> {
  const today = startOfDay(now)
  const monthStart = addDays(today, 1 - Number(dayKey(today).slice(8, 10)))
  const weekAgo = addDays(today, -6)
  const on = (key: string) => features.includes(key)
  const one = { limit: 1, depth: 0, overrideAccess: true } as const

  const [scheme, reviews, affiliates, carts] = await Promise.all([
    on('schemes')
      ? Promise.all([
          payload.find({
            collection: 'schemes',
            where: inStore(tenantId, { status: { equals: 'live' } }),
            sort: 'endsAt',
            ...one,
            select: { name: true, endsAt: true, stats: true },
          }),
          payload.find({
            collection: 'schemes',
            where: inStore(tenantId, { status: { equals: 'scheduled' } }),
            sort: 'startsAt',
            ...one,
            select: { name: true, startsAt: true },
          }),
        ]).then(([live, next]) => {
          const l = live.docs[0]
          const n = next.docs[0]
          return {
            live: l
              ? {
                  id: String(l.id),
                  name: l.name,
                  orders: l.stats?.orders ?? 0,
                  discountMinor: l.stats?.discountMinor ?? 0,
                  endsAt: l.endsAt,
                }
              : null,
            next: n ? { id: String(n.id), name: n.name, startsAt: n.startsAt } : null,
          }
        })
      : undefined,
    on('reviews')
      ? Promise.all([
          count(payload, 'reviews', inStore(tenantId, { status: { equals: 'pending' } })),
          payload.find({
            collection: 'reviews',
            where: inStore(tenantId, { status: { equals: 'pending' } }),
            sort: 'createdAt',
            ...one,
            select: { createdAt: true },
          }),
          payload.find({
            collection: 'reviews',
            where: inStore(
              tenantId,
              { status: { equals: 'published' } },
              { createdAt: { greater_than_equal: monthStart.toISOString() } },
            ),
            depth: 0,
            limit: 10_000,
            pagination: false,
            overrideAccess: true,
            select: { rating: true },
          }),
        ]).then(([pending, oldest, month]) => ({
          pending,
          oldest: oldest.docs[0]?.createdAt ?? null,
          averageThisMonth: month.docs.length
            ? Math.round(
                (month.docs.reduce((s, r) => s + (r.rating ?? 0), 0) / month.docs.length) * 10,
              ) / 10
            : null,
        }))
      : undefined,
    on('affiliate')
      ? Promise.all([
          count(payload, 'affiliates', inStore(tenantId, { status: { equals: 'applied' } })),
          payload.find({
            collection: 'referrals',
            where: inStore(tenantId, { status: { in: ['pending', 'approved'] } }),
            depth: 0,
            limit: 50_000,
            pagination: false,
            overrideAccess: true,
            select: { status: true, commissionMinor: true },
          }),
        ]).then(([applications, referrals]) => {
          const sum = (status: string) =>
            referrals.docs
              .filter((r) => r.status === status)
              .reduce((s, r) => s + (r.commissionMinor ?? 0), 0)
          return { applications, pendingMinor: sum('pending'), approvedMinor: sum('approved') }
        })
      : undefined,
    on('abandoned-cart')
      ? payload
          .find({
            collection: 'carts',
            where: inStore(tenantId, {
              abandonedAt: { greater_than_equal: weekAgo.toISOString() },
            }),
            depth: 1,
            limit: 10_000,
            pagination: false,
            overrideAccess: true,
            select: { abandonedAt: true, reminders: true, convertedOrder: true },
          })
          .then(({ docs }) => {
            const orderOf = (cart: (typeof docs)[number]) =>
              typeof cart.convertedOrder === 'object' ? cart.convertedOrder : null
            // Recovered: reminded, then ordered (and not cancelled), as Abandoned carts counts it
            const recovered = docs.filter(
              (cart) =>
                (cart.reminders ?? []).length > 0 &&
                orderOf(cart)?.status !== undefined &&
                orderOf(cart)?.status !== 'cancelled',
            )
            const isToday = (cart: (typeof docs)[number]) =>
              Boolean(cart.abandonedAt && new Date(cart.abandonedAt) >= today)
            return {
              abandonedToday: docs.filter(isToday).length,
              recoveredToday: recovered.filter(isToday).length,
              recoveredWeekMinor: recovered.reduce(
                (s, cart) => s + (orderOf(cart)?.totals?.grandTotalMinor ?? 0),
                0,
              ),
            }
          })
      : undefined,
  ])
  return { scheme, reviews, affiliates, carts }
}
