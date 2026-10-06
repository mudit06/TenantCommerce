import type { ListViewServerProps } from 'payload'

import { storeSessionOf } from '@/access'
import { adminUrl } from '@/admin/paths'
import { currentStore, storeRolesOf } from '@/admin/store'
import { ButtonLink, EmptyState, PageHeader } from '@/admin/ui'
import { formatDayMonth, formatRelative, formatTime } from '@/lib/dates'
import { GST_STATE_OPTIONS, GST_STATES } from '@/lib/gst/gstin'
import { formatINR } from '@/lib/money'

import { ordersWhere } from '../endpoints'
import { deliveryPill, paymentPill } from './orderPills'
import { OrdersTable, type OrderRow } from './OrdersTable'
import { OrdersToolbar } from './OrdersToolbar'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'to-pack', label: 'To pack' },
  { key: 'packed', label: 'Packed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'out-for-delivery', label: 'Out for delivery' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'unpaid', label: 'Awaiting payment' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'returns', label: 'Returns' },
] as const

const PAGE_SIZE = 50

const param = (value: unknown) =>
  typeof value === 'string' ? value : Array.isArray(value) ? String(value[0] ?? '') : ''

function placedText(iso: string) {
  const at = new Date(iso)
  const days = (Date.now() - at.getTime()) / 86_400_000
  if (days < 1 && new Date().toDateString() === at.toDateString()) return `Today ${formatTime(at)}`
  if (days < 2) return `${formatRelative(at)}`
  return `${formatDayMonth(at)} ${formatTime(at)}`
}

/**
 * Orders (docs/screens/vendor-cms.md `cms-orders`): every order grouped by what needs doing
 * next, with order, payment and delivery shown separately. Replaces Payload's list for orders.
 */
export async function OrdersList({ payload, user, searchParams }: ListViewServerProps) {
  const store = await currentStore(payload, user)
  if (!store) {
    return (
      <div className="te-page">
        <EmptyState icon="store" title="No store selected">
          Choose a store in the menu to see its orders.
        </EmptyState>
      </div>
    )
  }
  const roles = storeRolesOf(user, store.id)
  const session = storeSessionOf(user)
  const canWrite = session
    ? session.mode === 'manage'
    : roles.some((role) => role === 'owner' || role === 'manager' || role === 'order-manager')

  const params = new URLSearchParams()
  for (const key of ['tab', 'q', 'days', 'payment', 'state', 'page']) {
    const value = param(searchParams?.[key])
    if (value) params.set(key, value)
  }
  const tab = params.get('tab') ?? 'all'
  const page = Math.max(1, Number(params.get('page')) || 1)

  const counts = await Promise.all(
    TABS.map(async ({ key }) => {
      const scoped = new URLSearchParams(params)
      if (key === 'all') scoped.delete('tab')
      else scoped.set('tab', key)
      const { totalDocs } = await payload.count({
        collection: 'orders',
        where: ordersWhere(store.id, scoped),
        overrideAccess: true,
      })
      return [key, totalDocs] as const
    }),
  )
  const countOf = Object.fromEntries(counts) as Record<string, number>

  const { docs, totalPages } = await payload.find({
    collection: 'orders',
    where: ordersWhere(store.id, params),
    sort: '-placedAt',
    depth: 0,
    limit: PAGE_SIZE,
    page,
    overrideAccess: true,
  })
  const ids = docs.map((doc) => doc.id)
  const [{ docs: payments }, { docs: parcels }] = await Promise.all([
    payload.find({
      collection: 'transactions',
      where: {
        and: [
          { order: { in: ids } },
          { status: { in: ['captured', 'authorized', 'refunded', 'partially_refunded'] } },
        ],
      },
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { order: true, methodDetail: true },
    }),
    payload.find({
      collection: 'shipments',
      where: { order: { in: ids } },
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { order: true, carrier: true },
    }),
  ])
  const methodOf = new Map(
    payments.map((p) => [
      String(typeof p.order === 'object' ? p.order?.id : p.order),
      p.methodDetail,
    ]),
  )
  const carrierOf = new Map(
    parcels.map((p) => [String(typeof p.order === 'object' ? p.order?.id : p.order), p.carrier]),
  )

  const rows: OrderRow[] = docs.map((order) => {
    const address = order.shippingAddress
    const payment = paymentPill(order)
    const delivery = deliveryPill(order)
    return {
      id: String(order.id),
      href: adminUrl.doc('orders', order.id),
      orderNumber: order.orderNumber,
      placed: placedText(order.placedAt ?? order.createdAt),
      customer: order.contact?.name ?? address?.name ?? '—',
      place: [
        address?.city,
        address?.stateCode ? GST_STATES[address.stateCode as keyof typeof GST_STATES] : null,
      ]
        .filter(Boolean)
        .join(', '),
      items: (order.items ?? []).reduce((sum, item) => sum + item.qty, 0),
      total: formatINR(order.totals?.grandTotalMinor ?? 0, { decimals: 'always' }),
      payment: { ...payment, detail: methodOf.get(String(order.id)) ?? null },
      delivery: { ...delivery, detail: carrierOf.get(String(order.id)) ?? null },
      canPack: order.status === 'confirmed' && order.fulfillmentStatus === 'unfulfilled',
      hasInvoice: Boolean(order.invoice),
    }
  })

  const tabHref = (key: string) => {
    const next = new URLSearchParams(params)
    next.delete('page')
    if (key === 'all') next.delete('tab')
    else next.set('tab', key)
    const query = next.toString()
    return query ? `${adminUrl.collection('orders')}?${query}` : adminUrl.collection('orders')
  }
  const pageHref = (n: number) => {
    const next = new URLSearchParams(params)
    next.set('page', String(n))
    return `${adminUrl.collection('orders')}?${next}`
  }
  const exportParams = new URLSearchParams(params)
  exportParams.delete('page')
  exportParams.set('store', store.id)

  return (
    <div className="te-page">
      <PageHeader
        actions={
          <ButtonLink
            href={`/api/admin/v1/orders/export?${exportParams}`}
            icon="upload"
            size="small"
          >
            Export CSV
          </ButtonLink>
        }
        eyebrow={store.name}
        subtitle="Grouped by what needs doing next: confirm, pack, ship, and handle returns."
        title="Orders"
      />
      <nav aria-label="Order status" className="te-tabs te-tabs--underline">
        {TABS.map(({ key, label }) => (
          <a
            aria-current={tab === key ? 'page' : undefined}
            className={`te-tab${tab === key ? ' te-tab--active' : ''}`}
            href={tabHref(key)}
            key={key}
          >
            {label} <span className="te-tab__count">{countOf[key]?.toLocaleString('en-IN')}</span>
          </a>
        ))}
      </nav>
      <OrdersToolbar
        initial={{
          q: params.get('q') ?? '',
          days: params.get('days') ?? '',
          payment: params.get('payment') ?? '',
          state: params.get('state') ?? '',
        }}
        states={GST_STATE_OPTIONS.map((option) => ({
          value: option.value,
          label: option.label.replace(/ \(\d+\)$/, ''),
        }))}
      />
      {rows.length ? (
        <OrdersTable canWrite={canWrite} rows={rows} storeId={store.id} />
      ) : (
        <EmptyState icon="receipt" title={countOf.all ? 'No orders match' : 'No orders yet'}>
          {countOf.all
            ? 'Try another tab or clear the filters.'
            : 'Orders placed on the store appear here, newest first.'}
        </EmptyState>
      )}
      {totalPages > 1 ? (
        <nav aria-label="Pages" className="te-pager">
          {page > 1 ? (
            <a className="te-link" href={pageHref(page - 1)}>
              ← Newer
            </a>
          ) : (
            <span />
          )}
          <span className="te-muted te-small">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <a className="te-link" href={pageHref(page + 1)}>
              Older →
            </a>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  )
}
