'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { saveMyPayoutDetails } from '../../shop/affiliateActions'
import { buttonClass } from '../ui'

const inputClass =
  'h-11 w-full rounded-card border border-line bg-white px-3 text-sm outline-none focus:border-ink/60'

/** Where the store pays the affiliate, and their PAN (stored encrypted, shown masked). */
export function PayoutDetailsForm({ payout, pan }: { payout: string | null; pan: string | null }) {
  const router = useRouter()
  const [open, setOpen] = useState(!payout)
  const [method, setMethod] = useState<'upi' | 'bank'>('upi')
  const [values, setValues] = useState({
    upiId: '',
    accountName: '',
    accountNumber: '',
    ifsc: '',
    pan: '',
  })
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()
  const set = (key: keyof typeof values, value: string) => setValues({ ...values, [key]: value })

  const save = () =>
    start(async () => {
      const result = await saveMyPayoutDetails({
        payout:
          method === 'upi'
            ? { method, upiId: values.upiId }
            : {
                method,
                accountName: values.accountName,
                accountNumber: values.accountNumber,
                ifsc: values.ifsc,
              },
        pan: values.pan,
      })
      if (!result.ok) {
        setMessage({ ok: false, text: result.message })
        return
      }
      setMessage({ ok: true, text: 'Saved. We emailed you to confirm the change.' })
      setValues({ upiId: '', accountName: '', accountNumber: '', ifsc: '', pan: '' })
      setOpen(false)
      router.refresh()
    })

  return (
    <div className="space-y-3 text-sm">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="text-ink-soft">Paid to</dt>
        <dd>{payout ?? 'Not given yet'}</dd>
        <dt className="text-ink-soft">PAN</dt>
        <dd>{pan ?? 'Not given yet (needed before your first payout)'}</dd>
      </dl>
      {!open ? (
        <button
          className={buttonClass('outline', 'min-h-9 px-3')}
          onClick={() => setOpen(true)}
          type="button"
        >
          Edit
        </button>
      ) : (
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            save()
          }}
        >
          <fieldset className="flex flex-wrap gap-4 sm:col-span-2">
            <legend className="mb-1 text-xs font-semibold">Pay me by</legend>
            {(
              [
                ['upi', 'UPI'],
                ['bank', 'Bank transfer'],
              ] as const
            ).map(([value, label]) => (
              <label className="flex items-center gap-2" key={value}>
                <input
                  checked={method === value}
                  name="aff-method"
                  onChange={() => setMethod(value)}
                  type="radio"
                />
                {label}
              </label>
            ))}
          </fieldset>
          {method === 'upi' ? (
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold" htmlFor="aff-upi">
                UPI ID
              </label>
              <input
                className={inputClass}
                id="aff-upi"
                onChange={(e) => set('upiId', e.target.value)}
                placeholder="name@okaxis"
                value={values.upiId}
              />
            </div>
          ) : (
            <>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold" htmlFor="aff-acname">
                  Name on the account
                </label>
                <input
                  className={inputClass}
                  id="aff-acname"
                  onChange={(e) => set('accountName', e.target.value)}
                  value={values.accountName}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold" htmlFor="aff-acno">
                  Account number
                </label>
                <input
                  className={inputClass}
                  id="aff-acno"
                  inputMode="numeric"
                  onChange={(e) => set('accountNumber', e.target.value)}
                  value={values.accountNumber}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold" htmlFor="aff-ifsc">
                  IFSC
                </label>
                <input
                  className={inputClass}
                  id="aff-ifsc"
                  onChange={(e) => set('ifsc', e.target.value.toUpperCase())}
                  value={values.ifsc}
                />
              </div>
            </>
          )}
          <div>
            <label className="mb-1 block text-xs font-semibold" htmlFor="aff-pan2">
              PAN {pan ? '(leave empty to keep)' : ''}
            </label>
            <input
              className={inputClass}
              id="aff-pan2"
              maxLength={10}
              onChange={(e) => set('pan', e.target.value.toUpperCase())}
              value={values.pan}
            />
          </div>
          <div className="flex items-end">
            <button className={buttonClass('primary')} disabled={pending} type="submit">
              {pending ? 'Saving…' : 'Save payout details'}
            </button>
          </div>
        </form>
      )}
      {message ? (
        <p className={message.ok ? 'text-emerald-800' : 'text-red-700'} role="status">
          {message.text}
        </p>
      ) : null}
    </div>
  )
}
