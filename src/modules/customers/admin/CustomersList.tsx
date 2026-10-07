import type { ListViewServerProps } from 'payload'

import { STORE_ADMIN, storeSessionOf } from '@/access'
import { adminUrl } from '@/admin/paths'
import { currentStore, storeRolesOf } from '@/admin/store'
import { ButtonLink, EmptyState, PageHeader, Pill } from '@/admin/ui'
import { calendarDaysBetween, formatDayMonth } from '@/lib/dates'
import { formatINR } from '@/lib/money'
import { maskedPhone } from '@/modules/notifications'

import { PRIVACY_STATUSES, PRIVACY_TYPES } from '../constants'
import { customersWhere } from '../services/list'
import { CustomersToolbar } from './CustomersToolbar'
import { PrivacyRequestsCard, type PrivacyRow } from './PrivacyRequestsCard'

const PAGE_SIZE = 50

const param = (value: unknown) =>
  typeof value === 'string' ? value : Array.isArray(value) ? String(value[0] ?? '') : ''

function lastOrderText(iso: string | null | undefined) {
  if (!iso) return '—'
  const days = calendarDaysBetween(new Date(iso), new Date())
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return formatDayMonth(iso)
}

const isPast = (iso: string) => new Date(iso).getTime() < Date.now()

const labelOf = (list: readonly { value: string; label: string }[], value: string) =>
  list.find((item) => item.value === value)?.label ?? value

/**
 * Customers (docs/screens/vendor-cms.md `cms-customers`): accounts in this store with their
 * orders and spend, and the privacy requests staff handle. Replaces Payload's list.
 */
export async function CustomersList({ payload, user, searchParams }: ListViewServerProps) {
  const store = await currentStore(payload, user)
  if (!store) {
    return (
      <div className="te-page">
        <EmptyState icon="store" title="No store selected">
          Choose a store in the menu to see its customers.
        </EmptyState>
      </div>
    )
  }
  const roles = storeRolesOf(user, store.id)
  const session = storeSessionOf(user)
  const canWrite = session
    ? session.mode === 'manage'
    : roles.some((role) => STORE_ADMIN.includes(role))

  const params = new URLSearchParams()
  for (const key of ['q', 'role', 'offers', 'page']) {
    const value = param(searchParams?.[key])
    if (value) params.set(key, value)
  }
  const page = Math.max(1, Number(params.get('page')) || 1)

  const [{ totalDocs: total }, list, { docs: requests }] = await Promise.all([
    payload.count({
      collection: 'customers',
      where: { tenant: { equals: store.id } },
      overrideAccess: true,
    }),
    payload.find({
      collection: 'customers',
      where: customersWhere(store.id, params),
      sort: '-createdAt',
      depth: 0,
      limit: PAGE_SIZE,
      page,
      overrideAccess: true,
      select: { passwordHash: false, notes: false },
    }),
    payload.find({
      collection: 'privacy-requests',
      where: { tenant: { equals: store.id } },
      sort: '-receivedAt',
      depth: 0,
      limit: 20,
      overrideAccess: true,
    }),
  ])

  const requestRows: PrivacyRow[] = requests.map((request) => {
    const open = request.status === 'received' || request.status === 'in_progress'
    const overdue = open && isPast(request.dueAt)
    return {
      id: String(request.id),
      type: request.type,
      typeLabel: labelOf(PRIVACY_TYPES, request.type),
      who: request.contact?.email || request.contact?.phone || '—',
      hasAccount: Boolean(request.customer),
      status: request.status,
      statusLabel: labelOf(PRIVACY_STATUSES, request.status),
      when: open
        ? `${overdue ? 'Overdue, was due' : 'Due'} ${formatDayMonth(request.dueAt)}`
        : request.completedAt
          ? `${labelOf(PRIVACY_STATUSES, request.status)} ${formatDayMonth(request.completedAt)}`
          : labelOf(PRIVACY_STATUSES, request.status),
      overdue,
      notes: request.notes ?? '',
    }
  })

  const pageHref = (n: number) => {
    const next = new URLSearchParams(params)
    next.set('page', String(n))
    return `${adminUrl.collection('customers')}?${next}`
  }
  const exportParams = new URLSearchParams(params)
  exportParams.delete('page')
  exportParams.set('store', store.id)

  return (
    <div className="te-page">
      <PageHeader
        actions={
          <ButtonLink
            href={`/api/admin/v1/customers/export?${exportParams}`}
            icon="upload"
            size="small"
          >
            Export CSV
          </ButtonLink>
        }
        eyebrow={store.name}
        subtitle={`${total.toLocaleString('en-IN')} account${total === 1 ? '' : 's'} in this store. Accounts belong to this store only.`}
        title="Customers"
      />
      <CustomersToolbar
        initial={{
          q: params.get('q') ?? '',
          role: params.get('role') ?? '',
          offers: params.get('offers') ?? '',
        }}
      />
      {list.docs.length ? (
        <div className="te-card te-card--table">
          <div className="te-table-scroll">
            <table className="te-table te-table--rows">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th className="te-num">Orders</th>
                  <th className="te-num">Spent</th>
                  <th>Last order</th>
                  <th>Roles</th>
                  <th>Offers</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {list.docs.map((customer) => {
                  const offers = [
                    customer.marketingConsent?.email ? 'Email' : null,
                    customer.marketingConsent?.whatsapp ? 'WhatsApp' : null,
                  ].filter(Boolean)
                  return (
                    <tr key={customer.id}>
                      <td>
                        <a
                          className="te-strong te-link"
                          href={adminUrl.doc('customers', customer.id)}
                        >
                          {customer.name || customer.email}
                        </a>
                        <div className="te-muted te-small">{customer.email}</div>
                        {customer.status === 'blocked' ? <Pill tone="danger">Blocked</Pill> : null}
                      </td>
                      <td className="te-nowrap">
                        {customer.phone ? maskedPhone(customer.phone) : '—'}
                      </td>
                      <td className="te-num">
                        {customer.ordersCount ? (
                          <a
                            className="te-link"
                            href={`${adminUrl.collection('orders')}?q=${encodeURIComponent(customer.email)}`}
                          >
                            {customer.ordersCount}
                          </a>
                        ) : (
                          0
                        )}
                      </td>
                      <td className="te-num te-nowrap">
                        {formatINR(customer.totalSpentMinor ?? 0)}
                      </td>
                      <td className="te-nowrap">{lastOrderText(customer.lastOrderAt)}</td>
                      <td>
                        {['Shopper', ...(customer.roles ?? []).map(() => 'Affiliate')].join(', ')}
                      </td>
                      <td>{offers.length ? offers.join(', ') : '—'}</td>
                      <td className="te-nowrap">{formatDayMonth(customer.createdAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState icon="staff" title={total ? 'No customers match' : 'No accounts yet'}>
          {total
            ? 'Clear the search or filters.'
            : 'Shoppers create an account with an email code on your store, or from the order confirmation page.'}
        </EmptyState>
      )}
      {list.totalPages > 1 ? (
        <nav aria-label="Pages" className="te-pager">
          {page > 1 ? (
            <a className="te-link" href={pageHref(page - 1)}>
              ← Newer
            </a>
          ) : (
            <span />
          )}
          <span className="te-muted te-small">
            Page {page} of {list.totalPages}
          </span>
          {page < list.totalPages ? (
            <a className="te-link" href={pageHref(page + 1)}>
              Older →
            </a>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
      <p className="te-muted te-small">
        Guest orders are listed under{' '}
        <a className="te-link" href={adminUrl.collection('orders')}>
          Orders
        </a>
        . Offers shows what the shopper agreed to; staff can’t switch it on for them.
      </p>
      <PrivacyRequestsCard canWrite={canWrite} rows={requestRows} storeId={store.id} />
    </div>
  )
}
