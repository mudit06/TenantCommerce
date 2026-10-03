'use client'

import { FieldDescription, FieldError, FieldLabel, useField } from '@payloadcms/ui'
import type { NumberFieldClientComponent } from 'payload'
import { useState } from 'react'

import { fromRupees, toRupeesString } from '@/lib/money'

/** Rupee input for a paise field: shows "11798.82", stores 1179882. */
export const RupeeInput: NumberFieldClientComponent = ({
  field,
  path: pathFromProps,
  readOnly,
}) => {
  const { value, setValue, showError, path } = useField<number | null>({
    potentiallyStalePath: pathFromProps,
  })
  const [text, setText] = useState(() => (typeof value === 'number' ? toRupeesString(value) : ''))
  const [parseError, setParseError] = useState<string | null>(null)

  // Follow outside changes (form reset, server value) without clobbering what is being typed:
  // adjust state during render when the value changes (react.dev "you might not need an effect")
  const [seenValue, setSeenValue] = useState(value)
  if (value !== seenValue) {
    setSeenValue(value)
    let sameAsTyped = false
    try {
      sameAsTyped = typeof value === 'number' && fromRupees(text) === value
    } catch {
      sameAsTyped = false
    }
    if (!sameAsTyped) setText(typeof value === 'number' ? toRupeesString(value) : '')
  }

  const onChange = (next: string) => {
    setText(next)
    if (next.trim() === '') {
      setParseError(null)
      setValue(null)
      return
    }
    try {
      setValue(fromRupees(next))
      setParseError(null)
    } catch {
      setParseError('Type an amount in rupees, for example 4999 or 4999.50')
    }
  }

  const isReadOnly = readOnly || Boolean(field.admin?.readOnly)

  return (
    <div className="field-type number te-rupee-input">
      <FieldLabel label={field.label} path={path} required={field.required} />
      <div className="field-type__wrap">
        {showError ? <FieldError path={path} /> : null}
        <div className="te-rupee-input__control">
          <span aria-hidden="true" className="te-rupee-input__prefix">
            ₹
          </span>
          <input
            aria-invalid={Boolean(parseError) || showError}
            disabled={isReadOnly}
            id={`field-${path.replace(/\./g, '__')}`}
            inputMode="decimal"
            name={path}
            onChange={(event) => onChange(event.target.value)}
            type="text"
            value={text}
          />
        </div>
        {parseError ? (
          <p className="te-rupee-input__error" role="alert">
            {parseError}
          </p>
        ) : null}
        <FieldDescription description={field.admin?.description} path={path} />
      </div>
    </div>
  )
}
