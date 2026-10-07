'use client'

import { toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { callApi } from '@/admin/client/api'
import { Card, Empty, Pill } from '@/admin/ui'
import { fromRupees, toRupeesString } from '@/lib/money'

export type CouponValues = {
  code: string
  description: string
  type: 'percent' | 'fixed' | 'free-shipping'
  percent: number | null
  amountMinor: number | null
  minOrderMinor: number | null
  maxDiscountMinor: number | null
  mode: 'all' | 'categories' | 'products'
  categories: string[]
  startsAt: string | null
  endsAt: string | null
  usageLimit: number | null
  perCustomerLimit: number | null
  firstOrderOnly: boolean
  onlineOnly: boolean
  visibility: 'public' | 'private'
  scheme: string
}

export type CouponRow = {
  id: string
  batchId: string | null
  code: string
  sub: string | null
  gives: string
  conditions: string
  used: string
  valid: string
  shown: string
  status: string
  values: CouponValues | null
}

const BLANK: CouponValues = {
  code: '',
  description: '',
  type: 'fixed',
  percent: null,
  amountMinor: null,
  minOrderMinor: null,
  maxDiscountMinor: null,
  mode: 'all',
  categories: [],
  startsAt: null,
  endsAt: null,
  usageLimit: null,
  perCustomerLimit: 1,
  firstOrderOnly: false,
  onlineOnly: false,
  visibility: 'private',
  scheme: '',
}

/** "2026-10-01T18:30:00Z" ↔ the India-time value of a datetime-local input */
const toLocal = (iso: string | null) => {
  if (!iso) return ''
  const d = new Date(new Date(iso).getTime() + 330 * 60_000)
  return d.toISOString().slice(0, 16)
}
const fromLocal = (value: string) =>
  value ? new Date(new Date(`${value}:00Z`).getTime() - 330 * 60_000).toISOString() : null

const rupees = (minor: number | null) => (minor === null ? '' : toRupeesString(minor))
const paise = (text: string): number | null => {
  if (!text.trim()) return null
  try {
    return fromRupees(text)
  } catch {
    return null
  }
}
const whole = (text: string): number | null =>
  text.trim() ? Math.max(0, Math.floor(Number(text))) || null : null

const TABS = ['all', 'active', 'paused', 'expired'] as const

export function CouponsClient({
  rows,
  storeId,
  canWrite,
  categories,
  schemes,
}: {
  rows: CouponRow[]
  storeId: string
  canWrite: boolean
  categories: { id: string; name: string }[]
  schemes: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState<(typeof TABS)[number]>('all')
  const [editing, setEditing] = useState<{ id: string | null; values: CouponValues } | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [bulk, setBulk] = useState({ prefix: '', count: '100', basedOn: '' })
  const shown = rows.filter((r) => tab === 'all' || r.status === tab)
  const singles = rows.filter((r) => r.values)

  const set = <K extends keyof CouponValues>(key: K, value: CouponValues[K]) =>
    setEditing((current) =>
      current ? { ...current, values: { ...current.values, [key]: value } } : current,
    )

  const save = async () => {
    if (!editing) return
    const v = editing.values
    setBusy(true)
    setErrors({})
    const body = {
      code: v.code,
      description: v.description || undefined,
      type: v.type,
      percent: v.type === 'percent' ? v.percent : null,
      amountMinor: v.type === 'fixed' ? v.amountMinor : null,
      minOrderMinor: v.minOrderMinor,
      maxDiscountMinor: v.type === 'percent' ? v.maxDiscountMinor : null,
      appliesTo: {
        mode: v.mode,
        categories: v.mode === 'categories' ? v.categories : [],
        products: [],
      },
      startsAt: v.startsAt,
      endsAt: v.endsAt,
      usageLimit: v.usageLimit,
      perCustomerLimit: v.perCustomerLimit,
      firstOrderOnly: v.firstOrderOnly,
      paymentMethods: v.onlineOnly ? ['razorpay'] : [],
      visibility: v.visibility,
      scheme: v.scheme || null,
    }
    const result = await callApi(
      editing.id
        ? `/admin/v1/coupons/${editing.id}?store=${storeId}`
        : `/admin/v1/coupons?store=${storeId}`,
      { body },
    )
    setBusy(false)
    if (!result.ok) {
      setErrors(result.error.fields ?? {})
      toast.error(result.error.message)
      return
    }
    toast.success('Coupon saved')
    setEditing(null)
    router.refresh()
  }

  const pause = async (row: CouponRow) => {
    setBusy(true)
    const result = await callApi(`/admin/v1/coupons/${row.id}/pause?store=${storeId}`, {
      body: { paused: row.status !== 'paused' },
    })
    setBusy(false)
    if (!result.ok) {
      toast.error(result.error.message)
      return
    }
    setEditing(null)
    router.refresh()
  }

  const makeCodes = async () => {
    setBusy(true)
    setErrors({})
    const result = await callApi<{ batchId: string; count: number }>(
      `/admin/v1/coupons/bulk?store=${storeId}`,
      { body: { prefix: bulk.prefix, count: Number(bulk.count) || 0, basedOn: bulk.basedOn } },
    )
    setBusy(false)
    if (!result.ok) {
      setErrors(result.error.fields ?? {})
      toast.error(result.error.message)
      return
    }
    toast.success(`${result.data.count} codes made`)
    // A file download, not a page: the browser saves the CSV and stays here
    window.open(
      `/api/admin/v1/coupons/batch/${encodeURIComponent(result.data.batchId)}?store=${storeId}`,
      '_blank',
    )
    router.refresh()
  }

  const err = (key: string) =>
    errors[key] ? <p className="te-field-error">{errors[key]}</p> : null
  const v = editing?.values

  return (
    <div className="te-coupon-layout">
      <div className="te-stack">
        <div className="te-toolbar-row">
          <nav aria-label="Coupon status" className="te-tabs te-tabs--underline">
            {TABS.map((key) => (
              <button
                aria-current={tab === key ? 'page' : undefined}
                className={`te-tab${tab === key ? ' te-tab--active' : ''}`}
                key={key}
                onClick={() => setTab(key)}
                type="button"
              >
                {key[0]!.toUpperCase() + key.slice(1)}{' '}
                <span className="te-tab__count">
                  {rows.filter((r) => key === 'all' || r.status === key).length}
                </span>
              </button>
            ))}
          </nav>
          {canWrite ? (
            <button
              className="te-button te-button--primary te-button--small"
              onClick={() => setEditing({ id: null, values: { ...BLANK } })}
              type="button"
            >
              + New coupon
            </button>
          ) : null}
        </div>
        {shown.length ? (
          <div className="te-card te-card--table">
            <div className="te-table-scroll">
              <table className="te-table te-table--rows">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Gives</th>
                    <th>Conditions</th>
                    <th className="te-num">Used</th>
                    <th>Valid</th>
                    <th>Shown</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((row) => (
                    <tr key={row.id}>
                      <td>
                        {row.values && canWrite ? (
                          <button
                            className="te-link-button te-strong te-mono"
                            onClick={() => {
                              setErrors({})
                              setEditing({ id: row.id, values: { ...row.values! } })
                            }}
                            type="button"
                          >
                            {row.code}
                          </button>
                        ) : (
                          <b className="te-mono">{row.code}</b>
                        )}
                        {row.sub ? <div className="te-muted te-small">{row.sub}</div> : null}
                        {row.batchId && canWrite ? (
                          <a
                            className="te-link te-small"
                            href={`/api/admin/v1/coupons/batch/${encodeURIComponent(row.batchId)}?store=${storeId}`}
                          >
                            Download codes
                          </a>
                        ) : null}
                      </td>
                      <td>{row.gives}</td>
                      <td>{row.conditions}</td>
                      <td className="te-num te-nowrap">{row.used}</td>
                      <td className="te-nowrap">{row.valid}</td>
                      <td>{row.shown}</td>
                      <td>
                        <Pill
                          tone={
                            row.status === 'active'
                              ? 'success'
                              : row.status === 'paused'
                                ? 'warning'
                                : 'neutral'
                          }
                        >
                          {row.status[0]!.toUpperCase() + row.status.slice(1)}
                        </Pill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <Empty>
            {rows.length ? 'No coupons here.' : 'No coupons yet. Add one with “New coupon”.'}
          </Empty>
        )}
        {canWrite && singles.length ? (
          <Card title="Make bulk codes">
            <div className="te-form-grid te-form-grid--3">
              <div>
                <label className="te-label" htmlFor="bulk-prefix">
                  Prefix
                </label>
                <input
                  className="te-input"
                  id="bulk-prefix"
                  onChange={(e) => setBulk({ ...bulk, prefix: e.target.value.toUpperCase() })}
                  placeholder="WED"
                  value={bulk.prefix}
                />
                {err('prefix')}
              </div>
              <div>
                <label className="te-label" htmlFor="bulk-count">
                  How many
                </label>
                <input
                  className="te-input"
                  id="bulk-count"
                  inputMode="numeric"
                  onChange={(e) => setBulk({ ...bulk, count: e.target.value })}
                  value={bulk.count}
                />
                {err('count')}
              </div>
              <div>
                <label className="te-label" htmlFor="bulk-base">
                  Based on
                </label>
                <select
                  className="te-input"
                  id="bulk-base"
                  onChange={(e) => setBulk({ ...bulk, basedOn: e.target.value })}
                  value={bulk.basedOn}
                >
                  <option value="">Choose a coupon</option>
                  {singles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code} · {r.gives}
                    </option>
                  ))}
                </select>
                {err('basedOn')}
              </div>
            </div>
            <div className="te-inline-actions">
              <button
                className="te-button te-button--secondary te-button--small"
                disabled={busy}
                onClick={makeCodes}
                type="button"
              >
                {busy ? 'Making…' : 'Make codes'}
              </button>
              <span className="te-muted te-small">
                Single-use codes that copy the chosen coupon. The list downloads as a CSV.
              </span>
            </div>
          </Card>
        ) : null}
      </div>

      {editing && v ? (
        <Card title={editing.id ? v.code : 'New coupon'}>
          <div className="te-form">
            <div className="te-form-grid">
              <div>
                <label className="te-label" htmlFor="c-code">
                  Code *
                </label>
                <input
                  className="te-input te-mono"
                  id="c-code"
                  onChange={(e) => set('code', e.target.value.toUpperCase())}
                  value={v.code}
                />
                {err('code')}
              </div>
              <div>
                <label className="te-label" htmlFor="c-note">
                  Note for staff
                </label>
                <input
                  className="te-input"
                  id="c-note"
                  onChange={(e) => set('description', e.target.value)}
                  value={v.description}
                />
              </div>
            </div>
            <fieldset className="te-fieldset">
              <legend className="te-label">Gives</legend>
              <div className="te-segmented" role="radiogroup">
                {(
                  [
                    ['percent', 'Percent off'],
                    ['fixed', 'Amount off'],
                    ['free-shipping', 'Free delivery'],
                  ] as const
                ).map(([value, label]) => (
                  <label className="te-segmented__option" key={value}>
                    <input
                      checked={v.type === value}
                      name="coupon-type"
                      onChange={() => set('type', value)}
                      type="radio"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="te-form-grid">
              {v.type === 'percent' ? (
                <>
                  <div>
                    <label className="te-label" htmlFor="c-percent">
                      Percent off
                    </label>
                    <input
                      className="te-input"
                      id="c-percent"
                      inputMode="decimal"
                      onChange={(e) =>
                        set('percent', e.target.value ? Number(e.target.value) : null)
                      }
                      value={v.percent ?? ''}
                    />
                    {err('percent')}
                  </div>
                  <div>
                    <label className="te-label" htmlFor="c-max">
                      Most off (₹)
                    </label>
                    <input
                      className="te-input"
                      id="c-max"
                      inputMode="decimal"
                      onChange={(e) => set('maxDiscountMinor', paise(e.target.value))}
                      defaultValue={rupees(v.maxDiscountMinor)}
                    />
                  </div>
                </>
              ) : null}
              {v.type === 'fixed' ? (
                <div>
                  <label className="te-label" htmlFor="c-amount">
                    Amount (₹)
                  </label>
                  <input
                    className="te-input"
                    id="c-amount"
                    inputMode="decimal"
                    onChange={(e) => set('amountMinor', paise(e.target.value))}
                    defaultValue={rupees(v.amountMinor)}
                  />
                  {err('amountMinor')}
                </div>
              ) : null}
              <div>
                <label className="te-label" htmlFor="c-min">
                  Minimum order (₹)
                </label>
                <input
                  className="te-input"
                  id="c-min"
                  inputMode="decimal"
                  onChange={(e) => set('minOrderMinor', paise(e.target.value))}
                  defaultValue={rupees(v.minOrderMinor)}
                />
              </div>
              <div>
                <label className="te-label" htmlFor="c-covers">
                  Covers
                </label>
                <select
                  className="te-input"
                  id="c-covers"
                  onChange={(e) => set('mode', e.target.value as CouponValues['mode'])}
                  value={v.mode === 'products' ? 'all' : v.mode}
                >
                  <option value="all">Whole store</option>
                  <option value="categories">Categories</option>
                </select>
              </div>
              {v.mode === 'categories' ? (
                <div className="te-form-grid__wide">
                  <span className="te-label">Categories (subcategories are included)</span>
                  <div className="te-chips">
                    {categories.map((c) => (
                      <label className="te-chip" key={c.id}>
                        <input
                          checked={v.categories.includes(c.id)}
                          className="te-visually-hidden"
                          onChange={(e) =>
                            set(
                              'categories',
                              e.target.checked
                                ? [...v.categories, c.id]
                                : v.categories.filter((id) => id !== c.id),
                            )
                          }
                          type="checkbox"
                        />
                        {c.name}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}
              <div>
                <label className="te-label" htmlFor="c-payment">
                  Payment
                </label>
                <select
                  className="te-input"
                  id="c-payment"
                  onChange={(e) => set('onlineOnly', e.target.value === 'online')}
                  value={v.onlineOnly ? 'online' : 'any'}
                >
                  <option value="any">Any method</option>
                  <option value="online">Paid online only</option>
                </select>
              </div>
              <div>
                <label className="te-label" htmlFor="c-starts">
                  Starts
                </label>
                <input
                  className="te-input"
                  id="c-starts"
                  onChange={(e) => set('startsAt', fromLocal(e.target.value))}
                  type="datetime-local"
                  value={toLocal(v.startsAt)}
                />
              </div>
              <div>
                <label className="te-label" htmlFor="c-ends">
                  Ends
                </label>
                <input
                  className="te-input"
                  id="c-ends"
                  onChange={(e) => set('endsAt', fromLocal(e.target.value))}
                  type="datetime-local"
                  value={toLocal(v.endsAt)}
                />
                {err('endsAt')}
              </div>
              <div>
                <label className="te-label" htmlFor="c-total">
                  Total uses
                </label>
                <input
                  className="te-input"
                  id="c-total"
                  inputMode="numeric"
                  onChange={(e) => set('usageLimit', whole(e.target.value))}
                  placeholder="No limit"
                  value={v.usageLimit ?? ''}
                />
              </div>
              <div>
                <label className="te-label" htmlFor="c-per">
                  Per shopper
                </label>
                <input
                  className="te-input"
                  id="c-per"
                  inputMode="numeric"
                  onChange={(e) => set('perCustomerLimit', whole(e.target.value))}
                  placeholder="No limit"
                  value={v.perCustomerLimit ?? ''}
                />
                <p className="te-field-help">Checked by phone and email</p>
              </div>
            </div>
            <label className="te-checkbox">
              <input
                checked={v.firstOrderOnly}
                onChange={(e) => set('firstOrderOnly', e.target.checked)}
                type="checkbox"
              />
              First order only
            </label>
            <label className="te-checkbox">
              <input
                checked={v.visibility === 'public'}
                onChange={(e) => set('visibility', e.target.checked ? 'public' : 'private')}
                type="checkbox"
              />
              Show at the cart and on the Offers page
            </label>
            <div>
              <label className="te-label" htmlFor="c-scheme">
                Linked scheme
              </label>
              <select
                className="te-input"
                id="c-scheme"
                onChange={(e) => set('scheme', e.target.value)}
                value={v.scheme}
              >
                <option value="">None</option>
                {schemes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="te-inline-actions">
              <button
                className="te-button te-button--primary te-button--small"
                disabled={busy}
                onClick={save}
                type="button"
              >
                {busy ? 'Saving…' : 'Save'}
              </button>
              {editing.id ? (
                <button
                  className="te-button te-button--secondary te-button--small"
                  disabled={busy}
                  onClick={() => pause(rows.find((r) => r.id === editing.id)!)}
                  type="button"
                >
                  {rows.find((r) => r.id === editing.id)?.status === 'paused' ? 'Resume' : 'Pause'}
                </button>
              ) : null}
              <button
                className="te-button te-button--ghost te-button--small"
                onClick={() => setEditing(null)}
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        </Card>
      ) : (
        <Card title="A coupon">
          <p className="te-muted">
            {canWrite
              ? 'Pick a code in the list to change it, or add a new one.'
              : 'Only owners and managers change coupons.'}
          </p>
          <p className="te-muted te-small">
            Per-shopper limits are checked by phone and email, so a guest can’t reuse a once-only
            code. A scheme set to not work with coupons blocks them while it is live: the cart keeps
            whichever saves the shopper more.
          </p>
        </Card>
      )}
    </div>
  )
}
