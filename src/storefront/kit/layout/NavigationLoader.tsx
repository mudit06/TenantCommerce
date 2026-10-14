'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { LoaderMark } from '../Loader'

const START = 'store:navigate'

/** Call just before `router.push` or `router.replace`, so the loader shows while the next page renders. */
export function startNavigation() {
  window.dispatchEvent(new Event(START))
}

/** A click that leaves this page for another page of the store (not a new tab, hash or button). */
function opensAnotherPage(event: MouseEvent) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false
  }
  // A button inside a card's link (wishlist heart, quick add) keeps the shopper on the page
  const target = (event.target as Element | null)?.closest?.('a[href], button')
  if (!(target instanceof HTMLAnchorElement)) return false
  if ((target.target && target.target !== '_self') || target.hasAttribute('download')) return false
  const to = new URL(target.href)
  const here = window.location
  return to.origin === here.origin && (to.pathname !== here.pathname || to.search !== here.search)
}

/**
 * The page loader (docs/10 "Loaders"): a thin bar in the store colour at the top at once, and the
 * store's loader in the middle if the next page takes longer than a moment (globals.css delays it,
 * so quick pages never flash it). It runs only while moving between pages: the first load of a
 * page is the server's HTML, so 404s and permanent redirects keep their real status codes, which a
 * `loading.tsx` would turn into 200s.
 */
export function NavigationLoader() {
  const here = `${usePathname()}?${useSearchParams().toString()}`
  // The page the shopper was on when they set off; the loader shows until the address moves on
  const [from, setFrom] = useState<string | null>(null)
  const [seen, setSeen] = useState(here)
  if (seen !== here) {
    setSeen(here)
    setFrom(null)
  }
  const loading = from !== null

  useEffect(() => {
    const start = () => setFrom(here)
    const onClick = (event: MouseEvent) => {
      if (opensAnotherPage(event)) start()
    }
    // A plain search or filter form loads its results as a new page
    const onSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement
      if (!event.defaultPrevented && form.method === 'get') start()
    }
    // Back to a page the browser kept in memory
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) setFrom(null)
    }
    window.addEventListener(START, start)
    document.addEventListener('click', onClick)
    document.addEventListener('submit', onSubmit)
    window.addEventListener('pageshow', onShow)
    return () => {
      window.removeEventListener(START, start)
      document.removeEventListener('click', onClick)
      document.removeEventListener('submit', onSubmit)
      window.removeEventListener('pageshow', onShow)
    }
  }, [here])

  // Never spin for ever: a navigation that was stopped or failed lets go after 15 seconds
  useEffect(() => {
    if (!loading) return
    const timer = setTimeout(() => setFrom(null), 15_000)
    return () => clearTimeout(timer)
  }, [loading])

  return (
    <div aria-live="polite" role="status">
      {loading ? (
        <>
          <div className="page-bar fixed inset-x-0 top-0 z-[60] h-[3px] overflow-hidden" />
          <div className="page-loader pointer-events-none fixed top-1/2 left-1/2 z-[60] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 rounded-card bg-surface/95 px-6 py-4 text-sm text-ink-soft shadow-lg ring-1 ring-black/5">
            <LoaderMark />
            <span>Loading…</span>
          </div>
        </>
      ) : null}
    </div>
  )
}
