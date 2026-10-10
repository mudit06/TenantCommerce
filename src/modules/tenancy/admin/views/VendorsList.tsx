import type { ListViewServerProps } from 'payload'

import { isPlatformStaff, isSuperAdmin } from '@/access'
import { adminUrl } from '@/admin/paths'
import { ButtonLink, EmptyState, PageHeader, Pill } from '@/admin/ui'
import { ListToolbar } from '@/admin/ui/ListToolbar'
import { Pager } from '@/admin/ui/Pager'
import { labelOf, SUBSCRIPTION_STATUS_TONE, TENANT_STATUS_TONE } from '@/admin/ui/tones'
import { formatDate } from '@/lib/dates'

import { INDUSTRIES, SUBSCRIPTION_STATUSES } from '../../constants'
import { loadVendorRows, vendorFiltersFrom } from '../vendorsData'

const PAGE_SIZE = 25
const KEYS = ['tab', 'q', 'plan', 'industry', 'subscription', 'page'] as const

const param = (value: unknown) =>
  typeof value === 'string' ? value : Array.isArray(value) ? String(value[0] ?? '') : ''

/**
 * All vendors (docs/screens/super-admin.md `sa-vendors`): every store with its plan, store and
 * subscription status, products used against the plan and orders in 30 days. Replaces Payload's
 * list for tenants; rows open the vendor detail tabs.
 */
export async function VendorsList({ payload, user, searchParams }: ListViewServerProps) {
  if (!isPlatformStaff(user)) {
    return (
      <div className="te-page">
        <EmptyState icon="shield" title="Our team only">
          Vendors are managed from the platform panel.
        </EmptyState>
      </div>
    )
  }
  const params = new URLSearchParams()
  for (const key of KEYS) {
    const value = param(searchParams?.[key])
    if (value) params.set(key, value)
  }
  const filters = vendorFiltersFrom(params)
  const page = Math.max(1, Number(params.get('page')) || 1)
  const { rows, counts, totals, plans } = await loadVendorRows(payload, filters)
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const tabHref = (key: string) => {
    const next = new URLSearchParams(params)
    next.delete('page')
    if (key === 'all') next.delete('tab')
    else next.set('tab', key)
    const query = next.toString()
    return query ? `${adminUrl.vendors}?${query}` : adminUrl.vendors
  }
  const exportParams = new URLSearchParams(params)
  exportParams.delete('page')

  return (
    <div className="te-page">
      <PageHeader
        actions={
          <>
            <ButtonLink
              href={`/api/admin/v1/platform/vendors/export?${exportParams}`}
              icon="upload"
            >
              Export CSV
            </ButtonLink>
            {isSuperAdmin(user) ? (
              <ButtonLink href={adminUrl.newVendor} icon="plus" variant="primary">
                New vendor
              </ButtonLink>
            ) : null}
          </>
        }
        subtitle={`${totals.stores.toLocaleString('en-IN')} stores · ${totals.live.toLocaleString('en-IN')} live`}
        title="Vendors"
      />
      <nav aria-label="Store status" className="te-tabs te-tabs--underline">
        {(['all', 'active', 'draft', 'suspended', 'archived'] as const).map((key) => (
          <a
            aria-current={filters.tab === key ? 'page' : undefined}
            className={`te-tab${filters.tab === key ? ' te-tab--active' : ''}`}
            href={tabHref(key)}
            key={key}
          >
            {key === 'all' ? 'All' : labelOf(key)}{' '}
            <span className="te-tab__count">{counts[key]?.toLocaleString('en-IN')}</span>
          </a>
        ))}
      </nav>
      <ListToolbar
        filters={[
          { key: 'plan', label: 'Plan', anyLabel: 'Plan: all', options: plans },
          {
            key: 'industry',
            label: 'Industry',
            anyLabel: 'Industry: all',
            options: INDUSTRIES.map(({ value, label }) => ({ value, label })),
          },
          {
            key: 'subscription',
            label: 'Subscription',
            anyLabel: 'Subscription: all',
            options: [
              ...SUBSCRIPTION_STATUSES.map((value) => ({ value, label: labelOf(value) })),
              { value: 'none', label: 'No subscription' },
            ],
          },
        ]}
        initial={{
          q: params.get('q') ?? '',
          plan: filters.plan,
          industry: filters.industry,
          subscription: filters.subscription,
        }}
        searchLabel="Search vendors"
        searchPlaceholder="Search name, slug or GSTIN"
      />
      {shown.length ? (
        <div className="te-card te-card--table">
          <div className="te-table-scroll">
            <table className="te-table te-table--rows te-table--clickable">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Industry</th>
                  <th>Plan</th>
                  <th>Store</th>
                  <th>Subscription</th>
                  <th>Products</th>
                  <th className="te-num">Orders, 30 days</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => {
                  const ratio = row.maxProducts ? Math.min(row.products / row.maxProducts, 1) : 0
                  return (
                    <tr key={row.id}>
                      <td>
                        <a className="te-table__primary" href={adminUrl.vendor(row.id)}>
                          {row.name}
                        </a>
                        <div className={`te-muted te-small${row.host ? ' te-mono' : ''}`}>
                          {row.host ?? 'No domain yet'}
                        </div>
                      </td>
                      <td>{row.industry || '—'}</td>
                      <td>{row.planName}</td>
                      <td>
                        <Pill tone={TENANT_STATUS_TONE[row.status]}>{labelOf(row.status)}</Pill>
                      </td>
                      <td>
                        {row.subscription ? (
                          <Pill tone={SUBSCRIPTION_STATUS_TONE[row.subscription]}>
                            {labelOf(row.subscription)}
                          </Pill>
                        ) : (
                          <span className="te-muted">—</span>
                        )}
                      </td>
                      <td>
                        <div className="te-usage-cell">
                          <span className="te-small">
                            {row.products.toLocaleString('en-IN')} /{' '}
                            {row.maxProducts ? row.maxProducts.toLocaleString('en-IN') : 'No limit'}
                          </span>
                          <span
                            aria-hidden
                            className={`te-usage-cell__track${row.nearLimit ? ' te-usage-cell__track--warning' : ''}`}
                          >
                            <i style={{ width: `${ratio * 100}%` }} />
                          </span>
                          {row.nearLimit ? (
                            <span className="te-small te-text--warning">
                              {Math.round((row.products / (row.maxProducts ?? 1)) * 100)}% used
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="te-num">{row.orders30.toLocaleString('en-IN')}</td>
                      <td className="te-nowrap">{formatDate(row.createdAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState icon="vendors" title={counts.all ? 'No vendors match' : 'No vendors yet'}>
          {counts.all
            ? 'Try another tab or clear the search and filters.'
            : 'Onboard the first manufacturer with New vendor.'}
        </EmptyState>
      )}
      <Pager
        base={adminUrl.vendors}
        page={page}
        pageSize={PAGE_SIZE}
        params={params}
        total={rows.length}
      />
      <p className="te-muted te-small">Click a vendor to open its detail tabs.</p>
    </div>
  )
}
