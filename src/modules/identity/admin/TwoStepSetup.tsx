'use client'

import { useState } from 'react'

import { callApi } from '@/admin/client/api'
import { CodeBoxes } from '@/admin/ui/CodeBoxes'

type Setup = { setupKey: string; qrSvg: string }

/**
 * Setting up two-step sign-in (docs/05): scan the QR code with an authenticator app (or type
 * the key), then confirm with the first code. Used by the setup screen our team must finish
 * and by each person's own account page.
 */
export function TwoStepSetup({ onDone }: { onDone?: () => void }) {
  const [setup, setSetup] = useState<Setup | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const start = async () => {
    setBusy(true)
    setError(null)
    const result = await callApi<Setup>('/admin/v1/auth/two-step/setup')
    setBusy(false)
    if (result.ok) setSetup(result.data)
    else setError(result.error.message)
  }

  const confirm = async (value: string) => {
    if (busy) return
    setBusy(true)
    setError(null)
    const result = await callApi('/admin/v1/auth/two-step/confirm', { body: { code: value } })
    setBusy(false)
    if (result.ok) {
      if (onDone) onDone()
      else window.location.reload()
      return
    }
    setError(result.error.fields?.code ?? result.error.message)
    setCode('')
  }

  if (!setup) {
    return (
      <div className="te-twostep">
        <ol className="te-twostep__steps">
          <li>
            Install an authenticator app on your phone, for example Google Authenticator, Microsoft
            Authenticator or 1Password.
          </li>
          <li>Scan the QR code we show you next.</li>
          <li>Type the 6-digit code the app shows to finish.</li>
        </ol>
        {error ? (
          <p className="te-field-error" role="alert">
            {error}
          </p>
        ) : null}
        <button
          className="te-button te-button--primary te-button--medium"
          disabled={busy}
          onClick={() => void start()}
          type="button"
        >
          {busy ? 'Starting…' : 'Set up two-step sign-in'}
        </button>
      </div>
    )
  }

  return (
    <div className="te-twostep">
      <div className="te-twostep__scan">
        <div
          aria-label="QR code for your authenticator app"
          className="te-twostep__qr"
          // Our own server's SVG from the qrcode library, not user input
          dangerouslySetInnerHTML={{ __html: setup.qrSvg }}
          role="img"
        />
        <div>
          <p className="te-small">Can’t scan? Choose “Enter a setup key” in the app and type:</p>
          <p className="te-mono te-twostep__key">{setup.setupKey}</p>
          <p className="te-muted te-small">Time based, 6 digits.</p>
        </div>
      </div>
      <label className="te-label" htmlFor="twostep-code">
        Code from the app
      </label>
      <CodeBoxes
        disabled={busy}
        invalid={Boolean(error)}
        onChange={setCode}
        onComplete={(value) => void confirm(value)}
        value={code}
      />
      {error ? (
        <p className="te-field-error" role="alert">
          {error}
        </p>
      ) : null}
      <button
        className="te-button te-button--primary te-button--medium"
        disabled={busy || code.length !== 6}
        onClick={() => void confirm(code)}
        type="button"
      >
        {busy ? 'Checking…' : 'Turn on two-step sign-in'}
      </button>
    </div>
  )
}
