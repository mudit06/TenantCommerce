'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { Icon } from '@/admin/ui/icons'

type Filters = { q: string; days: string; payment: string; state: string }

/** Search and filters above the orders table; every choice lives in the address. */
export function OrdersToolbar({
  initial,
  states,
}: {
  initial: Filters
  states: { value: string; label: string }[]
}) {
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
        <span className="te-visually-hidden">Search orders</span>
        <input
          onChange={(event) => setQ(event.target.value)}
          placeholder="Order no., phone, email or name"
          type="search"
          value={q}
        />
      </label>
      {select(
        'Placed',
        'days',
        [
          { value: '1', label: 'Today' },
          { value: '7', label: 'Last 7 days' },
          { value: '30', label: 'Last 30 days' },
          { value: '90', label: 'Last 90 days' },
        ],
        'Any time',
      )}
      {select(
        'Payment',
        'payment',
        [
          { value: 'razorpay', label: 'Paid online' },
          { value: 'cod', label: 'Cash on delivery' },
          { value: 'pending', label: 'Not paid yet' },
          { value: 'refunded', label: 'Refunded' },
        ],
        'Payment: any',
      )}
      {select('State', 'state', states, 'State: any')}
    </div>
  )
}
