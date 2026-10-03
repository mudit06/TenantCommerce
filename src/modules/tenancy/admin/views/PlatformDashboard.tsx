import type { Payload } from 'payload'

import { adminUrl } from '@/admin/paths'
import { Card, Empty, Figure, Pill, Row, Rows } from '@/admin/ui'
import { labelOf, SUBSCRIPTION_STATUS_TONE, TENANT_STATUS_TONE } from '@/admin/ui/tones'
import { formatDate, formatDateWithWeekday } from '@/lib/dates'
import { formatINR, formatINRCompact } from '@/lib/money'

import { loadPlatformDashboard } from '../data'

function greeting(now: Date): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      hourCycle: 'h23',
    }).format(now),
  )
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
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
  const data = await loadPlatformDashboard(payload, now)
  const live = data.counts.active
  const firstName = userName.split(' ')[0] ?? userName

  return (
    <div className="te-page">
      <header className="te-page__header">
        <div>
          <h1 className="te-page__title">
            {greeting(now)}, {firstName}
          </h1>
          <p className="te-page__subtitle">{formatDateWithWeekday(now)} · all stores</p>
        </div>
        {canEdit ? (
          <a className="btn btn--style-primary btn--size-medium te-btn" href={adminUrl.newVendor}>
            New vendor
          </a>
        ) : null}
      </header>

      <div className="te-figures">
        <Figure
          hint={`${data.livePaying} paying · ${data.liveTrialing} on trial`}
          label="Live stores"
          value={live.toLocaleString('en-IN')}
        />
        <Figure hint="before GST" label="MRR" value={formatINRCompact(data.billing.mrrMinor)} />
        <Figure
          hint={
            data.billing.pastDueCount > 0
              ? `${formatINR(data.billing.pastDueOutstandingMinor)} outstanding`
              : 'Nothing outstanding'
          }
          label="Past due"
          tone={data.billing.pastDueCount > 0 ? 'danger' : undefined}
          value={data.billing.pastDueCount}
        />
        <Figure
          hint={`${data.billing.trialsEndingSoon} ending in 7 days`}
          label="On trial"
          value={data.billing.trialCount}
        />
      </div>

      <div className="te-grid te-grid--2-1">
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

        <Card title="Recently onboarded">
          {data.recent.length === 0 ? (
            <Empty>No vendors yet. Start with New vendor.</Empty>
          ) : (
            <Rows>
              {data.recent.map(({ tenant, planName, subscriptionStatus }) => (
                <Row
                  aside={
                    <Pill tone={TENANT_STATUS_TONE[tenant.status]}>{labelOf(tenant.status)}</Pill>
                  }
                  href={adminUrl.vendor(tenant.id)}
                  key={tenant.id}
                  primary={tenant.name}
                  secondary={
                    <>
                      {planName} · created {formatDate(tenant.createdAt)}
                      {subscriptionStatus ? (
                        <>
                          {' · '}
                          <span
                            className={`te-text--${SUBSCRIPTION_STATUS_TONE[subscriptionStatus]}`}
                          >
                            subscription {labelOf(subscriptionStatus).toLowerCase()}
                          </span>
                        </>
                      ) : null}
                    </>
                  }
                />
              ))}
            </Rows>
          )}
        </Card>
      </div>

      <Card title="Orders and sales across stores">
        <Empty>
          Orders today, GMV and top stores appear here once the orders module and the nightly
          daily-stats rollup are built (roadmap sprints 4 and 5).
        </Empty>
      </Card>
    </div>
  )
}
