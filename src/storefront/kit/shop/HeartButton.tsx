'use client'

import { useEffect, useState, useTransition } from 'react'

import { syncWishlist } from '@/storefront/shop/wishlistActions'

import { HeartIcon } from '../icons'
import { useChosenOptions } from './ChosenOptions'

// Wishlist hearts (docs/screens storefront `st-wishlist` rule 1). The list lives on the device
// for everyone; a signed-in shopper's list is also kept in their account, merged on first use.

export const WISHLIST_KEY = 'te_wishlist'
export const WISHLIST_EVENT = 'te-wishlist'
const SYNCED = 'te_wishlist_synced'

export type LocalItem = { productId: string; variantId: string | null }

export function readWishlist(): LocalItem[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(WISHLIST_KEY) ?? '[]') as LocalItem[]
    return Array.isArray(value) ? value.filter((i) => i && typeof i.productId === 'string') : []
  } catch {
    return []
  }
}

export function writeWishlist(items: LocalItem[]) {
  try {
    window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(items.slice(0, 100)))
  } catch {
    // Private mode: the heart still works for this page
  }
  window.dispatchEvent(new Event(WISHLIST_EVENT))
}

/** Once a session: merge the device's list with the account's (when signed in). */
export async function syncOnce() {
  try {
    if (window.sessionStorage.getItem(SYNCED)) return
    window.sessionStorage.setItem(SYNCED, '1')
  } catch {
    return
  }
  const result = await syncWishlist(readWishlist(), 'merge')
  if (result.signedIn) writeWishlist(result.items)
}

export function HeartButton({
  productId,
  variantId = null,
  label,
  className = '',
  withText = false,
  followChosen = false,
}: {
  productId: string
  variantId?: string | null
  label: string
  className?: string
  withText?: boolean
  /** On a product page: save the finish and size picked in the buy box */
  followChosen?: boolean
}) {
  const chosen = useChosenOptions()
  const savedVariant = followChosen ? (chosen?.variantId ?? variantId) : variantId
  const [saved, setSaved] = useState(false)
  // Goes up on each tap, so the heart bumps when pressed (not when the page loads)
  const [taps, setTaps] = useState(0)
  const [, start] = useTransition()

  useEffect(() => {
    const update = () => setSaved(readWishlist().some((i) => i.productId === productId))
    update()
    void syncOnce().then(update)
    window.addEventListener(WISHLIST_EVENT, update)
    return () => window.removeEventListener(WISHLIST_EVENT, update)
  }, [productId])

  const toggle = () => {
    const items = readWishlist()
    const next = saved
      ? items.filter((i) => i.productId !== productId)
      : [...items, { productId, variantId: savedVariant }]
    writeWishlist(next)
    setSaved(!saved)
    setTaps((n) => n + 1)
    start(async () => {
      await syncWishlist(next, 'replace')
    })
  }

  return (
    <button
      aria-label={saved ? `Remove ${label} from your wishlist` : `Save ${label} to your wishlist`}
      aria-pressed={saved}
      className={className}
      onClick={(event) => {
        event.preventDefault()
        toggle()
      }}
      type="button"
    >
      <HeartIcon
        aria-hidden
        className={`${saved ? 'fill-red-600 text-red-600' : 'text-ink'} ${taps ? 'bump' : ''}`}
        height={18}
        key={taps}
        width={18}
      />
      {withText ? <span>{saved ? 'Saved' : 'Save'}</span> : null}
    </button>
  )
}
