'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { Icon } from './icons'

export type ListFilter = {
  key: string
  label: string
  /** The first option, meaning "no filter" (for example "Plan: all") */
  anyLabel: string
  options: { value: string; label: string }[]
}

/**
 * Search and select filters above our own list screens. Every choice lives in the address, so a
 * filtered list can be shared, reloaded and exported as shown; changing one goes back to page 1.
 */
export function ListToolbar({
  searchKey = 'q',
  searchLabel,
  searchPlaceholder,
  filters = [],
  initial,
}: {
  searchKey?: string
  searchLabel: string
  searchPlaceholder: string
  filters?: ListFilter[]
  initial: Record<string, string>
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [q, setQ] = useState(initial[searchKey] ?? '')

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params.toString())
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    next.delete('page')
    const query = next.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  useEffect(() => {
    if (q === (initial[searchKey] ?? '')) return
    const timer = window.setTimeout(() => update({ [searchKey]: q.trim() }), 300)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the typed text restarts the wait
  }, [q])

  return (
    <div className="te-toolbar-row" role="search">
      <label className="te-search">
        <Icon name="search" size={16} />
        <span className="te-visually-hidden">{searchLabel}</span>
        <input
          onChange={(event) => setQ(event.target.value)}
          placeholder={searchPlaceholder}
          type="search"
          value={q}
        />
      </label>
      {filters.map((filter) => (
        <label className="te-filter" key={filter.key}>
          <span className="te-filter__label">{filter.label}</span>
          <select
            onChange={(event) => update({ [filter.key]: event.target.value })}
            value={initial[filter.key] ?? ''}
          >
            <option value="">{filter.anyLabel}</option>
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  )
}
