'use client'

import { useState } from 'react'

import { WhatsAppIcon } from '../icons'
import { buttonClass } from '../ui'
import { QuoteForm } from './QuoteForm'

export type PickerAxis = {
  code: string
  label: string
  options: { value: string; label: string; swatchHex?: string | null }[]
}

/**
 * Finish and size pickers with "Request a quote" and "Ask on WhatsApp" (docs/10 kit:
 * VariantPicker, RequestQuote, WhatsAppButton). The choice travels with the request.
 */
export function ProductEnquiry({
  axes,
  title,
  modelNumber,
  whatsappNumber,
  storeName,
  pageUrl,
  enquiriesOn,
}: {
  axes: PickerAxis[]
  title: string
  modelNumber: string
  whatsappNumber: string | null
  storeName: string
  pageUrl: string
  enquiriesOn: boolean
}) {
  const [chosen, setChosen] = useState<Record<string, string>>({})
  const optionsText = axes
    .map((axis) => {
      const option = axis.options.find((o) => o.value === chosen[axis.code])
      return option ? `${axis.label}: ${option.label}` : null
    })
    .filter(Boolean)
    .join(', ')
  const whatsappText = `Hello ${storeName}, I'd like a quote for ${title} (${modelNumber})${optionsText ? `, ${optionsText}` : ''}. ${pageUrl}`
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappText)}`
    : null

  return (
    <div className="space-y-6">
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
              return (
                <label
                  className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-card border px-3 text-sm transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink ${selected ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink hover:border-ink/40'}`}
                  key={option.value}
                >
                  <input
                    checked={selected}
                    className="sr-only"
                    name={`opt-${axis.code}`}
                    onChange={() =>
                      setChosen((current) => ({ ...current, [axis.code]: option.value }))
                    }
                    type="radio"
                    value={option.value}
                  />
                  {option.swatchHex ? (
                    <span
                      aria-hidden
                      className="size-4 rounded-full border border-black/15"
                      style={{ background: option.swatchHex }}
                    />
                  ) : null}
                  {option.label}
                </label>
              )
            })}
          </div>
        </fieldset>
      ))}

      <div className="flex flex-col gap-3 sm:flex-row">
        {enquiriesOn ? (
          <a className={buttonClass('primary', 'flex-1')} href="#quote">
            Request a quote
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

      {enquiriesOn ? (
        <section
          aria-labelledby="quote-heading"
          className="scroll-mt-28 rounded-card border border-line bg-surface-alt p-4 sm:p-6"
          id="quote"
        >
          <h2
            className="mb-1 font-heading text-lg font-semibold [text-transform:var(--heading-transform)]"
            id="quote-heading"
          >
            Request a quote
          </h2>
          <p className="mb-4 text-sm text-ink-soft">
            {title} · {modelNumber}
            {optionsText ? ` · ${optionsText}` : ''}
          </p>
          <QuoteForm
            modelNumber={modelNumber}
            options={optionsText ? `Options: ${optionsText}` : undefined}
            page={pageUrl}
            productTitle={title}
            showQty
            storeName={storeName}
            submitLabel="Send quote request"
            type="product"
          />
        </section>
      ) : null}

      {/* Phone: the two actions stay in reach while scrolling (docs/10 UX rules) */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-line bg-white p-2 lg:hidden">
        {enquiriesOn ? (
          <a className={buttonClass('primary', 'flex-1')} href="#quote">
            Request a quote
          </a>
        ) : null}
        {whatsappHref ? (
          <a
            className={buttonClass('whatsapp', 'flex-1')}
            href={whatsappHref}
            rel="noopener noreferrer"
            target="_blank"
          >
            <WhatsAppIcon /> WhatsApp
          </a>
        ) : null}
      </div>
    </div>
  )
}
