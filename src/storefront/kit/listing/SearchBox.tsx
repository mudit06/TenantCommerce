'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'

import type { Suggestions } from '@/app/(storefront)/[tenant]/search/suggest/route'

import { SearchIcon } from '../icons'

const RECENT_KEY = 'te_recent_searches'

const readRecent = (): string[] => {
  try {
    const value = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? '[]') as unknown
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

/** Keeps the last six searches on this device only (docs/screens `st-search` rule 2). */
export const rememberSearch = (q: string) => {
  const term = q.trim()
  if (term.length < 2) return
  try {
    const next = [term, ...readRecent().filter((v) => v.toLowerCase() !== term.toLowerCase())]
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next.slice(0, 6)))
  } catch {
    // Private mode: search still works
  }
}

/**
 * Search box with instant results (docs/screens storefront `st-search`): products with model
 * numbers first, matching categories, recent searches; Enter opens the full results page.
 */
export function SearchBox({
  defaultValue = '',
  variant = 'header',
  autoFocus = false,
}: {
  defaultValue?: string
  variant?: 'header' | 'page'
  autoFocus?: boolean
}) {
  const id = useId()
  const router = useRouter()
  const [q, setQ] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<Suggestions | null>(null)
  const [recent, setRecent] = useState<string[]>([])
  const [active, setActive] = useState(-1)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      fetch(`/search/suggest?q=${encodeURIComponent(term)}`, { signal: controller.signal })
        .then((response) => (response.ok ? (response.json() as Promise<Suggestions>) : null))
        .then((data) => {
          setResults(data)
          setActive(-1)
        })
        .catch(() => undefined)
    }, 150)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [q])

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const term = q.trim()
  const showResults = term.length >= 2 && results
  const options: { href: string; label: string }[] = showResults
    ? [
        ...results.products.map((p) => ({ href: p.href, label: p.title })),
        ...results.categories.map((c) => ({ href: c.href, label: c.name })),
        { href: `/search?q=${encodeURIComponent(term)}`, label: `See all results for “${term}”` },
      ]
    : recent.map((r) => ({ href: `/search?q=${encodeURIComponent(r)}`, label: r }))

  const go = (href: string, searched?: string) => {
    if (searched) rememberSearch(searched)
    setOpen(false)
    router.push(href)
  }
  const optionId = (i: number) => `${id}-opt-${i}`
  const listOpen = open && options.length > 0

  const optionClass = (i: number) =>
    `flex items-center gap-3 px-3 py-2 text-sm ${i === active ? 'bg-surface-alt' : 'hover:bg-surface-alt'}`
  // Each option's place in `options`: products, then categories, then "See all"
  const productCount = showResults ? results.products.length : 0
  const categoryCount = showResults ? results.categories.length : 0

  return (
    <div className="relative" ref={box}>
      <form
        action="/search"
        onSubmit={(event) => {
          event.preventDefault()
          if (active >= 0 && options[active]) return go(options[active].href, term)
          if (term.length >= 1) go(`/search?q=${encodeURIComponent(term)}`, term)
        }}
        role="search"
      >
        <label className="sr-only" htmlFor={`${id}-q`}>
          Search products or model number
        </label>
        <div
          className={`flex items-center rounded-card border border-line px-3 focus-within:border-ink/40 ${variant === 'header' ? 'bg-surface-alt' : 'bg-white'}`}
        >
          <SearchIcon className="shrink-0 text-ink-soft" />
          <input
            aria-activedescendant={active >= 0 ? optionId(active) : undefined}
            aria-autocomplete="list"
            aria-controls={`${id}-list`}
            aria-expanded={listOpen}
            autoComplete="off"
            autoFocus={autoFocus}
            className={`bg-transparent px-2 text-sm outline-none placeholder:text-ink-soft ${variant === 'header' ? 'h-10 w-36 xl:w-44 2xl:w-56' : 'h-12 w-full text-base'}`}
            id={`${id}-q`}
            name="q"
            onChange={(event) => {
              setQ(event.target.value)
              setOpen(true)
            }}
            onFocus={() => {
              setRecent(readRecent())
              setOpen(true)
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                setOpen(true)
                setActive((a) => Math.min(options.length - 1, a + 1))
              } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                setActive((a) => Math.max(-1, a - 1))
              } else if (event.key === 'Escape') {
                setOpen(false)
              }
            }}
            placeholder={variant === 'header' ? 'Search or model no.' : 'Product name or model number'}
            role="combobox"
            type="search"
            value={q}
          />
        </div>
      </form>
      {listOpen ? (
        <div
          className={`absolute z-50 mt-1 max-h-[70dvh] overflow-y-auto rounded-card border border-line bg-white py-2 shadow-xl ${variant === 'header' ? 'right-0 w-[min(26rem,90vw)]' : 'inset-x-0'}`}
          id={`${id}-list`}
          role="listbox"
        >
          {showResults ? (
            <>
              {results.products.length ? (
                <p className="px-3 pt-1 pb-1 text-[11px] font-semibold tracking-wider text-ink-soft uppercase">
                  Products
                </p>
              ) : null}
              {results.products.map((product, i) => {
                return (
                  <Link
                    aria-selected={i === active}
                    className={optionClass(i)}
                    href={product.href}
                    id={optionId(i)}
                    key={product.href}
                    onClick={() => rememberSearch(term)}
                    role="option"
                  >
                    <span className="size-10 shrink-0 overflow-hidden rounded border border-line bg-surface-alt">
                      {product.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt="" className="size-full object-contain" src={product.image} />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">{product.title}</span>
                      <span className="block text-xs text-ink-soft">{product.modelNumber}</span>
                    </span>
                    {product.price ? (
                      <span className="text-sm font-semibold">{product.price}</span>
                    ) : null}
                  </Link>
                )
              })}
              {results.categories.length ? (
                <p className="px-3 pt-3 pb-1 text-[11px] font-semibold tracking-wider text-ink-soft uppercase">
                  Categories
                </p>
              ) : null}
              {results.categories.map((category, j) => {
                const i = productCount + j
                return (
                  <Link
                    aria-selected={i === active}
                    className={optionClass(i)}
                    href={category.href}
                    id={optionId(i)}
                    key={category.href}
                    onClick={() => rememberSearch(term)}
                    role="option"
                  >
                    {category.name}
                  </Link>
                )
              })}
              {results.products.length === 0 && results.categories.length === 0 ? (
                <p className="px-3 py-2 text-sm text-ink-soft">
                  Nothing matches yet. Try the model number printed on the box.
                </p>
              ) : null}
              {(() => {
                const i = productCount + categoryCount
                return (
                  <Link
                    aria-selected={i === active}
                    className={`${optionClass(i)} mt-1 border-t border-line font-semibold text-accent`}
                    href={`/search?q=${encodeURIComponent(term)}`}
                    id={optionId(i)}
                    onClick={() => rememberSearch(term)}
                    role="option"
                  >
                    See all results for “{term}”
                  </Link>
                )
              })()}
            </>
          ) : (
            <>
              <p className="px-3 pt-1 pb-1 text-[11px] font-semibold tracking-wider text-ink-soft uppercase">
                Recent searches
              </p>
              {recent.map((r, i) => {
                return (
                  <Link
                    aria-selected={i === active}
                    className={optionClass(i)}
                    href={`/search?q=${encodeURIComponent(r)}`}
                    id={optionId(i)}
                    key={r}
                    onClick={() => rememberSearch(r)}
                    role="option"
                  >
                    <SearchIcon className="text-ink-soft" height={16} width={16} /> {r}
                  </Link>
                )
              })}
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
