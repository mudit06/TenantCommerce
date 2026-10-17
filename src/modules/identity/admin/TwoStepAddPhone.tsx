'use client'

import { useState } from 'react'

import { callApi } from '@/admin/client/api'
import { CodeBoxes } from '@/admin/ui/CodeBoxes'

import { type Setup, TwoStepScan } from './TwoStepSetup'

/**
 * "Add another phone" on your own account with two-step on (docs/05): a current code from a
 * phone that works shows the same QR again, so every phone you scan it on gives working codes.
 */
export function TwoStepAddPhone() {
  const [open, setOpen] = useState(false)
  const [setup, setSetup] = useState<Setup | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const show = async (value: string) => {
    if (busy) return
    setBusy(true)
    setError(null)
    const result = await callApi<Setup>('/admin/v1/auth/two-step/qr', { body: { code: value } })
    setBusy(false)
    if (result.ok) setSetup(result.data)
    else {
      setError(result.error.fields?.code ?? result.error.message)
      setCode('')
    }
  }

  const close = () => {
    setOpen(false)
    setSetup(null)
    setCode('')
    setError(null)
  }

  if (!open) {
    return (
      <button className="te-link-button" onClick={() => setOpen(true)} type="button">
        Add another phone
      </button>
    )
  }
  if (setup) {
    return (
      <div className="te-twostep">
        <TwoStepScan setup={setup} />
        <button className="te-link-button" onClick={close} type="button">
          Done
        </button>
      </div>
    )
  }
  return (
    <div className="te-twostep">
      <p className="te-small">
        Enter a code from a phone that already works to show the QR code again.
      </p>
      <CodeBoxes
        autoFocus
        disabled={busy}
        invalid={Boolean(error)}
        onChange={setCode}
        onComplete={(value) => void show(value)}
        value={code}
      />
      {error ? (
        <p className="te-field-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="te-link-button" onClick={close} type="button">
        Cancel
      </button>
    </div>
  )
}
