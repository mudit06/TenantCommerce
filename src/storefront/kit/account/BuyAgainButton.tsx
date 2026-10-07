'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { buyAgain } from '../../shop/accountActions'
import { announceCartChange } from '../shop/CartLink'
import { buttonClass } from '../ui'

/** Puts a delivered order's items back in the cart, at today's prices, and opens the cart. */
export function BuyAgainButton({ orderNumber }: { orderNumber: string }) {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)
  const [pending, start] = useTransition()
  return (
    <>
      <button
        className={buttonClass('outline', 'min-h-9 px-3')}
        disabled={pending}
        onClick={() =>
          start(async () => {
            setMessage(null)
            const result = await buyAgain(orderNumber)
            if (!result.ok) {
              setMessage(result.message)
              return
            }
            if (!result.data.added) {
              setMessage('These items aren’t available any more.')
              return
            }
            announceCartChange()
            router.push('/cart')
          })
        }
        type="button"
      >
        {pending ? 'Adding…' : 'Buy again'}
      </button>
      {message ? <span className="w-full text-xs text-red-700">{message}</span> : null}
    </>
  )
}
