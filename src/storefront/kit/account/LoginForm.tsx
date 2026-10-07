'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'

import { passwordLogin, sendCode, verifyCode } from '../../shop/accountActions'
import { buttonClass } from '../ui'

const inputClass =
  'h-12 w-full rounded-card border border-line bg-white px-3 text-base outline-none focus:border-ink/60'

/**
 * Log in or create an account (docs/screens storefront `st-login`): an email code by default,
 * a password for shoppers who set one. The code creates the account when the email is new.
 */
export function LoginForm({ initialEmail, next }: { initialEmail: string; next: string }) {
  const router = useRouter()
  const [tab, setTab] = useState<'code' | 'password'>('code')
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''))
  const [wait, setWait] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const boxes = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (wait <= 0) return
    const timer = window.setTimeout(() => setWait((w) => w - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [wait])

  const send = () =>
    start(async () => {
      setError(null)
      const result = await sendCode(email)
      if (!result.ok) {
        setError(result.message)
        return
      }
      setSentTo(result.data.maskedEmail)
      setWait(result.data.waitSeconds)
      setDigits(Array(6).fill(''))
      window.setTimeout(() => boxes.current[0]?.focus(), 50)
    })

  const verify = (code = digits.join('')) =>
    start(async () => {
      setError(null)
      if (code.length !== 6) {
        setError('Enter the 6-digit code from the email.')
        return
      }
      const result = await verifyCode(email, code, next)
      if (!result.ok) {
        setError(result.message)
        return
      }
      router.replace(result.data.next)
      router.refresh()
    })

  const logIn = () =>
    start(async () => {
      setError(null)
      const result = await passwordLogin(email, password, next)
      if (!result.ok) {
        setError(result.message)
        return
      }
      router.replace(result.data.next)
      router.refresh()
    })

  const typeDigit = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '')
    if (clean.length > 1) {
      // Pasted or filled by the phone's one-time-code suggestion
      const all = clean.slice(0, 6).split('')
      const filled = [...all, ...Array(6 - all.length).fill('')]
      setDigits(filled)
      boxes.current[Math.min(all.length, 5)]?.focus()
      if (all.length === 6) verify(all.join(''))
      return
    }
    const nextDigits = [...digits]
    nextDigits[index] = clean
    setDigits(nextDigits)
    if (clean && index < 5) boxes.current[index + 1]?.focus()
    if (clean && index === 5 && nextDigits.every(Boolean)) verify(nextDigits.join(''))
  }

  const tabClass = (on: boolean) =>
    `flex-1 border-b-2 pb-2 text-sm font-semibold ${on ? 'border-ink text-ink' : 'border-transparent text-ink-soft'}`

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold">Log in or create an account</h1>
      <div className="flex gap-4" role="tablist">
        <button
          aria-selected={tab === 'code'}
          className={tabClass(tab === 'code')}
          onClick={() => {
            setTab('code')
            setError(null)
          }}
          role="tab"
          type="button"
        >
          Email code
        </button>
        <button
          aria-selected={tab === 'password'}
          className={tabClass(tab === 'password')}
          onClick={() => {
            setTab('password')
            setError(null)
          }}
          role="tab"
          type="button"
        >
          Password
        </button>
      </div>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          if (tab === 'password') logIn()
          else if (!sentTo) send()
          else verify()
        }}
      >
        <div>
          <label className="mb-1 block text-sm font-semibold" htmlFor="login-email">
            Email
          </label>
          <input
            autoComplete="email"
            className={inputClass}
            id="login-email"
            inputMode="email"
            onChange={(event) => {
              setEmail(event.target.value)
              setSentTo(null)
            }}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />
        </div>

        {tab === 'password' ? (
          <>
            <div>
              <label className="mb-1 block text-sm font-semibold" htmlFor="login-password">
                Password
              </label>
              <input
                autoComplete="current-password"
                className={inputClass}
                id="login-password"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </div>
            <button className={buttonClass('dark', 'w-full')} disabled={pending} type="submit">
              {pending ? 'Logging in…' : 'Log in'}
            </button>
            <p className="text-xs text-ink-soft">
              No password yet, or forgot it? Use an email code, then set one in your profile.
            </p>
          </>
        ) : !sentTo ? (
          <button className={buttonClass('dark', 'w-full')} disabled={pending} type="submit">
            {pending ? 'Sending…' : 'Send code'}
          </button>
        ) : (
          <>
            <div className="border-t border-line pt-4">
              <p className="text-sm">
                Enter the 6-digit code sent to <b>{sentTo}</b>
              </p>
              <div className="mt-3 flex gap-2" role="group" aria-label="6-digit code">
                {digits.map((digit, index) => (
                  <input
                    aria-label={`Digit ${index + 1}`}
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    className="h-12 w-11 rounded-card border border-line bg-white text-center font-mono text-xl outline-none focus:border-ink/60 sm:w-12"
                    inputMode="numeric"
                    key={index}
                    maxLength={index === 0 ? 6 : 1}
                    onChange={(event) => typeDigit(index, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Backspace' && !digits[index] && index > 0) {
                        boxes.current[index - 1]?.focus()
                      }
                    }}
                    ref={(el) => {
                      boxes.current[index] = el
                    }}
                    value={digit}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-ink-soft">
                {wait > 0 ? (
                  `Resend code in 0:${String(wait).padStart(2, '0')}`
                ) : (
                  <button
                    className="font-semibold underline underline-offset-2"
                    disabled={pending}
                    onClick={send}
                    type="button"
                  >
                    Resend code
                  </button>
                )}
              </p>
            </div>
            <button className={buttonClass('dark', 'w-full')} disabled={pending} type="submit">
              {pending ? 'Checking…' : 'Verify'}
            </button>
          </>
        )}
      </form>

      {error ? (
        <p aria-live="assertive" className="text-sm font-semibold text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {tab === 'code' ? (
        <p className="text-xs text-ink-soft">
          If an account exists for this email, we’ll send a code. New here? The code creates your
          account.
        </p>
      ) : null}
    </div>
  )
}
