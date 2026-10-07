'use client'

import { Button, toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'

import { callApi } from '@/admin/client/api'
import { Card, PageHeader, Pill } from '@/admin/ui'
import { RupeeField } from '@/admin/ui/RupeeField'
import { formatINR } from '@/lib/money'

export type ZoneValues = {
  name: string
  isServiceable: boolean
  states: string[]
  pincodePrefixes: string[]
  rateType: 'flat' | 'weight' | 'order-value'
  feeMinor: number | null
  freeAboveMinor: number | null
  baseWeightGrams: number | null
  perExtraKgMinor: number | null
  valueBrackets: { fromMinor: number; feeMinor: number }[]
  codAllowed: boolean
  etaMinDays: number | null
  etaMaxDays: number | null
}

export type ZoneRow = {
  id: string
  name: string
  covers: string
  fee: string
  freeAbove: string | null
  serviceable: boolean
  cod: boolean
  eta: string
  values: ZoneValues
}

type Check = {
  place: { city: string | null; stateName: string | null }
  quote: {
    serviceable: boolean
    codAllowed: boolean
    feeMinor: number
    zoneName: string | null
    etaMinDays: number | null
    etaMaxDays: number | null
    source: 'shiprocket' | 'rate-card'
    courierName: string | null
  }
  freeAboveMinor: number | null
}

const BLANK: ZoneValues = {
  name: '',
  isServiceable: true,
  states: [],
  pincodePrefixes: [],
  rateType: 'flat',
  feeMinor: null,
  freeAboveMinor: null,
  baseWeightGrams: 2000,
  perExtraKgMinor: null,
  valueBrackets: [],
  codAllowed: true,
  etaMinDays: null,
  etaMaxDays: null,
}

const RATE_CHOICES = [
  { value: 'flat', label: 'Flat' },
  { value: 'weight', label: 'Weight' },
  { value: 'order-value', label: 'Order value' },
] as const

const rupees = (minor: number) => formatINR(minor)

function days(min: number | null, max: number | null) {
  if (min == null && max == null) return null
  if (min == null || max == null || min === max) return `${max ?? min} days`
  return `${min} to ${max} days`
}

/**
 * Shipping zones (docs/screens/vendor-cms.md `cms-shipping`): the zones table, "Test a pincode"
 * and the zone being edited, side by side as in the wireframe. `children` is the Shiprocket card.
 */
export function ShippingZones({
  storeId,
  rows,
  states,
  canEdit,
  subtitle,
  children,
}: {
  storeId: string
  rows: ZoneRow[]
  states: { code: string; name: string }[]
  canEdit: boolean
  subtitle: string | null
  children?: ReactNode
}) {
  const [editing, setEditing] = useState<string | 'new' | null>(rows[0]?.id ?? null)
  const current = editing === 'new' ? null : rows.find((row) => row.id === editing)

  return (
    <div className="te-page">
      <PageHeader
        actions={
          canEdit ? (
            <Button icon="plus" onClick={() => setEditing('new')} size="medium">
              Add zone
            </Button>
          ) : null
        }
        eyebrow="Store"
        subtitle={subtitle}
        title="Shipping zones"
      />
      <div className="te-card te-card--table">
        <div className="te-table-scroll">
          <table className="te-table te-table--rows">
            <thead>
              <tr>
                <th>Zone</th>
                <th>Covers</th>
                <th>Delivery fee</th>
                <th>Free above</th>
                <th>COD</th>
                <th>Delivery time</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <p className="te-muted">
                      No zones yet, so delivery is free everywhere and cash on delivery is offered
                      to everyone. Add a zone for each area you deliver to.
                    </p>
                  </td>
                </tr>
              ) : null}
              {rows.map((row) => (
                <tr className={row.id === editing ? 'te-row--selected' : undefined} key={row.id}>
                  <td>
                    <button
                      className="te-link-button te-strong"
                      onClick={() => setEditing(row.id)}
                      type="button"
                    >
                      {row.name}
                    </button>
                  </td>
                  <td>{row.covers}</td>
                  <td>{row.fee}</td>
                  <td className="te-nowrap">{row.freeAbove ?? '—'}</td>
                  <td>
                    {row.serviceable ? (
                      <Pill tone={row.cod ? 'success' : 'neutral'}>
                        {row.cod ? 'Allowed' : 'Not allowed'}
                      </Pill>
                    ) : (
                      <Pill tone="danger">No delivery</Pill>
                    )}
                  </td>
                  <td className="te-nowrap">{row.eta || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="te-grid te-grid--halves">
        <PincodeTester storeId={storeId} />
        {editing ? (
          <ZoneEditor
            canEdit={canEdit}
            key={`${editing}:${current ? 'loaded' : 'pending'}`}
            onDone={(id) => setEditing(id)}
            states={states}
            storeId={storeId}
            zone={current ? { id: current.id, values: current.values } : null}
          />
        ) : (
          <Card title="Edit zone">
            <p className="te-muted">Pick a zone in the table to change it.</p>
          </Card>
        )}
      </div>
      {children}
    </div>
  )
}

function PincodeTester({ storeId }: { storeId: string }) {
  const [pincode, setPincode] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Check | null>(null)
  const [error, setError] = useState<string | null>(null)

  const check = async () => {
    setBusy(true)
    setError(null)
    const response = await callApi<Check>(
      `/admin/v1/shipping/check?store=${encodeURIComponent(storeId)}&pincode=${encodeURIComponent(pincode.trim())}`,
      { method: 'GET' },
    )
    setBusy(false)
    if (!response.ok) {
      setResult(null)
      setError(response.error.fields?.pincode ?? response.error.message)
      return
    }
    setResult(response.data)
  }

  const quote = result?.quote
  const place = [result?.place.city, result?.place.stateName].filter(Boolean).join(', ')
  const eta = quote ? days(quote.etaMinDays, quote.etaMaxDays) : null
  return (
    <Card title="Test a pincode">
      <form
        className="te-inline-field"
        onSubmit={(event) => {
          event.preventDefault()
          void check()
        }}
      >
        <label className="te-visually-hidden" htmlFor="test-pincode">
          Pincode
        </label>
        <input
          className="te-input"
          id="test-pincode"
          inputMode="numeric"
          maxLength={6}
          onChange={(event) => setPincode(event.target.value.replace(/\D/g, ''))}
          placeholder="411045"
          value={pincode}
        />
        <Button buttonStyle="secondary" disabled={busy || pincode.length !== 6} type="submit">
          Check
        </Button>
      </form>
      {error ? <p className="te-field-error">{error}</p> : null}
      {quote ? (
        <div
          className={`te-notice te-notice--${quote.serviceable ? 'info' : 'danger'}`}
          role="status"
        >
          <div className="te-quote">
            <strong>{[quote.zoneName ?? 'No zone', place].filter(Boolean).join(' · ')}</strong>
            {quote.serviceable ? (
              <>
                <span>
                  {quote.feeMinor ? `Delivery ${rupees(quote.feeMinor)}` : 'Free delivery'}
                  {result?.freeAboveMinor ? `, free above ${rupees(result.freeAboveMinor)}` : ''}
                </span>
                <span>
                  {quote.codAllowed ? 'Cash on delivery allowed' : 'Cash on delivery not allowed'}
                </span>
                {eta ? <span>{eta}</span> : null}
                <span className="te-muted te-small">
                  {quote.source === 'shiprocket'
                    ? `Live rate from Shiprocket${quote.courierName ? ` (${quote.courierName})` : ''}`
                    : 'From your zones'}
                </span>
              </>
            ) : (
              <span>You don’t deliver to this pincode. Shoppers here can’t order.</span>
            )}
          </div>
        </div>
      ) : null}
      <p className="te-field-help">
        Shoppers see the same answer on product pages and at checkout (for an empty cart here).
      </p>
    </Card>
  )
}

function ZoneEditor({
  storeId,
  zone,
  states,
  canEdit,
  onDone,
}: {
  storeId: string
  zone: { id: string; values: ZoneValues } | null
  states: { code: string; name: string }[]
  canEdit: boolean
  onDone: (id: string | null) => void
}) {
  const router = useRouter()
  const [values, setValues] = useState<ZoneValues>(zone?.values ?? BLANK)
  const [pincodes, setPincodes] = useState((zone?.values.pincodePrefixes ?? []).join(', '))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [badMoney, setBadMoney] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const set = <K extends keyof ZoneValues>(key: K, value: ZoneValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }))
  const money =
    (key: 'feeMinor' | 'freeAboveMinor' | 'perExtraKgMinor') =>
    (amount: number | null, valid: boolean) => {
      set(key, amount)
      setBadMoney((current) => {
        const next = new Set(current)
        if (valid) next.delete(key)
        else next.add(key)
        return next
      })
    }
  const nameOf = (code: string) => states.find((s) => s.code === code)?.name ?? code
  const disabled = !canEdit || busy

  const save = async () => {
    if (badMoney.size) return toast.error('Fix the amounts marked in red first')
    const prefixes = pincodes
      .split(/[\s,]+/)
      .map((p) => p.trim())
      .filter(Boolean)
    setBusy(true)
    setErrors({})
    const result = await callApi<{ id: string }>(
      zone ? `/admin/v1/shipping/zones/${zone.id}` : '/admin/v1/shipping/zones',
      {
        method: zone ? 'PATCH' : 'POST',
        body: { ...values, pincodePrefixes: prefixes, store: storeId },
      },
    )
    setBusy(false)
    if (!result.ok) {
      setErrors(result.error.fields ?? {})
      return toast.error(result.error.message)
    }
    toast.success(zone ? 'Zone saved' : 'Zone added')
    onDone(result.data.id)
    router.refresh()
  }

  const remove = async () => {
    if (!zone) return
    setBusy(true)
    const result = await callApi(`/admin/v1/shipping/zones/${zone.id}`, {
      method: 'DELETE',
      body: { store: storeId },
    })
    setBusy(false)
    if (!result.ok) return toast.error(result.error.message)
    toast.success('Zone deleted')
    onDone(null)
    router.refresh()
  }

  const fieldError = (...keys: string[]) => {
    const message = keys.map((key) => errors[key]).find(Boolean)
    return message ? <p className="te-field-error">{message}</p> : null
  }

  return (
    <Card title={zone ? `Edit zone: ${zone.values.name}` : 'Add zone'}>
      <div className="te-form">
        <div>
          <label className="te-label" htmlFor="zone-name">
            Name
          </label>
          <input
            className="te-input"
            disabled={disabled}
            id="zone-name"
            onChange={(event) => set('name', event.target.value)}
            placeholder="West and South"
            value={values.name}
          />
          {fieldError('name')}
        </div>
        <div>
          <span className="te-label">States</span>
          <div className="te-chips">
            {values.states.map((code) => (
              <span className="te-chip" key={code}>
                {nameOf(code)}
                {canEdit ? (
                  <button
                    aria-label={`Remove ${nameOf(code)}`}
                    className="te-link-button"
                    disabled={busy}
                    onClick={() =>
                      set(
                        'states',
                        values.states.filter((s) => s !== code),
                      )
                    }
                    type="button"
                  >
                    ✕
                  </button>
                ) : null}
              </span>
            ))}
            {canEdit ? (
              <select
                aria-label="Add a state"
                className="te-input"
                disabled={busy}
                onChange={(event) => {
                  if (event.target.value) set('states', [...values.states, event.target.value])
                }}
                value=""
              >
                <option value="">Add a state…</option>
                {states
                  .filter((s) => !values.states.includes(s.code))
                  .map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
              </select>
            ) : null}
          </div>
          {fieldError('states')}
        </div>
        <div>
          <label className="te-label" htmlFor="zone-pincodes">
            Pincodes or pincode starts
          </label>
          <textarea
            className="te-input"
            disabled={disabled}
            id="zone-pincodes"
            onChange={(event) => setPincodes(event.target.value)}
            placeholder="411045, 4110, 3630"
            rows={2}
            value={pincodes}
          />
          <p className="te-field-help">
            Whole pincodes or their first digits (4110 covers 411001 to 411099). A pincode listed
            here wins over its state.
          </p>
          {fieldError('pincodePrefixes')}
        </div>
        <fieldset className="te-fieldset">
          <legend className="te-label">Fee based on</legend>
          <div className="te-segmented" role="radiogroup">
            {RATE_CHOICES.map((choice) => (
              <button
                aria-checked={values.rateType === choice.value}
                className="te-segmented__option"
                disabled={disabled}
                key={choice.value}
                onClick={() => set('rateType', choice.value)}
                role="radio"
                type="button"
              >
                {choice.label}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="te-form-grid te-form-grid--3">
          <RupeeField
            disabled={disabled}
            error={errors.feeMinor}
            id="zone-fee"
            label={
              values.rateType === 'weight'
                ? 'Fee for the first kilos'
                : values.rateType === 'order-value'
                  ? 'Fee below the first bracket'
                  : 'Fee'
            }
            onChange={money('feeMinor')}
            valueMinor={values.feeMinor}
          />
          <RupeeField
            disabled={disabled}
            id="zone-free"
            label="Free above"
            onChange={money('freeAboveMinor')}
            valueMinor={values.freeAboveMinor}
          />
          <div>
            <span className="te-label">Days</span>
            <div className="te-inline-field">
              <input
                aria-label="Delivery from (days)"
                className="te-input"
                disabled={disabled}
                inputMode="numeric"
                onChange={(event) => set('etaMinDays', toNumber(event.target.value))}
                placeholder="3"
                value={values.etaMinDays ?? ''}
              />
              <span className="te-muted">to</span>
              <input
                aria-label="Delivery to (days)"
                className="te-input"
                disabled={disabled}
                inputMode="numeric"
                onChange={(event) => set('etaMaxDays', toNumber(event.target.value))}
                placeholder="5"
                value={values.etaMaxDays ?? ''}
              />
            </div>
            {fieldError('etaMaxDays', 'etaMinDays')}
          </div>
        </div>
        {values.rateType === 'weight' ? (
          <div className="te-form-grid">
            <div>
              <label className="te-label" htmlFor="zone-base-kg">
                Fee covers up to (kg)
              </label>
              <input
                className="te-input"
                disabled={disabled}
                id="zone-base-kg"
                inputMode="decimal"
                onChange={(event) => {
                  const kg = Number(event.target.value)
                  set('baseWeightGrams', Number.isFinite(kg) ? Math.round(kg * 1000) : null)
                }}
                value={values.baseWeightGrams == null ? '' : values.baseWeightGrams / 1000}
              />
            </div>
            <RupeeField
              disabled={disabled}
              id="zone-per-kg"
              label="Then per extra kg"
              onChange={money('perExtraKgMinor')}
              valueMinor={values.perExtraKgMinor}
            />
          </div>
        ) : null}
        {values.rateType === 'order-value' ? (
          <Brackets
            brackets={values.valueBrackets}
            disabled={disabled}
            onChange={(brackets) => set('valueBrackets', brackets)}
          />
        ) : null}
        <label className="te-switch-row">
          <span className="te-switch">
            <input
              checked={values.codAllowed}
              disabled={disabled}
              onChange={(event) => set('codAllowed', event.target.checked)}
              type="checkbox"
            />
            <span className="te-switch__track" />
          </span>
          <span>Allow cash on delivery</span>
        </label>
        <label className="te-switch-row">
          <span className="te-switch">
            <input
              checked={!values.isServiceable}
              disabled={disabled}
              onChange={(event) => set('isServiceable', !event.target.checked)}
              type="checkbox"
            />
            <span className="te-switch__track" />
          </span>
          <span>We don’t deliver here (shoppers in this zone can’t order)</span>
        </label>
        <p className="te-field-help">
          GST on delivery: the same rate as the goods in the order, split by value when an order
          mixes rates.
        </p>
        {canEdit ? (
          <div className="te-button-row">
            <Button disabled={busy} onClick={() => void save()} size="small">
              {zone ? 'Save zone' : 'Add zone'}
            </Button>
            {zone ? (
              confirmDelete ? (
                <>
                  <span className="te-small">Delete {zone.values.name}?</span>
                  <Button
                    buttonStyle="secondary"
                    disabled={busy}
                    onClick={() => void remove()}
                    size="small"
                  >
                    Yes, delete
                  </Button>
                  <Button
                    buttonStyle="secondary"
                    onClick={() => setConfirmDelete(false)}
                    size="small"
                  >
                    Keep it
                  </Button>
                </>
              ) : (
                <Button
                  buttonStyle="secondary"
                  disabled={busy}
                  onClick={() => setConfirmDelete(true)}
                  size="small"
                >
                  Delete zone
                </Button>
              )
            ) : null}
          </div>
        ) : (
          <p className="te-muted te-small">Only owners and managers change shipping zones.</p>
        )}
      </div>
    </Card>
  )
}

function Brackets({
  brackets,
  disabled,
  onChange,
}: {
  brackets: ZoneValues['valueBrackets']
  disabled: boolean
  onChange: (brackets: ZoneValues['valueBrackets']) => void
}) {
  return (
    <div>
      <span className="te-label">Fee by order value</span>
      <p className="te-field-help">The highest bracket the order reaches applies.</p>
      {brackets.map((row, index) => (
        <div className="te-form-grid" key={index}>
          <RupeeField
            disabled={disabled}
            id={`bracket-from-${index}`}
            label="Orders from"
            onChange={(amount) =>
              onChange(brackets.map((b, i) => (i === index ? { ...b, fromMinor: amount ?? 0 } : b)))
            }
            valueMinor={row.fromMinor}
          />
          <RupeeField
            disabled={disabled}
            id={`bracket-fee-${index}`}
            label="Fee"
            onChange={(amount) =>
              onChange(brackets.map((b, i) => (i === index ? { ...b, feeMinor: amount ?? 0 } : b)))
            }
            valueMinor={row.feeMinor}
          />
        </div>
      ))}
      <div className="te-button-row">
        <Button
          buttonStyle="secondary"
          disabled={disabled}
          onClick={() => onChange([...brackets, { fromMinor: 0, feeMinor: 0 }])}
          size="small"
        >
          Add a bracket
        </Button>
        {brackets.length ? (
          <Button
            buttonStyle="secondary"
            disabled={disabled}
            onClick={() => onChange(brackets.slice(0, -1))}
            size="small"
          >
            Remove the last
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function toNumber(text: string): number | null {
  const digits = text.replace(/\D/g, '')
  return digits ? Number(digits) : null
}
