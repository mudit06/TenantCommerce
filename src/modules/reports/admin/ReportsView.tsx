import type { AdminViewServerProps } from 'payload'

import { adminUrl } from '@/admin/paths'
import { requireSignedIn } from '@/admin/session/requireSignedIn'
import { currentStore, storeRolesOf } from '@/admin/store'
import { AdminScreen } from '@/admin/ui/AdminScreen'
import { Card, Empty, Figure, Notice, PageHeader } from '@/admin/ui'
import { storeSessionOf } from '@/access'
import { formatINR } from '@/lib/money'

import { buildReport, REPORT_ROLES } from '../services/report'
import { MonthPicker } from './MonthPicker'

/** Reports (docs/screens/vendor-cms.md `cms-reports`): one month at a time. */
export async function ReportsView(view: AdminViewServerProps) {
  return (
    <AdminScreen view={view}>
      <Reports view={view} />
    </AdminScreen>
  )
}

const money = (minor: number) => formatINR(minor, { decimals: 'always' })

const lastMonths = (count: number) => {
  const now = new Date(Date.now() + 330 * 60_000)
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    return {
      key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    }
  })
}

async function Reports({ view }: { view: AdminViewServerProps }) {
  const { req } = view.initPageResult
  requireSignedIn(req.user, adminUrl.reports)
  const store = await currentStore(req.payload, req.user)
  if (!store) {
    return (
      <div className="te-page">
        <Notice tone="info">Open a store to see its reports.</Notice>
      </div>
    )
  }
  const roles = storeRolesOf(req.user, store.id)
  if (!storeSessionOf(req.user) && !roles.some((role) => REPORT_ROLES.includes(role))) {
    return (
      <div className="te-page">
        <Notice tone="danger">Owners, managers and order managers see reports.</Notice>
      </div>
    )
  }
  const month = typeof view.searchParams?.month === 'string' ? view.searchParams.month : null
  const report = await buildReport(req.payload, store.id, month)
  const f = report.figures
  const change = f.previousOrders
    ? Math.round(((f.orders - f.previousOrders) / f.previousOrders) * 100)
    : null
  const top = Math.max(1, ...report.daily.map((d) => d.salesMinor))
  const query = `store=${store.id}&month=${report.month.key}`
  const hsnTotal = report.hsn.reduce(
    (t, r) => ({
      taxable: t.taxable + r.taxableMinor,
      igst: t.igst + r.igstMinor,
      cgst: t.cgst + r.cgstMinor,
      sgst: t.sgst + r.sgstMinor,
      tax: t.tax + r.taxMinor,
    }),
    { taxable: 0, igst: 0, cgst: 0, sgst: 0, tax: 0 },
  )

  return (
    <div className="te-page">
      <PageHeader
        actions={
          <div className="te-inline-actions">
            <MonthPicker months={lastMonths(13)} value={report.month.key} />
            <a
              className="te-button te-button--secondary te-button--small"
              href={`/api/admin/v1/reports/orders.csv?${query}`}
            >
              Export orders CSV
            </a>
          </div>
        }
        eyebrow={store.name}
        subtitle={report.month.label}
        title="Reports"
      />
      <div className="te-figures te-figures--list">
        <Figure hint="incl. GST" label="Gross sales" value={formatINR(f.grossMinor)} />
        <Figure
          hint={
            change === null
              ? `none in ${report.month.prevLabel}`
              : `${change >= 0 ? '+' : ''}${change}% vs ${report.month.prevLabel}`
          }
          label="Orders"
          value={f.orders.toLocaleString('en-IN')}
        />
        <Figure label="Average order" value={formatINR(f.averageMinor)} />
        <Figure
          hint={`${f.refundedOrders} order${f.refundedOrders === 1 ? '' : 's'}`}
          label="Refunds"
          value={formatINR(f.refundsMinor)}
        />
        <Figure
          hint={f.orders ? `COD ${100 - f.onlineShare}%` : undefined}
          label="Paid online"
          value={f.orders ? `${f.onlineShare}%` : '—'}
        />
      </div>
      <p className="te-muted te-small">
        Sales are orders paid online or cash collected on delivery, by the day the money came in,
        before refunds.
      </p>

      <div className="te-grid te-grid--2-1">
        <Card title="Daily sales">
          <figure
            aria-label={`Sales each day of ${report.month.label}`}
            className="te-chart"
            role="img"
          >
            <div aria-hidden className="te-chart__y">
              <span>{formatINR(top)}</span>
              <span>{formatINR(Math.round(top / 2))}</span>
              <span>0</span>
            </div>
            <div aria-hidden className="te-chart__plot">
              {report.daily.map((d) => (
                <div
                  className="te-chart__col"
                  key={d.day}
                  title={`${d.day}: ${formatINR(d.salesMinor)}`}
                >
                  <i style={{ height: `${(d.salesMinor / top) * 100}%` }} />
                </div>
              ))}
            </div>
            <figcaption aria-hidden className="te-chart__x">
              <span>1</span>
              <span>{Math.ceil(report.month.days / 2)}</span>
              <span>{report.month.days}</span>
            </figcaption>
          </figure>
        </Card>
        <Card title="Affiliates and abandoned carts">
          <dl className="te-dl">
            <dt>Affiliate sales</dt>
            <dd>
              {formatINR(report.affiliates.salesMinor)} · {report.affiliates.orders} orders
            </dd>
            <dt>Commission approved / pending</dt>
            <dd>
              {formatINR(report.affiliates.approvedMinor)} /{' '}
              {formatINR(report.affiliates.pendingMinor)}
            </dd>
            <dt>Carts reminded / recovered</dt>
            <dd>
              {report.carts.reminded} / {report.carts.recovered}
            </dd>
            <dt>Recovered sales</dt>
            <dd>{formatINR(report.carts.recoveredMinor)}</dd>
          </dl>
          <p className="te-small">
            <a href={adminUrl.collection('affiliates')}>Affiliates</a> ·{' '}
            <a href={adminUrl.collection('carts')}>Abandoned carts</a>
          </p>
        </Card>
      </div>

      <div className="te-grid te-grid--2">
        <Card title="Best sellers">
          {report.bestSellers.length ? (
            <div className="te-table-scroll">
              <table className="te-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th className="te-num">Units</th>
                    <th className="te-num">Sales</th>
                  </tr>
                </thead>
                <tbody>
                  {report.bestSellers.map((p) => (
                    <tr key={p.title}>
                      <td>{p.title}</td>
                      <td className="te-num">{p.units}</td>
                      <td className="te-num te-nowrap">{formatINR(p.salesMinor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No sales this month yet.</Empty>
          )}
        </Card>
        <Card
          actions={
            <a className="te-link-button" href={adminUrl.collection('schemes')}>
              Details
            </a>
          }
          title="Offers"
        >
          {report.offers.length ? (
            <div className="te-table-scroll">
              <table className="te-table">
                <thead>
                  <tr>
                    <th>Scheme or coupon</th>
                    <th className="te-num">Orders</th>
                    <th className="te-num">Sales</th>
                    <th className="te-num">Discount</th>
                  </tr>
                </thead>
                <tbody>
                  {report.offers.map((o) => (
                    <tr key={`${o.name}-${o.note}`}>
                      <td>
                        {o.name} {o.note ? <span className="te-muted">({o.note})</span> : null}
                      </td>
                      <td className="te-num">{o.orders}</td>
                      <td className="te-num te-nowrap">{formatINR(o.salesMinor)}</td>
                      <td className="te-num te-nowrap">{formatINR(o.discountMinor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No scheme or coupon was used this month.</Empty>
          )}
        </Card>
      </div>

      <Card
        actions={
          <a
            className="te-button te-button--secondary te-button--small"
            href={`/api/admin/v1/reports/hsn.csv?${query}`}
          >
            Export for GSTR-1 (CSV)
          </a>
        }
        title="GST summary by HSN"
      >
        {report.hsn.length ? (
          <div className="te-table-scroll">
            <table className="te-table">
              <thead>
                <tr>
                  <th>HSN</th>
                  <th>Description</th>
                  <th className="te-num">Rate</th>
                  <th className="te-num">Taxable value</th>
                  <th className="te-num">IGST</th>
                  <th className="te-num">CGST</th>
                  <th className="te-num">SGST</th>
                  <th className="te-num">Total tax</th>
                </tr>
              </thead>
              <tbody>
                {report.hsn.map((r) => (
                  <tr key={`${r.hsn}-${r.ratePercent}`}>
                    <td className="te-mono">{r.hsn}</td>
                    <td className="te-small">{r.description || '—'}</td>
                    <td className="te-num">{r.ratePercent}%</td>
                    <td className="te-num te-nowrap">{money(r.taxableMinor)}</td>
                    <td className="te-num te-nowrap">{money(r.igstMinor)}</td>
                    <td className="te-num te-nowrap">{money(r.cgstMinor)}</td>
                    <td className="te-num te-nowrap">{money(r.sgstMinor)}</td>
                    <td className="te-num te-nowrap">{money(r.taxMinor)}</td>
                  </tr>
                ))}
                <tr className="te-strong">
                  <td>Total</td>
                  <td>—</td>
                  <td className="te-num">—</td>
                  <td className="te-num te-nowrap">{money(hsnTotal.taxable)}</td>
                  <td className="te-num te-nowrap">{money(hsnTotal.igst)}</td>
                  <td className="te-num te-nowrap">{money(hsnTotal.cgst)}</td>
                  <td className="te-num te-nowrap">{money(hsnTotal.sgst)}</td>
                  <td className="te-num te-nowrap">{money(hsnTotal.tax)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>No invoices issued this month.</Empty>
        )}
        <p className="te-muted te-small">
          Tax invoices issued in the month less credit notes, by HSN and rate. Delivery and COD fees
          are in their goods’ rows. Have your accountant check before filing.
        </p>
      </Card>
    </div>
  )
}
