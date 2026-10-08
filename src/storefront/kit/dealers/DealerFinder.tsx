'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { buttonClass } from '../ui'

export type DealerCard = {
  id: string
  name: string
  typeLabel: string
  type: string
  address: string
  hours: string | null
  distance: string | null
  callHref: string
  whatsappHref: string | null
  directionsHref: string
  mapSrc: string | null
}

const inputClass =
  'h-11 w-full rounded-card border border-line bg-white px-3 text-sm outline-none focus:border-ink/60'

/** Search, "Use my location", type filter and the list or map (docs/screens storefront `st-dealers`). */
export function DealerFinder({
  dealers,
  query,
  types,
  note,
}: {
  dealers: DealerCard[]
  query: string
  types: { value: string; label: string }[]
  note: string | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [text, setText] = useState(query)
  const [type, setType] = useState('all')
  const [view, setView] = useState<'list' | 'map'>('list')
  const [chosen, setChosen] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState<string | null>(null)

  const go = (next: Record<string, string | null>) => {
    const search = new URLSearchParams(params.toString())
    for (const [k, v] of Object.entries(next)) {
      if (v) search.set(k, v)
      else search.delete(k)
    }
    router.push(`${pathname}?${search}`, { scroll: false })
  }

  const useLocation = () => {
    if (!('geolocation' in navigator)) {
      setLocError('This browser can’t share its location. Type your pincode instead.')
      return
    }
    setLocating(true)
    setLocError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        go({
          lat: pos.coords.latitude.toFixed(4),
          lng: pos.coords.longitude.toFixed(4),
          near: null,
        })
      },
      () => {
        setLocating(false)
        setLocError('Location is off. Type your pincode or city instead.')
      },
      { timeout: 10_000, maximumAge: 600_000 },
    )
  }

  const shown = dealers.filter((d) => type === 'all' || d.type === type)
  const onMap = shown.find((d) => d.id === chosen && d.mapSrc) ?? shown.find((d) => d.mapSrc)

  return (
    <div className="space-y-5">
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault()
          go({ near: text.trim() || null, lat: null, lng: null })
        }}
        role="search"
      >
        <label className="sr-only" htmlFor="dealer-near">
          Pincode or city
        </label>
        <input
          className={inputClass}
          id="dealer-near"
          inputMode="search"
          onChange={(e) => setText(e.target.value)}
          placeholder="Pincode or city"
          value={text}
        />
        <div className="flex gap-2">
          <button className={buttonClass('primary')} type="submit">
            Search
          </button>
          <button
            className={buttonClass('outline', 'whitespace-nowrap')}
            disabled={locating}
            onClick={useLocation}
            type="button"
          >
            {locating ? 'Finding you…' : 'Use my location'}
          </button>
        </div>
      </form>
      {locError ? <p className="text-sm text-red-700">{locError}</p> : null}
      {note ? <p className="text-sm text-ink-soft">{note}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div aria-label="Type" className="flex flex-wrap gap-2" role="group">
          {[{ value: 'all', label: 'All' }, ...types].map((t) => (
            <button
              aria-pressed={type === t.value}
              className={`min-h-9 rounded-full border px-3 text-sm ${type === t.value ? 'border-ink bg-ink text-white' : 'border-line bg-white'}`}
              key={t.value}
              onClick={() => setType(t.value)}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </div>
        <div aria-label="View" className="flex rounded-card border border-line" role="group">
          {(['list', 'map'] as const).map((v) => (
            <button
              aria-pressed={view === v}
              className={`min-h-9 px-4 text-sm ${view === v ? 'bg-surface-alt font-semibold' : ''}`}
              key={v}
              onClick={() => setView(v)}
              type="button"
            >
              {v === 'list' ? 'List' : 'Map'}
            </button>
          ))}
        </div>
      </div>

      {view === 'map' ? (
        onMap?.mapSrc ? (
          <div className="space-y-3">
            <iframe
              className="h-80 w-full rounded-card border border-line sm:h-[28rem]"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={onMap.mapSrc}
              title={`Map: ${onMap.name}`}
            />
            <div className="flex flex-wrap gap-2">
              {shown
                .filter((d) => d.mapSrc)
                .map((d) => (
                  <button
                    aria-pressed={d.id === onMap.id}
                    className={`min-h-9 rounded-full border px-3 text-sm ${d.id === onMap.id ? 'border-ink' : 'border-line'}`}
                    key={d.id}
                    onClick={() => setChosen(d.id)}
                    type="button"
                  >
                    {d.name}
                    {d.distance ? ` · ${d.distance}` : ''}
                  </button>
                ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-ink-soft">These dealers have no map position yet.</p>
        )
      ) : shown.length ? (
        <ul className="divide-y divide-line rounded-card border border-line bg-white">
          {shown.map((d) => (
            <li className="space-y-2 p-4" key={d.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p>
                  <span className="font-semibold">{d.name}</span>{' '}
                  <span className="text-sm text-ink-soft">{d.typeLabel}</span>
                </p>
                {d.distance ? <span className="text-sm font-semibold">{d.distance}</span> : null}
              </div>
              <p className="text-sm text-ink-soft">{d.address}</p>
              {d.hours ? <p className="text-xs text-ink-soft">{d.hours}</p> : null}
              <div className="flex flex-wrap gap-2">
                <a className={buttonClass('outline', 'min-h-9 px-3')} href={d.callHref}>
                  Call
                </a>
                {d.whatsappHref ? (
                  <a
                    className={buttonClass('outline', 'min-h-9 px-3')}
                    href={d.whatsappHref}
                    rel="noopener"
                    target="_blank"
                  >
                    WhatsApp
                  </a>
                ) : null}
                <a
                  className={buttonClass('outline', 'min-h-9 px-3')}
                  href={d.directionsHref}
                  rel="noopener"
                  target="_blank"
                >
                  Directions
                </a>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-soft">
          No {types.find((t) => t.value === type)?.label.toLowerCase()} here yet.
        </p>
      )}
      <p className="text-xs text-ink-soft">Directions open Google Maps.</p>
    </div>
  )
}
