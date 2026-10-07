'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import type { PublicCoupon } from '@/lib/data/offers'
import { formatINR } from '@/lib/money'
import { applyCoupon, removeCoupon } from '@/storefront/shop/actions'

import { buttonClass } from '../ui'

/**
 * The cart's coupon box (docs/screens storefront Cart rule 4): one code per order, checked by
 * the server, which says why a code can't be used. Public codes are listed with Apply.
 */
export function CouponBox({
  applied,
  problem,
  note,
  coupons,
  subtotalMinor,
}: {
  applied: string | null
  problem: string | null
  note: string | null
  coupons: PublicCoupon[]
  subtotalMinor: number
}) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const apply = (value: string) =>
    start(async () => {
      setMessage(null)
      const result = await applyCoupon(value)
      if (!result.ok) {
        setMessage(result.message)
        return
      }
      setCode('')
      router.refresh()
    })
  const remove = () =>
    start(async () => {
      setMessage(null)
      await removeCoupon()
      router.refresh()
    })

  return (
    <section aria-label="Coupon" className="space-y-3 border-b border-line py-4">
      {applied ? (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-card border border-dashed border-[#1F7A3E] px-2 py-0.5 font-mono font-semibold text-[#1F7A3E]">
            {applied}
          </span>
          <span className="flex-1 text-ink-soft">applied</span>
          <button className="underline" disabled={pending} onClick={remove} type="button">
            Remove
          </button>
        </p>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            apply(code)
          }}
        >
          <label className="sr-only" htmlFor="coupon-code">
            Coupon code
          </label>
          <input
            autoCapitalize="characters"
            className="h-11 min-w-0 flex-1 rounded-card border border-line px-3 font-mono uppercase"
            id="coupon-code"
            maxLength={40}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Coupon code"
            value={code}
          />
          <button
            className={buttonClass('outline')}
            disabled={pending || !code.trim()}
            type="submit"
          >
            Apply
          </button>
        </form>
      )}
      {message || problem ? (
        <p aria-live="polite" className="text-sm text-red-700">
          {message ?? problem}
        </p>
      ) : null}
      {note ? <p className="text-sm text-ink-soft">{note}</p> : null}
      {!applied && coupons.length ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">
            Coupons for this cart
          </p>
          {coupons.map((coupon) => {
            const short = coupon.minOrderMinor ? coupon.minOrderMinor - subtotalMinor : 0
            return (
              <div
                className={`flex items-center gap-3 rounded-card border border-dashed border-line p-2.5 text-sm ${short > 0 ? 'opacity-70' : ''}`}
                key={coupon.code}
              >
                <span className="flex-1">
                  <b className="font-mono">{coupon.code}</b> {coupon.gives}
                  {coupon.minOrderMinor
                    ? ` on orders above ${formatINR(coupon.minOrderMinor)}`
                    : ''}
                  {coupon.onlineOnly ? ' when you pay online' : ''}
                  {short > 0 ? (
                    <span className="block text-xs text-ink-soft">
                      Add {formatINR(short)} more to use it
                    </span>
                  ) : coupon.onlineOnly ? (
                    <span className="block text-xs text-ink-soft">
                      Choose Pay online at checkout
                    </span>
                  ) : null}
                </span>
                {short <= 0 ? (
                  <button
                    className={buttonClass('outline', 'min-h-9 px-3')}
                    disabled={pending}
                    onClick={() => apply(coupon.code)}
                    type="button"
                  >
                    Apply
                  </button>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
