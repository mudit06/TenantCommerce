'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useId, useMemo, useState, useTransition } from 'react'

import { formatINR } from '@/lib/money'
import Link from '@/storefront/kit/IntentLink'
import { addToCart, checkDelivery, type DeliveryCheck } from '@/storefront/shop/actions'

import { CashIcon, CheckIcon, TruckIcon, WhatsAppIcon } from '../icons'
import type { PickerAxis } from '../product/ProductEnquiry'
import { buttonClass } from '../ui'
import { announceCartChange } from './CartLink'
import { useChosenOptions } from './ChosenOptions'
import { Price } from './Price'
import { QtyStepper } from './QtyStepper'
import { startNavigation } from '../layout/NavigationLoader'

export type BuyVariant = {
  id: string
  options: Record<string, string>
  priceMinor: number
  mrpMinor: number | null
  sku: string | null
  /** Pieces that can be bought now, or null when not tracked (backorders allowed) */
  available: number | null
  /** A live scheme's price for one piece (docs/11 "Display") */
  offerMinor?: number | null
}

export type BuyOffer = { badge: string | null; until: string | null; priceMinor: number | null }

/** "Ask on WhatsApp": the store's number and the message, which gets the chosen finish added. */
export type BuyWhatsApp = { number: string; intro: string; pageUrl: string }

/**
 * The product page's buying block (docs/screens storefront `st-product`): finish and size with
 * their prices, quantity and stock, the pincode check, Add to cart and Buy now; a quote request
 * and WhatsApp stay below for bulk buyers. Prices come from the server; the cart prices again.
 */
export function BuyBox({
  productId,
  axes,
  variants,
  basePriceMinor,
  baseMrpMinor,
  modelNumber,
  pincodeCheck,
  quoteHref,
  whatsapp,
  offer,
  compact = false,
}: {
  productId: string
  axes: PickerAxis[]
  variants: BuyVariant[]
  basePriceMinor: number | null
  baseMrpMinor: number | null
  modelNumber: string
  pincodeCheck: boolean
  quoteHref: string | null
  whatsapp: BuyWhatsApp | null
  /** The product's live scheme: its badge and real end, and the price without a variant */
  offer?: BuyOffer | null
  /** The cards' quick add: choices, quantity and the two buttons only */
  compact?: boolean
}) {
  const router = useRouter()
  const uid = useId()
  const [chosen, setChosen] = useState<Record<string, string>>(() =>
    // Preselect the first variant in stock so a price shows at once
    variants.length ? { ...(variants.find((v) => v.available !== 0) ?? variants[0])!.options } : {},
  )
  const [qty, setQty] = useState(1)
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const [pincode, setPincode] = useState('')
  const [delivery, setDelivery] = useState<DeliveryCheck | null>(null)
  const [deliveryError, setDeliveryError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  // Which button is waiting, so only that one shows the busy ring
  const [busy, setBusy] = useState<'cart' | 'buy' | 'pincode' | null>(null)

  const variant = useMemo(
    () =>
      variants.length
        ? (variants.find((v) => axes.every((axis) => v.options[axis.code] === chosen[axis.code])) ??
          null)
        : null,
    [variants, axes, chosen],
  )
  const listMinor = variant?.priceMinor ?? basePriceMinor
  const offerMinor = variants.length ? (variant?.offerMinor ?? null) : (offer?.priceMinor ?? null)
  const priceMinor = offerMinor ?? listMinor
  const listMrp = variant ? variant.mrpMinor : baseMrpMinor
  // With an offer the struck price is the real MRP, else the usual price (docs/14)
  const mrpMinor = offerMinor !== null ? (listMrp ?? listMinor) : listMrp
  const needsChoice = variants.length > 0 && !variant
  const available = variant?.available ?? null
  const soldOut = available === 0
  const max = available ?? 99

  // The choice travels with the request: "Finish: Rose gold, Size: 8 inch" (docs/10 kit)
  const optionsText = axes
    .map((axis) => {
      const option = axis.options.find((o) => o.value === chosen[axis.code])
      return option ? `${axis.label}: ${option.label}` : null
    })
    .filter(Boolean)
    .join(', ')
  const whatsappHref = whatsapp
    ? `https://wa.me/${whatsapp.number}?text=${encodeURIComponent(
        `${whatsapp.intro}${optionsText ? `, ${optionsText}` : ''}. ${whatsapp.pageUrl}`,
      )}`
    : null
  const chosenOptions = useChosenOptions()
  const setChosenText = chosenOptions?.setText
  useEffect(() => {
    if (!compact) setChosenText?.(optionsText)
  }, [compact, optionsText, setChosenText])

  const priceFor = (axisCode: string, value: string) => {
    const match = variants.find(
      (v) =>
        v.options[axisCode] === value &&
        axes.every((a) => a.code === axisCode || v.options[a.code] === chosen[a.code]),
    )
    return match ? (match.offerMinor ?? match.priceMinor) : null
  }

  const add = (thenCheckout: boolean) => {
    setBusy(thenCheckout ? 'buy' : 'cart')
    startTransition(async () => {
      setMessage(null)
      const result = await addToCart({ productId, variantId: variant?.id ?? null, qty })
      if (!result.ok) {
        setMessage({ tone: 'error', text: result.message })
        return
      }
      announceCartChange()
      if (thenCheckout) {
        startNavigation()
        router.push('/checkout')
      } else setMessage({ tone: 'ok', text: 'Added to your cart.' })
    })
  }

  const check = () => {
    if (pincode.length !== 6) {
      setDeliveryError('Enter a 6-digit pincode.')
      return
    }
    setBusy('pincode')
    startTransition(async () => {
      setDeliveryError(null)
      const result = await checkDelivery({
        pincode,
        productId,
        variantId: variant?.id ?? null,
        qty,
      })
      if (!result.ok) {
        setDelivery(null)
        setDeliveryError(result.message)
        return
      }
      setDelivery(result.data)
    })
  }

  return (
    <div className="space-y-5">
      {offer?.badge ? (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-white">
            {offer.badge}
          </span>
          {offer.until ? <span className="text-ink-soft">Offer ends {offer.until}</span> : null}
        </p>
      ) : null}
      {priceMinor !== null ? (
        <Price amountMinor={priceMinor} mrpMinor={mrpMinor} showTaxNote size="lg" />
      ) : null}
      {variant?.sku && variant.sku !== modelNumber ? (
        <p className="text-xs text-ink-soft">
          Code <span className="font-semibold text-ink">{variant.sku}</span>
        </p>
      ) : null}

      {axes.map((axis) => (
        <fieldset key={axis.code}>
          <legend className="mb-2 text-sm font-semibold text-ink">
            {axis.label}
            {chosen[axis.code] ? (
              <span className="font-normal text-ink-soft">
                : {axis.options.find((o) => o.value === chosen[axis.code])?.label}
              </span>
            ) : null}
          </legend>
          <div className="flex flex-wrap gap-2">
            {axis.options.map((option) => {
              const selected = chosen[axis.code] === option.value
              const optionPrice = priceFor(axis.code, option.value)
              return (
                <label
                  className={`inline-flex min-h-11 cursor-pointer flex-col items-center justify-center rounded-card border px-3 py-1.5 text-sm transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink ${selected ? 'border-ink ring-1 ring-ink' : 'border-line bg-white hover:border-ink/40'}`}
                  key={option.value}
                >
                  <input
                    checked={selected}
                    className="sr-only"
                    name={`${uid}-opt-${axis.code}`}
                    onChange={() =>
                      setChosen((current) => ({ ...current, [axis.code]: option.value }))
                    }
                    type="radio"
                    value={option.value}
                  />
                  <span className="inline-flex items-center gap-2">
                    {option.swatchHex ? (
                      <span
                        aria-hidden
                        className="size-4 rounded-full border border-black/15"
                        style={{ background: option.swatchHex }}
                      />
                    ) : null}
                    {option.label}
                  </span>
                  {optionPrice !== null && axes.length === 1 ? (
                    <span className="text-xs text-ink-soft">{formatINR(optionPrice)}</span>
                  ) : null}
                </label>
              )
            })}
          </div>
        </fieldset>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold">Quantity</span>
        <QtyStepper disabled={needsChoice || soldOut} max={max} onChange={setQty} value={qty} />
        <span className={`text-sm ${soldOut ? 'font-semibold text-red-700' : 'text-ink-soft'}`}>
          {needsChoice
            ? 'Choose an option'
            : soldOut
              ? 'Out of stock'
              : available !== null && available <= 5
                ? `Only ${available} left`
                : 'In stock'}
        </span>
      </div>

      {pincodeCheck && !compact ? (
        <div className="rounded-card border border-line p-4">
          <p className="mb-2 text-sm font-semibold">Check delivery</p>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              check()
            }}
          >
            <label className="sr-only" htmlFor="pdp-pincode">
              Pincode
            </label>
            <input
              autoComplete="postal-code"
              className="h-11 min-w-0 flex-1 rounded-card border border-line px-3 text-sm"
              id="pdp-pincode"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => {
                // An answer for another pincode would read as this one's
                setPincode(event.target.value.replace(/\D/g, ''))
                setDelivery(null)
                setDeliveryError(null)
              }}
              placeholder="Enter pincode"
              value={pincode}
            />
            <button
              aria-busy={pending && busy === 'pincode'}
              className={buttonClass('outline')}
              disabled={pending || pincode.length === 0}
              type="submit"
            >
              Check
            </button>
          </form>
          {deliveryError ? (
            <p aria-live="polite" className="mt-2 text-sm text-red-700">
              {deliveryError}
            </p>
          ) : null}
          {delivery ? (
            delivery.serviceable ? (
              <ul className="mt-3 space-y-1.5 text-sm" aria-live="polite">
                <li className="flex items-center gap-2">
                  <TruckIcon className="text-ink-soft" height={16} width={16} />
                  {delivery.arrivesBy ? (
                    <span>
                      Delivery by <strong>{delivery.arrivesBy}</strong>
                      {delivery.stateName ? ` to ${delivery.stateName}` : ''}
                    </span>
                  ) : (
                    <span>
                      We deliver here{delivery.stateName ? ` in ${delivery.stateName}` : ''}
                    </span>
                  )}
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon className="text-[#1F7A3E]" height={16} width={16} />
                  {delivery.feeMinor === 0
                    ? 'Free delivery on this order'
                    : `Delivery ${formatINR(delivery.feeMinor)}`}
                </li>
                <li className="flex items-center gap-2">
                  <CashIcon className="text-ink-soft" height={16} width={16} />
                  {delivery.codAvailable
                    ? 'Cash on delivery available'
                    : 'Pay online for this pincode'}
                </li>
              </ul>
            ) : (
              <p className="mt-2 text-sm text-red-700" aria-live="polite">
                Sorry, we don’t deliver to this pincode yet.
              </p>
            )
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <button
          aria-busy={pending && busy === 'cart'}
          className={buttonClass('dark')}
          disabled={pending || needsChoice || soldOut}
          onClick={() => add(false)}
          type="button"
        >
          Add to cart
        </button>
        <button
          aria-busy={pending && busy === 'buy'}
          className={buttonClass('outline')}
          disabled={pending || needsChoice || soldOut}
          onClick={() => add(true)}
          type="button"
        >
          Buy now
        </button>
      </div>
      {message ? (
        <p
          aria-live="polite"
          className={`text-sm ${message.tone === 'ok' ? 'text-[#1F7A3E]' : 'text-red-700'}`}
          role="status"
        >
          {message.text}{' '}
          {message.tone === 'ok' ? (
            <Link className="font-semibold underline" href="/cart">
              View cart
            </Link>
          ) : null}
        </p>
      ) : null}

      {!compact && (quoteHref || whatsappHref) ? (
        <div className="flex flex-wrap gap-3">
          {quoteHref ? (
            <a className={buttonClass('outline', 'flex-1')} href={quoteHref}>
              Request a bulk quote
            </a>
          ) : null}
          {whatsappHref ? (
            <a
              className={buttonClass('whatsapp', 'flex-1')}
              href={whatsappHref}
              rel="noopener noreferrer"
              target="_blank"
            >
              <WhatsAppIcon /> Ask on WhatsApp
            </a>
          ) : null}
        </div>
      ) : null}

      {/* Phone: Add to cart stays in reach while scrolling (docs/screens rule 7) */}
      {compact ? null : (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-white p-2 lg:hidden">
          {priceMinor !== null ? (
            <span className="pl-2 text-base font-bold">{formatINR(priceMinor)}</span>
          ) : null}
          <button
            aria-busy={pending && busy === 'cart'}
            className={buttonClass('dark', 'flex-1')}
            disabled={pending || needsChoice || soldOut}
            onClick={() => add(false)}
            type="button"
          >
            Add to cart
          </button>
        </div>
      )}
    </div>
  )
}
