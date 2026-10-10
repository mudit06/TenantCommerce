'use client'

import { useRef } from 'react'

const LENGTH = 6

/**
 * Six boxes for an authenticator code (docs/screens `sa-login` step 2). Typing moves on,
 * Backspace moves back, and pasting or the phone's one-time-code fill spreads the digits.
 */
export function CodeBoxes({
  value,
  onChange,
  onComplete,
  disabled,
  invalid,
  label = 'Six-digit code',
  autoFocus,
}: {
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  disabled?: boolean
  invalid?: boolean
  label?: string
  autoFocus?: boolean
}) {
  const boxes = useRef<(HTMLInputElement | null)[]>([])
  const digits = value.padEnd(LENGTH, ' ').slice(0, LENGTH).split('')

  const set = (next: string) => {
    const clean = next.replace(/\D/g, '').slice(0, LENGTH)
    onChange(clean)
    if (clean.length === LENGTH) onComplete?.(clean)
    boxes.current[Math.min(clean.length, LENGTH - 1)]?.focus()
  }

  return (
    <div aria-label={label} className={`te-code${invalid ? ' te-code--invalid' : ''}`} role="group">
      {digits.map((digit, index) => (
        <input
          aria-label={`Digit ${index + 1}`}
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          autoFocus={autoFocus && index === 0}
          className="te-code__box"
          disabled={disabled}
          inputMode="numeric"
          key={index}
          maxLength={LENGTH}
          onChange={(event) => {
            const typed = event.target.value.replace(/\D/g, '')
            if (!typed) return
            // One digit typed here, or several pasted or filled by the phone
            set(value.slice(0, index) + typed)
          }}
          onFocus={(event) => event.target.select()}
          onKeyDown={(event) => {
            if (event.key === 'Backspace') {
              event.preventDefault()
              const cut = digit.trim() ? index : Math.max(0, index - 1)
              onChange(value.slice(0, cut))
              boxes.current[cut]?.focus()
            }
            if (event.key === 'ArrowLeft') boxes.current[index - 1]?.focus()
            if (event.key === 'ArrowRight') boxes.current[index + 1]?.focus()
          }}
          onPaste={(event) => {
            event.preventDefault()
            set(event.clipboardData.getData('text'))
          }}
          pattern="[0-9]*"
          ref={(element) => {
            boxes.current[index] = element
          }}
          type="text"
          value={digit.trim()}
        />
      ))}
    </div>
  )
}
