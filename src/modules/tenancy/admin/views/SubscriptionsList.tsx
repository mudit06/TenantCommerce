import type { ListViewServerProps } from 'payload'

import { isPlatformStaff, isSuperAdmin } from '@/access'
import { adminUrl } from '@/admin/paths'
import { ButtonLink, EmptyState, Figure, Notice, PageHeader, Pill } from '@/admin/ui'
import { labelOf, SUBSCRIPTION_STATUS_TONE } from '@/admin/ui/tones'
import { formatINR, formatINRCompact } from '@/lib/money'

import { loadSubscriptionRows } from '../subscriptionsData'

const param = (value: unknown) =>
  typeof value === 'string' ? value : Array.isArray(value) ? String(value[0] ?? '') : ''

/**
 * Subscriptions (docs/screens/super-admin.md `sa-subscriptions`): our billing desk. Who pays
 * what, who is on trial and who owes money, with Record payment on the rows that need it.
 * Replaces Payload's list; a row opens the vendor's Billing tab.
 */
export async function SubscriptionsList({ payload, user, searchParams }: ListViewServerProps) {
  if (!isPlatformStaff(user)) {
    return (
      <div className="te-page">
        <EmptyState icon="shield" title="Our team only">
          Your plan and payments are on your store dashboard.
        </EmptyState>
      </div>
    )
  }
  const tab = param(searchParams?.tab) || 'all'
  const { summary, rows, total } = await loadSubscriptionRows(payload, tab)
  const canRecord = isSuperAdmin(user)
  const counts: Record<string, number> = { all: total, ...summary.statusCounts }
  const tabs = ['all', 'trialing', 'active', 'past_due', 'paused', 'cancelled'] as const

  return (
    <div className="te-page">
      <PageHeader
        actions={
          <ButtonLink
            href={`/api/admin/v1/platform/subscriptions/export${tab === 'all' ? '' : `?tab=${tab}`}`}
            icon="upload"
          >
            Export CSV
          </ButtonLink>
        }
        subtitle={
          <span className="te-inline">
            Manual billing <Pill tone="neutral">Automatic in P2</Pill>
          </span>
        }
        title="Subscriptions"
      />
      <div className="te-figures">
        <Figure
          hint={`${summary.payingCount} paying ${summary.payingCount === 1 ? 'vendor' : 'vendors'}, before GST`}
          label="MRR"
          value={formatINRCompact(summary.mrrMinor)}
        />
        <Figure
          hint={`${summary.trialsEndingSoon} end this week`}
          label="On trial"
          value={summary.trialCount}
        />
        <Figure
          hint={`${formatINR(summary.pastDueOutstandingMinor)} incl. GST`}
          label="Past due"
          tone={summary.pastDueCount ? 'danger' : undefined}
          value={summary.pastDueCount}
        />
        <Figure
          hint={`${formatINR(summary.renewingSoonMinor)} incl. GST`}
          label="Renewing in 7 days"
          value={summary.renewingSoonCount}
        />
      </div>
      <nav aria-label="Subscription status" className="te-tabs te-tabs--underline">
        {tabs.map((key) => (
          <a
            aria-current={tab === key ? 'page' : undefined}
            className={`te-tab${tab === key ? ' te-tab--active' : ''}`}
            href={key === 'all' ? adminUrl.subscriptions : `${adminUrl.subscriptions}?tab=${key}`}
            key={key}
          >
            {key === 'all' ? 'All' : labelOf(key)}{' '}
            <span className="te-tab__count">{counts[key] ?? 0}</span>
          </a>
        ))}
      </nav>
      {rows.length ? (
        <div className="te-card te-card--table">
          <div className="te-table-scroll">
            <table className="te-table te-table--rows te-table--clickable">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Plan</th>
                  <th>Status</th>
                  <th>Billing</th>
                  <th>Period ends</th>
                  <th className="te-num">Amount incl. GST</th>
                  <th>Last payment</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <a
                        className="te-table__primary"
                        href={
                          row.tenantId
                            ? adminUrl.vendor(row.tenantId, 'billing')
                            : adminUrl.subscription(row.id)
                        }
                      >
                        {row.vendor}
                      </a>
                    </td>
                    <td>{row.plan}</td>
                    <td>
                      <Pill tone={SUBSCRIPTION_STATUS_TONE[row.status]}>{labelOf(row.status)}</Pill>
                    </td>
                    <td>{row.billingMode}</td>
                    <td className="te-nowrap">{row.periodEnds}</td>
                    <td className="te-num te-nowrap">
                      {row.dueMinor === null
                        ? '—'
                        : formatINR(row.dueMinor, { decimals: 'always' })}
                    </td>
                    <td className="te-nowrap">{row.lastPayment ?? '—'}</td>
                    <td className="te-cell-actions">
                      {canRecord && row.status === 'past_due' ? (
                        <a
                          className="te-button te-button--secondary te-button--small"
                          href={`${adminUrl.subscription(row.id)}#record-payment`}
                        >
                          Record payment
                        </a>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState icon="subscriptions" title="Nothing here">
          No subscriptions in this tab.
        </EmptyState>
      )}
      <Notice tone="neutral">
        <Pill tone="neutral">P2</Pill> Razorpay Subscriptions: vendors pay by card or UPI autopay;
        failed charges retry and move the status to past due automatically.
      </Notice>
    </div>
  )
}
