import type { ListViewServerProps } from 'payload'

import { STORE_ADMIN, storeSessionOf } from '@/access'
import { adminUrl } from '@/admin/paths'
import { currentStore, storeRolesOf } from '@/admin/store'
import { Card, EmptyState, PageHeader, Pill, type Tone } from '@/admin/ui'
import { formatINR } from '@/lib/money'
import type { Scheme } from '@/payload-types'

import { OCCASIONS, occasionOf, SCHEME_STATUSES } from '../occasions'
import { describeScheme } from '../rules'
import { schemeRule } from '../services/load'
import { NewSchemeButtons } from './NewSchemeButtons'

const TABS = ['all', 'live', 'scheduled', 'draft', 'paused', 'ended'] as const
const TONE: Record<string, Tone> = {
  live: 'success',
  scheduled: 'warning',
  draft: 'neutral',
  paused: 'info',
  ended: 'neutral',
}

const day = (iso: string, year = false) =>
  new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    ...(year ? { year: 'numeric' as const } : {}),
    timeZone: 'Asia/Kolkata',
  })

const param = (value: unknown) =>
  typeof value === 'string' ? value : Array.isArray(value) ? String(value[0] ?? '') : ''

/** Six months from the start of this month, for the timeline */
function timelineWindow(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 6, 1))
  const months = Array.from({ length: 6 }, (_, i) =>
    new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1)).toLocaleDateString('en-IN', {
      month: 'short',
      timeZone: 'UTC',
    }),
  )
  return { start, end, months }
}

/**
 * Schemes and offers (docs/screens/vendor-cms.md `cms-schemes`): start from an occasion, the
 * timeline with overlaps, and every scheme with its results. Replaces Payload's list.
 */
export async function SchemesList({ payload, user, searchParams }: ListViewServerProps) {
  const store = await currentStore(payload, user)
  if (!store) {
    return (
      <div className="te-page">
        <EmptyState icon="store" title="No store selected">
          Choose a store in the menu to see its schemes.
        </EmptyState>
      </div>
    )
  }
  const roles = storeRolesOf(user, store.id)
  const session = storeSessionOf(user)
  const canWrite = session ? session.mode === 'manage' : roles.some((r) => STORE_ADMIN.includes(r))
  const tab = (TABS as readonly string[]).includes(param(searchParams?.tab))
    ? param(searchParams?.tab)
    : 'all'

  const { docs: schemes } = await payload.find({
    collection: 'schemes',
    where: { tenant: { equals: store.id } },
    sort: '-startsAt',
    depth: 1,
    limit: 500,
    pagination: false,
    overrideAccess: true,
  })
  const count = (status: string) =>
    schemes.filter((s) => status === 'all' || s.status === status).length
  const shown = schemes.filter((s) => tab === 'all' || s.status === tab)

  const covers = (scheme: Scheme) => {
    const mode = scheme.appliesTo?.mode ?? 'all'
    if (scheme.offer?.type === 'special-price') {
      const n = scheme.offer.specialPrices?.length ?? 0
      return `${n} launch price${n === 1 ? '' : 's'}`
    }
    if (mode === 'categories') {
      const names = (scheme.appliesTo?.categories ?? [])
        .map((c) => (typeof c === 'object' && c ? c.name : null))
        .filter(Boolean)
      return names.length ? names.join(', ') : 'Categories'
    }
    if (mode === 'products') {
      const n = scheme.appliesTo?.products?.length ?? 0
      return `${n} product${n === 1 ? '' : 's'}`
    }
    return 'Whole store'
  }
  const offer = (scheme: Scheme) => {
    const rule = schemeRule({ ...scheme, appliesTo: { mode: 'all' } } as Scheme)
    if (rule.type === 'special-price') {
      const first = scheme.offer?.specialPrices?.[0]
      const product = first && typeof first.product === 'object' ? first.product : null
      return first?.priceMinor
        ? `Launch price ${formatINR(first.priceMinor)}${product?.price?.amountMinor ? ` (was ${formatINR(product.price.amountMinor)})` : ''}`
        : 'Launch price'
    }
    return describeScheme(rule)
  }

  const { start, end, months } = timelineWindow()
  const span = end.getTime() - start.getTime()
  const onTimeline = schemes
    .filter((s) => s.status !== 'ended' || new Date(s.endsAt) > start)
    .filter((s) => new Date(s.startsAt) < end && new Date(s.endsAt) > start)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 8)
  const pos = (iso: string) =>
    Math.min(100, Math.max(0, ((new Date(iso).getTime() - start.getTime()) / span) * 100))
  // Overlapping running schemes, for the line under the timeline (rule 2)
  const running = onTimeline.filter((s) => s.status !== 'draft' && s.status !== 'ended')
  let overlap: string | null = null
  for (let i = 0; i < running.length && !overlap; i++) {
    for (let j = i + 1; j < running.length && !overlap; j++) {
      const a = running[i]!
      const b = running[j]!
      const from = a.startsAt > b.startsAt ? a.startsAt : b.startsAt
      const to = a.endsAt < b.endsAt ? a.endsAt : b.endsAt
      if (from < to) {
        overlap = `${a.name} and ${b.name} overlap from ${day(from)} to ${day(to)}: each product gets whichever gives the shopper the better price.`
      }
    }
  }

  const live = count('live')
  const scheduled = count('scheduled')
  const tabHref = (key: string) =>
    key === 'all' ? adminUrl.collection('schemes') : `${adminUrl.collection('schemes')}?tab=${key}`

  return (
    <div className="te-page">
      <PageHeader
        actions={
          canWrite ? <NewSchemeButtons occasions={[]} storeId={store.id} variant="button" /> : null
        }
        eyebrow={store.name}
        subtitle={`${live} live · ${scheduled} scheduled. Schemes start and end by themselves at the minute set.`}
        title="Schemes and offers"
      />
      {canWrite ? (
        <Card title="Start from an occasion">
          <NewSchemeButtons
            occasions={OCCASIONS.map(({ value, label }) => ({ value, label }))}
            storeId={store.id}
            variant="chips"
          />
          <p className="te-muted te-small">
            The occasion fills the name, badge and offer type. You always type the dates: festival
            dates move every year.
          </p>
        </Card>
      ) : null}
      <Card title={`Timeline, ${months[0]} to ${months[5]}`}>
        {onTimeline.length ? (
          <div className="te-timeline">
            <div className="te-timeline__months" aria-hidden>
              <span />
              <div>
                {months.map((m, i) => (
                  <span key={`${m}-${i}`}>{m}</span>
                ))}
              </div>
            </div>
            {onTimeline.map((s) => (
              <div className="te-timeline__row" key={s.id}>
                <a className="te-timeline__name te-link" href={adminUrl.doc('schemes', s.id)}>
                  {s.name}
                </a>
                <div className="te-timeline__track">
                  <span
                    className={`te-timeline__bar te-timeline__bar--${s.status}`}
                    style={{
                      left: `${pos(s.startsAt)}%`,
                      width: `${Math.max(1.5, pos(s.endsAt) - pos(s.startsAt))}%`,
                    }}
                    title={`${day(s.startsAt)} to ${day(s.endsAt)}`}
                  />
                </div>
                <Pill tone={TONE[s.status] ?? 'neutral'}>
                  {SCHEME_STATUSES.find((x) => x.value === s.status)?.label}
                </Pill>
              </div>
            ))}
            {overlap ? <p className="te-muted te-small">{overlap}</p> : null}
          </div>
        ) : (
          <p className="te-muted">No schemes in the next six months.</p>
        )}
      </Card>
      <nav aria-label="Scheme status" className="te-tabs te-tabs--underline">
        {TABS.map((key) => (
          <a
            aria-current={tab === key ? 'page' : undefined}
            className={`te-tab${tab === key ? ' te-tab--active' : ''}`}
            href={tabHref(key)}
            key={key}
          >
            {key === 'all' ? 'All' : SCHEME_STATUSES.find((s) => s.value === key)?.label}{' '}
            <span className="te-tab__count">{count(key)}</span>
          </a>
        ))}
      </nav>
      {shown.length ? (
        <div className="te-card te-card--table">
          <div className="te-table-scroll">
            <table className="te-table te-table--rows">
              <thead>
                <tr>
                  <th>Scheme</th>
                  <th>Offer</th>
                  <th>Covers</th>
                  <th>Dates</th>
                  <th>Status</th>
                  <th className="te-num">Orders</th>
                  <th className="te-num">Discount given</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((s) => {
                  const started =
                    s.status === 'live' || s.status === 'ended' || s.status === 'paused'
                  const yearShown = new Date(s.endsAt).getFullYear() !== new Date().getFullYear()
                  return (
                    <tr key={s.id}>
                      <td>
                        <a className="te-strong te-link" href={adminUrl.doc('schemes', s.id)}>
                          {s.name}
                        </a>
                        <div className="te-muted te-small">{occasionOf(s.occasion).label}</div>
                      </td>
                      <td>{offer(s)}</td>
                      <td>{covers(s)}</td>
                      <td className="te-nowrap">
                        {day(s.startsAt)} to {day(s.endsAt, yearShown)}
                      </td>
                      <td>
                        <Pill tone={TONE[s.status] ?? 'neutral'}>
                          {SCHEME_STATUSES.find((x) => x.value === s.status)?.label}
                        </Pill>
                      </td>
                      <td className="te-num">{started ? (s.stats?.orders ?? 0) : '—'}</td>
                      <td className="te-num te-nowrap">
                        {started ? formatINR(s.stats?.discountMinor ?? 0) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState icon="calendar" title={schemes.length ? 'No schemes here' : 'No schemes yet'}>
          {schemes.length
            ? 'Try another tab.'
            : 'Start one from an occasion above. A scheme applies by itself, no code needed.'}
        </EmptyState>
      )}
      <p className="te-muted te-small">
        Results update every night. In Phase 1 schemes are for retail shoppers; trade schemes for
        dealers, retailers, wholesalers and interior designers come in Phase 2.
      </p>
    </div>
  )
}
