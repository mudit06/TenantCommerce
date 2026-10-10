'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { HeartIcon } from '../icons'
import { readWishlist, syncOnce, WISHLIST_EVENT } from './HeartButton'

/** The header's wishlist icon with its count (docs/screens storefront layout rules, desktop). */
export function WishlistLink({ className = '' }: { className?: string }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const update = () => setCount(readWishlist().length)
    update()
    void syncOnce().then(update)
    window.addEventListener(WISHLIST_EVENT, update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener(WISHLIST_EVENT, update)
      window.removeEventListener('storage', update)
    }
  }, [])
  return (
    <Link
      aria-label={count ? `Wishlist, ${count} saved` : 'Wishlist'}
      className={`relative size-11 items-center justify-center rounded-card border border-line hover:border-ink/40 ${className}`}
      href="/wishlist"
    >
      <HeartIcon />
      {count > 0 ? (
        <span className="absolute -top-1.5 -right-1.5 flex min-w-5 items-center justify-center rounded-full bg-dark px-1 text-[11px] font-bold text-white">
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </Link>
  )
}
