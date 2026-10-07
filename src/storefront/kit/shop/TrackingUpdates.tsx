'use client'

import { useState, useTransition } from 'react'

import { WhatsAppIcon } from '../icons'
import { setTrackingWhatsApp } from '../../shop/tracking'

/** "Updates for +91 98xxx xx210" on the tracking page: WhatsApp on or off for this number */
export function TrackingUpdates({
  code,
  phone,
  initialOn,
}: {
  code: string
  phone: string
  initialOn: boolean
}) {
  const [on, setOn] = useState(initialOn)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const change = (next: boolean) =>
    start(async () => {
      setMessage(null)
      const result = await setTrackingWhatsApp(code, next)
      if (!result.ok) {
        setMessage(result.message)
        return
      }
      setOn(result.whatsapp)
      setMessage(
        result.whatsapp
          ? 'WhatsApp updates are on for this number.'
          : 'WhatsApp updates are off for this number. Order emails still arrive.',
      )
    })

  return (
    <section className="rounded-card border border-line bg-white">
      <h2 className="border-b border-line px-4 py-3 font-semibold">Updates for {phone}</h2>
      <div className="space-y-3 p-4 text-sm">
        <label className="flex items-center gap-3">
          <WhatsAppIcon aria-hidden height={18} width={18} />
          <span className="flex-1">WhatsApp updates</span>
          <input
            checked={on}
            className="size-5"
            disabled={pending}
            onChange={(event) => change(event.target.checked)}
            type="checkbox"
          />
        </label>
        {on ? (
          <button
            className="text-sm font-semibold text-red-700 underline-offset-2 hover:underline"
            disabled={pending}
            onClick={() => change(false)}
            type="button"
          >
            Stop updates for this number
          </button>
        ) : null}
        {message ? (
          <p aria-live="polite" className="text-ink-soft">
            {message}
          </p>
        ) : null}
      </div>
    </section>
  )
}
