'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { requestMyReturn } from '../../shop/accountActions'
import { buttonClass } from '../ui'

const REASONS = [
  ['damaged', 'Arrived damaged or broken'],
  ['wrong-item', 'Wrong item or finish'],
  ['not-as-described', 'Not as described'],
  ['size-fit', 'Size or fit'],
  ['changed-mind', 'Changed my mind'],
  ['other', 'Something else'],
] as const

/** "Request return": what, why and photos, while the window is open (docs/screens `st-order`). */
export function ReturnForm({
  orderNumber,
  items,
  closes,
}: {
  orderNumber: string
  items: { orderItemId: string; title: string; options: string | null; qty: number }[]
  closes: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [chosen, setChosen] = useState<Record<string, number>>({})
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [pending, start] = useTransition()

  if (!open) {
    return (
      <div className="space-y-2 text-sm">
        <p>You can return items until {closes}.</p>
        <button
          className={buttonClass('outline', 'min-h-9 px-3')}
          onClick={() => setOpen(true)}
          type="button"
        >
          Request return
        </button>
      </div>
    )
  }

  const submit = () =>
    start(async () => {
      const form = new FormData()
      form.set('orderNumber', orderNumber)
      form.set(
        'items',
        JSON.stringify(
          Object.entries(chosen)
            .filter(([, qty]) => qty > 0)
            .map(([orderItemId, qty]) => ({ orderItemId, qty })),
        ),
      )
      form.set('reason', reason)
      form.set('note', note)
      for (const file of files.slice(0, 3)) form.append('photos', file)
      const result = await requestMyReturn(form)
      if (!result.ok) {
        setMessage(result.message)
        return
      }
      setMessage(null)
      setOpen(false)
      router.refresh()
    })

  return (
    <form
      className="space-y-3 text-sm"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <fieldset className="space-y-2">
        <legend className="mb-1 text-xs font-semibold">What are you returning?</legend>
        {items.map((item) => (
          <label className="flex items-center gap-2" key={item.orderItemId}>
            <input
              checked={(chosen[item.orderItemId] ?? 0) > 0}
              className="size-4"
              onChange={(e) =>
                setChosen({ ...chosen, [item.orderItemId]: e.target.checked ? item.qty : 0 })
              }
              type="checkbox"
            />
            <span className="min-w-0 flex-1">
              {item.title}
              {item.options ? <span className="text-ink-soft"> · {item.options}</span> : null}
            </span>
            {item.qty > 1 && (chosen[item.orderItemId] ?? 0) > 0 ? (
              <select
                aria-label={`How many ${item.title}`}
                className="h-9 rounded-card border border-line bg-white px-2"
                onChange={(e) =>
                  setChosen({ ...chosen, [item.orderItemId]: Number(e.target.value) })
                }
                value={chosen[item.orderItemId]}
              >
                {Array.from({ length: item.qty }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            ) : null}
          </label>
        ))}
      </fieldset>
      <div>
        <label className="mb-1 block text-xs font-semibold" htmlFor="ret-reason">
          Why?
        </label>
        <select
          className="h-11 w-full rounded-card border border-line bg-white px-3"
          id="ret-reason"
          onChange={(e) => setReason(e.target.value)}
          value={reason}
        >
          <option value="">Choose</option>
          {REASONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold" htmlFor="ret-note">
          Anything to add (optional)
        </label>
        <textarea
          className="min-h-20 w-full rounded-card border border-line bg-white p-3"
          id="ret-note"
          maxLength={1000}
          onChange={(e) => setNote(e.target.value)}
          value={note}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold" htmlFor="ret-photos">
          Photos (up to 3; they help for damage or a wrong item)
        </label>
        <input
          accept="image/jpeg,image/png,image/webp"
          id="ret-photos"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 3))}
          type="file"
        />
      </div>
      {message ? (
        <p className="text-red-700" role="alert">
          {message}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button className={buttonClass('primary')} disabled={pending} type="submit">
          {pending ? 'Sending…' : 'Send return request'}
        </button>
        <button className={buttonClass('outline')} onClick={() => setOpen(false)} type="button">
          Back
        </button>
      </div>
      <p className="text-xs text-ink-soft">
        The store checks the request and tells you how the item comes back.
      </p>
    </form>
  )
}
