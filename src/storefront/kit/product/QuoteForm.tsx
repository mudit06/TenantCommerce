'use client'

import { useActionState } from 'react'

import { sendEnquiry, type EnquiryState } from '../../actions'
import { CheckIcon } from '../icons'
import { buttonClass } from '../ui'

const field =
  'mt-1 block h-11 w-full rounded-card border border-line bg-white px-3 text-sm text-ink outline-none focus:border-ink/50 focus:ring-2 focus:ring-brand/40'
const label = 'block text-sm font-medium text-ink'

function Error({ state, name }: { state: EnquiryState; name: string }) {
  const message = state.status === 'error' ? state.fields?.[name] : undefined
  return message ? (
    <p className="mt-1 text-xs text-red-700" id={`${name}-error`}>
      {message}
    </p>
  ) : null
}

/** Quote request or contact form; lands in the store's Enquiries inbox (docs/screens Enquiries). */
export function QuoteForm({
  type = 'general',
  productTitle,
  modelNumber,
  options,
  page,
  storeName,
  showQty = false,
  submitLabel = 'Send',
}: {
  type?: string
  productTitle?: string
  modelNumber?: string
  options?: string
  page?: string
  storeName: string
  showQty?: boolean
  submitLabel?: string
}) {
  const [state, action, pending] = useActionState(sendEnquiry, { status: 'idle' } as EnquiryState)
  if (state.status === 'sent') {
    return (
      <div
        className="rounded-card border border-green-700/30 bg-green-50 p-5 text-sm text-green-900"
        role="status"
      >
        <p className="flex items-center gap-2 font-semibold">
          <CheckIcon /> Thank you, your request has been sent.
        </p>
        <p className="mt-1">
          {state.reference ? `Your reference is ${state.reference}. ` : ''}
          The {storeName} team will contact you soon.
        </p>
      </div>
    )
  }
  const invalid = (name: string) =>
    state.status === 'error' && state.fields?.[name]
      ? { 'aria-invalid': true, 'aria-describedby': `${name}-error` }
      : {}
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      <input name="type" type="hidden" value={type} />
      {productTitle ? <input name="productTitle" type="hidden" value={productTitle} /> : null}
      {modelNumber ? <input name="modelNumber" type="hidden" value={modelNumber} /> : null}
      {options ? <input name="options" type="hidden" value={options} /> : null}
      {page ? <input name="page" type="hidden" value={page} /> : null}
      <div aria-hidden className="absolute -left-[9999px]">
        <label>
          Leave empty <input autoComplete="off" name="website" tabIndex={-1} />
        </label>
      </div>
      <div className="sm:col-span-2">
        <label className={label} htmlFor="q-name">
          Name *
        </label>
        <input
          autoComplete="name"
          className={field}
          id="q-name"
          name="name"
          required
          {...invalid('name')}
        />
        <Error name="name" state={state} />
      </div>
      <div>
        <label className={label} htmlFor="q-phone">
          Mobile number
        </label>
        <input
          autoComplete="tel"
          className={field}
          id="q-phone"
          inputMode="tel"
          name="phone"
          {...invalid('phone')}
        />
        <Error name="phone" state={state} />
      </div>
      <div>
        <label className={label} htmlFor="q-email">
          Email
        </label>
        <input
          autoComplete="email"
          className={field}
          id="q-email"
          name="email"
          type="email"
          {...invalid('email')}
        />
        <Error name="email" state={state} />
      </div>
      <div>
        <label className={label} htmlFor="q-city">
          City
        </label>
        <input autoComplete="address-level2" className={field} id="q-city" name="city" />
      </div>
      {showQty ? (
        <div>
          <label className={label} htmlFor="q-qty">
            Quantity
          </label>
          <input
            className={field}
            id="q-qty"
            inputMode="numeric"
            min={1}
            name="qty"
            type="number"
            {...invalid('qty')}
          />
          <Error name="qty" state={state} />
        </div>
      ) : (
        <div>
          <label className={label} htmlFor="q-company">
            Company (optional)
          </label>
          <input autoComplete="organization" className={field} id="q-company" name="company" />
        </div>
      )}
      <div className="sm:col-span-2">
        <label className={label} htmlFor="q-message">
          Message
        </label>
        <textarea
          className={`${field} h-28 py-2`}
          id="q-message"
          name="message"
          placeholder={productTitle ? 'Sizes, finishes, delivery city…' : 'How can we help?'}
        />
      </div>
      <div className="sm:col-span-2">
        <label className="flex items-start gap-3 text-sm text-ink-soft">
          <input
            className="mt-0.5 size-5 accent-[var(--brand)]"
            name="consent"
            type="checkbox"
            {...invalid('consent')}
          />
          <span>{storeName} may contact me by phone, WhatsApp or email about this request.</span>
        </label>
        <Error name="consent" state={state} />
      </div>
      {state.status === 'error' ? (
        <p className="text-sm text-red-700 sm:col-span-2" role="alert">
          {state.message}
        </p>
      ) : null}
      <div className="sm:col-span-2">
        <button
          className={buttonClass('primary', 'w-full sm:w-auto')}
          disabled={pending}
          type="submit"
        >
          {pending ? 'Sending…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
