'use client'

import { useState } from 'react'

import { FileIcon } from '../icons'
import { buttonClass } from '../ui'

export type DownloadItem = {
  id: string
  title: string
  type: string
  href: string
  meta: string
  search: string
}

/** Tabs by kind, search by product or model number (docs/screens storefront `st-downloads`). */
export function DownloadsList({
  items,
  tabs,
}: {
  items: DownloadItem[]
  tabs: { value: string; label: string }[]
}) {
  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const shown = items.filter(
    (i) => (tab === 'all' || i.type === tab) && (!needle || i.search.includes(needle)),
  )
  return (
    <div className="space-y-4">
      <div aria-label="Kind" className="flex flex-wrap gap-2" role="group">
        {[{ value: 'all', label: 'All' }, ...tabs].map((t) => (
          <button
            aria-pressed={tab === t.value}
            className={`min-h-9 rounded-full border px-3 text-sm ${tab === t.value ? 'border-ink bg-ink text-white' : 'border-line bg-white'}`}
            key={t.value}
            onClick={() => setTab(t.value)}
            type="button"
          >
            {t.label}
          </button>
        ))}
      </div>
      <label className="sr-only" htmlFor="downloads-q">
        Search by product or model no.
      </label>
      <input
        className="h-11 w-full rounded-card border border-line bg-white px-3 text-sm outline-none focus:border-ink/60"
        id="downloads-q"
        inputMode="search"
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by product or model no."
        type="search"
        value={q}
      />
      {shown.length ? (
        <ul className="divide-y divide-line rounded-card border border-line bg-white">
          {shown.map((i) => (
            <li className="flex items-center gap-3 p-4" key={i.id}>
              <FileIcon className="shrink-0 text-accent" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{i.title}</p>
                <p className="text-xs text-ink-soft">{i.meta}</p>
              </div>
              <a
                aria-label={`Download ${i.title}`}
                className={buttonClass('outline', 'min-h-9 shrink-0 px-3')}
                download
                href={i.href}
                rel="noopener"
                target="_blank"
              >
                Download
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-soft">Nothing matches. Try another product or model no.</p>
      )}
    </div>
  )
}
