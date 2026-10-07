'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { Icon } from '@/admin/ui/icons'

type Filters = { q: string; role: string; offers: string }

/** Search and filters above the customers table; every choice lives in the address. */
export function CustomersToolbar({ initial }: { initial: Filters }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [q, setQ] = useState(initial.q)

  const update = (changes: Partial<Filters>) => {
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
    if (q === initial.q) return
    const timer = window.setTimeout(() => update({ q: q.trim() }), 300)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the typed text restarts the wait
  }, [q])

  const select = (
    labelText: string,
    key: keyof Filters,
    options: { value: string; label: string }[],
    anyLabel: string,
  ) => (
    <label className="te-filter">
      <span className="te-filter__label">{labelText}</span>
      <select onChange={(event) => update({ [key]: event.target.value })} value={initial[key]}>
        <option value="">{anyLabel}</option>
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
        <span className="te-visually-hidden">Search customers</span>
        <input
          onChange={(event) => setQ(event.target.value)}
          placeholder="Name, email or phone"
          type="search"
          value={q}
        />
      </label>
      {select(
        'Role',
        'role',
        [
          { value: 'shopper', label: 'Shoppers only' },
          { value: 'affiliate', label: 'Affiliates' },
        ],
        'Role: all',
      )}
      {select(
        'Offers',
        'offers',
        [
          { value: 'email', label: 'By email' },
          { value: 'whatsapp', label: 'On WhatsApp' },
          { value: 'none', label: 'None' },
        ],
        'Offers: any',
      )}
    </div>
  )
}
