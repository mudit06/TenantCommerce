import type { Payload, SanitizedPermissions } from 'payload'
import { Suspense } from 'react'

import { idOf, storeSessionOf, type TenantRole } from '@/access'
import { adminUrl } from '@/admin/paths'
import { currentStore, storeRolesOf } from '@/admin/store'
import { ButtonLink, Card, EmptyState, Notice, PageHeader, Skeleton } from '@/admin/ui'
import { Icon, type IconName } from '@/admin/ui/icons'
import { formatDateAndTime, formatDateWithWeekday, formatRelative, greetingFor } from '@/lib/dates'
import { pageAddress, storePageOverview, type PageRow } from '@/modules/content'
import { ENQUIRY_TYPES } from '@/modules/enquiries'
import { StorePlanCard } from '@/modules/tenancy/admin'

import { StoreSetup } from './StoreSetup'
import {
  type AttentionItem,
  type EnquirySummary,
  loadCatalogSummary,
  loadEnquirySummary,
  loadStoreAttention,
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

/** Enquiries per day for two weeks (the wireframe's sales chart, until orders exist). */
function EnquiryChart({ days }: { days: EnquirySummary['daily'] }) {
  const total = days.reduce((sum, day) => sum + day.count, 0)
  const top = Math.ceil(Math.max(4, ...days.map((day) => day.count)) / 2) * 2
  return (
    <figure
      aria-label={`${total} enquiries in the last 14 days, ${days.at(-1)?.count ?? 0} today`}
      className="te-chart"
      role="img"
    >
      <div aria-hidden className="te-chart__y">
        <span>{top}</span>
        <span>{top / 2}</span>
        <span>0</span>
      </div>
      <div aria-hidden className="te-chart__plot">
        {days.map((day, index) => (
          <div className="te-chart__col" key={day.label} title={`${day.label}: ${day.count}`}>
            <i
              className={index === days.length - 1 ? 'te-chart__bar--today' : undefined}
              style={{ height: `${(day.count / top) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <figcaption aria-hidden className="te-chart__x">
        <span>{days[0]?.label}</span>
        <span>{total} in 14 days</span>
        <span>Today</span>
      </figcaption>
    </figure>
  )
}

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

const GROWTH = [
  { feature: 'schemes', label: 'Schemes and offers', icon: 'calendar' },
  { feature: 'reviews', label: 'Reviews to approve', icon: 'star' },
  { feature: 'affiliate', label: 'Affiliates', icon: 'link' },
  { feature: 'abandoned-cart', label: 'Abandoned carts', icon: 'cart' },
  { feature: 'coupons', label: 'Coupons', icon: 'brands' },
  { feature: 'offer-messages', label: 'Offer messages', icon: 'mail' },
] as const satisfies readonly { feature: string; label: string; icon: IconName }[]

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

  const [enquiries, catalog] = await Promise.all([
    seesEnquiries ? loadEnquirySummary(payload, store.id, userId, now) : null,
    can('products') ? loadCatalogSummary(payload, store.id) : null,
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
  const growth = isAdmin ? GROWTH.filter((item) => enabledFeatures.includes(item.feature)) : []

  return (
    <div className="te-page te-dash">
      <PageHeader
        actions={
          <>
            {store.storeUrl ? (
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
        {seesOrders ? (
          <div className="te-stat te-stat--static">
            <span aria-hidden className="te-stat__icon">
              <Icon name="receipt" size={18} />
            </span>
            <span className="te-stat__label">Orders today</span>
            <span className="te-stat__value">—</span>
            <span className="te-stat__hint">Starts with online selling</span>
          </div>
        ) : null}
        {catalog ? (
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
            hint={`${enquiries.newQuotes} quote ${enquiries.newQuotes === 1 ? 'request' : 'requests'} · ${enquiries.inProgress} in progress`}
          />
        ) : null}
        {can('pages') ? (
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

      {enquiries ? (
        <div className="te-grid te-grid--2-1">
          <Card title="Enquiries, last 14 days">
            <EnquiryChart days={enquiries.daily} />
          </Card>
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

      {growth.length ? (
        <Card title="Offers and growth">
          <div className="te-growth">
            {growth.map((item) => (
              <div className="te-growth__tile" key={item.feature}>
                <span className="te-growth__label">
                  <Icon name={item.icon} size={15} />
                  {item.label}
                </span>
                <b>—</b>
                <span className="te-muted te-small">Switched on · screen coming soon</span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="te-grid te-grid--2-1">
        <Card title="Recent activity">
          <Suspense fallback={<Skeleton label="Loading recent activity" lines={5} />}>
            <RecentActivity can={can} pages={pages} payload={payload} tenantId={store.id} />
          </Suspense>
        </Card>
        <div className="te-stack">
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
