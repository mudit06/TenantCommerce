'use client'

import { toast } from '@payloadcms/ui'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { callApi } from '@/admin/client/api'
import { Card, Empty, Pill } from '@/admin/ui'
import { RupeeField } from '@/admin/ui/RupeeField'

export type AffiliateRow = {
  id: string
  name: string
  sub: string
  code: string
  rate: string
  clicks: string
  orders: string
  pending: string
  approved: string
  paid: string
}

export type ApplicationRow = {
  id: string
  name: string
  sub: string
  note: string
  applied: string
}

export type AffiliateDetail = {
  id: string
  name: string
  status: string
  since: string
  link: string
  rate: string
  commissionPercent: number
  categoryRates: { category: string; percent: number }[]
  coupon: { id: string; label: string } | null
  payout: string
  pan: string
  gstin: string | null
  yearTotal: string
  contact: string
  rejectReason: string | null
  preview: {
    count: number
    gross: string
    tds: string
    net: string
    enough: boolean
    payTo: string | null
  }
  payouts: {
    id: string
    number: string
    paidOn: string
    gross: string
    tds: string
    net: string
    reference: string
  }[]
}

type Program = {
  defaultCommissionPercent: number
  cookieDays: number
  holdDays: number
  minPayoutMinor: number
  autoApproveApplications: boolean
  termsPath: string
}

const STATUS_TONE: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  approved: 'success',
  applied: 'warning',
  paused: 'neutral',
  rejected: 'danger',
}

const todayIst = () => new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10)

export function AffiliatesClient({
  applications,
  canPay,
  canWrite,
  categories,
  counts,
  coupons,
  detail,
  program,
  rows,
  storeId,
  tab,
}: {
  applications: ApplicationRow[]
  canPay: boolean
  canWrite: boolean
  categories: { id: string; name: string }[]
  counts: Record<'approved' | 'applied' | 'paused' | 'rejected', number>
  coupons: { id: string; label: string }[]
  detail: AffiliateDetail | null
  program: Program
  rows: AffiliateRow[]
  storeId: string
  tab: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [busy, setBusy] = useState(false)
  const [rejecting, setRejecting] = useState<{ id: string; reason: string } | null>(null)
  const [editingRate, setEditingRate] = useState(false)
  const [rates, setRates] = useState({
    commissionPercent: detail?.commissionPercent ?? program.defaultCommissionPercent,
    categoryRates: detail?.categoryRates ?? [],
  })
  const [pay, setPay] = useState({ paidOn: todayIst(), method: 'upi', reference: '' })
  const [showProgram, setShowProgram] = useState(false)
  const [settings, setSettings] = useState(program)

  const go = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    router.replace(`${pathname}?${next}`, { scroll: false })
  }

  const post = async (path: string, body: unknown, done: string) => {
    setBusy(true)
    const result = await callApi(`/admin/v1/affiliates${path}?store=${storeId}`, { body })
    setBusy(false)
    if (!result.ok) {
      toast.error(result.error.message)
      return false
    }
    toast.success(done)
    router.refresh()
    return true
  }

  const setStatus = (id: string, action: string, reason?: string) =>
    post(`/${id}/status`, { action, reason }, action === 'approve' ? 'Approved' : 'Saved')

  return (
    <div className="te-coupon-layout">
      <div className="te-stack">
        <div className="te-inline-actions">
          <nav aria-label="Affiliate status" className="te-tabs te-tabs--underline">
            {(
              [
                ['approved', 'Approved'],
                ['applied', 'Applications'],
                ['paused', 'Paused'],
                ['rejected', 'Rejected'],
              ] as const
            ).map(([key, label]) => (
              <button
                aria-current={tab === key ? 'page' : undefined}
                className={`te-tab${tab === key ? ' te-tab--active' : ''}`}
                key={key}
                onClick={() => go({ tab: key, a: '' })}
                type="button"
              >
                {label} <span className="te-tab__count">{counts[key]}</span>
              </button>
            ))}
          </nav>
          <button
            className="te-button te-button--secondary te-button--small"
            onClick={() => setShowProgram((v) => !v)}
            type="button"
          >
            Program settings
          </button>
        </div>

        {tab === 'applied' ? (
          applications.length ? (
            <Card title="Applications">
              <ul className="te-list">
                {applications.map((a) => (
                  <li className="te-list__row" key={a.id}>
                    <div className="te-grow">
                      <b>{a.name}</b>
                      <div className="te-muted te-small">
                        {a.sub} · applied {a.applied}
                      </div>
                      {a.note ? <p className="te-small">{a.note}</p> : null}
                      {rejecting?.id === a.id ? (
                        <div className="te-inline-actions">
                          <input
                            aria-label="Why"
                            className="te-input"
                            onChange={(e) => setRejecting({ id: a.id, reason: e.target.value })}
                            placeholder="Why, for the applicant"
                            value={rejecting.reason}
                          />
                          <button
                            className="te-button te-button--secondary te-button--small"
                            disabled={busy || rejecting.reason.trim().length < 3}
                            onClick={async () => {
                              if (await setStatus(a.id, 'reject', rejecting.reason))
                                setRejecting(null)
                            }}
                            type="button"
                          >
                            Reject
                          </button>
                          <button
                            className="te-button te-button--ghost te-button--small"
                            onClick={() => setRejecting(null)}
                            type="button"
                          >
                            Back
                          </button>
                        </div>
                      ) : null}
                    </div>
                    {canWrite && rejecting?.id !== a.id ? (
                      <div className="te-inline-actions">
                        <button
                          className="te-button te-button--primary te-button--small"
                          disabled={busy}
                          onClick={() => setStatus(a.id, 'approve')}
                          type="button"
                        >
                          Approve
                        </button>
                        <button
                          className="te-button te-button--secondary te-button--small"
                          disabled={busy}
                          onClick={() => setRejecting({ id: a.id, reason: '' })}
                          type="button"
                        >
                          Reject
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
          ) : (
            <Empty>
              No applications waiting. Shoppers apply from your store’s /affiliate page.
            </Empty>
          )
        ) : rows.length ? (
          <div className="te-card te-card--table">
            <div className="te-table-scroll">
              <table className="te-table te-table--rows">
                <thead>
                  <tr>
                    <th>Affiliate</th>
                    <th>Code</th>
                    <th>Rate</th>
                    <th className="te-num">Clicks, 30 d</th>
                    <th className="te-num">Orders, 30 d</th>
                    <th className="te-num">Pending</th>
                    <th className="te-num">Approved</th>
                    <th className="te-num">Paid to date</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <button
                          className="te-link-button te-strong"
                          onClick={() => go({ a: row.id })}
                          type="button"
                        >
                          {row.name}
                        </button>
                        <div className="te-muted te-small">{row.sub}</div>
                      </td>
                      <td className="te-mono te-nowrap">{row.code}</td>
                      <td className="te-small">{row.rate}</td>
                      <td className="te-num">{row.clicks}</td>
                      <td className="te-num">{row.orders}</td>
                      <td className="te-num te-nowrap">{row.pending}</td>
                      <td className="te-num te-nowrap">{row.approved}</td>
                      <td className="te-num te-nowrap">{row.paid}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <Empty>No {tab} affiliates.</Empty>
        )}

        {showProgram ? (
          <Card title="Program">
            <div className="te-form-grid">
              <div>
                <label className="te-label" htmlFor="ap-rate">
                  Default rate (%)
                </label>
                <input
                  className="te-input"
                  disabled={!canWrite}
                  id="ap-rate"
                  max={50}
                  min={0}
                  onChange={(e) =>
                    setSettings({ ...settings, defaultCommissionPercent: Number(e.target.value) })
                  }
                  step={0.5}
                  type="number"
                  value={settings.defaultCommissionPercent}
                />
              </div>
              <div>
                <label className="te-label" htmlFor="ap-cookie">
                  Referral cookie (days, last click)
                </label>
                <input
                  className="te-input"
                  disabled={!canWrite}
                  id="ap-cookie"
                  max={90}
                  min={1}
                  onChange={(e) =>
                    setSettings({ ...settings, cookieDays: Number(e.target.value) || 1 })
                  }
                  type="number"
                  value={settings.cookieDays}
                />
              </div>
              <div>
                <label className="te-label" htmlFor="ap-hold">
                  Approved after delivery (days, the return window)
                </label>
                <input
                  className="te-input"
                  disabled={!canWrite}
                  id="ap-hold"
                  max={60}
                  min={0}
                  onChange={(e) => setSettings({ ...settings, holdDays: Number(e.target.value) })}
                  type="number"
                  value={settings.holdDays}
                />
              </div>
              <RupeeField
                disabled={!canWrite}
                id="ap-min"
                label="Minimum payout"
                onChange={(amount) => setSettings({ ...settings, minPayoutMinor: amount ?? 0 })}
                valueMinor={settings.minPayoutMinor}
              />
              <div className="te-form-grid__wide">
                <label className="te-label" htmlFor="ap-terms">
                  Terms page
                </label>
                <input
                  className="te-input"
                  disabled={!canWrite}
                  id="ap-terms"
                  onChange={(e) => setSettings({ ...settings, termsPath: e.target.value })}
                  value={settings.termsPath}
                />
              </div>
              <label className="te-checkbox te-form-grid__wide" htmlFor="ap-auto">
                <input
                  checked={settings.autoApproveApplications}
                  disabled={!canWrite}
                  id="ap-auto"
                  onChange={(e) =>
                    setSettings({ ...settings, autoApproveApplications: e.target.checked })
                  }
                  type="checkbox"
                />
                Approve applications without checking them
              </label>
            </div>
            {canWrite ? (
              <div className="te-inline-actions">
                <button
                  className="te-button te-button--primary te-button--small"
                  disabled={busy}
                  onClick={() => post('/program', settings, 'Program saved')}
                  type="button"
                >
                  Save program
                </button>
              </div>
            ) : null}
          </Card>
        ) : null}
      </div>

      <div className="te-stack">
        {detail ? (
          <Card className="te-side-card" title={detail.name}>
            <dl className="te-dl">
              <dt>Status</dt>
              <dd>
                <Pill tone={STATUS_TONE[detail.status] ?? 'neutral'}>{detail.status}</Pill>
              </dd>
              <dt>Since</dt>
              <dd>{detail.since}</dd>
              <dt>Link</dt>
              <dd className="te-mono">{detail.link}</dd>
              <dt>Rate</dt>
              <dd>{detail.rate}</dd>
              <dt>Coupon</dt>
              <dd>{detail.coupon?.label ?? 'None'}</dd>
              <dt>Payout to</dt>
              <dd>{detail.payout}</dd>
              <dt>PAN</dt>
              <dd>{detail.pan}</dd>
              {detail.gstin ? (
                <>
                  <dt>GSTIN</dt>
                  <dd className="te-mono">{detail.gstin}</dd>
                </>
              ) : null}
              <dt>This financial year</dt>
              <dd>{detail.yearTotal}</dd>
              <dt>Contact</dt>
              <dd>{detail.contact}</dd>
              {detail.rejectReason ? (
                <>
                  <dt>Rejected</dt>
                  <dd>{detail.rejectReason}</dd>
                </>
              ) : null}
            </dl>
            {canWrite ? (
              <div className="te-inline-actions">
                <button
                  className="te-button te-button--secondary te-button--small"
                  onClick={() => setEditingRate((v) => !v)}
                  type="button"
                >
                  Change rate
                </button>
                {detail.status === 'approved' ? (
                  <button
                    className="te-button te-button--ghost te-button--small"
                    disabled={busy}
                    onClick={() => setStatus(detail.id, 'pause')}
                    type="button"
                  >
                    Pause
                  </button>
                ) : null}
                {detail.status === 'paused' ? (
                  <button
                    className="te-button te-button--secondary te-button--small"
                    disabled={busy}
                    onClick={() => setStatus(detail.id, 'resume')}
                    type="button"
                  >
                    Resume
                  </button>
                ) : null}
                {detail.status === 'rejected' ? (
                  <button
                    className="te-button te-button--secondary te-button--small"
                    disabled={busy}
                    onClick={() => setStatus(detail.id, 'approve')}
                    type="button"
                  >
                    Approve
                  </button>
                ) : null}
              </div>
            ) : null}
            {canWrite && editingRate ? (
              <div className="te-stack">
                <div>
                  <label className="te-label" htmlFor="ar-rate">
                    Rate (%)
                  </label>
                  <input
                    className="te-input"
                    id="ar-rate"
                    max={50}
                    min={0}
                    onChange={(e) =>
                      setRates({ ...rates, commissionPercent: Number(e.target.value) })
                    }
                    step={0.5}
                    type="number"
                    value={rates.commissionPercent}
                  />
                </div>
                {rates.categoryRates.map((r, i) => (
                  <div className="te-inline-actions" key={i}>
                    <select
                      aria-label="Category"
                      className="te-input"
                      onChange={(e) =>
                        setRates({
                          ...rates,
                          categoryRates: rates.categoryRates.map((x, j) =>
                            j === i ? { ...x, category: e.target.value } : x,
                          ),
                        })
                      }
                      value={r.category}
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <input
                      aria-label="Category rate (%)"
                      className="te-input te-input--inline"
                      max={50}
                      min={0}
                      onChange={(e) =>
                        setRates({
                          ...rates,
                          categoryRates: rates.categoryRates.map((x, j) =>
                            j === i ? { ...x, percent: Number(e.target.value) } : x,
                          ),
                        })
                      }
                      step={0.5}
                      type="number"
                      value={r.percent}
                    />
                    <button
                      className="te-button te-button--ghost te-button--small"
                      onClick={() =>
                        setRates({
                          ...rates,
                          categoryRates: rates.categoryRates.filter((_, j) => j !== i),
                        })
                      }
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <div className="te-inline-actions">
                  {categories.length ? (
                    <button
                      className="te-link-button"
                      onClick={() =>
                        setRates({
                          ...rates,
                          categoryRates: [
                            ...rates.categoryRates,
                            { category: categories[0]!.id, percent: rates.commissionPercent },
                          ],
                        })
                      }
                      type="button"
                    >
                      + Category rate
                    </button>
                  ) : null}
                  <button
                    className="te-button te-button--primary te-button--small"
                    disabled={busy}
                    onClick={async () => {
                      if (await post(`/${detail.id}/rates`, rates, 'Rate saved'))
                        setEditingRate(false)
                    }}
                    type="button"
                  >
                    Save rate
                  </button>
                </div>
                <label className="te-label" htmlFor="ar-coupon">
                  Personal coupon
                </label>
                <select
                  className="te-input"
                  id="ar-coupon"
                  onChange={(e) =>
                    post(`/${detail.id}/coupon`, { coupon: e.target.value || null }, 'Coupon saved')
                  }
                  value={detail.coupon?.id ?? ''}
                >
                  <option value="">None</option>
                  {coupons.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <p className="te-field-help">Orders with this code credit the affiliate.</p>
              </div>
            ) : null}
          </Card>
        ) : null}

        {detail && (detail.status === 'approved' || detail.status === 'paused') ? (
          <Card title="Record payout">
            <dl className="te-dl">
              <dt>Approved, not paid</dt>
              <dd>
                {detail.preview.gross} · {detail.preview.count} order
                {detail.preview.count === 1 ? '' : 's'}
              </dd>
              <dt>TDS</dt>
              <dd>{detail.preview.tds}</dd>
              <dt>To pay</dt>
              <dd>
                <b>{detail.preview.net}</b>
              </dd>
              {detail.preview.payTo ? (
                <>
                  <dt>Pay to</dt>
                  <dd className="te-mono">{detail.preview.payTo}</dd>
                </>
              ) : null}
            </dl>
            {canPay ? (
              detail.preview.enough ? (
                <div className="te-stack">
                  <div className="te-form-grid">
                    <div>
                      <label className="te-label" htmlFor="pay-on">
                        Paid on
                      </label>
                      <input
                        className="te-input"
                        id="pay-on"
                        max={todayIst()}
                        onChange={(e) => setPay({ ...pay, paidOn: e.target.value })}
                        type="date"
                        value={pay.paidOn}
                      />
                    </div>
                    <div>
                      <label className="te-label" htmlFor="pay-method">
                        Method
                      </label>
                      <select
                        className="te-input"
                        id="pay-method"
                        onChange={(e) => setPay({ ...pay, method: e.target.value })}
                        value={pay.method}
                      >
                        <option value="upi">UPI</option>
                        <option value="neft">NEFT</option>
                        <option value="imps">IMPS</option>
                      </select>
                    </div>
                    <div className="te-form-grid__wide">
                      <label className="te-label" htmlFor="pay-ref">
                        UTR or reference
                      </label>
                      <input
                        className="te-input"
                        id="pay-ref"
                        onChange={(e) => setPay({ ...pay, reference: e.target.value })}
                        placeholder="For example 402155557731"
                        value={pay.reference}
                      />
                    </div>
                  </div>
                  <div>
                    <button
                      className="te-button te-button--primary te-button--small"
                      disabled={busy || pay.reference.trim().length < 4}
                      onClick={async () => {
                        if (await post(`/${detail.id}/payouts`, pay, 'Payout recorded'))
                          setPay({ ...pay, reference: '' })
                      }}
                      type="button"
                    >
                      Mark paid and email statement
                    </button>
                  </div>
                </div>
              ) : (
                <p className="te-muted te-small">
                  Nothing to pay yet: approved commission is below the minimum payout.
                </p>
              )
            ) : (
              <p className="te-muted te-small">Only the store owner records payouts.</p>
            )}
            {detail.payouts.length ? (
              <ul className="te-list te-small">
                {detail.payouts.map((p) => (
                  <li className="te-list__row" key={p.id}>
                    <span className="te-grow">
                      <span className="te-mono">{p.number}</span> · paid {p.paidOn}
                      {p.reference ? ` · UTR ${p.reference}` : ''}
                      <div className="te-muted">
                        gross {p.gross} · TDS {p.tds}
                      </div>
                    </span>
                    <b>{p.net}</b>
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
        ) : null}
      </div>
    </div>
  )
}
