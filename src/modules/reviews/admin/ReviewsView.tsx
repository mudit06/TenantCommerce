import type { ListViewServerProps } from 'payload'

import { storeSessionOf } from '@/access'
import { currentStore, storeRolesOf } from '@/admin/store'
import { EmptyState, PageHeader } from '@/admin/ui'
import { formatRelative } from '@/lib/dates'
import { featureConfig } from '@/modules/tenancy'

import { REJECTION_REASONS } from '../constants'
import { REVIEW_ROLES } from '../services/access'
import { ReviewsClient, type ReviewCard, type ReviewSettings } from './ReviewsClient'

const TABS = ['pending', 'published', 'rejected'] as const

const param = (value: unknown) =>
  typeof value === 'string' ? value : Array.isArray(value) ? String(value[0] ?? '') : ''

/** First of this month in India, for "This month" */
function monthStart(now = new Date()) {
  const india = new Date(now.getTime() + 330 * 60_000)
  return new Date(Date.UTC(india.getUTCFullYear(), india.getUTCMonth(), 1) - 330 * 60_000)
}

/**
 * Reviews (docs/screens/vendor-cms.md `cms-reviews`): approve, reject with a reason or reply;
 * the store's review settings and this month's figures beside the list.
 */
export async function ReviewsView({ payload, user, searchParams }: ListViewServerProps) {
  const store = await currentStore(payload, user)
  if (!store) {
    return (
      <div className="te-page">
        <EmptyState icon="store" title="No store selected">
          Choose a store in the menu to see its reviews.
        </EmptyState>
      </div>
    )
  }
  const roles = storeRolesOf(user, store.id)
  const session = storeSessionOf(user)
  const canModerate = session
    ? session.mode === 'manage'
    : roles.some((r) => REVIEW_ROLES.includes(r) && r !== 'support')
  const canSettings = session
    ? session.mode === 'manage'
    : roles.some((r) => r === 'owner' || r === 'manager')
  const tab = (TABS as readonly string[]).includes(param(searchParams?.tab))
    ? param(searchParams?.tab)
    : 'pending'
  const rating = Number(param(searchParams?.rating)) || null
  const product = param(searchParams?.product) || null
  const photos = param(searchParams?.photos) === '1'

  const scope = { tenant: { equals: store.id } }
  const since = monthStart().toISOString()
  const [counts, list, published, products, config, month, requests] = await Promise.all([
    Promise.all(
      TABS.map((status) =>
        payload.count({
          collection: 'reviews',
          where: { and: [scope, { status: { equals: status } }] },
          overrideAccess: true,
        }),
      ),
    ),
    payload.find({
      collection: 'reviews',
      where: {
        and: [
          scope,
          { status: { equals: tab } },
          ...(rating ? [{ rating: { equals: rating } }] : []),
          ...(product ? [{ product: { equals: product } }] : []),
          ...(photos ? [{ 'photos.0': { exists: true } }] : []),
        ],
      },
      sort: '-createdAt',
      depth: 1,
      limit: 50,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'reviews',
      where: { and: [scope, { status: { equals: 'published' } }] },
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { rating: true },
    }),
    payload.find({
      collection: 'reviews',
      where: scope,
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { product: true, productTitle: true },
    }),
    featureConfig<ReviewSettings>(payload, store.id, 'reviews'),
    payload.find({
      collection: 'reviews',
      where: { and: [scope, { createdAt: { greater_than: since } }] },
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { status: true, rating: true },
    }),
    payload.count({
      collection: 'notification-logs',
      where: {
        and: [
          scope,
          { milestone: { equals: 'review_request' } },
          { createdAt: { greater_than: since } },
        ],
      },
      overrideAccess: true,
    }),
  ])
  const average = published.docs.length
    ? (published.docs.reduce((s, r) => s + r.rating, 0) / published.docs.length).toFixed(1)
    : null
  const productOptions = [
    ...new Map(products.docs.map((r) => [r.product, r.productTitle ?? 'Product'])).entries(),
  ].map(([value, label]) => ({ value, label }))
  const cards: ReviewCard[] = list.docs.map((r) => ({
    id: String(r.id),
    rating: r.rating,
    title: r.title ?? '',
    body: r.body ?? '',
    meta: [
      r.displayName,
      [r.productTitle, r.variantLabel].filter(Boolean).join(', '),
      r.orderNumber,
      formatRelative(r.createdAt),
    ]
      .filter(Boolean)
      .join(' · '),
    photos: (r.photos ?? [])
      .map((p) => (typeof p === 'object' && p ? (p.sizes?.thumb?.url ?? p.url ?? null) : null))
      .filter((u): u is string => Boolean(u)),
    status: r.status,
    reason: REJECTION_REASONS.find((x) => x.value === r.rejectionReason)?.label ?? null,
    reply: r.reply?.text ?? null,
    // A phone number or email in the text: the reason to pick is "personal details"
    personal: /(\d[\s-]?){8,}|@\w/.test(`${r.title ?? ''} ${r.body ?? ''}`),
  }))
  const monthPublished = month.docs.filter((r) => r.status === 'published')
  const monthAverage = monthPublished.length
    ? (monthPublished.reduce((s, r) => s + r.rating, 0) / monthPublished.length).toFixed(1)
    : '—'

  return (
    <div className="te-page">
      <PageHeader
        eyebrow={store.name}
        subtitle={
          average
            ? `${average} average from ${published.docs.length.toLocaleString('en-IN')} published review${published.docs.length === 1 ? '' : 's'}`
            : 'No published reviews yet'
        }
        title="Reviews"
      />
      <ReviewsClient
        canModerate={canModerate}
        canSettings={canSettings}
        cards={cards}
        counts={{
          pending: counts[0]!.totalDocs,
          published: counts[1]!.totalDocs,
          rejected: counts[2]!.totalDocs,
        }}
        filters={{ tab, rating: rating ? String(rating) : '', product: product ?? '', photos }}
        month={{
          requests: requests.totalDocs,
          received: month.docs.length,
          approved: monthPublished.length,
          rejected: month.docs.filter((r) => r.status === 'rejected').length,
          average: monthAverage,
        }}
        products={productOptions}
        settings={
          config ?? {
            holdForApproval: true,
            showOnProductPages: true,
            allowPhotos: true,
            requestAfterDays: 5,
            requestChannels: ['email'],
          }
        }
        storeId={store.id}
      />
    </div>
  )
}
