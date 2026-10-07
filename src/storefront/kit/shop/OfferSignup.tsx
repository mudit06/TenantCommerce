'use client'

import { useState, useTransition } from 'react'

import { signUpForOffers } from '@/storefront/shop/offerActions'

import { buttonClass } from '../ui'

/**
 * "Hear about the next offer first" (docs/screens Offers page rule 5): consent per channel,
 * unticked; order updates are separate.
 */
export function OfferSignup({ storeName, whatsapp }: { storeName: string; whatsapp: boolean }) {
  const [contact, setContact] = useState('')
  const [email, setEmail] = useState(false)
  const [onWhatsApp, setOnWhatsApp] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()
  return (
    <section className="rounded-card border border-line bg-white p-5" id="offer-signup">
      <h2 className="font-heading text-lg font-bold">Hear about the next offer first</h2>
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
          <label className="sr-only" htmlFor="offer-contact">
            Email or WhatsApp number
          </label>
          <input
            className="h-11 min-w-0 flex-1 rounded-card border border-line px-3"
            id="offer-contact"
            onChange={(event) => setContact(event.target.value)}
            placeholder={whatsapp ? 'Email or WhatsApp number' : 'Email'}
            value={contact}
          />
          <button className={buttonClass('dark')} disabled={pending} type="submit">
            Sign up
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
            Send me offers by email
          </label>
          {whatsapp ? (
            <label className="flex items-center gap-2">
              <input
                checked={onWhatsApp}
                className="size-4"
                onChange={(event) => setOnWhatsApp(event.target.checked)}
                type="checkbox"
              />
              Send me offers on WhatsApp
            </label>
          ) : null}
        </div>
        <p className="text-xs text-ink-soft">
          From {storeName} only. At most 2 a week. Unsubscribe in one tap from any message.
        </p>
        {message ? (
          <p
            aria-live="polite"
            className={`text-sm ${message.ok ? 'text-emerald-800' : 'text-red-700'}`}
          >
            {message.text}
          </p>
        ) : null}
      </form>
    </section>
  )
}
