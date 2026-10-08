'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/** The report's month */
export function MonthPicker({
  months,
  value,
}: {
  months: { key: string; label: string }[]
  value: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  return (
    <label className="te-filter">
      <span className="te-filter__label">Month</span>
      <select
        aria-label="Month"
        onChange={(e) => {
          const next = new URLSearchParams(params.toString())
          next.set('month', e.target.value)
          router.push(`${pathname}?${next}`)
        }}
        value={value}
      >
        {months.map((m) => (
          <option key={m.key} value={m.key}>
            {m.label}
          </option>
        ))}
      </select>
    </label>
  )
}
