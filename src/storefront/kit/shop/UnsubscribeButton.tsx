'use client'

import { useState, useTransition } from 'react'

import { setOffersFromLink } from '@/storefront/shop/unsubscribeActions'

import { buttonClass } from '../ui'

/** One tap to stop offers, and Undo (docs/screens storefront `st-offer-messages`). */
export function UnsubscribeButton({
  token,
  address,
  storeName,
}: {
  token: string
  address: string
  storeName: string
}) {
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const change = (on: boolean) =>
    start(async () => {
      const result = await setOffersFromLink(token, on)
      if (!result.ok) {
        setError(result.message ?? 'Something went wrong.')
        return
      }
      setDone(!on)
    })
  return (
    <div className="space-y-3">
      {done ? (
        <>
          <p className="font-semibold">
            You won’t get offers from {storeName} at {address} any more.
          </p>
          <p className="text-sm text-ink-soft">Order updates for your orders still arrive.</p>
          <button
            className="text-sm font-semibold underline"
            disabled={pending}
            onClick={() => change(true)}
            type="button"
          >
            Undo
          </button>
        </>
      ) : (
        <>
          <p>
            Stop offers from {storeName} to <b>{address}</b>?
          </p>
          <button
            className={buttonClass('dark')}
            disabled={pending}
            onClick={() => change(false)}
            type="button"
          >
            {pending ? 'Unsubscribing…' : 'Unsubscribe'}
          </button>
          <p className="text-sm text-ink-soft">Order updates for your orders still arrive.</p>
        </>
      )}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  )
}
