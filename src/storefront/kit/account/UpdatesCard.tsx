'use client'

import { useState, useTransition } from 'react'

import { setMyOffers, setMyWhatsAppUpdates } from '../../shop/accountActions'
import { MailIcon, WhatsAppIcon } from '../icons'
import { Switch } from './Switch'

/**
 * Order updates and offers on My account (docs/screens My account rules 5 and 6): WhatsApp
 * updates by phone; offers by email and WhatsApp are separate and never stop order updates.
 */
export function UpdatesCard({
  maskedPhone,
  whatsappOn,
  email,
  offers,
}: {
  maskedPhone: string | null
  whatsappOn: boolean
  email: string
  /** Shown when the store sends offers; whatsapp when it sends them on WhatsApp too */
  offers: { email: boolean; whatsapp: boolean | null; perWeek: number } | null
}) {
  const [state, setState] = useState({
    whatsapp: whatsappOn,
    offersEmail: offers?.email ?? false,
    offersWhatsApp: offers?.whatsapp ?? false,
  })
  const [message, setMessage] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const change = (key: keyof typeof state, next: boolean) =>
    start(async () => {
      setMessage(null)
      const result =
        key === 'whatsapp'
          ? await setMyWhatsAppUpdates(next)
          : await setMyOffers(key === 'offersEmail' ? 'email' : 'whatsapp', next)
      if (!result.ok) {
        setMessage(result.message)
        return
      }
      setState((current) => ({ ...current, [key]: next }))
    })

  return (
    <>
      <section className="rounded-card border border-line bg-white">
        <h2 className="border-b border-line px-4 py-3 font-semibold">Order updates</h2>
        <div className="space-y-3 p-4 text-sm">
          {maskedPhone ? (
            <div className="flex items-center gap-3">
              <WhatsAppIcon aria-hidden height={18} width={18} />
              <span className="flex-1">WhatsApp updates to {maskedPhone}</span>
              <Switch
                checked={state.whatsapp}
                disabled={pending}
                label="WhatsApp order updates"
                onChange={(next) => change('whatsapp', next)}
              />
            </div>
          ) : (
            <p className="text-ink-soft">
              Add your mobile number in Profile to get WhatsApp updates.
            </p>
          )}
          <div className="flex items-center gap-3 text-ink-soft">
            <MailIcon aria-hidden height={18} width={18} />
            <span className="flex-1">Order emails to {email} always arrive</span>
          </div>
        </div>
      </section>
      {offers ? (
        <section className="rounded-card border border-line bg-white">
          <h2 className="border-b border-line px-4 py-3 font-semibold">Offers and new launches</h2>
          <div className="space-y-3 p-4 text-sm">
            <div className="flex items-center gap-3">
              <MailIcon aria-hidden height={18} width={18} />
              <span className="flex-1">Offers by email to {email}</span>
              <Switch
                checked={state.offersEmail}
                disabled={pending}
                label="Offers by email"
                onChange={(next) => change('offersEmail', next)}
              />
            </div>
            {offers.whatsapp !== null && maskedPhone ? (
              <div className="flex items-center gap-3">
                <WhatsAppIcon aria-hidden height={18} width={18} />
                <span className="flex-1">Offers on WhatsApp</span>
                <Switch
                  checked={state.offersWhatsApp}
                  disabled={pending}
                  label="Offers on WhatsApp"
                  onChange={(next) => change('offersWhatsApp', next)}
                />
              </div>
            ) : null}
            <p className="text-xs text-ink-soft">
              At most {offers.perWeek} offer message{offers.perWeek === 1 ? '' : 's'} a week. Order
              updates are not affected.
            </p>
          </div>
        </section>
      ) : null}
      {message ? (
        <p aria-live="polite" className="text-sm font-semibold text-red-700">
          {message}
        </p>
      ) : null}
    </>
  )
}
