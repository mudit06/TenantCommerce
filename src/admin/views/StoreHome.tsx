import type { Payload, SanitizedPermissions } from 'payload'
import { Suspense } from 'react'

import { storeSessionOf } from '@/access'
import { adminUrl } from '@/admin/paths'
import { currentStore, type CurrentStore } from '@/admin/store'
import { ButtonLink, Card, EmptyState, Notice, PageHeader, Skeleton } from '@/admin/ui'
import { Icon, type IconName } from '@/admin/ui/icons'
import {
  DEFAULT_TIMEZONE,
  formatDateAndTime,
  formatDateWithWeekday,
  formatRelative,
} from '@/lib/dates'
import { pageAddress, storePageOverview, type PageRow } from '@/modules/content'
import { StorePlanCard } from '@/modules/tenancy/admin'

import { StoreSetup } from './StoreSetup'

type Can = (collection: string, action?: 'read' | 'create') => boolean

const greeting = (now: Date) => {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: DEFAULT_TIMEZONE,
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(now),
  )
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
}

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

function QuickActions({ can, store }: { can: Can; store: CurrentStore }) {
  const actions: { href: string; label: string; hint: string; icon: IconName; show: boolean }[] = [
    {
      href: adminUrl.newPage,
      label: 'Create page',
      hint: 'About us, policies, guides',
      icon: 'pages',
      show: can('pages', 'create'),
    },
    {
      href: adminUrl.createPage('landing'),
      label: 'Create landing page',
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
      href: adminUrl.create('products'),
      label: 'Add product',
      hint: 'With photos and specifications',
      icon: 'products',
      show: can('products', 'create'),
    },
  ]
  const shown = actions.filter((action) => action.show)
  if (shown.length === 0 && !store.storeUrl) return null
  return (
    <Card title="Quick actions">
      <div className="te-quick-actions">
        {shown.map((action) => (
          <a className="te-quick-action" href={action.href} key={action.href}>
            <span aria-hidden className="te-quick-action__icon">
              <Icon name={action.icon} size={18} />
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

/**
 * The store dashboard (docs/screens `cms-dashboard`): the state of the store at a glance, what
 * needs doing, what changed and who changed it, and the next scheduled changes. Sales cards
 * arrive with orders (stage B).
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
  const tenant = await payload.findByID({
    collection: 'tenants',
    id: store.id,
    depth: 0,
    overrideAccess: true,
  })
  const enabledFeatures = tenant.enabledFeatures ?? []
  const where = { tenant: { equals: store.id } }

  const [pages, products, activeProducts, newEnquiries] = await Promise.all([
    storePageOverview(payload, store.id),
    can('products') ? payload.count({ collection: 'products', where, overrideAccess: true }) : null,
    can('products')
      ? payload.count({
          collection: 'products',
          where: { and: [where, { status: { equals: 'active' } }] },
          overrideAccess: true,
        })
      : null,
    can('enquiries')
      ? payload.count({
          collection: 'enquiries',
          where: { and: [where, { status: { equals: 'new' } }] },
          overrideAccess: true,
        })
      : null,
  ])
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
  const attention = [
    newEnquiries?.totalDocs
      ? {
          key: 'enquiries',
          icon: 'enquiries' as const,
          text: `${newEnquiries.totalDocs} new ${newEnquiries.totalDocs === 1 ? 'enquiry' : 'enquiries'} waiting for a reply`,
          href: `${adminUrl.collection('enquiries')}?where[status][equals]=new`,
        }
      : null,
    can('pages') && draftPolicies.length
      ? {
          key: 'policies',
          icon: 'legal' as const,
          text: `${draftPolicies.length} policy ${draftPolicies.length === 1 ? 'page is' : 'pages are'} still a draft: publish before launch`,
          href: `${adminUrl.pages}?template=policy`,
        }
      : null,
    can('pages') && changed.length
      ? {
          key: 'changed',
          icon: 'edit' as const,
          text: `${changed.length} published ${changed.length === 1 ? 'page has' : 'pages have'} changes not live yet`,
          href: `${adminUrl.pages}?status=changed`,
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item))

  return (
    <div className="te-page">
      <PageHeader
        actions={
          <>
            {store.storeUrl ? (
              <ButtonLink external href={store.storeUrl} icon="external">
                View store
              </ButtonLink>
            ) : null}
            {can('pages', 'create') ? (
              <ButtonLink href={adminUrl.newPage} icon="plus" variant="primary">
                Create page
              </ButtonLink>
            ) : null}
          </>
        }
        eyebrow={store.name}
        subtitle={formatDateWithWeekday(now)}
        title={`${greeting(now)}${firstName ? `, ${firstName}` : ''}`}
      />

      {store.status === 'suspended' ? (
        <Notice tone="danger">
          This store is suspended. Shoppers see “store unavailable” and changes are paused. Contact
          the platform team.
        </Notice>
      ) : store.status === 'draft' ? (
        <Notice tone="info">
          Your store isn’t live yet. Finish the setup steps on the right; the platform team takes it
          live.
        </Notice>
      ) : null}
      {session?.mode === 'view' ? (
        <Notice tone="info">You are viewing this store read-only as support.</Notice>
      ) : null}

      <div className="te-stats">
        {can('pages') ? (
          <>
            <Stat
              href={`${adminUrl.pages}?status=published`}
              icon="checkCircle"
              label="Published pages"
              tone="success"
              value={published}
              hint={changed.length ? `${changed.length} with unpublished changes` : 'All live'}
            />
            <Stat
              href={`${adminUrl.pages}?status=draft`}
              icon="draft"
              label="Draft pages"
              value={drafts.length}
              hint={drafts.length ? 'Not on the store yet' : 'Nothing waiting'}
            />
            <Stat
              href={`${adminUrl.pages}?status=scheduled`}
              icon="calendar"
              label="Scheduled"
              tone="info"
              value={scheduled.length}
              hint={
                scheduled[0]
                  ? `Next ${formatRelative(scheduled[0].scheduled!.at, now)}`
                  : 'Nothing planned'
              }
            />
          </>
        ) : null}
        {products && activeProducts ? (
          <Stat
            href={adminUrl.collection('products')}
            icon="products"
            label="Products"
            value={activeProducts.totalDocs}
            hint={`active of ${products.totalDocs}`}
          />
        ) : null}
        {newEnquiries && enabledFeatures.includes('enquiries') ? (
          <Stat
            href={`${adminUrl.collection('enquiries')}?where[status][equals]=new`}
            icon="enquiries"
            label="New enquiries"
            tone={newEnquiries.totalDocs ? 'warning' : 'neutral'}
            value={newEnquiries.totalDocs}
            hint={newEnquiries.totalDocs ? 'Waiting for a reply' : 'All answered'}
          />
        ) : null}
      </div>

      <div className="te-grid te-grid--2-1">
        <div className="te-stack">
          {attention.length ? (
            <Card title="Needs your attention">
              <ul className="te-attention">
                {attention.map((item) => (
                  <li key={item.key}>
                    <a className="te-attention__item" href={item.href}>
                      <Icon name={item.icon} size={16} />
                      <span>{item.text}</span>
                      <Icon className="te-attention__go" name="chevronRight" size={16} />
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          <Card title="Recent activity">
            <Suspense fallback={<Skeleton label="Loading recent activity" lines={5} />}>
              <RecentActivity can={can} pages={pages} payload={payload} tenantId={store.id} />
            </Suspense>
          </Card>
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
                <EmptyState icon="calendar" title="Nothing scheduled">
                  Schedule a page from its editor to put it live at a set time, for example a
                  festive offer at 10:00 on the day.
                </EmptyState>
              )}
            </Card>
          ) : null}
        </div>
        <div className="te-stack">
          <QuickActions can={can} store={store} />
          <Suspense fallback={<Skeleton label="Loading the setup checklist" lines={6} />}>
            <StoreSetup enabledFeatures={enabledFeatures} payload={payload} tenantId={store.id} />
          </Suspense>
          <Suspense fallback={<Skeleton label="Loading plan usage" lines={3} />}>
            <StorePlanCard payload={payload} tenantId={store.id} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
