'use client'

import { MinusIcon, PlusIcon } from '../icons'

export function QtyStepper({
  value,
  onChange,
  max = 99,
  disabled,
  label = 'Quantity',
}: {
  value: number
  onChange: (next: number) => void
  max?: number
  disabled?: boolean
  label?: string
}) {
  const button =
    'flex size-10 items-center justify-center text-ink disabled:opacity-40 hover:bg-surface-alt'
  return (
    <div className="inline-flex items-center rounded-card border border-line bg-white">
      <button
        aria-label={`Fewer (${label})`}
        className={button}
        disabled={disabled || value <= 1}
        onClick={() => onChange(value - 1)}
        type="button"
      >
        <MinusIcon height={16} width={16} />
      </button>
      <span
        aria-label={label}
        aria-live="polite"
        className="w-9 text-center text-sm font-semibold"
        role="status"
      >
        {value}
      </span>
      <button
        aria-label={`More (${label})`}
        className={button}
        disabled={disabled || value >= max}
        onClick={() => onChange(value + 1)}
        type="button"
      >
        <PlusIcon height={16} width={16} />
      </button>
    </div>
  )
}
