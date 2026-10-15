'use client'

import { useEffect, useRef, useState } from 'react'

import Link from '@/storefront/kit/IntentLink'

import { HeartIcon } from '../icons'
import { readWishlist, syncOnce, WISHLIST_EVENT } from './HeartButton'

const LOOK = {
  boxed: 'rounded-card border border-line hover:border-ink/40',
  plain: 'rounded-full hover:bg-surface-alt',
} as const
const BADGE = {
  boxed: '-top-1.5 -right-1.5 bg-dark text-white',
  plain: 'top-0 right-0 bg-brand text-brand-ink',
} as const

/** The header's wishlist icon with its count (docs/screens storefront layout rules, desktop). */
export function WishlistLink({
  className = '',
  look = 'boxed',
}: {
  className?: string
  look?: 'boxed' | 'plain'
}) {
  const [count, setCount] = useState(0)
  // Goes up when a heart changes the count, so the badge bumps (not on page load)
  const [changes, setChanges] = useState(0)
  const last = useRef<number | null>(null)
  useEffect(() => {
    const read = (bump: boolean) => {
      const next = readWishlist().length
      if (bump && last.current !== null && next !== last.current) setChanges((n) => n + 1)
      last.current = next
      setCount(next)
    }
    const update = () => read(false)
    const changed = () => read(true)
    update()
    void syncOnce().then(update)
    window.addEventListener(WISHLIST_EVENT, changed)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener(WISHLIST_EVENT, changed)
      window.removeEventListener('storage', update)
    }
  }, [])
  return (
    <Link
      aria-label={count ? `Wishlist, ${count} saved` : 'Wishlist'}
      className={`relative size-11 items-center justify-center ${LOOK[look]} ${className}`}
      href="/wishlist"
    >
      <HeartIcon />
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
