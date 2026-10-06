'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { CartIcon } from '../icons'

export const CART_EVENT = 'te-cart'

const readCount = () => {
  const match = document.cookie.match(/(?:^|; )te_cart_n=(\d+)/)
  return match ? Number(match[1]) : 0
}

/** The header's cart icon with its count, kept current without a request (cookie + event). */
export function CartLink() {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const update = () => setCount(readCount())
    update()
    window.addEventListener(CART_EVENT, update)
    window.addEventListener('focus', update)
    return () => {
      window.removeEventListener(CART_EVENT, update)
      window.removeEventListener('focus', update)
    }
  }, [])
  return (
    <Link
      aria-label={count ? `Cart, ${count} item${count === 1 ? '' : 's'}` : 'Cart'}
      className="relative flex size-11 items-center justify-center rounded-card border border-line hover:border-ink/40"
      href="/cart"
    >
      <CartIcon />
      {count > 0 ? (
        <span className="absolute -top-1.5 -right-1.5 flex min-w-5 items-center justify-center rounded-full bg-dark px-1 text-[11px] font-bold text-white">
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </Link>
  )
}

/** Tells the header the cart changed (after an action has set the cookie). */
export const announceCartChange = () => window.dispatchEvent(new Event(CART_EVENT))
