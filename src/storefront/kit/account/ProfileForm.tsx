'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { changePassword, saveProfile } from '../../shop/accountActions'
import { buttonClass } from '../ui'

const inputClass =
  'h-11 w-full rounded-card border border-line bg-white px-3 text-sm outline-none focus:border-ink/60'

/** Profile on My account: name and mobile, and an optional password (email codes always work). */
export function ProfileForm({
  name,
  phone,
  email,
  hasPassword,
}: {
  name: string
  phone: string
  email: string
  hasPassword: boolean
}) {
  const router = useRouter()
  const [values, setValues] = useState({ name, phone })
  const [password, setPassword] = useState({ current: '', next: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()

  const save = () =>
    start(async () => {
      const result = await saveProfile(values)
      setMessage(result.ok ? { ok: true, text: 'Saved.' } : { ok: false, text: result.message })
      if (result.ok) router.refresh()
    })

  const savePassword = () =>
    start(async () => {
      const result = await changePassword({
        password: password.next,
        current: hasPassword ? password.current : undefined,
      })
      if (!result.ok) {
        setMessage({ ok: false, text: result.message })
        return
      }
      setPassword({ current: '', next: '' })
      setShowPassword(false)
      setMessage({
        ok: true,
        text: 'Password saved. You can log in with it or with an email code.',
      })
      router.refresh()
    })

  return (
    <section className="rounded-card border border-line bg-white" id="profile">
      <h2 className="border-b border-line px-4 py-3 font-semibold">Profile</h2>
      <form
        className="grid gap-3 p-4 text-sm sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
      >
        <div>
          <label className="mb-1 block text-xs font-semibold" htmlFor="profile-name">
            Name
          </label>
          <input
            autoComplete="name"
            className={inputClass}
            id="profile-name"
            onChange={(event) => setValues({ ...values, name: event.target.value })}
            value={values.name}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold" htmlFor="profile-phone">
            Mobile
          </label>
          <input
            autoComplete="tel"
            className={inputClass}
            id="profile-phone"
            inputMode="tel"
            onChange={(event) => setValues({ ...values, phone: event.target.value })}
            placeholder="10-digit mobile"
            value={values.phone}
          />
        </div>
        <p className="text-ink-soft sm:col-span-2">Email: {email}</p>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button className={buttonClass('dark')} disabled={pending} type="submit">
            Save profile
          </button>
          {!showPassword ? (
            <button
              className={buttonClass('outline')}
              onClick={() => setShowPassword(true)}
              type="button"
            >
              {hasPassword ? 'Change password' : 'Set a password'}
            </button>
          ) : null}
        </div>
      </form>
      {showPassword ? (
        <form
          className="grid gap-3 border-t border-line p-4 text-sm sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault()
            savePassword()
          }}
        >
          {hasPassword ? (
            <div>
              <label className="mb-1 block text-xs font-semibold" htmlFor="password-current">
                Current password
              </label>
              <input
                autoComplete="current-password"
                className={inputClass}
                id="password-current"
                onChange={(event) => setPassword({ ...password, current: event.target.value })}
                type="password"
                value={password.current}
              />
            </div>
          ) : null}
          <div>
            <label className="mb-1 block text-xs font-semibold" htmlFor="password-next">
              New password (at least 10 characters)
            </label>
            <input
              autoComplete="new-password"
              className={inputClass}
              id="password-next"
              minLength={10}
              onChange={(event) => setPassword({ ...password, next: event.target.value })}
              type="password"
              value={password.next}
            />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <button className={buttonClass('dark')} disabled={pending} type="submit">
              Save password
            </button>
            <button
              className={buttonClass('outline')}
              onClick={() => setShowPassword(false)}
              type="button"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
      {message ? (
        <p
          aria-live="polite"
          className={`px-4 pb-4 text-sm ${message.ok ? 'text-emerald-800' : 'text-red-700'}`}
        >
          {message.text}
        </p>
      ) : null}
    </section>
  )
}
