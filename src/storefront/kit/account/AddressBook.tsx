'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { GST_STATE_OPTIONS } from '@/lib/gst/gstin'

import { deleteMyAddress, saveMyAddress } from '../../shop/accountActions'
import { buttonClass } from '../ui'

export type SavedAddress = {
  id: string
  type: 'home' | 'work' | 'site'
  isDefault: boolean
  name: string
  phone: string
  line1: string
  line2: string
  landmark: string
  city: string
  stateCode: string
  pincode: string
  gstin: string
  legalName: string
}

const EMPTY: Omit<SavedAddress, 'id'> = {
  type: 'home',
  isDefault: false,
  name: '',
  phone: '',
  line1: '',
  line2: '',
  landmark: '',
  city: '',
  stateCode: '',
  pincode: '',
  gstin: '',
  legalName: '',
}

const TYPE_LABEL = { home: 'Home', work: 'Work', site: 'Site' } as const

const inputClass =
  'h-11 w-full rounded-card border border-line bg-white px-3 text-sm outline-none focus:border-ink/60'

const stateName = (code: string) =>
  GST_STATE_OPTIONS.find((o) => o.value === code)?.label.replace(/ \(\d+\)$/, '') ?? ''

/** Saved addresses on My account: edit, add, remove, and which one checkout fills in. */
export function AddressBook({ addresses }: { addresses: SavedAddress[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const [values, setValues] = useState<Omit<SavedAddress, 'id'>>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const open = (address: SavedAddress | null) => {
    setErrors({})
    setMessage(null)
    setEditing(address ? address.id : 'new')
    setValues(address ? { ...address } : { ...EMPTY, isDefault: addresses.length === 0 })
  }
  const set = (key: keyof typeof values, value: string | boolean) =>
    setValues((current) => ({ ...current, [key]: value }))

  const save = () =>
    start(async () => {
      setErrors({})
      const result = await saveMyAddress(
        { ...values, stateCode: values.stateCode, gstin: values.gstin || undefined },
        editing === 'new' ? null : editing,
      )
      if (!result.ok) {
        setErrors(result.fields ?? {})
        setMessage(result.message)
        return
      }
      setEditing(null)
      router.refresh()
    })

  const remove = (id: string) =>
    start(async () => {
      if (!window.confirm('Remove this address?')) return
      const result = await deleteMyAddress(id)
      if (!result.ok) setMessage(result.message)
      router.refresh()
    })

  const field = (key: keyof typeof values, label: string, extra: object = {}) => (
    <div>
      <label className="mb-1 block text-xs font-semibold" htmlFor={`address-${key}`}>
        {label}
      </label>
      <input
        className={inputClass}
        id={`address-${key}`}
        onChange={(event) => set(key, event.target.value)}
        value={String(values[key] ?? '')}
        {...extra}
      />
      {errors[key] ? <p className="mt-1 text-xs text-red-700">{errors[key]}</p> : null}
    </div>
  )

  return (
    <section className="rounded-card border border-line bg-white" id="addresses">
      <h2 className="border-b border-line px-4 py-3 font-semibold">
        {addresses.length > 1 ? 'Saved addresses' : 'Saved address'}
      </h2>
      <div className="space-y-4 p-4 text-sm">
        {addresses.length === 0 && editing === null ? (
          <p className="text-ink-soft">No saved address yet. Checkout fills in the one you save.</p>
        ) : null}
        {addresses.map((address) =>
          editing === address.id ? null : (
            <div className="space-y-2" key={address.id}>
              <p>
                <b>{TYPE_LABEL[address.type]}</b>
                {address.isDefault ? ' · used at checkout' : ''} · {address.name}, {address.line1}
                {address.line2 ? `, ${address.line2}` : ''}, {address.city},{' '}
                {stateName(address.stateCode)} {address.pincode}
              </p>
              <div className="flex gap-2">
                <button
                  className={buttonClass('outline', 'min-h-9 px-3')}
                  onClick={() => open(address)}
                  type="button"
                >
                  Edit
                </button>
                <button
                  className="min-h-9 px-3 text-sm text-ink-soft underline-offset-2 hover:underline"
                  disabled={pending}
                  onClick={() => remove(address.id)}
                  type="button"
                >
                  Remove
                </button>
              </div>
            </div>
          ),
        )}
        {editing ? (
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault()
              save()
            }}
          >
            {field('name', 'Name', { autoComplete: 'name' })}
            {field('phone', 'Mobile', { autoComplete: 'tel', inputMode: 'tel' })}
            <div className="sm:col-span-2">
              {field('line1', 'House, building, street', { autoComplete: 'address-line1' })}
            </div>
            {field('line2', 'Area, locality', { autoComplete: 'address-line2' })}
            {field('landmark', 'Landmark (optional)')}
            {field('city', 'City or town', { autoComplete: 'address-level2' })}
            {field('pincode', 'Pincode', { inputMode: 'numeric', maxLength: 6 })}
            <div>
              <label className="mb-1 block text-xs font-semibold" htmlFor="address-stateCode">
                State
              </label>
              <select
                className={inputClass}
                id="address-stateCode"
                onChange={(event) => set('stateCode', event.target.value)}
                value={values.stateCode}
              >
                <option value="">Choose the state</option>
                {GST_STATE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label.replace(/ \(\d+\)$/, '')}
                  </option>
                ))}
              </select>
              {errors.stateCode ? (
                <p className="mt-1 text-xs text-red-700">{errors.stateCode}</p>
              ) : null}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold" htmlFor="address-type">
                Type
              </label>
              <select
                className={inputClass}
                id="address-type"
                onChange={(event) => set('type', event.target.value)}
                value={values.type}
              >
                <option value="home">Home</option>
                <option value="work">Work</option>
                <option value="site">Site</option>
              </select>
            </div>
            {field('gstin', 'GSTIN for business invoices (optional)')}
            {values.gstin ? field('legalName', 'Business name') : null}
            <label className="flex items-center gap-2 sm:col-span-2">
              <input
                checked={values.isDefault}
                className="size-4"
                onChange={(event) => set('isDefault', event.target.checked)}
                type="checkbox"
              />
              Use this address at checkout
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <button className={buttonClass('dark')} disabled={pending} type="submit">
                {pending ? 'Saving…' : 'Save address'}
              </button>
              <button
                className={buttonClass('outline')}
                onClick={() => setEditing(null)}
                type="button"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            className={buttonClass('outline', 'min-h-9 px-3')}
            onClick={() => open(null)}
            type="button"
          >
            + Add address
          </button>
        )}
        {message ? (
          <p aria-live="polite" className="text-sm text-red-700">
            {message}
          </p>
        ) : null}
      </div>
    </section>
  )
}
