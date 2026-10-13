'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { CartIcon } from '../icons'

export const CART_EVENT = 'te-cart'

const LOOK = {
  boxed: 'rounded-card border border-line hover:border-ink/40',
  plain: 'rounded-full hover:bg-surface-alt',
} as const
const BADGE = {
  boxed: '-top-1.5 -right-1.5 bg-dark text-white',
  plain: 'top-0 right-0 bg-brand text-brand-ink',
} as const

const readCount = () => {
  const match = document.cookie.match(/(?:^|; )te_cart_n=(\d+)/)
  return match ? Number(match[1]) : 0
}

/** The header's cart icon with its count, kept current without a request (cookie + event). */
export function CartLink({ look = 'boxed' }: { look?: 'boxed' | 'plain' }) {
  const [count, setCount] = useState(0)
  // Goes up when something is added here, so the badge bumps (not on page load)
  const [changes, setChanges] = useState(0)
  useEffect(() => {
    const update = () => setCount(readCount())
    const changed = () => {
      update()
      setChanges((n) => n + 1)
    }
    update()
    window.addEventListener(CART_EVENT, changed)
    window.addEventListener('focus', update)
    return () => {
      window.removeEventListener(CART_EVENT, changed)
      window.removeEventListener('focus', update)
    }
  }, [])
  return (
    <Link
      aria-label={count ? `Cart, ${count} item${count === 1 ? '' : 's'}` : 'Cart'}
      className={`relative flex size-11 items-center justify-center ${LOOK[look]}`}
      href="/cart"
    >
      <CartIcon />
      {count > 0 ? (
        <span
          className={`absolute flex min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold ${BADGE[look]} ${changes ? 'bump' : ''}`}
          key={changes}
        >
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </Link>
  )
}

/** Tells the header the cart changed (after an action has set the cookie). */
export const announceCartChange = () => window.dispatchEvent(new Event(CART_EVENT))
