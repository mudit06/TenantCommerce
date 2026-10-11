'use client'

import dynamic from 'next/dynamic'
import { useState, useTransition } from 'react'

import { addToCart } from '@/storefront/shop/actions'

import { CartIcon, MailIcon, PlusIcon } from '../icons'
import { buttonClass } from '../ui'
import { announceCartChange } from './CartLink'

// The picker and quote form load on the first press, not with every card
const QuickAddDialog = dynamic(() => import('./QuickAddDialog'), { ssr: false })

/**
 * Quick add on a product card (docs/10 kit: AddToCart / RequestQuote): one piece of a product
 * sold in one finish goes straight to the cart; one with finishes or sizes opens a small picker
 * with their prices; a "price on request" product opens the quote form. Prices come from the
 * server each time; the cart prices the line again.
 *
 * `look`: "overlay" sits on the card's photo (shown on hover with a mouse, always on touch);
 * "button" fills the width under the card, as on listing pages.
 */
export function QuickAdd({
  mode,
  productId,
  variantId,
  available,
  slug,
  title,
  modelNumber,
  storeName,
  look,
}: {
  mode: 'cart' | 'options' | 'quote'
  productId: string
  variantId: string | null
  available: number | null
  slug: string
  title: string
  modelNumber: string
  storeName: string
  look: 'overlay' | 'button'
}) {
  const [pending, start] = useTransition()
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null)
  const [openCount, setOpenCount] = useState(0)
  const soldOut = mode === 'cart' && available === 0

  const open = () => setOpenCount((n) => n + 1)

  const addNow = () =>
    start(async () => {
      const result = await addToCart({ productId, variantId, qty: 1 })
      if (result.ok) {
        announceCartChange()
        setNote({ ok: true, text: `${title} added to your cart` })
      } else setNote({ ok: false, text: result.message })
    })

  const label =
    mode === 'quote'
      ? 'Quick quote'
      : soldOut
        ? 'Out of stock'
        : pending && mode === 'cart'
          ? 'Adding…'
          : note?.ok
            ? 'Added ✓'
            : mode === 'cart'
              ? 'Add to cart'
              : 'Quick add'
  const Icon = mode === 'quote' ? MailIcon : note?.ok ? CartIcon : PlusIcon
  const onClick = mode === 'cart' ? addNow : open

  const trigger =
    look === 'overlay' ? (
      <button
        aria-label={`${label}: ${title}`}
        className="pointer-events-auto inline-flex min-h-10 items-center gap-1.5 rounded-full bg-white/95 px-3 text-xs font-semibold text-ink shadow-md ring-1 ring-black/5 transition hover:bg-dark hover:text-white disabled:opacity-60 sm:text-sm"
        disabled={soldOut || (pending && mode === 'cart')}
        onClick={onClick}
        type="button"
      >
        <Icon aria-hidden height={16} width={16} />
        <span className="max-[380px]:sr-only">{label}</span>
      </button>
    ) : (
      <button
        aria-label={`${label}: ${title}`}
        className={buttonClass('outline', 'min-h-10 w-full px-3 text-xs sm:text-sm')}
        disabled={soldOut || (pending && mode === 'cart')}
        onClick={onClick}
        type="button"
      >
        {mode === 'quote' ? 'Ask for a quote' : mode === 'options' ? 'Choose options' : label}
      </button>
    )

  return (
    <>
      {trigger}
      {mode === 'cart' ? (
        <p
          aria-live="polite"
          className={note && !note.ok ? 'mt-1 text-[11px] text-red-700' : 'sr-only'}
        >
          {note?.text ?? ''}
        </p>
      ) : openCount > 0 ? (
        <QuickAddDialog
          mode={mode}
          modelNumber={modelNumber}
          openCount={openCount}
          productId={productId}
          slug={slug}
          storeName={storeName}
          title={title}
        />
      ) : null}
    </>
  )
}
