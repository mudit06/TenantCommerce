import type { Payload } from 'payload'

import { adminUrl } from '@/admin/paths'
import { Card, Empty, Figure, Pill, Row, Rows } from '@/admin/ui'
import { BarChart } from '@/admin/ui/BarChart'
import { labelOf, SUBSCRIPTION_STATUS_TONE, TENANT_STATUS_TONE } from '@/admin/ui/tones'
import { formatDate, formatDateWithWeekday, greetingFor } from '@/lib/dates'
import { formatINR, formatINRCompact } from '@/lib/money'
import { ResendInviteButton } from '@/modules/identity/admin'
import { platformSales } from '@/modules/reports'

import { INDUSTRIES } from '../../constants'
import { loadPlatformDashboard } from '../data'

const INDUSTRY_LABEL = new Map<string, string>(INDUSTRIES.map((i) => [i.value, i.label]))

/** "+12%" against last month to the same day; "New" when it sold nothing then. */
function versus(current: number, previous: number): { text: string; tone: string } {
  if (!previous) return { text: current ? 'New' : '—', tone: 'te-muted' }
  const change = Math.round(((current - previous) / previous) * 100)
  return {
    text: `${change > 0 ? '+' : change < 0 ? '−' : ''}${Math.abs(change)}%`,
    tone: change < 0 ? 'te-text--danger' : 'te-text--success',
  }
}

/** docs/screens/super-admin.md "Platform dashboard". */
export async function PlatformDashboard({
  payload,
  userName,
  canEdit,
}: {
  payload: Payload
  userName: string
  canEdit: boolean
}) {
  const now = new Date()
  const [data, sales] = await Promise.all([
    loadPlatformDashboard(payload, now),
    platformSales(payload, now),
  ])
  const live = data.counts.active
  const firstName = userName.split(' ')[0] ?? userName
  const monthName = sales.month.label.split(' ')[0] ?? sales.month.label
  const shortMonth = monthName.slice(0, 3)

  return (
    <div className="te-page">
      <header className="te-page__header">
        <div>
          <h1 className="te-page__title">
            {greetingFor(now)}, {firstName}
          </h1>
          <p className="te-page__subtitle">{formatDateWithWeekday(now)} · all stores</p>
        </div>
        {canEdit ? (
          <a className="btn btn--style-primary btn--size-medium te-btn" href={adminUrl.newVendor}>
            New vendor
          </a>
        ) : null}
      </header>

      <div className="te-figures te-figures--5">
        <Figure
          hint={`${data.livePaying} paying · ${data.liveTrialing} on trial`}
          href={`${adminUrl.vendors}?where[status][equals]=active`}
          label="Live stores"
          value={live.toLocaleString('en-IN')}
        />
        <Figure
          hint="before GST"
          href={adminUrl.subscriptions}
          label="MRR"
          value={formatINRCompact(data.billing.mrrMinor)}
        />
        <Figure
          hint={
            data.billing.pastDueCount > 0
              ? `${formatINR(data.billing.pastDueOutstandingMinor)} outstanding`
              : 'Nothing outstanding'
          }
          href={adminUrl.subscriptions}
          label="Past due"
          tone={data.billing.pastDueCount > 0 ? 'danger' : undefined}
          value={data.billing.pastDueCount}
        />
        <Figure
          hint="across all stores"
          label="Orders today"
          value={sales.ordersToday.toLocaleString('en-IN')}
        />
        <Figure
          hint="paid orders, incl. GST"
          label={`GMV, ${monthName}`}
          value={formatINRCompact(sales.gmvMinor)}
        />
      </div>

      <div className="te-grid te-grid--2-1">
        <Card
          actions={<span className="te-muted te-small">Daily GMV</span>}
          title={`Sales across all stores, ${monthName}`}
        >
          <BarChart
            bars={sales.daily.map((d) => ({
              key: String(d.day),
              title: `${d.day} ${shortMonth}`,
              value: d.salesMinor,
            }))}
            format={formatINRCompact}
            label={`${formatINR(sales.gmvMinor)} of paid orders across all stores in ${sales.month.label}`}
            minTop={100_000_00}
            xLabels={[
              `1 ${shortMonth}`,
              `${Math.ceil(sales.month.days / 2)} ${shortMonth}`,
              `${sales.month.days} ${shortMonth}`,
            ]}
          />
        </Card>

        <Card title="Needs attention">
          {data.attention.length === 0 ? (
            <Empty>All clear. Nothing needs your team right now.</Empty>
          ) : (
            <Rows>
              {data.attention.slice(0, 12).map((item, index) => (
                <Row
                  aside={<Pill tone={item.tone}>{item.tag}</Pill>}
                  href={adminUrl.vendor(item.tenantId, item.tab)}
                  key={`${item.tenantId}-${index}`}
                  primary={item.vendor}
                  secondary={item.message}
                />
              ))}
            </Rows>
          )}
        </Card>
      </div>

      <div className="te-grid te-grid--2-1">
        <Card className="te-card--flush" title="Top stores this month">
          {sales.topStores.length === 0 ? (
            <Empty>No paid orders in any store yet this month.</Empty>
          ) : (
            <table className="te-table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Industry</th>
                  <th className="te-num">Orders</th>
                  <th className="te-num">GMV</th>
                  <th className="te-num">vs {sales.month.prevLabel}</th>
                </tr>
              </thead>
              <tbody>
                {sales.topStores.map((row) => {
                  const tenant = data.tenantById.get(row.tenantId)
                  const change = versus(row.salesMinor, row.previousMinor)
                  return (
                    <tr key={row.tenantId}>
                      <td>
                        <a className="te-link" href={adminUrl.vendor(row.tenantId)}>
                          {tenant?.name ?? 'Unknown store'}
                        </a>
                      </td>
                      <td className="te-muted">
                        {(tenant?.industry ?? [])
                          .map((value) => INDUSTRY_LABEL.get(value) ?? value)
                          .join(', ') || '—'}
                      </td>
                      <td className="te-num">{row.orders.toLocaleString('en-IN')}</td>
                      <td className="te-num">{formatINRCompact(row.salesMinor)}</td>
                      <td className={`te-num ${change.tone}`}>{change.text}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Recently onboarded">
          {data.recent.length === 0 ? (
            <Empty>No vendors yet. Start with New vendor.</Empty>
          ) : (
            <Rows>
              {data.recent.map(({ tenant, planName, subscriptionStatus, invitedOwnerId }) => (
                <Row
                  aside={
                    invitedOwnerId && canEdit ? (
                      <ResendInviteButton userId={invitedOwnerId} />
                    ) : subscriptionStatus === 'trialing' && tenant.status === 'active' ? (
                      <Pill tone={SUBSCRIPTION_STATUS_TONE.trialing}>Trialing</Pill>
                    ) : (
                      <Pill tone={TENANT_STATUS_TONE[tenant.status]}>{labelOf(tenant.status)}</Pill>
                    )
                  }
                  key={tenant.id}
                  primary={
                    <a className="te-link" href={adminUrl.vendor(tenant.id)}>
                      {tenant.name}
                    </a>
                  }
                  secondary={
                    invitedOwnerId
                      ? 'Owner has not accepted the invite'
                      : tenant.activatedAt
                        ? `${planName} · live since ${formatDate(tenant.activatedAt)}`
                        : `${planName} · ${tenant.usage?.productsCount ?? 0} products · created ${formatDate(tenant.createdAt)}`
                  }
                />
              ))}
            </Rows>
          )}
        </Card>
      </div>
    </div>
  )
}
