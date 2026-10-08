'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { applyForAffiliate } from '../../shop/affiliateActions'
import { buttonClass } from '../ui'

const inputClass =
  'h-11 w-full rounded-card border border-line bg-white px-3 text-sm outline-none focus:border-ink/60'

const WHERE = [
  ['instagram', 'Instagram'],
  ['youtube', 'YouTube'],
  ['website', 'Website or blog'],
  ['whatsapp', 'WhatsApp groups'],
  ['offline', 'In person (fitter, contractor)'],
  ['other', 'Somewhere else'],
] as const

/** The affiliate application (docs/screens storefront `st-affiliate` "Apply"). */
export function ApplyForm({
  email,
  name,
  phone,
  termsPath,
}: {
  email: string
  name: string
  phone: string
  termsPath: string
}) {
  const router = useRouter()
  const [values, setValues] = useState({
    name,
    phone,
    promotesOn: '',
    profileUrl: '',
    audienceNote: '',
    pan: '',
    acceptTerms: false,
    offers: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) =>
    setValues({ ...values, [key]: value })

  const submit = () =>
    start(async () => {
      const result = await applyForAffiliate({
        ...values,
        acceptTerms: values.acceptTerms as true,
      })
      if (!result.ok) {
        setErrors(result.fields ?? {})
        setMessage(result.message)
        return
      }
      setErrors({})
      setMessage(null)
      router.refresh()
    })

  const error = (key: string) =>
    errors[key] ? (
      <p className="mt-1 text-xs text-red-700" id={`aff-${key}-error`}>
        {errors[key]}
      </p>
    ) : null

  return (
    <form
      className="grid gap-4 text-sm sm:grid-cols-2"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <div>
        <label className="mb-1 block text-xs font-semibold" htmlFor="aff-name">
          Full name *
        </label>
        <input
          aria-invalid={Boolean(errors.name)}
          autoComplete="name"
          className={inputClass}
          id="aff-name"
          onChange={(e) => set('name', e.target.value)}
          value={values.name}
        />
        {error('name')}
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold" htmlFor="aff-phone">
          Mobile *
        </label>
        <input
          aria-invalid={Boolean(errors.phone)}
          autoComplete="tel"
          className={inputClass}
          id="aff-phone"
          inputMode="tel"
          onChange={(e) => set('phone', e.target.value)}
          placeholder="98765 43210"
          value={values.phone}
        />
        {error('phone')}
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold" htmlFor="aff-where">
          Where do you share? *
        </label>
        <select
          aria-invalid={Boolean(errors.promotesOn)}
          className={inputClass}
          id="aff-where"
          onChange={(e) => set('promotesOn', e.target.value)}
          value={values.promotesOn}
        >
          <option value="">Choose</option>
          {WHERE.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {error('promotesOn')}
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold" htmlFor="aff-profile">
          Profile link
        </label>
        <input
          className={inputClass}
          id="aff-profile"
          inputMode="url"
          onChange={(e) => set('profileUrl', e.target.value)}
          placeholder="instagram.com/your.name"
          value={values.profileUrl}
        />
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-semibold" htmlFor="aff-audience">
          Tell us about your audience
        </label>
        <textarea
          className="min-h-24 w-full rounded-card border border-line bg-white p-3 text-sm outline-none focus:border-ink/60"
          id="aff-audience"
          maxLength={600}
          onChange={(e) => set('audienceNote', e.target.value)}
          value={values.audienceNote}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold" htmlFor="aff-pan">
          PAN
        </label>
        <input
          aria-invalid={Boolean(errors.pan)}
          autoCapitalize="characters"
          className={inputClass}
          id="aff-pan"
          maxLength={10}
          onChange={(e) => set('pan', e.target.value.toUpperCase())}
          placeholder="Needed before your first payout"
          value={values.pan}
        />
        {error('pan')}
      </div>
      <div className="space-y-2 sm:col-span-2">
        <label className="flex items-start gap-2">
          <input
            checked={values.acceptTerms}
            className="mt-0.5 size-4"
            onChange={(e) => set('acceptTerms', e.target.checked)}
            type="checkbox"
          />
          <span>
            I accept the{' '}
            <Link className="underline" href={`/${termsPath}`} target="_blank">
              affiliate terms
            </Link>{' '}
            and will mark my posts as a paid partnership
          </span>
        </label>
        {error('acceptTerms')}
        <label className="flex items-start gap-2">
          <input
            checked={values.offers}
            className="mt-0.5 size-4"
            onChange={(e) => set('offers', e.target.checked)}
            type="checkbox"
          />
          Also send me offers by email
        </label>
      </div>
      {message ? (
        <p className="text-sm text-red-700 sm:col-span-2" role="alert">
          {message}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button className={buttonClass('primary')} disabled={pending} type="submit">
          {pending ? 'Sending…' : 'Send application'}
        </button>
        <span className="text-xs text-ink-soft">Signed in as {email}</span>
      </div>
    </form>
  )
}
