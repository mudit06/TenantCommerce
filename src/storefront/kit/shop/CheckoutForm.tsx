'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'

import { GST_STATE_OPTIONS } from '@/lib/gst/gstin'
import { formatINR } from '@/lib/money'
import {
  confirmPayment,
  previewCheckout,
  saveCheckoutContact,
  submitCheckout,
  type PlacedOrder,
} from '@/storefront/shop/actions'
import type { CheckoutSummary } from '@/storefront/shop/summary'

import { CardIcon, CashIcon, LockIcon } from '../icons'
import { buttonClass } from '../ui'
import { announceCartChange } from './CartLink'
import { PriceDetails } from './CartView'

type RazorpayResponse = {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

type RazorpayInstance = { open: () => void; on: (event: string, fn: () => void) => void }

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance
  }
}

const money = (minor: number) => formatINR(minor, { decimals: 'always' })

function loadRazorpay(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true)
  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

const inputClass =
  'h-11 w-full rounded-card border border-line bg-white px-3 text-sm aria-[invalid=true]:border-red-600'

function Field({
  id,
  label,
  required,
  error,
  children,
  className = '',
}: {
  id: string
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-sm text-ink-soft" htmlFor={id}>
        {label}
        {required ? <span aria-hidden> *</span> : null}
      </label>
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-700" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`step-${n}`} className="rounded-card border border-line bg-white">
      <h2 className="border-b border-line px-4 py-3 text-base font-semibold" id={`step-${n}`}>
        {n}. {title}
      </h2>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  )
}

/**
 * Checkout (docs/screens storefront `st-checkout`): one page from contact to payment, no account
 * needed. The pincode sets the state (place of supply), the delivery fee and whether COD is
 * offered; the server prices everything again when the order is placed.
 */
export type CheckoutAccount = {
  email: string
  phone: string
  name: string
  /** The saved address checkout fills in (the default one) */
  address: {
    pincode: string
    city: string
    stateCode: string
    name: string
    line1: string
    line2: string
    landmark: string
    gstin: string
    legalName: string
  } | null
  savedAddresses: number
}

export function CheckoutForm({
  initial,
  initialPincode,
  storeName,
  themeColor,
  whatsappDefault,
  account,
  offerChoices,
}: {
  initial: CheckoutSummary
  initialPincode: string
  storeName: string
  themeColor: string
  whatsappDefault: boolean
  /** The signed-in shopper: their details fill the form (docs/screens Checkout) */
  account: CheckoutAccount | null
  /** Offer consent boxes, unticked, when the store sends offers (docs/18 "Consent") */
  offerChoices: { email: boolean; whatsapp: boolean }
}) {
  const router = useRouter()
  const [summary, setSummary] = useState(initial)
  const [pending, startTransition] = useTransition()
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  // One key per checkout page: a double press or a retried request places one order (docs/11)
  const idempotencyKey = useRef<string | null>(null)

  const saved = account?.address ?? null
  const [contact, setContact] = useState({
    phone: account?.phone.replace(/^\+91/, '') ?? '',
    email: account?.email ?? '',
  })
  const [saveAddress, setSaveAddress] = useState(Boolean(account) && !saved)
  const [offers, setOffers] = useState({ email: false, whatsapp: false })
  // The contact and offer choices are kept on the cart as they are typed, so a cart left here
  // can be reminded (abandoned carts, only with offer consent)
  const keepContact = (next = offers, touched = false) => {
    if (!contact.email.includes('@') && contact.phone.replace(/\D/g, '').length < 10) return
    void saveCheckoutContact({
      name: address.name,
      email: contact.email,
      phone: contact.phone,
      ...(touched ? { offers: next } : {}),
    })
  }
  const [whatsappOptIn, setWhatsappOptIn] = useState(whatsappDefault)
  const [address, setAddress] = useState({
    pincode: saved?.pincode ?? initialPincode,
    city: saved?.city ?? '',
    stateCode: saved?.stateCode ?? initial.placeOfSupply?.stateCode ?? '',
    name: saved?.name ?? account?.name ?? '',
    line1: saved?.line1 ?? '',
    line2: saved?.line2 ?? '',
    landmark: saved?.landmark ?? '',
  })
  const [business, setBusiness] = useState(Boolean(saved?.gstin))
  const [gstin, setGstin] = useState({
    buyerGstin: saved?.gstin ?? '',
    buyerLegalName: saved?.legalName ?? '',
  })
  const [method, setMethod] = useState<'razorpay' | 'cod' | null>(
    initial.payment.online.available ? 'razorpay' : initial.payment.cod.available ? 'cod' : null,
  )

  // Re-price when the pincode or the payment method changes (state, delivery, COD fee)
  const pincodeReady = /^[1-9][0-9]{5}$/.test(address.pincode)
  useEffect(() => {
    if (!pincodeReady && address.pincode.length > 0) return
    startTransition(async () => {
      const result = await previewCheckout({
        pincode: pincodeReady ? address.pincode : undefined,
        stateCode: address.stateCode || undefined,
        paymentMethod: method ?? undefined,
      })
      if (!result.ok) return
      setSummary(result.data)
      if (result.data.placeOfSupply) {
        setAddress((current) => ({ ...current, stateCode: result.data.placeOfSupply!.stateCode }))
      }
      if (
        method === 'cod' &&
        !result.data.payment.cod.available &&
        result.data.payment.online.available
      ) {
        setMethod('razorpay')
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address.pincode, method])

  const set = <K extends keyof typeof address>(key: K, value: string) =>
    setAddress((current) => ({ ...current, [key]: value }))

  const total = summary.totals.grandTotalMinor
  const blocked =
    summary.problems.length > 0 || summary.lines.some((line) => line.problem) || !method
  const err = (path: string) => fields[path]

  const openRazorpay = async (placed: PlacedOrder) => {
    const payment = placed.payment!
    if (!(await loadRazorpay()) || !window.Razorpay) {
      router.push(`/checkout/success?order=${encodeURIComponent(placed.orderNumber)}`)
      return
    }
    const checkout = new window.Razorpay({
      key: payment.keyId,
      amount: payment.amountMinor,
      currency: payment.currency,
      name: payment.storeName,
      description: `Order ${placed.orderNumber}`,
      order_id: payment.razorpayOrderId,
      prefill: payment.prefill,
      theme: { color: themeColor },
      handler: async (response: RazorpayResponse) => {
        await confirmPayment({ orderNumber: placed.orderNumber, ...response })
        router.push(`/checkout/success?order=${encodeURIComponent(placed.orderNumber)}`)
      },
      modal: {
        // Closed without paying: the order waits 30 minutes; the order page can try again
        ondismiss: () =>
          router.push(`/checkout/success?order=${encodeURIComponent(placed.orderNumber)}`),
      },
    })
    checkout.open()
  }

  const place = async () => {
    if (!method) return
    setPlacing(true)
    setError(null)
    setFields({})
    idempotencyKey.current ??= crypto.randomUUID()
    const result = await submitCheckout({
      idempotencyKey: idempotencyKey.current,
      saveAddress: Boolean(account) && saveAddress,
      offers,
      form: {
        contact: { name: address.name, email: contact.email, phone: contact.phone },
        // One mobile number for the order: the courier calls the same one
        shippingAddress: { ...address, phone: contact.phone },
        billingSameAsShipping: true,
        buyerGstin: business ? gstin.buyerGstin : undefined,
        buyerLegalName: business ? gstin.buyerLegalName : undefined,
        paymentMethod: method,
        whatsappOptIn,
      },
    })
    if (!result.ok) {
      setPlacing(false)
      setError(result.message)
      setFields(result.fields ?? {})
      return
    }
    announceCartChange()
    if (result.data.payment) {
      await openRazorpay(result.data)
      setPlacing(false)
      return
    }
    router.push(`/checkout/success?order=${encodeURIComponent(result.data.orderNumber)}`)
  }

  const arrives = summary.delivery.arrivesBy

  return (
    <form
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void place()
      }}
    >
      <div className="space-y-5">
        {summary.payment.online.testMode ? (
          <p className="rounded-card bg-amber-100 px-4 py-2 text-sm text-amber-900">
            Test payments: this store’s online payment is in test mode, so nobody is charged.
          </p>
        ) : null}
        <Step n={1} title="Contact">
          {account ? (
            <p className="text-sm text-ink-soft">
              Logged in as <b className="text-ink">{account.email}</b>. This order goes to your
              account.
            </p>
          ) : (
            <p className="text-sm text-ink-soft">
              Have an account?{' '}
              <Link
                className="font-semibold text-ink underline"
                href="/account/login?next=%2Fcheckout"
              >
                Log in
              </Link>{' '}
              to fill this in.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field error={err('contact.phone')} id="co-phone" label="Mobile number" required>
              <input
                aria-invalid={Boolean(err('contact.phone'))}
                autoComplete="tel"
                className={inputClass}
                id="co-phone"
                inputMode="tel"
                onBlur={() => keepContact()}
                onChange={(event) => setContact({ ...contact, phone: event.target.value })}
                placeholder="98765 43210"
                value={contact.phone}
              />
            </Field>
            <Field error={err('contact.email')} id="co-email" label="Email" required>
              <input
                aria-invalid={Boolean(err('contact.email'))}
                autoComplete="email"
                className={inputClass}
                id="co-email"
                inputMode="email"
                onBlur={() => keepContact()}
                onChange={(event) => setContact({ ...contact, email: event.target.value })}
                type="email"
                value={contact.email}
              />
            </Field>
          </div>
          <p className="text-xs text-ink-soft">
            We’ll send order updates to this number and email.
          </p>
          <label className="flex items-start gap-2 text-sm">
            <input
              checked={whatsappOptIn}
              className="mt-0.5 size-4"
              onChange={(event) => setWhatsappOptIn(event.target.checked)}
              type="checkbox"
            />
            Send me order updates from {storeName} on WhatsApp
          </label>
          {offerChoices.email ? (
            <div className="space-y-1 text-sm">
              <p>Offers and new launches from {storeName}</p>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2">
                  <input
                    checked={offers.email}
                    className="size-4"
                    onChange={(event) => {
                      const next = { ...offers, email: event.target.checked }
                      setOffers(next)
                      keepContact(next, true)
                    }}
                    type="checkbox"
                  />
                  By email
                </label>
                {offerChoices.whatsapp ? (
                  <label className="flex items-center gap-2">
                    <input
                      checked={offers.whatsapp}
                      className="size-4"
                      onChange={(event) => {
                        const next = { ...offers, whatsapp: event.target.checked }
                        setOffers(next)
                        keepContact(next, true)
                      }}
                      type="checkbox"
                    />
                    On WhatsApp
                  </label>
                ) : null}
              </div>
            </div>
          ) : null}
        </Step>

        <Step n={2} title="Delivery address">
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_1fr]">
            <Field error={err('shippingAddress.pincode')} id="co-pincode" label="Pincode" required>
              <input
                aria-invalid={Boolean(err('shippingAddress.pincode'))}
                autoComplete="postal-code"
                className={inputClass}
                id="co-pincode"
                inputMode="numeric"
                maxLength={6}
                onChange={(event) => set('pincode', event.target.value.replace(/\D/g, ''))}
                value={address.pincode}
              />
            </Field>
            <Field error={err('shippingAddress.city')} id="co-city" label="City" required>
              <input
                aria-invalid={Boolean(err('shippingAddress.city'))}
                autoComplete="address-level2"
                className={inputClass}
                id="co-city"
                onChange={(event) => set('city', event.target.value)}
                value={address.city}
              />
            </Field>
            <Field error={err('shippingAddress.stateCode')} id="co-state" label="State" required>
              <select
                aria-invalid={Boolean(err('shippingAddress.stateCode'))}
                autoComplete="address-level1"
                className={inputClass}
                disabled={Boolean(summary.placeOfSupply)}
                id="co-state"
                onChange={(event) => set('stateCode', event.target.value)}
                value={address.stateCode}
              >
                <option value="">Choose</option>
                {GST_STATE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label.replace(/ \(\d+\)$/, '')}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field
            error={err('shippingAddress.name') ?? err('contact.name')}
            id="co-name"
            label="Full name"
            required
          >
            <input
              aria-invalid={Boolean(err('shippingAddress.name'))}
              autoComplete="name"
              className={inputClass}
              id="co-name"
              onChange={(event) => set('name', event.target.value)}
              value={address.name}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              error={err('shippingAddress.line1')}
              id="co-line1"
              label="Flat, house, building"
              required
            >
              <input
                aria-invalid={Boolean(err('shippingAddress.line1'))}
                autoComplete="address-line1"
                className={inputClass}
                id="co-line1"
                onChange={(event) => set('line1', event.target.value)}
                value={address.line1}
              />
            </Field>
            <Field id="co-line2" label="Area, street">
              <input
                autoComplete="address-line2"
                className={inputClass}
                id="co-line2"
                onChange={(event) => set('line2', event.target.value)}
                value={address.line2}
              />
            </Field>
          </div>
          <Field id="co-landmark" label="Landmark">
            <input
              className={inputClass}
              id="co-landmark"
              onChange={(event) => set('landmark', event.target.value)}
              placeholder="Optional"
              value={address.landmark}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              checked={business}
              className="size-4"
              onChange={(event) => setBusiness(event.target.checked)}
              type="checkbox"
            />
            Add GSTIN for a business invoice
          </label>
          {account ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                checked={saveAddress}
                className="size-4"
                onChange={(event) => setSaveAddress(event.target.checked)}
                type="checkbox"
              />
              Save this address to my account
            </label>
          ) : null}
          {business ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field error={err('buyerGstin')} id="co-gstin" label="GSTIN" required>
                <input
                  aria-invalid={Boolean(err('buyerGstin'))}
                  className={`${inputClass} uppercase`}
                  id="co-gstin"
                  maxLength={15}
                  onChange={(event) =>
                    setGstin({ ...gstin, buyerGstin: event.target.value.toUpperCase() })
                  }
                  value={gstin.buyerGstin}
                />
              </Field>
              <Field error={err('buyerLegalName')} id="co-business" label="Business name" required>
                <input
                  aria-invalid={Boolean(err('buyerLegalName'))}
                  className={inputClass}
                  id="co-business"
                  onChange={(event) => setGstin({ ...gstin, buyerLegalName: event.target.value })}
                  value={gstin.buyerLegalName}
                />
              </Field>
            </div>
          ) : null}
        </Step>

        <Step n={3} title="Delivery">
          {!pincodeReady ? (
            <p className="text-sm text-ink-soft">Enter the pincode to see delivery options.</p>
          ) : summary.delivery.serviceable ? (
            <label className="flex items-center gap-3 rounded-card border border-ink p-3 text-sm">
              <input checked readOnly type="radio" />
              <span>
                <strong>Standard</strong>{' '}
                {summary.totals.shippingMinor === 0 ? 'Free' : money(summary.totals.shippingMinor)}
                {arrives ? ` · arrives by ${arrives}` : ''}
              </span>
            </label>
          ) : (
            <p className="text-sm font-semibold text-red-700">
              We don’t deliver to this pincode yet.
            </p>
          )}
        </Step>

        <Step n={4} title="Payment">
          <div className="space-y-3" role="radiogroup">
            {summary.payment.online.available ? (
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-card border p-3 text-sm ${method === 'razorpay' ? 'border-ink' : 'border-line'}`}
              >
                <input
                  checked={method === 'razorpay'}
                  name="method"
                  onChange={() => setMethod('razorpay')}
                  type="radio"
                />
                <CardIcon className="text-ink-soft" />
                <span>
                  <strong>Pay online</strong>
                  <span className="block text-xs text-ink-soft">
                    UPI, cards, netbanking, wallets
                  </span>
                </span>
              </label>
            ) : null}
            <label
              className={`flex items-center gap-3 rounded-card border p-3 text-sm ${summary.payment.cod.available ? 'cursor-pointer' : 'opacity-60'} ${method === 'cod' ? 'border-ink' : 'border-line'}`}
            >
              <input
                checked={method === 'cod'}
                disabled={!summary.payment.cod.available}
                name="method"
                onChange={() => setMethod('cod')}
                type="radio"
              />
              <CashIcon className="text-ink-soft" />
              <span>
                <strong>Cash on delivery</strong>
                <span className="block text-xs text-ink-soft">
                  {summary.payment.cod.available
                    ? `${summary.payment.cod.feeMinor ? `${formatINR(summary.payment.cod.feeMinor)} fee · ` : ''}pay when it arrives`
                    : summary.payment.cod.reason}
                </span>
              </span>
            </label>
          </div>
        </Step>

        {error ? (
          <div className="rounded-card bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            <p>{error}</p>
            {Object.keys(fields).length ? (
              <ul className="mt-1 list-disc pl-5">
                {[...new Set(Object.values(fields))].map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        {summary.problems.length ? (
          <ul className="rounded-card bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {summary.problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        ) : null}
        <button
          className={buttonClass('dark', 'hidden w-full lg:flex')}
          disabled={blocked || placing || pending}
          type="submit"
        >
          <LockIcon height={16} width={16} />
          {placing
            ? 'Placing your order…'
            : method === 'cod'
              ? `Place order · ${money(total)}`
              : `Pay ${money(total)}`}
        </button>
      </div>

      <div className="lg:sticky lg:top-28 lg:self-start">
        <PriceDetails heading="Order summary" summary={summary}>
          <ul className="space-y-2 border-t border-line pt-3 text-sm">
            {summary.lines.map((line) => (
              <li className="flex justify-between gap-3" key={line.key}>
                <span>
                  {line.title}
                  <span className="block text-xs text-ink-soft">
                    {[line.options, `Qty ${line.qty}`].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <span>{money(line.lineMinor)}</span>
              </li>
            ))}
          </ul>
        </PriceDetails>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white p-2 lg:hidden">
        <button
          className={buttonClass('dark', 'w-full')}
          disabled={blocked || placing || pending}
          type="submit"
        >
          {placing
            ? 'Placing your order…'
            : method === 'cod'
              ? `Place order · ${money(total)}`
              : `Pay ${money(total)}`}
        </button>
      </div>
    </form>
  )
}
