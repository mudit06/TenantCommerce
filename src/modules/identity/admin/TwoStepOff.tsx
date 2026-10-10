'use client'

import { useState } from 'react'

import { callApi } from '@/admin/client/api'
import { CodeBoxes } from '@/admin/ui/CodeBoxes'

/** Turning two-step off on your own vendor staff account: a current code proves it is you. */
export function TwoStepOff() {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const turnOff = async (value: string) => {
    setBusy(true)
    setError(null)
    const result = await callApi('/admin/v1/auth/two-step/off', { body: { code: value } })
    setBusy(false)
    if (result.ok) window.location.reload()
    else {
      setError(result.error.fields?.code ?? result.error.message)
      setCode('')
    }
  }

  if (!open) {
    return (
      <button className="te-link-button" onClick={() => setOpen(true)} type="button">
        Turn off two-step sign-in
      </button>
    )
  }
  return (
    <div className="te-twostep">
      <p className="te-small">Enter a code from your app to turn it off.</p>
      <CodeBoxes
        autoFocus
        disabled={busy}
        invalid={Boolean(error)}
        onChange={setCode}
        onComplete={(value) => void turnOff(value)}
        value={code}
      />
      {error ? (
        <p className="te-field-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="te-link-button" onClick={() => setOpen(false)} type="button">
        Keep it on
      </button>
    </div>
  )
}
