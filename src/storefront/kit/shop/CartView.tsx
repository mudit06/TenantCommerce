'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import type { PublicCoupon } from '@/lib/data/offers'
import type { SellingInfo } from '@/lib/data/store'
import { formatINR } from '@/lib/money'
import { checkDelivery, updateCartLine } from '@/storefront/shop/actions'
import { syncWishlist } from '@/storefront/shop/wishlistActions'
import type { CheckoutSummary } from '@/storefront/shop/summary'

import { TruckIcon } from '../icons'
import { buttonClass } from '../ui'
import { announceCartChange } from './CartLink'
import { CouponBox } from './CouponBox'
import { readWishlist, writeWishlist } from './HeartButton'
import { Price } from './Price'
import { QtyStepper } from './QtyStepper'

const money = (minor: number) => formatINR(minor, { decimals: 'always' })

export function PriceDetails({
  summary,
  children,
  heading = 'Price details',
}: {
  summary: CheckoutSummary
  children?: React.ReactNode
  heading?: string
}) {
  const t = summary.totals
  return (
    <section aria-labelledby="price-details" className="rounded-card border border-line bg-white">
      <h2 className="border-b border-line px-4 py-3 text-base font-semibold" id="price-details">
        {heading}
      </h2>
      <dl className="divide-y divide-line px-4 text-sm">
        <div className="flex justify-between py-2.5">
          <dt>Items ({summary.count})</dt>
          <dd>{money(t.itemsMinor)}</dd>
        </div>
        <div className="flex justify-between py-2.5">
          <dt>Discounts</dt>
          <dd className={t.discountMinor ? 'text-[#1F7A3E]' : 'text-ink-soft'}>
            {t.discountMinor ? `− ${money(t.discountMinor)}` : 'none applied'}
          </dd>
        </div>
        {summary.offers.map((offer) => (
          <div className="flex justify-between py-2 pl-3 text-xs text-ink-soft" key={offer.name}>
            <dt>{offer.name}</dt>
            <dd>− {money(offer.discountMinor)}</dd>
          </div>
        ))}
        <div className="flex justify-between py-2.5">
          <dt>Delivery</dt>
          <dd>
            {!summary.delivery.known
              ? 'At checkout'
              : t.shippingMinor === 0
                ? 'Free'
                : money(t.shippingMinor)}
          </dd>
        </div>
        {t.codFeeMinor ? (
          <div className="flex justify-between py-2.5">
            <dt>Cash on delivery fee</dt>
            <dd>{money(t.codFeeMinor)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between py-3 text-base font-bold">
          <dt>Total</dt>
          <dd>{money(t.grandTotalMinor)}</dd>
        </div>
      </dl>
      <p className="px-4 pb-3 text-xs text-ink-soft">
        Includes GST of {money(t.taxMinor)}.
        {t.savingsMinor ? ` You save ${formatINR(t.savingsMinor)} on MRP.` : ''}
      </p>
      {children ? <div className="space-y-3 px-4 pb-4">{children}</div> : null}
    </section>
  )
}

/** Cart (docs/screens storefront `st-cart`). Every change asks the server for new totals. */
export function CartView({
  summary,
  selling,
  initialPincode,
  coupons,
  wishlistOn = false,
  children,
}: {
  summary: CheckoutSummary
  selling: SellingInfo
  initialPincode: string
  /** "Move to wishlist" on each line (wishlist feature) */
  wishlistOn?: boolean
  /** Shown under the lines: "Complete the look" */
  children?: React.ReactNode
  /** Public codes when the store's coupons are on; null when it has none */
  coupons: PublicCoupon[] | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [pincode, setPincode] = useState(initialPincode)
  const [editingPincode, setEditingPincode] = useState(!initialPincode)

  const change = (line: { productId: string; variantId: string | null }, qty: number) =>
    startTransition(async () => {
      setError(null)
      const result = await updateCartLine({ ...line, qty })
      if (!result.ok) setError(result.message)
      announceCartChange()
      router.refresh()
    })

  // Saves the item on the device (and the account when signed in), then takes it out of the cart
  const moveToWishlist = (line: { productId: string; variantId: string | null }) =>
    startTransition(async () => {
      setError(null)
      const items = readWishlist()
      const next = items.some((i) => i.productId === line.productId)
        ? items
        : [...items, { productId: line.productId, variantId: line.variantId }]
      writeWishlist(next)
      await syncWishlist(next, 'replace')
      const result = await updateCartLine({ ...line, qty: 0 })
      if (!result.ok) setError(result.message)
      announceCartChange()
      router.refresh()
    })

  const savePincode = () =>
    startTransition(async () => {
      setError(null)
      const result = await checkDelivery({ pincode })
      if (!result.ok) {
        setError(result.message)
        return
      }
      setEditingPincode(false)
      router.refresh()
    })

  if (summary.lines.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="font-heading text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-ink-soft">Browse the store and add what you need.</p>
        <Link className={buttonClass('dark', 'mt-6')} href="/">
          Continue shopping
        </Link>
      </div>
    )
  }

  const blocked = summary.lines.some((line) => line.problem) || !summary.delivery.serviceable
  return (
    <div>
      <h1 className="font-heading text-2xl font-bold">Your cart</h1>
      <p className="text-sm text-ink-soft">
        {summary.count} item{summary.count === 1 ? '' : 's'}
      </p>
      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div aria-busy={pending}>
          <ul className="divide-y divide-line border-y border-line">
            {summary.lines.map((line) => (
              <li className="flex gap-4 py-4" key={line.key}>
                <Link
                  className="size-24 shrink-0 overflow-hidden rounded-card border border-line bg-surface-alt"
                  href={line.href}
                >
                  {line.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt={line.image.alt}
                      className="size-full object-contain"
                      src={line.image.url}
                    />
                  ) : null}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link className="font-semibold hover:underline" href={line.href}>
                    {line.title}
                  </Link>
                  <p className="text-xs text-ink-soft">
                    {[line.options, line.sku].filter(Boolean).join(' · ')}
                  </p>
                  <div className="mt-1">
                    <Price amountMinor={line.unitMinor} mrpMinor={line.mrpMinor} size="sm" />
                  </div>
                  {line.problem ? (
                    <p className="mt-1 text-sm font-semibold text-red-700">{line.problem}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <QtyStepper
                      disabled={pending}
                      label={`Quantity of ${line.title}`}
                      max={line.available ?? 99}
                      onChange={(qty) => change(line, qty)}
                      value={line.qty}
                    />
                    <button
                      className="text-sm text-ink-soft underline hover:text-ink"
                      disabled={pending}
                      onClick={() => change(line, 0)}
                      type="button"
                    >
                      Remove
                    </button>
                    {wishlistOn ? (
                      <button
                        className="text-sm text-ink-soft underline hover:text-ink"
                        disabled={pending}
                        onClick={() => moveToWishlist(line)}
                        type="button"
                      >
                        Move to wishlist
                      </button>
                    ) : null}
                  </div>
                </div>
                <p className="hidden text-right font-semibold sm:block">{money(line.lineMinor)}</p>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <TruckIcon className="text-ink-soft" />
            {editingPincode ? (
              <form
                className="flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault()
                  savePincode()
                }}
              >
                <label className="sr-only" htmlFor="cart-pincode">
                  Delivery pincode
                </label>
                <input
                  autoComplete="postal-code"
                  className="h-10 w-36 rounded-card border border-line px-3"
                  id="cart-pincode"
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) => setPincode(event.target.value.replace(/\D/g, ''))}
                  placeholder="Delivery pincode"
                  value={pincode}
                />
                <button
                  className={buttonClass('outline', 'min-h-10')}
                  disabled={pending || pincode.length !== 6}
                  type="submit"
                >
                  Check
                </button>
              </form>
            ) : (
              <>
                <span>
                  {summary.delivery.serviceable ? 'Delivering to' : 'We don’t deliver to'}{' '}
                  <strong>{pincode}</strong>
                  {summary.placeOfSupply ? `, ${summary.placeOfSupply.stateName}` : ''}
                  {summary.delivery.arrivesBy ? ` · by ${summary.delivery.arrivesBy}` : ''}
                </span>
                <button
                  className="ml-auto underline"
                  onClick={() => setEditingPincode(true)}
                  type="button"
                >
                  Change
                </button>
              </>
            )}
          </div>
          {error ? (
            <p className="mt-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          {coupons ? (
            <div className="mt-4 border-t border-line">
              <CouponBox
                applied={summary.coupon}
                coupons={coupons}
                note={summary.offerNote}
                problem={summary.couponProblem}
                subtotalMinor={summary.totals.itemsMinor - summary.totals.discountMinor}
              />
            </div>
          ) : null}
          {children}
        </div>

        <div className="lg:sticky lg:top-28 lg:self-start">
          <PriceDetails summary={summary}>
            <Link
              aria-disabled={blocked}
              className={buttonClass(
                'dark',
                `w-full ${blocked ? 'pointer-events-none opacity-50' : ''}`,
              )}
              href="/checkout"
            >
              Checkout
            </Link>
            <p className="flex flex-wrap gap-1.5 text-xs">
              {selling.online
                ? ['UPI', 'Cards', 'Netbanking'].map((method) => (
                    <span className="rounded-full border border-line px-2 py-0.5" key={method}>
                      {method}
                    </span>
                  ))
                : null}
              {selling.cod ? (
                <span className="rounded-full border border-line px-2 py-0.5">COD</span>
              ) : null}
            </p>
            <p className="text-xs text-ink-soft">
              Cart saved on this device · stock is held at checkout
            </p>
          </PriceDetails>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-white p-2 lg:hidden">
        <div className="pl-2">
          <p className="text-base font-bold">{money(summary.totals.grandTotalMinor)}</p>
          <p className="text-[11px] text-ink-soft">incl. GST</p>
        </div>
        <Link
          aria-disabled={blocked}
          className={buttonClass(
            'dark',
            `flex-1 ${blocked ? 'pointer-events-none opacity-50' : ''}`,
          )}
          href="/checkout"
        >
          Checkout
        </Link>
      </div>
    </div>
  )
}
