'use client'

import { useState } from 'react'

import { fromRupees, toRupeesString } from '@/lib/money'

/**
 * A rupee amount outside Payload's forms (our custom screens): shows "499", reports 49900 paise,
 * or null when empty. Rejects text that isn't an amount instead of guessing.
 */
export function RupeeField({
  id,
  label,
  valueMinor,
  onChange,
  disabled,
  help,
  error,
}: {
  id: string
  label: string
  valueMinor: number | null
  onChange: (amountMinor: number | null, valid: boolean) => void
  disabled?: boolean
  help?: string
  error?: string
}) {
  const [text, setText] = useState(valueMinor === null ? '' : toRupeesString(valueMinor))
  const [parseError, setParseError] = useState<string | null>(null)
  const message = parseError ?? error
  return (
    <div>
      <label className="te-label" htmlFor={id}>
        {label}
      </label>
      <div className="te-rupee-input__control">
        <span aria-hidden="true" className="te-rupee-input__prefix">
          ₹
        </span>
        <input
          aria-invalid={message ? true : undefined}
          disabled={disabled}
          id={id}
          inputMode="decimal"
          onChange={(event) => {
            const next = event.target.value
            setText(next)
            if (next.trim() === '') {
              setParseError(null)
              onChange(null, true)
              return
            }
            try {
              onChange(fromRupees(next), true)
              setParseError(null)
            } catch {
              setParseError('Type an amount in rupees, for example 499 or 49.50')
              onChange(null, false)
            }
          }}
          type="text"
          value={text}
        />
      </div>
      {message ? (
        <p className="te-rupee-input__error" role="alert">
          {message}
        </p>
      ) : help ? (
        <p className="te-field-help">{help}</p>
      ) : null}
    </div>
  )
}
