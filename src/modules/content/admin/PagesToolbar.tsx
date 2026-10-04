'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { Icon } from '@/admin/ui/icons'

type Filters = { q: string; template: string; editor: string; period: string; sort: string }

/**
 * Search, filters and sort above the Pages table. Every choice lives in the address, so a
 * filtered list can be shared and the back button works; typing waits a moment before searching.
 */
export function PagesToolbar({
  initial,
  templates,
  editors,
}: {
  initial: Filters
  templates: { value: string; label: string }[]
  editors: string[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [q, setQ] = useState(initial.q)
  const searchRef = useRef<HTMLInputElement>(null)

  const update = (changes: Partial<Filters>) => {
    const next = new URLSearchParams(params.toString())
    for (const [key, value] of Object.entries(changes)) {
      if (value && !(key === 'sort' && value === 'updated')) next.set(key, value)
      else next.delete(key)
    }
    const query = next.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  useEffect(() => {
    if (q === initial.q) return
    const timer = window.setTimeout(() => update({ q: q.trim() }), 300)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the typed text restarts the wait
  }, [q])

  // "/" jumps to the search box, as in most list screens
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (event.key !== '/' || target?.closest('input, textarea, select, [contenteditable]')) return
      event.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const select = (
    label: string,
    key: keyof Filters,
    options: { value: string; label: string }[],
    anyLabel?: string,
  ) => (
    <label className="te-filter">
      <span className="te-filter__label">{label}</span>
      <select onChange={(event) => update({ [key]: event.target.value })} value={initial[key]}>
        {anyLabel ? <option value="">{anyLabel}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <div className="te-toolbar-row" role="search">
      <label className="te-search">
        <Icon name="search" size={16} />
        <span className="te-visually-hidden">Search pages</span>
        <input
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search by title or address"
          ref={searchRef}
          type="search"
          value={q}
        />
        <kbd aria-hidden className="te-kbd">
          /
        </kbd>
      </label>
      <div className="te-toolbar-row__filters">
        {select('Template', 'template', templates, 'All templates')}
        {select(
          'Changed by',
          'editor',
          editors.map((name) => ({ value: name, label: name })),
          'Anyone',
        )}
        {select(
          'Modified',
          'period',
          [
            { value: 'today', label: 'Today' },
            { value: 'week', label: 'Last 7 days' },
            { value: 'month', label: 'Last 30 days' },
          ],
          'Any time',
        )}
        {select('Sort', 'sort', [
          { value: 'updated', label: 'Last modified' },
          { value: 'title', label: 'Title A to Z' },
          { value: 'published', label: 'Last published' },
        ])}
      </div>
    </div>
  )
}
