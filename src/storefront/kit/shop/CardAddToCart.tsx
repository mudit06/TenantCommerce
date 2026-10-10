'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'

import { addToCart } from '@/storefront/shop/actions'

import { buttonClass } from '../ui'
import { announceCartChange } from './CartLink'

/**
 * Add to cart on a product card (docs/screens storefront `st-category`): one piece of the only
 * finish. Products sold in several finishes or sizes open their page to choose; the server checks
 * price and stock either way.
 */
export function CardAddToCart({
  productId,
  variantId,
  options,
  available,
  href,
  title,
}: {
  productId: string
  variantId: string | null
  options: number
  available: number | null
  href: string
  title: string
}) {
  const [state, setState] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()
  const className = buttonClass('outline', 'min-h-10 w-full px-3 text-xs sm:text-sm')

  if (options > 1)
    return (
      <Link aria-label={`Choose a finish of ${title}`} className={className} href={href}>
        Choose finish
      </Link>
    )
  if (available === 0)
    return (
      <button className={`${className} opacity-60`} disabled type="button">
        Out of stock
      </button>
    )
  return (
    <div>
      <button
        aria-label={`Add ${title} to cart`}
        className={className}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await addToCart({ productId, variantId, qty: 1 })
            if (result.ok) {
              announceCartChange()
              setState({ ok: true, text: 'Added to your cart' })
            } else setState({ ok: false, text: result.message })
          })
        }
        type="button"
      >
        {pending ? 'Adding…' : state?.ok ? 'Added ✓' : 'Add to cart'}
      </button>
      <p
        aria-live="polite"
        className={`mt-1 text-[11px] ${state?.ok ? 'sr-only' : 'text-red-700'}`}
      >
        {state?.text ?? ''}
      </p>
    </div>
  )
}
