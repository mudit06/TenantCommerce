'use client'

/* eslint-disable @next/next/no-img-element -- a 200 px thumbnail from our own WebP sizes */
import { useEffect, useRef, useState } from 'react'

import Link from '@/storefront/kit/IntentLink'
import { quickAddOptions, type QuickAddOptions } from '@/storefront/shop/quickAddActions'

import { CloseIcon } from '../icons'
import { QuoteForm } from '../product/QuoteForm'
import { BuyBox } from './BuyBox'

/**
 * The quick add dialog: the finish and size picker (prices from the server) or the quote form.
 * Loaded only when a shopper first opens it, so cards don't carry this code (QuickAdd.tsx).
 */
export default function QuickAddDialog({
  mode,
  productId,
  slug,
  title,
  modelNumber,
  storeName,
  openCount,
}: {
  mode: 'options' | 'quote'
  productId: string
  slug: string
  title: string
  modelNumber: string
  storeName: string
  /** Goes up each time the shopper presses the card's button: open the dialog again */
  openCount: number
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [options, setOptions] = useState<QuickAddOptions | null>(null)
  const [error, setError] = useState<string | null>(null)
  const href = `/products/${slug}`

  useEffect(() => {
    if (openCount > 0 && !dialog.current?.open) dialog.current?.showModal()
  }, [openCount])

  useEffect(() => {
    if (mode !== 'options') return
    let live = true
    void quickAddOptions(slug).then((result) => {
      if (!live) return
      if (result.ok) setOptions(result.data)
      else setError(result.message)
    })
    return () => {
      live = false
    }
  }, [mode, slug])

  return (
    <dialog
      aria-labelledby={`qa-${productId}`}
      className="sheet pointer-events-auto fixed inset-x-0 top-auto bottom-0 m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-2xl bg-white p-0 text-ink shadow-2xl backdrop:bg-black/50 sm:inset-0 sm:m-auto sm:max-w-lg sm:rounded-card"
      onClick={(event) => {
        // A click on the backdrop closes it
        if (event.target === event.currentTarget) dialog.current?.close()
      }}
      ref={dialog}
    >
      <div className="sticky top-0 z-10 flex items-start gap-3 border-b border-line bg-white p-4">
        {options?.image ? (
          <img
            alt=""
            className="size-14 shrink-0 rounded-card bg-surface-alt object-contain"
            height={56}
            src={options.image.url}
            width={56}
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-accent uppercase">{modelNumber}</p>
          <h2 className="line-clamp-2 text-base font-semibold" id={`qa-${productId}`}>
            {title}
          </h2>
        </div>
        <button
          aria-label="Close"
          className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-surface-alt"
          onClick={() => dialog.current?.close()}
          type="button"
        >
          <CloseIcon />
        </button>
      </div>
      <div className="p-4">
        {mode === 'quote' ? (
          <QuoteForm
            modelNumber={modelNumber}
            page={href}
            productTitle={title}
            showQty
            storeName={storeName}
            submitLabel="Send quote request"
            type="product"
          />
        ) : error ? (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : options ? (
          <BuyBox
            axes={options.axes}
            baseMrpMinor={options.baseMrpMinor}
            basePriceMinor={options.basePriceMinor}
            compact
            modelNumber={options.modelNumber}
            offer={options.offer}
            pincodeCheck={false}
            productId={options.productId}
            quoteHref={null}
            variants={options.variants}
            whatsappHref={null}
          />
        ) : (
          // A still outline of the picker while its prices load
          <div aria-busy="true" className="space-y-4 py-2">
            <span className="sr-only" role="status">
              Loading options…
            </span>
            {['w-24', 'w-32', 'w-20'].map((width) => (
              <div className="space-y-2" key={width}>
                <div className={`h-3 rounded bg-surface-alt motion-safe:animate-pulse ${width}`} />
                <div className="flex gap-2">
                  <div className="h-10 w-20 rounded-card bg-surface-alt motion-safe:animate-pulse" />
                  <div className="h-10 w-20 rounded-card bg-surface-alt motion-safe:animate-pulse" />
                  <div className="h-10 w-20 rounded-card bg-surface-alt motion-safe:animate-pulse" />
                </div>
              </div>
            ))}
            <div className="h-11 rounded-card bg-surface-alt motion-safe:animate-pulse" />
          </div>
        )}
        <Link
          className="mt-4 inline-block text-sm font-semibold text-accent underline-offset-4 hover:underline"
          href={href}
        >
          See full details
        </Link>
      </div>
    </dialog>
  )
}
