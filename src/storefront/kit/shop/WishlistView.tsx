'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useTransition } from 'react'

import { addToCart } from '@/storefront/shop/actions'
import { syncWishlist, wishlistView, type WishlistRow } from '@/storefront/shop/wishlistActions'

import { HeartIcon } from '../icons'
import { buttonClass } from '../ui'
import { announceCartChange } from './CartLink'
import { readWishlist, syncOnce, writeWishlist, type LocalItem } from './HeartButton'
import { Price } from './Price'

/**
 * The wishlist (docs/screens storefront `st-wishlist`): prices, offers and stock read fresh,
 * Move to cart with the saved finish, Remove with Undo.
 */
export function WishlistView({ signedIn, selling }: { signedIn: boolean; selling: boolean }) {
  const [rows, setRows] = useState<WishlistRow[] | null>(null)
  const [undo, setUndo] = useState<{ item: LocalItem; title: string } | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const timer = useRef<number | null>(null)

  const load = () =>
    start(async () => {
      await syncOnce()
      setRows(await wishlistView(readWishlist()))
    })
  useEffect(load, [])

  const save = (items: LocalItem[]) => {
    writeWishlist(items)
    void syncWishlist(items, 'replace')
  }

  const remove = (row: WishlistRow) => {
    const item = { productId: row.productId, variantId: row.variantId }
    save(
      readWishlist().filter((i) => i.productId !== row.productId || i.variantId !== row.variantId),
    )
    setRows((current) => current?.filter((r) => r !== row) ?? null)
    setUndo({ item, title: row.title })
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setUndo(null), 6000)
  }

  const moveToCart = (row: WishlistRow) =>
    start(async () => {
      setMessage(null)
      const result = await addToCart({ productId: row.productId, variantId: row.variantId, qty: 1 })
      if (!result.ok) {
        setMessage(result.message)
        return
      }
      announceCartChange()
      save(
        readWishlist().filter(
          (i) => i.productId !== row.productId || i.variantId !== row.variantId,
        ),
      )
      setRows((current) => current?.filter((r) => r !== row) ?? null)
      setMessage(`${row.title} is in your cart.`)
    })

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-heading text-2xl font-bold">Your wishlist</h1>
        <p className="text-sm text-ink-soft">{rows ? `${rows.length} saved` : 'Loading…'}</p>
      </header>
      {!signedIn ? (
        <div className="flex flex-wrap items-center gap-3 rounded-card bg-surface-alt p-3 text-sm">
          <HeartIcon aria-hidden height={16} width={16} />
          <span className="flex-1">
            Saved on this device. Log in to keep your wishlist on all your devices.
          </span>
          <Link
            className={buttonClass('outline', 'min-h-9 px-3')}
            href="/account/login?next=%2Fwishlist"
          >
            Log in
          </Link>
        </div>
      ) : null}
      {undo ? (
        <p
          className="flex items-center gap-3 rounded-card border border-line p-3 text-sm"
          role="status"
        >
          <span className="flex-1">Removed {undo.title}.</span>
          <button
            className="font-semibold underline"
            onClick={() => {
              save([...readWishlist(), undo.item])
              setUndo(null)
              load()
            }}
            type="button"
          >
            Undo
          </button>
        </p>
      ) : null}
      {message ? (
        <p aria-live="polite" className="text-sm">
          {message}{' '}
          <Link className="underline" href="/cart">
            Go to cart
          </Link>
        </p>
      ) : null}
      {rows && rows.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-ink-soft">
            Nothing saved yet. Tap the heart on a product to keep it here.
          </p>
          <Link className={buttonClass('dark', 'mt-5')} href="/">
            Browse the store
          </Link>
        </div>
      ) : null}
      <ul aria-busy={pending} className="divide-y divide-line">
        {(rows ?? []).map((row) => (
          <li className="flex gap-3 py-4" key={`${row.productId}:${row.variantId}`}>
            <Link
              className="size-20 shrink-0 overflow-hidden rounded-card border border-line bg-surface-alt sm:size-24"
              href={row.href}
            >
              {row.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={row.image.alt} className="size-full object-contain" src={row.image.url} />
              ) : null}
            </Link>
            <div className="min-w-0 flex-1 space-y-1">
              <Link className="font-semibold hover:underline" href={row.href}>
                {row.title}
              </Link>
              <p className="text-xs text-ink-soft">
                {[row.options, row.sku].filter(Boolean).join(' · ')}
              </p>
              {row.priceMinor !== null ? (
                <Price
                  amountMinor={row.offer?.priceMinor ?? row.priceMinor}
                  mrpMinor={row.offer?.priceMinor ? (row.mrpMinor ?? row.priceMinor) : row.mrpMinor}
                  size="sm"
                />
              ) : (
                <p className="text-xs text-ink-soft">Price on request</p>
              )}
              {row.offer?.until ? (
                <p className="text-xs">
                  {row.offer.badge ? `${row.offer.badge} until ` : 'Offer until '}
                  {row.offer.until}
                </p>
              ) : null}
              <p
                className={`text-xs ${row.problem ? 'font-semibold text-red-700' : 'text-ink-soft'}`}
              >
                {row.problem ?? 'In stock'}
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {selling && !row.problem && row.priceMinor !== null ? (
                  <button
                    className={buttonClass('dark', 'min-h-9 px-3')}
                    disabled={pending}
                    onClick={() => moveToCart(row)}
                    type="button"
                  >
                    Move to cart
                  </button>
                ) : null}
                <button
                  className="text-sm text-ink-soft underline"
                  onClick={() => remove(row)}
                  type="button"
                >
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-xs text-ink-soft">
        Move to cart adds the finish you saved · Price alerts come later
      </p>
    </div>
  )
}
