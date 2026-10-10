import type { Payload, SanitizedPermissions } from 'payload'
import { Suspense } from 'react'

import { idOf, storeSessionOf, type TenantRole } from '@/access'
import { adminUrl } from '@/admin/paths'
import { currentStore, storeRolesOf } from '@/admin/store'
import { ButtonLink, Card, EmptyState, Notice, PageHeader, Pill, Skeleton } from '@/admin/ui'
import { BarChart } from '@/admin/ui/BarChart'
import { Icon, type IconName } from '@/admin/ui/icons'
import {
  formatDateAndTime,
  formatDateWithWeekday,
  formatDayMonth,
  formatRelative,
  greetingFor,
} from '@/lib/dates'
import { formatINR, formatINRCompact } from '@/lib/money'
import { pageAddress, storePageOverview, type PageRow } from '@/modules/content'
import { ENQUIRY_TYPES } from '@/modules/enquiries'
import { StorePlanCard } from '@/modules/tenancy/admin'

import { StoreSetup } from './StoreSetup'
import {
  type AttentionItem,
  type EnquirySummary,
  type GrowthSummary,
  loadCatalogSummary,
  loadEnquirySummary,
  loadGrowthSummary,
  loadOrderUpdatesToday,
  loadSalesSummary,
  loadStoreAttention,
  type OrderUpdatesToday,
} from './storeHomeData'

type Can = (collection: string, action?: 'read' | 'create' | 'update') => boolean

function Stat({
  label,
  value,
  hint,
  href,
  icon,
  tone = 'neutral',
}: {
  label: string
  value: number | string
  hint?: string
  href: string
  icon: IconName
  tone?: 'neutral' | 'success' | 'warning' | 'info'
}) {
  return (
    <a className={`te-stat te-stat--${tone}`} href={href}>
      <span aria-hidden className="te-stat__icon">
        <Icon name={icon} size={18} />
      </span>
      <span className="te-stat__label">{label}</span>
      <span className="te-stat__value">{value}</span>
      {hint ? <span className="te-stat__hint">{hint}</span> : null}
    </a>
  )
}

type Activity = {
  key: string
  icon: IconName
  text: string
  by?: string | null
  at: string
  href: string
}

const pageActivity = (row: PageRow): Activity => {
  const justPublished =
    row.publishedAt && Math.abs(Date.parse(row.publishedAt) - Date.parse(row.updatedAt)) < 60_000
  const verb = justPublished
    ? 'published'
    : row.status === 'scheduled'
      ? 'scheduled'
      : row.status === 'draft' || row.status === 'changed'
        ? 'saved as a draft'
        : 'updated'
  return {
    key: `page-${row.id}`,
    icon: justPublished ? 'checkCircle' : row.status === 'scheduled' ? 'calendar' : 'pages',
    text: `${row.title} ${verb}`,
    by: row.lastEditedBy,
    at: row.updatedAt,
    href: adminUrl.page(row.id),
  }
}

/** What changed lately across pages, products and media (newest first). */
async function RecentActivity({
  payload,
  tenantId,
  pages,
  can,
}: {
  payload: Payload
  tenantId: string
  pages: PageRow[]
  can: Can
}) {
  const where = { tenant: { equals: tenantId } }
  const [products, media, platform] = await Promise.all([
    can('products')
      ? payload.find({
          collection: 'products',
          where,
          sort: '-updatedAt',
          limit: 6,
          depth: 0,
          overrideAccess: true,
          select: { title: true, updatedAt: true, lastEditedBy: true, status: true },
        })
      : null,
    can('media')
      ? payload.find({
          collection: 'media',
          where,
          sort: '-createdAt',
          limit: 4,
          depth: 0,
          overrideAccess: true,
          select: { filename: true, createdAt: true },
        })
      : null,
    // Our team's visits and changes, so the owner sees them (docs/05 "Manage store")
    payload.find({
      collection: 'audit-logs',
      where: {
        and: [
          where,
          { actingAsPlatform: { equals: true } },
          { action: { in: ['support_access', 'store_managed_change'] } },
        ],
      },
      sort: '-at',
      limit: 4,
      depth: 1,
      overrideAccess: true,
      select: { summary: true, reason: true, at: true, actor: true },
    }),
  ])
  const items: Activity[] = [
    ...(can('pages') ? pages.slice(0, 6).map(pageActivity) : []),
    ...(products?.docs ?? []).map((doc) => ({
      key: `product-${doc.id}`,
      icon: 'products' as const,
      text: `${doc.title} ${doc.status === 'active' ? 'updated' : 'saved'}`,
      by: doc.lastEditedBy,
      at: doc.updatedAt,
      href: `${adminUrl.collection('products')}/${doc.id}`,
    })),
    ...(media?.docs ?? []).map((doc) => ({
      key: `media-${doc.id}`,
      icon: 'media' as const,
      text: `${doc.filename ?? 'A file'} uploaded`,
      at: doc.createdAt,
      href: `${adminUrl.collection('media')}/${doc.id}`,
    })),
    ...platform.docs.map((doc) => ({
      key: `audit-${doc.id}`,
      icon: 'shield' as const,
      text: `Platform team: ${doc.summary ?? 'opened the store'}${doc.reason ? ` (${doc.reason})` : ''}`,
      by: typeof doc.actor === 'object' && doc.actor ? doc.actor.name : null,
      at: doc.at,
      href: adminUrl.dashboard,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8)

  if (items.length === 0) {
    return (
      <EmptyState icon="history" title="Nothing has changed yet">
        Edits to pages, products and media show up here, with who made them.
      </EmptyState>
    )
  }
  return (
    <ol className="te-activity">
      {items.map((item) => (
        <li key={item.key}>
          <a className="te-activity__item" href={item.href}>
            <span aria-hidden className="te-activity__icon">
              <Icon name={item.icon} size={15} />
            </span>
            <span className="te-activity__text">
              <span className="te-activity__primary">{item.text}</span>
              <span className="te-activity__secondary">
                {formatRelative(item.at)}
                {item.by ? ` · by ${item.by}` : ''}
              </span>
            </span>
          </a>
        </li>
      ))}
    </ol>
  )
}

type QuickAction = { href: string; label: string; hint: string; icon: IconName; show: boolean }

/** Shortcuts for what this person can create or change (wireframe "Quick actions"). */
function QuickActions({
  can,
  features,
  canManageStaff,
}: {
  can: Can
  features: readonly string[]
  canManageStaff: boolean
}) {
  const actions: QuickAction[] = [
    {
      href: adminUrl.create('products'),
      label: 'Add product',
      hint: 'With photos and specifications',
      icon: 'products',
      show: can('products', 'create'),
    },
    {
      href: adminUrl.newPage,
      label: 'Create page',
      hint: 'About us, policies, guides',
      icon: 'pages',
      show: can('pages', 'create'),
    },
    {
      href: adminUrl.createPage('landing'),
      label: 'Landing page',
      hint: 'Offers, collections, home',
      icon: 'layout',
      show: can('pages', 'create'),
    },
    {
      href: adminUrl.create('media'),
      label: 'Upload media',
      hint: 'Photos and PDFs',
      icon: 'upload',
      show: can('media', 'create'),
    },
    {
      href: adminUrl.create('categories'),
      label: 'Add category',
      hint: 'Where products sit in the store',
      icon: 'categories',
      show: can('categories', 'create'),
    },
    {
      href: adminUrl.create('enquiries'),
      label: 'Log an enquiry',
      hint: 'A phone or walk-in request',
      icon: 'phone',
      show: features.includes('enquiries') && can('enquiries', 'create'),
    },
    {
      href: adminUrl.create('dealers'),
      label: 'Add dealer',
      hint: 'Shown on the dealer locator',
      icon: 'dealers',
      show: features.includes('dealer-locator') && can('dealers', 'create'),
    },
    {
      href: adminUrl.staff,
      label: 'Invite staff',
      hint: 'Give a colleague a login',
      icon: 'staff',
      show: canManageStaff,
    },
    {
      href: adminUrl.collection('site-settings'),
      label: 'Store settings',
      hint: 'Logo, contact, policies',
      icon: 'settings',
      show: can('site-settings', 'update'),
    },
  ]
  const shown = actions.filter((action) => action.show)
  if (shown.length === 0) return null
  return (
    <Card title="Quick actions">
      <div className="te-quick-actions te-quick-actions--compact">
        {shown.map((action) => (
          <a className="te-quick-action" href={action.href} key={action.href} title={action.hint}>
            <span aria-hidden className="te-quick-action__icon">
              <Icon name={action.icon} size={17} />
            </span>
            <span>
              <span className="te-quick-action__label">{action.label}</span>
              <span className="te-quick-action__hint">{action.hint}</span>
            </span>
          </a>
        ))}
      </div>
    </Card>
  )
}

const ENQUIRY_TYPE_LABEL = new Map<string, string>(
  ENQUIRY_TYPES.map((type) => [type.value, type.label]),
)

function NewEnquiries({ summary, now }: { summary: EnquirySummary; now: Date }) {
  if (summary.latest.length === 0) {
    return (
      <EmptyState icon="enquiries" title="No new enquiries">
        Quote requests and questions from the store land here first.
      </EmptyState>
    )
  }
  return (
    <ol className="te-activity">
      {summary.latest.map((enquiry) => {
        const about = enquiry.productTitle
          ? `${enquiry.qty ? `${enquiry.qty} × ` : ''}${enquiry.productTitle}`
          : (enquiry.message ?? '')
        return (
          <li key={enquiry.id}>
            <a className="te-activity__item" href={adminUrl.doc('enquiries', enquiry.id)}>
              <span className="te-activity__text">
                <span className="te-activity__primary">
                  {ENQUIRY_TYPE_LABEL.get(enquiry.type) ?? enquiry.type}
                </span>
                <span className="te-activity__secondary te-clamp">
                  {[enquiry.company || enquiry.name, enquiry.city].filter(Boolean).join(', ')}
                  {about ? ` · ${about}` : ''}
                </span>
              </span>
              <span className="te-activity__when">{formatRelative(enquiry.createdAt, now)}</span>
            </a>
          </li>
        )
      })}
    </ol>
  )
}

const TONE_RANK: Record<string, number> = { danger: 0, warning: 1, info: 2, neutral: 3, success: 4 }

function AttentionList({ items }: { items: AttentionItem[] }) {
  return (
    <ul className="te-attention">
      {items.map((item) => {
        const body = (
          <>
            <span aria-hidden className={`te-attention__icon te-attention__icon--${item.tone}`}>
              <Icon name={item.icon} size={16} />
            </span>
            <span className="te-attention__text">
              <span className="te-attention__primary">{item.text}</span>
              {item.detail ? <span className="te-attention__secondary">{item.detail}</span> : null}
            </span>
            {item.href ? <Icon className="te-attention__go" name="chevronRight" size={16} /> : null}
          </>
        )
        return (
          <li key={item.key}>
            {item.href ? (
              <a className="te-attention__item" href={item.href}>
                {body}
              </a>
            ) : (
              <div className="te-attention__item">{body}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** "2 days" or "5 h": how long the oldest order has waited to ship */
function formatAge(at: string, now: Date): string {
  const hours = Math.max(0, Math.floor((now.getTime() - Date.parse(at)) / 3_600_000))
  if (hours < 24) return `${hours} h`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'}`
}

const CHANNEL: Record<OrderUpdatesToday[number]['channel'], { label: string; icon: IconName }> = {
  whatsapp: { label: 'WhatsApp', icon: 'whatsapp' },
  sms: { label: 'SMS', icon: 'phone' },
  email: { label: 'Email', icon: 'mail' },
}

/** Order updates sent today by channel (cms-dashboard rule 4). SMS shows once it is used. */
function OrderUpdates({ rows }: { rows: OrderUpdatesToday }) {
  const shown = rows.filter((row) => row.channel !== 'sms' || row.sent || row.failed)
  return (
    <ul className="te-rows">
      {shown.map((row) => (
        <li className="te-rows__item te-rows__item--static" key={row.channel}>
          <span className="te-inline">
            <Icon name={CHANNEL[row.channel].icon} size={15} />
            {CHANNEL[row.channel].label}
          </span>
          <span className="te-rows__aside">
            <b>{row.sent.toLocaleString('en-IN')} sent</b>
            {row.failed ? (
              <span className="te-muted te-small">
                {' · '}
                {row.failed} failed
                {row.fellBack ? `, ${row.fellBack} sent another way` : ''}
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  )
}

const hasGrowth = (growth: GrowthSummary) =>
  Boolean(growth.scheme || growth.reviews || growth.affiliates || growth.carts)

/** The live scheme, reviews, affiliates and carts at a glance (cms-dashboard rule 5). */
function GrowthTiles({ growth, now }: { growth: GrowthSummary; now: Date }) {
  const { scheme, reviews, affiliates, carts } = growth
  return (
    <div className="te-growth">
      {scheme ? (
        <a className="te-growth__tile" href={adminUrl.collection('schemes')}>
          <span className="te-growth__label">
            <Icon name="calendar" size={15} />
            Live scheme
          </span>
          <b>{scheme.live?.name ?? 'None live'}</b>
          {scheme.live ? (
            <span className="te-muted te-small">
              {scheme.live.orders.toLocaleString('en-IN')} orders ·{' '}
              {formatINR(scheme.live.discountMinor, { decimals: 'never' })} off · ends{' '}
              {formatDayMonth(scheme.live.endsAt)}
            </span>
          ) : null}
          {scheme.next ? (
            <span className="te-small">
              Next: {scheme.next.name}, starts {formatDayMonth(scheme.next.startsAt)}
            </span>
          ) : null}
        </a>
      ) : null}
      {reviews ? (
        <a className="te-growth__tile" href={adminUrl.collection('reviews')}>
          <span className="te-growth__label">
            <Icon name="star" size={15} />
            Reviews to approve
          </span>
          <b>{reviews.pending}</b>
          <span className="te-muted te-small">
            {[
              reviews.oldest ? `oldest ${formatAge(reviews.oldest, now)}` : null,
              reviews.averageThisMonth !== null
                ? `average this month ${reviews.averageThisMonth}`
                : null,
            ]
              .filter(Boolean)
              .join(' · ') || 'Nothing waiting'}
          </span>
        </a>
      ) : null}
      {affiliates ? (
        <a className="te-growth__tile" href={adminUrl.collection('affiliates')}>
          <span className="te-growth__label">
            <Icon name="link" size={15} />
            Affiliates
          </span>
          <b>
            {affiliates.applications} application{affiliates.applications === 1 ? '' : 's'}
          </b>
          <span className="te-muted te-small">
            {formatINR(affiliates.pendingMinor, { decimals: 'never' })} commission pending ·{' '}
            {formatINR(affiliates.approvedMinor, { decimals: 'never' })} approved
          </span>
        </a>
      ) : null}
      {carts ? (
        <a className="te-growth__tile" href={adminUrl.collection('carts')}>
          <span className="te-growth__label">
            <Icon name="cart" size={15} />
            Abandoned carts today
          </span>
          <b>
            {carts.abandonedToday} · {carts.recoveredToday} recovered
          </b>
          <span className="te-muted te-small">
            {formatINR(carts.recoveredWeekMinor, { decimals: 'never' })} recovered this week
          </span>
        </a>
      ) : null}
    </div>
  )
}

/**
 * The store dashboard (docs/screens `cms-dashboard`, laid out as the wireframe's Design view):
 * launch checklist, figures, enquiries, what needs doing, quick actions, what changed and who
 * changed it, stock, and the next scheduled changes. Cards follow the person's role and the
 * store's features. Sales, orders to ship and order updates arrive with orders (stage B).
 */
export async function StoreHome({
  payload,
  user,
  permissions,
}: {
  payload: Payload
  user: unknown
  permissions: SanitizedPermissions
}) {
  const store = await currentStore(payload, user)
  if (!store) {
    return (
      <div className="te-page">
        <EmptyState icon="store" title="You aren’t part of a store yet">
          Ask the store owner to invite you again, or contact the platform team.
        </EmptyState>
      </div>
    )
  }
  const can: Can = (collection, action = 'read') =>
    Boolean(permissions.collections?.[collection]?.[action])
  const session = storeSessionOf(user)
  const enabledFeatures = store.features
  const pages = can('pages') ? await storePageOverview(payload, store.id) : []
  const byStatus = (status: PageRow['status']) => pages.filter((row) => row.status === status)
  const published = byStatus('published').length + byStatus('changed').length
  const drafts = byStatus('draft')
  const changed = byStatus('changed')
  const scheduled = pages
    .filter((row) => row.scheduled)
    .sort((a, b) => a.scheduled!.at.localeCompare(b.scheduled!.at))
  const draftPolicies = pages.filter(
    (row) => row.template === 'policy' && row.status !== 'published' && row.status !== 'changed',
  )

  const now = new Date()
  const firstName = (
    user && typeof user === 'object' && 'name' in user && typeof user.name === 'string'
      ? user.name
      : ''
  ).split(' ')[0]
  const userId = String(idOf((user as { id?: unknown } | null)?.id) ?? '')
  const roles = storeRolesOf(user, store.id)
  const hasRole = (allowed: readonly TenantRole[]) => roles.some((role) => allowed.includes(role))
  const seesEnquiries = enabledFeatures.includes('enquiries') && can('enquiries')
  const seesOrders = hasRole(['owner', 'manager', 'order-manager'])
  const isAdmin = hasRole(['owner', 'manager'])
  const canManageStaff = session ? session.mode === 'manage' : roles.includes('owner')

  const [enquiries, catalog, sales, updates, growth] = await Promise.all([
    seesEnquiries ? loadEnquirySummary(payload, store.id, userId, now) : null,
    can('products') ? loadCatalogSummary(payload, store.id) : null,
    seesOrders && can('orders') ? loadSalesSummary(payload, store.id, now) : null,
    seesOrders && can('orders') ? loadOrderUpdatesToday(payload, store.id, now) : null,
    isAdmin ? loadGrowthSummary(payload, store.id, enabledFeatures, now) : null,
  ])
  const storeAttention = await loadStoreAttention({
    payload,
    tenantId: store.id,
    roles,
    userId,
    now,
    enquiries,
    catalog,
    canWriteCatalog: can('products', 'create'),
  })
  const pageAttention: AttentionItem[] = [
    can('pages') && draftPolicies.length
      ? {
          key: 'policies',
          tone: 'warning' as const,
          icon: 'legal' as const,
          text: `${draftPolicies.length} policy ${draftPolicies.length === 1 ? 'page is' : 'pages are'} still a draft`,
          detail: 'Publish shipping, returns, privacy and terms before launch.',
          href: `${adminUrl.pages}?template=policy`,
        }
      : null,
    can('pages') && changed.length
      ? {
          key: 'changed',
          tone: 'info' as const,
          icon: 'edit' as const,
          text: `${changed.length} published ${changed.length === 1 ? 'page has' : 'pages have'} changes not live yet`,
          href: `${adminUrl.pages}?status=changed`,
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item))
  const attention = [...storeAttention, ...pageAttention].sort(
    (a, b) => (TONE_RANK[a.tone] ?? 9) - (TONE_RANK[b.tone] ?? 9),
  )

  return (
    <div className="te-page te-dash">
      <PageHeader
        actions={
          <>
            {can('products', 'create') && can('import-jobs') ? (
              <ButtonLink href={adminUrl.import} icon="upload">
                Import CSV
              </ButtonLink>
            ) : store.storeUrl ? (
              <ButtonLink external href={store.storeUrl} icon="external">
                View store
              </ButtonLink>
            ) : null}
            {can('products', 'create') ? (
              <ButtonLink href={adminUrl.create('products')} icon="plus" variant="primary">
                Add product
              </ButtonLink>
            ) : can('pages', 'create') ? (
              <ButtonLink href={adminUrl.newPage} icon="plus" variant="primary">
                Create page
              </ButtonLink>
            ) : null}
          </>
        }
        subtitle={`${formatDateWithWeekday(now)} · ${store.name}`}
        title={`${greetingFor(now)}${firstName ? `, ${firstName}` : ''}`}
      />

      {store.status === 'suspended' ? (
        <Notice tone="danger">
          This store is suspended. Shoppers see “store unavailable” and changes are paused. Contact
          the platform team.
        </Notice>
      ) : store.status === 'draft' ? (
        <Notice tone="info">
          Your store isn’t live yet. Finish the launch checklist; the platform team takes it live.
        </Notice>
      ) : null}
      {session?.mode === 'view' ? (
        <Notice tone="info">You are viewing this store read-only as support.</Notice>
      ) : null}

      {isAdmin ? (
        <Suspense fallback={<Skeleton label="Loading the launch checklist" lines={3} />}>
          <StoreSetup enabledFeatures={enabledFeatures} payload={payload} tenantId={store.id} />
        </Suspense>
      ) : null}

      <div className="te-stats">
        {sales ? (
          <>
            <Stat
              href={adminUrl.collection('orders')}
              icon="receipt"
              label="Orders today"
              value={sales.ordersToday.toLocaleString('en-IN')}
              hint={`${sales.ordersTodayToShip} still to ship`}
            />
            <Stat
              href={adminUrl.reports}
              icon="chart"
              label="Sales today"
              value={formatINR(sales.salesTodayMinor, { decimals: 'never' })}
              hint="incl. GST"
            />
            <Stat
              href={`${adminUrl.collection('orders')}?tab=to-pack`}
              icon="truck"
              label="To ship"
              tone={sales.toShip ? 'warning' : 'neutral'}
              value={sales.toShip}
              hint={
                sales.oldestToShip
                  ? `oldest ${formatAge(sales.oldestToShip, now)}`
                  : 'Nothing waiting'
              }
            />
          </>
        ) : catalog ? (
          <Stat
            href={adminUrl.filtered('products', 'status', 'active')}
            icon="products"
            label="Products live"
            value={catalog.active.toLocaleString('en-IN')}
            hint={`${catalog.draft} in draft · ${catalog.total} in all`}
          />
        ) : null}
        {enquiries ? (
          <Stat
            href={adminUrl.filtered('enquiries', 'status', 'new')}
            icon="enquiries"
            label="New enquiries"
            tone={enquiries.newCount ? 'warning' : 'neutral'}
            value={enquiries.newCount}
            hint={`${enquiries.newQuotes} quote ${enquiries.newQuotes === 1 ? 'request' : 'requests'}`}
          />
        ) : null}
        {!sales && can('pages') ? (
          <Stat
            href={`${adminUrl.pages}?status=draft`}
            icon="draft"
            label="Draft pages"
            value={drafts.length}
            hint={
              scheduled[0]
                ? `${published} live · next scheduled ${formatRelative(scheduled[0].scheduled!.at, now)}`
                : `${published} live`
            }
          />
        ) : null}
        {catalog ? (
          <Stat
            href={adminUrl.collection('variants')}
            icon="variants"
            label="Low stock"
            tone={catalog.lowStock.length ? 'warning' : 'neutral'}
            value={catalog.lowStock.length}
            hint={catalog.alertsSet ? 'variants' : 'Set “Alert me below” on variants'}
          />
        ) : null}
      </div>

      {sales || enquiries ? (
        <div className="te-grid te-grid--2-1">
          {sales ? (
            <Card title="Sales, last 14 days">
              <BarChart
                bars={sales.daily.map((day) => ({
                  key: day.label,
                  title: day.label,
                  value: day.salesMinor,
                }))}
                format={formatINRCompact}
                highlightLast
                label={`Sales each day for the last 14 days, ${formatINR(sales.salesTodayMinor)} today`}
                minTop={10_000_00}
                xLabels={[sales.daily[0]?.label ?? '', '', 'Today']}
              />
            </Card>
          ) : enquiries ? (
            <Card title="Enquiries, last 14 days">
              <BarChart
                bars={enquiries.daily.map((day) => ({
                  key: day.label,
                  title: day.label,
                  value: day.count,
                }))}
                highlightLast
                label={`${enquiries.daily.reduce((s, d) => s + d.count, 0)} enquiries in the last 14 days`}
                xLabels={[enquiries.daily[0]?.label ?? '', '', 'Today']}
              />
            </Card>
          ) : null}
          <div className="te-stack">
            {enquiries ? (
              <Card
                actions={
                  <a className="te-link" href={adminUrl.collection('enquiries')}>
                    All
                  </a>
                }
                title="New enquiries"
              >
                <NewEnquiries now={now} summary={enquiries} />
              </Card>
            ) : null}
            {updates ? (
              <Card
                actions={
                  <a className="te-link" href={adminUrl.notifications}>
                    Settings
                  </a>
                }
                title="Order updates today"
              >
                <OrderUpdates rows={updates} />
              </Card>
            ) : null}
          </div>
        </div>
      ) : null}

      {growth && hasGrowth(growth) ? (
        <Card title="Offers and growth">
          <GrowthTiles growth={growth} now={now} />
        </Card>
      ) : null}

      {sales || (catalog && catalog.lowStock.length) ? (
        <div className="te-grid te-grid--halves">
          {sales ? (
            <Card
              actions={
                <a className="te-link" href={`${adminUrl.collection('orders')}?tab=to-pack`}>
                  All
                </a>
              }
              className="te-card--flush"
              title="Orders to ship"
            >
              {sales.toShipRows.length ? (
                <table className="te-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th className="te-num">Total</th>
                      <th>Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.toShipRows.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <a className="te-link te-mono" href={adminUrl.doc('orders', order.id)}>
                            {order.orderNumber}
                          </a>
                        </td>
                        <td>{order.contact?.name ?? '—'}</td>
                        <td className="te-num">{formatINR(order.totals?.grandTotalMinor ?? 0)}</td>
                        <td>
                          {order.paymentMethod === 'cod' ? (
                            <Pill tone="warning">COD</Pill>
                          ) : (
                            <Pill tone="success">Paid</Pill>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState icon="checkCircle" title="Nothing to ship">
                  Confirmed orders waiting for a courier show here.
                </EmptyState>
              )}
            </Card>
          ) : null}
          {catalog && catalog.lowStock.length ? (
            <Card className="te-card--flush" title="Low stock">
              <table className="te-table">
                <thead>
                  <tr>
                    <th>Variant</th>
                    <th className="te-num">In stock</th>
                    <th className="te-num">Alert at</th>
                  </tr>
                </thead>
                <tbody>
                  {catalog.lowStock.slice(0, 5).map((row) => (
                    <tr key={row.id}>
                      <td>
                        <a className="te-link" href={adminUrl.doc('variants', row.id)}>
                          {row.name}
                        </a>
                      </td>
                      <td className={`te-num${row.stock === 0 ? ' te-text--danger' : ''}`}>
                        {row.stock}
                      </td>
                      <td className="te-num">{row.alertAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ) : null}
        </div>
      ) : null}

      <div className="te-grid te-grid--2-1">
        <Card title="Needs your attention">
          {attention.length ? (
            <AttentionList items={attention} />
          ) : (
            <EmptyState icon="checkCircle" title="All clear">
              Nothing needs you right now.
            </EmptyState>
          )}
        </Card>
        <QuickActions can={can} canManageStaff={canManageStaff} features={enabledFeatures} />
      </div>

      <div className="te-grid te-grid--2-1">
        <Card title="Recent activity">
          <Suspense fallback={<Skeleton label="Loading recent activity" lines={5} />}>
            <RecentActivity can={can} pages={pages} payload={payload} tenantId={store.id} />
          </Suspense>
        </Card>
        <div className="te-stack">
          {catalog && can('products', 'create') && catalog.drafts.length ? (
            <Card
              actions={
                <a className="te-link" href={adminUrl.filtered('products', 'status', 'draft')}>
                  All drafts
                </a>
              }
              title="Products to finish"
            >
              <ol className="te-activity">
                {catalog.drafts.map((product) => (
                  <li key={product.id}>
                    <a className="te-activity__item" href={adminUrl.doc('products', product.id)}>
                      <span className="te-activity__text">
                        <span className="te-activity__primary">{product.title}</span>
                        <span className="te-activity__secondary">
                          {product.modelNumber} · edited {formatRelative(product.updatedAt, now)}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ol>
            </Card>
          ) : null}
          {can('pages') ? (
            <Card
              actions={
                <a className="te-link" href={`${adminUrl.pages}?status=scheduled`}>
                  All scheduled
                </a>
              }
              title="Coming up"
            >
              {scheduled.length ? (
                <ol className="te-activity">
                  {scheduled.slice(0, 5).map((row) => (
                    <li key={row.id}>
                      <a className="te-activity__item" href={adminUrl.page(row.id)}>
                        <span aria-hidden className="te-activity__icon te-activity__icon--info">
                          <Icon name="calendar" size={15} />
                        </span>
                        <span className="te-activity__text">
                          <span className="te-activity__primary">
                            {row.title}{' '}
                            {row.scheduled!.type === 'publish' ? 'goes live' : 'is unpublished'}
                          </span>
                          <span className="te-activity__secondary">
                            {formatDateAndTime(row.scheduled!.at)} · {pageAddress(row.slug)}
                          </span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="te-muted te-small">
                  Nothing scheduled. Schedule a page from its editor to put it live at a set time,
                  for example a festive offer at 10:00 on the day.
                </p>
              )}
            </Card>
          ) : null}
          {isAdmin ? (
            <Suspense fallback={<Skeleton label="Loading plan usage" lines={3} />}>
              <StorePlanCard payload={payload} tenantId={store.id} />
            </Suspense>
          ) : null}
        </div>
      </div>
    </div>
  )
}
