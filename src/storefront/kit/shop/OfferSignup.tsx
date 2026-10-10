'use client'

import { useId, useState, useTransition } from 'react'

import { signUpForOffers } from '@/storefront/shop/offerActions'

import { buttonClass } from '../ui'

/**
 * "Hear about the next offer first" (docs/screens Offers page rule 5): consent per channel,
 * unticked; order updates are separate. `footer` is the compact version on the dark footer.
 */
export function OfferSignup({
  storeName,
  whatsapp,
  heading = 'Hear about the next offer first',
  text,
  variant = 'card',
}: {
  storeName: string
  whatsapp: boolean
  /** The Offers sign-up block's own words */
  heading?: string | null
  text?: string | null
  variant?: 'card' | 'footer'
}) {
  const id = useId()
  const [contact, setContact] = useState('')
  const [email, setEmail] = useState(false)
  const [onWhatsApp, setOnWhatsApp] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()
  const footer = variant === 'footer'
  return (
    <section
      className={footer ? 'mt-5' : 'rounded-card border border-line bg-white p-5'}
      id={footer ? undefined : 'offer-signup'}
    >
      <h2
        className={
          footer
            ? 'font-heading text-sm font-semibold tracking-wider text-white uppercase'
            : 'font-heading text-lg font-bold'
        }
      >
        {heading || 'Hear about the next offer first'}
      </h2>
      {text ? (
        <p className={`mt-1 text-sm ${footer ? 'text-white/70' : 'text-ink-soft'}`}>{text}</p>
      ) : null}
      <form
        className="mt-3 space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          start(async () => {
            const result = await signUpForOffers({ contact, email, whatsapp: onWhatsApp })
            setMessage(
              result.ok
                ? { ok: true, text: result.data.message }
                : { ok: false, text: result.message },
            )
            if (result.ok) setContact('')
          })
        }}
      >
        <div className="flex gap-2">
          <label className="sr-only" htmlFor={`${id}-contact`}>
            Email or WhatsApp number
          </label>
          <input
            className={`h-11 min-w-0 flex-1 rounded-card border px-3 ${footer ? 'border-white/20 bg-white/10 text-white placeholder:text-white/50' : 'border-line'}`}
            id={`${id}-contact`}
            onChange={(event) => setContact(event.target.value)}
            placeholder={whatsapp ? 'Email or WhatsApp number' : 'Email'}
            value={contact}
          />
          <button
            className={buttonClass(footer ? 'primary' : 'dark')}
            disabled={pending}
            type="submit"
          >
            {footer ? 'Get offers' : 'Sign up'}
          </button>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              checked={email}
              className="size-4"
              onChange={(event) => setEmail(event.target.checked)}
              type="checkbox"
            />
            {footer ? 'By email' : 'Send me offers by email'}
          </label>
          {whatsapp ? (
            <label className="flex items-center gap-2">
              <input
                checked={onWhatsApp}
                className="size-4"
                onChange={(event) => setOnWhatsApp(event.target.checked)}
                type="checkbox"
              />
              {footer ? 'On WhatsApp' : 'Send me offers on WhatsApp'}
            </label>
          ) : null}
        </div>
        <p className={`text-xs ${footer ? 'text-white/60' : 'text-ink-soft'}`}>
          {footer
            ? 'Offers only. Unsubscribe in one tap.'
            : `From ${storeName} only. At most 2 a week. Unsubscribe in one tap from any message.`}
        </p>
        {message ? (
          <p
            aria-live="polite"
            className={`text-sm ${message.ok ? (footer ? 'text-emerald-300' : 'text-emerald-800') : footer ? 'text-red-300' : 'text-red-700'}`}
          >
            {message.text}
          </p>
        ) : null}
      </form>
    </section>
  )
}
