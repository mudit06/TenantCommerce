'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { cancelMyOrder } from '../../shop/accountActions'

/** "Cancel order" until the order ships (docs/screens Order tracking rule 4). */
export function CancelOrderButton({
  orderNumber,
  prepaid,
}: {
  orderNumber: string
  prepaid: boolean
}) {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [pending, start] = useTransition()
  return (
    <div className="space-y-2">
      <button
        className="inline-flex min-h-9 items-center rounded-card border border-red-700/40 px-3 text-sm font-semibold text-red-700 hover:border-red-700"
        disabled={pending}
        onClick={() => {
          const ok = window.confirm(
            prepaid
              ? 'Cancel this order? The store refunds what you paid to the same account.'
              : 'Cancel this order?',
          )
          if (!ok) return
          start(async () => {
            const result = await cancelMyOrder(orderNumber)
            if (!result.ok) {
              setMessage(result.message)
              return
            }
            router.refresh()
          })
        }}
        type="button"
      >
        {pending ? 'Cancelling…' : 'Cancel order'}
      </button>
      {message ? <p className="text-sm text-red-700">{message}</p> : null}
    </div>
  )
}
