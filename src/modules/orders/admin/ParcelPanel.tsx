'use client'

import { Button, toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { callApi } from '@/admin/client/api'
import { Pill, type Tone } from '@/admin/ui'

const COURIERS = [
  'Delhivery',
  'Blue Dart',
  'DTDC',
  'Ecom Express',
  'Xpressbees',
  'Shadowfax',
  'India Post',
  'Ekart',
  'Own delivery',
]

const REASONS = [
  { value: 'customer_unavailable', label: 'Shopper not available' },
  { value: 'address_issue', label: 'Address problem' },
  { value: 'refused', label: 'Shopper refused it' },
  { value: 'cod_not_ready', label: 'Cash not ready' },
  { value: 'other', label: 'Other' },
]

export type ParcelView = {
  id: string
  status: string
  statusLabel: string
  tone: Tone
  items: string
  carrier: string | null
  trackingNumber: string | null
  trackingUrl: string | null
  attempts: number
  provider: string
  /** Shiprocket is connected and this packed parcel isn't booked yet */
  canBook: boolean
  labelUrl: string | null
  pickup: string | null
  next: { to: string; label: string; primary?: boolean }[]
  events: { at: string; text: string }[]
}

/**
 * One parcel on the order screen (docs/screens Order detail "Shipment", docs/11 journey): the
 * courier and tracking number to ship it, then the next steps. Every step messages the shopper.
 */
export function ParcelPanel({ parcel, canWrite }: { parcel: ParcelView; canWrite: boolean }) {
  const router = useRouter()
  const [carrier, setCarrier] = useState(parcel.carrier ?? COURIERS[0]!)
  const [tracking, setTracking] = useState(parcel.trackingNumber ?? '')
  const [link, setLink] = useState(parcel.trackingUrl ?? '')
  const [reason, setReason] = useState(REASONS[0]!.value)
  const [failing, setFailing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const move = async (to: string, extra: Record<string, unknown> = {}) => {
    setBusy(true)
    setErrors({})
    const result = await callApi(`/admin/v1/shipments/${parcel.id}/status`, {
      body: { to, ...extra },
    })
    setBusy(false)
    if (!result.ok) {
      setErrors(result.error.fields ?? {})
      toast.error(result.error.message)
      return
    }
    toast.success('Saved. The shopper is told.')
    setFailing(false)
    router.refresh()
  }

  const book = async () => {
    setBusy(true)
    const result = await callApi<{ awb: string }>(`/admin/v1/shipments/${parcel.id}/book`, {
      body: {},
    })
    setBusy(false)
    if (!result.ok) return toast.error(result.error.message)
    toast.success(`Booked with Shiprocket: AWB ${result.data.awb}`)
    router.refresh()
  }

  const packed = parcel.status === 'packed'
  const booked = parcel.provider === 'shiprocket'
  return (
    <div className="te-parcel">
      <div className="te-parcel__head">
        <Pill tone={parcel.tone}>{parcel.statusLabel}</Pill>
        <span className="te-small">{parcel.items}</span>
        {parcel.carrier && !packed ? (
          <span className="te-muted te-small">
            {parcel.carrier} ·{' '}
            {parcel.trackingUrl ? (
              <a className="te-link" href={parcel.trackingUrl} rel="noreferrer" target="_blank">
                {parcel.trackingNumber}
              </a>
            ) : (
              parcel.trackingNumber
            )}
            {parcel.attempts
              ? ` · ${parcel.attempts} failed attempt${parcel.attempts === 1 ? '' : 's'}`
              : ''}
          </span>
        ) : null}
      </div>
      {packed && booked ? (
        <div className="te-notice te-notice--info" role="status">
          Booked with Shiprocket: {parcel.carrier ?? 'courier'} · AWB{' '}
          {parcel.trackingUrl ? (
            <a className="te-link" href={parcel.trackingUrl} rel="noreferrer" target="_blank">
              {parcel.trackingNumber}
            </a>
          ) : (
            parcel.trackingNumber
          )}
          {parcel.pickup ? ` · pickup ${parcel.pickup}` : ''}. It moves to shipped when the courier
          picks it up.
          {parcel.labelUrl ? (
            <>
              {' '}
              <a className="te-link" href={parcel.labelUrl} rel="noreferrer" target="_blank">
                Print the label
              </a>
            </>
          ) : null}
        </div>
      ) : null}
      {canWrite && parcel.canBook ? (
        <div className="te-button-row">
          <Button disabled={busy} onClick={() => void book()} size="small">
            Book with Shiprocket
          </Button>
          <span className="te-muted te-small">
            AWB, label and pickup in one go. Or enter your own courier below.
          </span>
        </div>
      ) : null}
      {canWrite && packed && !booked ? (
        <div className="te-form-grid te-form-grid--3">
          <div>
            <label className="te-label" htmlFor={`carrier-${parcel.id}`}>
              Courier
            </label>
            <input
              className="te-input"
              id={`carrier-${parcel.id}`}
              list={`couriers-${parcel.id}`}
              onChange={(event) => setCarrier(event.target.value)}
              value={carrier}
            />
            <datalist id={`couriers-${parcel.id}`}>
              {COURIERS.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            {errors.carrier ? <p className="te-field-error">{errors.carrier}</p> : null}
          </div>
          <div>
            <label className="te-label" htmlFor={`awb-${parcel.id}`}>
              Tracking number
            </label>
            <input
              className="te-input"
              id={`awb-${parcel.id}`}
              onChange={(event) => setTracking(event.target.value)}
              placeholder="AWB number"
              value={tracking}
            />
            {errors.trackingNumber ? (
              <p className="te-field-error">{errors.trackingNumber}</p>
            ) : null}
          </div>
          <div>
            <label className="te-label" htmlFor={`link-${parcel.id}`}>
              Tracking link
            </label>
            <input
              className="te-input"
              id={`link-${parcel.id}`}
              onChange={(event) => setLink(event.target.value)}
              placeholder="Optional"
              value={link}
            />
          </div>
        </div>
      ) : null}
      {canWrite && parcel.next.length ? (
        <div className="te-button-row">
          {packed && !booked ? (
            <Button
              buttonStyle={parcel.canBook ? 'secondary' : 'primary'}
              disabled={busy}
              onClick={() =>
                void move('shipped', { carrier, trackingNumber: tracking, trackingUrl: link })
              }
              size="small"
            >
              Save and tell the shopper it shipped
            </Button>
          ) : null}
          {parcel.next
            .filter((step) => step.to !== 'shipped' && step.to !== 'delivery_failed')
            .map((step) => (
              <Button
                buttonStyle={step.primary ? 'primary' : 'secondary'}
                disabled={busy}
                key={step.to}
                onClick={() => void move(step.to)}
                size="small"
              >
                {step.label}
              </Button>
            ))}
          {parcel.next.some((step) => step.to === 'delivery_failed') ? (
            <Button
              buttonStyle="secondary"
              disabled={busy}
              onClick={() => setFailing(!failing)}
              size="small"
            >
              Delivery failed
            </Button>
          ) : null}
        </div>
      ) : null}
      {failing ? (
        <div className="te-confirm">
          <label className="te-label" htmlFor={`reason-${parcel.id}`}>
            Why did it fail?
          </label>
          <select
            className="te-input"
            id={`reason-${parcel.id}`}
            onChange={(event) => setReason(event.target.value)}
            value={reason}
          >
            {REASONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="te-confirm__buttons">
            <Button
              disabled={busy}
              onClick={() => void move('delivery_failed', { failureReason: reason })}
              size="small"
            >
              Save
            </Button>
          </div>
        </div>
      ) : null}
      {parcel.events.length > 1 ? (
        <ul className="te-parcel__events te-small te-muted">
          {parcel.events.map((event, index) => (
            <li key={index}>
              {event.at} · {event.text}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/** Adds a note for the team to the order's timeline. */
export function OrderNote({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="te-note-form"
      onSubmit={async (event) => {
        event.preventDefault()
        if (!text.trim()) return
        setBusy(true)
        const result = await callApi(`/admin/v1/orders/${orderId}/note`, { body: { text } })
        setBusy(false)
        if (!result.ok) return toast.error(result.error.message)
        setText('')
        router.refresh()
      }}
    >
      <label className="te-visually-hidden" htmlFor="order-note">
        Add a note for your team
      </label>
      <input
        className="te-input"
        id="order-note"
        onChange={(event) => setText(event.target.value)}
        placeholder="Add a note for your team"
        value={text}
      />
      <Button disabled={busy || !text.trim()} size="small" type="submit">
        Add
      </Button>
    </form>
  )
}
