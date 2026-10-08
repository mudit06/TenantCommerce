'use client'

import { useSyncExternalStore } from 'react'

import { buttonClass } from '../ui'
import { readRecent, type RecentProduct } from './recent'

const empty: RecentProduct[] = []
let snapshot: RecentProduct[] | null = null
const subscribe = () => () => {}
const getSnapshot = () => (snapshot ??= readRecent())

/** The page the shopper was opening (`?from=`, a path on this store only) */
const fromPath = () => {
  const from = new URLSearchParams(location.search).get('from') ?? '/'
  return from.startsWith('/') && !from.startsWith('//') ? from : '/'
}

/**
 * "You're offline" with the products viewed recently on this device (`st-offline`). The service
 * worker saves this page's script files when it installs, so it works with no connection.
 */
export function OfflineView() {
  const recent = useSyncExternalStore(subscribe, getSnapshot, () => empty)
  const retry = useSyncExternalStore(subscribe, fromPath, () => '/')
  return (
    <div className="space-y-6 text-center">
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-bold">You’re offline</h1>
        <p className="text-ink-soft">
          Check your connection. Pages you opened recently still work.
        </p>
      </div>
      <a className={buttonClass('primary')} href={retry}>
        Try again
      </a>
      {recent.length ? (
        <section className="text-left">
          <h2 className="mb-2 font-semibold">Recently viewed</h2>
          <ul className="divide-y divide-line rounded-card border border-line bg-white">
            {recent.map((r) => (
              <li key={r.path}>
                <a className="flex items-center gap-3 p-3" href={r.path}>
                  {r.image ? (
                    // A plain img: the image optimiser isn't reachable offline
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt=""
                      className="size-12 rounded object-contain"
                      // Not saved for offline (pages load images through the optimiser): hide it
                      onError={(e) => {
                        e.currentTarget.hidden = true
                      }}
                      src={r.image}
                    />
                  ) : null}
                  <span className="min-w-0 flex-1 text-sm font-semibold">{r.title}</span>
                  {r.price ? <span className="text-sm">{r.price}</span> : null}
                  <span aria-hidden>›</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
