'use client'

import { Button, toast } from '@payloadcms/ui'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { callApi } from '@/admin/client/api'
import { RupeeField } from '@/admin/ui/RupeeField'
import { formatINR } from '@/lib/money'

type Panel = 'refund' | 'cancel' | 'pack' | null

/**
 * The order's actions (docs/screens Order detail): download the invoice, refund, cancel, pack.
 * Each is a checked change on the server; buttons that can't apply aren't shown.
 */
export function OrderActions({
  orderId,
  canWrite,
  invoiceHref,
  canRefund,
  refundableMinor,
  cod,
  canCancel,
  canPack,
}: {
  orderId: string
  canWrite: boolean
  invoiceHref: string | null
  canRefund: boolean
  refundableMinor: number
  cod: boolean
  canCancel: boolean
  canPack: boolean
}) {
  const router = useRouter()
  const [panel, setPanel] = useState<Panel>(null)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [reason, setReason] = useState('')
  const [amount, setAmount] = useState<number | null>(refundableMinor)
  const [manual, setManual] = useState(cod)
  const [reference, setReference] = useState('')
  const [weight, setWeight] = useState('')
  const [eway, setEway] = useState('')

  const run = async (path: string, body: unknown, done: string) => {
    setBusy(true)
    setErrors({})
    const result = await callApi(path, { body })
    setBusy(false)
    if (!result.ok) {
      setErrors(result.error.fields ?? {})
      toast.error(result.error.message)
      return
    }
    toast.success(done)
    setPanel(null)
    setReason('')
    router.refresh()
  }

  return (
    <div className="te-order-actions">
      <div className="te-button-row">
        {invoiceHref ? (
          <a
            className="btn btn--style-secondary btn--size-small"
            href={invoiceHref}
            rel="noreferrer"
            target="_blank"
          >
            Download invoice
          </a>
        ) : null}
        {canWrite && canRefund ? (
          <Button
            buttonStyle="secondary"
            onClick={() => setPanel(panel === 'refund' ? null : 'refund')}
            size="small"
          >
            Refund
          </Button>
        ) : null}
        {canWrite && canCancel ? (
          <Button
            buttonStyle="error"
            onClick={() => setPanel(panel === 'cancel' ? null : 'cancel')}
            size="small"
          >
            Cancel order
          </Button>
        ) : null}
        {canWrite && canPack ? (
          <Button
            disabled={busy}
            onClick={() => setPanel(panel === 'pack' ? null : 'pack')}
            size="small"
          >
            Mark as packed
          </Button>
        ) : null}
      </div>

      {panel === 'cancel' ? (
        <div className="te-confirm">
          <p>
            Cancelling gives the stock back{cod ? '' : ' and notes the refund the shopper is owed'}.
            The shopper is told.
          </p>
          <label className="te-label" htmlFor="cancel-reason">
            Reason
          </label>
          <input
            className="te-input"
            id="cancel-reason"
            onChange={(event) => setReason(event.target.value)}
            placeholder="For example: out of stock, shopper asked"
            value={reason}
          />
          {errors.reason ? <p className="te-field-error">{errors.reason}</p> : null}
          <div className="te-confirm__buttons">
            <Button
              buttonStyle="error"
              disabled={busy || reason.trim().length < 3}
              onClick={() =>
                void run(`/admin/v1/orders/${orderId}/cancel`, { reason }, 'Order cancelled')
              }
              size="small"
            >
              Cancel the order
            </Button>
            <Button buttonStyle="secondary" onClick={() => setPanel(null)} size="small">
              Keep it
            </Button>
          </div>
        </div>
      ) : null}

      {panel === 'refund' ? (
        <div className="te-confirm">
          <p>
            Up to {formatINR(refundableMinor, { decimals: 'always' })} can be refunded. A credit
            note is issued for it.
          </p>
          <div className="te-form-grid">
            <RupeeField
              error={errors.amountMinor}
              id="refund-amount"
              label="Amount"
              onChange={(value) => setAmount(value)}
              valueMinor={amount}
            />
            <div>
              <label className="te-label" htmlFor="refund-reason">
                Reason
              </label>
              <input
                className="te-input"
                id="refund-reason"
                onChange={(event) => setReason(event.target.value)}
                value={reason}
              />
              {errors.reason ? <p className="te-field-error">{errors.reason}</p> : null}
            </div>
          </div>
          {!cod ? (
            <label className="te-checkbox">
              <input
                checked={manual}
                onChange={(event) => setManual(event.target.checked)}
                type="checkbox"
              />
              <span>I paid it back myself (bank transfer or UPI), not through Razorpay</span>
            </label>
          ) : null}
          {manual ? (
            <div>
              <label className="te-label" htmlFor="refund-reference">
                Bank or UPI reference
              </label>
              <input
                className="te-input"
                id="refund-reference"
                onChange={(event) => setReference(event.target.value)}
                value={reference}
              />
              {errors.reference ? <p className="te-field-error">{errors.reference}</p> : null}
            </div>
          ) : null}
          <div className="te-confirm__buttons">
            <Button
              disabled={busy || !amount || reason.trim().length < 3}
              onClick={() =>
                void run(
                  `/admin/v1/orders/${orderId}/refund`,
                  { amountMinor: amount, reason, manual, reference: reference || undefined },
                  manual ? 'Refund recorded' : 'Refund sent to Razorpay',
                )
              }
              size="small"
            >
              {manual ? 'Record refund' : 'Refund through Razorpay'}
            </Button>
            <Button buttonStyle="secondary" onClick={() => setPanel(null)} size="small">
              Close
            </Button>
          </div>
        </div>
      ) : null}

      {panel === 'pack' ? (
        <div className="te-confirm te-confirm--info">
          <p>Packs every item not packed yet into one parcel.</p>
          <div className="te-form-grid">
            <div>
              <label className="te-label" htmlFor="pack-weight">
                Parcel weight (g), optional
              </label>
              <input
                className="te-input"
                id="pack-weight"
                inputMode="numeric"
                onChange={(event) => setWeight(event.target.value.replace(/\D/g, ''))}
                value={weight}
              />
            </div>
            <div>
              <label className="te-label" htmlFor="pack-eway">
                E-way bill number (parcels above ₹50,000)
              </label>
              <input
                className="te-input"
                id="pack-eway"
                onChange={(event) => setEway(event.target.value)}
                value={eway}
              />
              {errors.ewayBillNo ? <p className="te-field-error">{errors.ewayBillNo}</p> : null}
            </div>
          </div>
          <div className="te-confirm__buttons">
            <Button
              disabled={busy}
              onClick={() =>
                void run(
                  `/admin/v1/orders/${orderId}/pack`,
                  {
                    package: weight ? { weightGrams: Number(weight) } : undefined,
                    ewayBillNo: eway || undefined,
                  },
                  'Packed',
                )
              }
              size="small"
            >
              Mark as packed
            </Button>
            <Button buttonStyle="secondary" onClick={() => setPanel(null)} size="small">
              Close
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
