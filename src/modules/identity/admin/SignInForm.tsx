'use client'

import { useState } from 'react'

import { callApi } from '@/admin/client/api'
import { ADMIN } from '@/admin/paths'
import { CodeBoxes } from '@/admin/ui/CodeBoxes'

import { safeRedirect } from './safeRedirect'

/** Only our own admin pages: never send someone to another site after sign-in. */

/**
 * Sign in and two-step check (docs/screens/super-admin.md `sa-login`): email and password, then
 * the authenticator code when the account has two-step on. One page for our team and every
 * store's staff; the role decides which panel opens.
 */
export function SignInForm({ redirect }: { redirect: string | null }) {
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [keep, setKeep] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (withCode?: string) => {
    if (busy) return
    setBusy(true)
    setError(null)
    const result = await callApi<{ signedIn?: boolean; twoStepRequired?: boolean }>(
      '/admin/v1/auth/sign-in',
      {
        body: {
          email,
          password,
          keepSignedIn: keep,
          ...(withCode ? { code: withCode } : {}),
        },
      },
    )
    if (result.ok && result.data.twoStepRequired) {
      setBusy(false)
      setStep(2)
      return
    }
    if (result.ok && result.data.signedIn) {
      window.location.assign(safeRedirect(redirect))
      return
    }
    setBusy(false)
    if (!result.ok) {
      setError(result.error.message)
      if (step === 2) setCode('')
    }
  }

  if (step === 2) {
    return (
      <form
        className="te-signin__form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void submit(code)
        }}
      >
        <p className="te-signin__step">Step 2 of 2</p>
        <h1 className="te-signin__title">Two-step verification</h1>
        <p className="te-muted">Enter the 6-digit code from your authenticator app.</p>
        <CodeBoxes
          autoFocus
          disabled={busy}
          invalid={Boolean(error)}
          onChange={setCode}
          onComplete={(value) => void submit(value)}
          value={code}
        />
        {error ? (
          <p className="te-signin__error" role="alert">
            {error}
          </p>
        ) : null}
        <button
          className="te-button te-button--primary te-button--medium te-button--block"
          disabled={busy || code.length !== 6}
          type="submit"
        >
          {busy ? 'Checking…' : 'Verify and continue'}
        </button>
        <button
          className="te-link-button"
          onClick={() => {
            setStep(1)
            setCode('')
            setError(null)
          }}
          type="button"
        >
          Use a different account
        </button>
        <p className="te-muted te-small">
          Lost your phone? Ask the platform team to reset two-step sign-in for you.
        </p>
      </form>
    )
  }

  return (
    <form
      className="te-signin__form"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <h1 className="te-signin__title">Sign in</h1>
      <label className="te-label" htmlFor="signin-email">
        Email
      </label>
      <input
        autoComplete="username"
        autoFocus
        className="te-input"
        id="signin-email"
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@company.com"
        required
        type="email"
        value={email}
      />
      <div className="te-signin__row">
        <label className="te-label" htmlFor="signin-password">
          Password
        </label>
        <a className="te-link te-small" href={`${ADMIN}/forgot`}>
          Forgot password?
        </a>
      </div>
      <div className="te-input-group">
        <input
          autoComplete="current-password"
          className="te-input"
          id="signin-password"
          onChange={(event) => setPassword(event.target.value)}
          required
          type={show ? 'text' : 'password'}
          value={password}
        />
        <button
          aria-pressed={show}
          className="te-input-group__button"
          onClick={() => setShow((value) => !value)}
          type="button"
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      <label className="te-checkbox">
        <input checked={keep} onChange={(event) => setKeep(event.target.checked)} type="checkbox" />
        Keep me signed in on this device
      </label>
      {error ? (
        <p className="te-signin__error" role="alert">
          {error}
        </p>
      ) : null}
      <button
        className="te-button te-button--primary te-button--medium te-button--block"
        disabled={busy || !email || !password}
        type="submit"
      >
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
