'use client'

import { useState } from 'react'

import { CopyCode } from '../shop/CopyCode'

/**
 * "Link to any page" (docs/screens storefront `st-affiliate-dash`): paste a page of this store
 * and get the same page with the affiliate's referral.
 */
export function LinkBuilder({ origin, code }: { origin: string; code: string }) {
  const [page, setPage] = useState('')
  let path: string | null = null
  try {
    const url = new URL(page.trim(), origin)
    if (url.origin === origin && url.pathname !== '/') path = `${url.pathname}${url.search}`
  } catch {
    path = null
  }
  const link = path ? `${origin}/r/${code}?to=${encodeURIComponent(path)}` : null
  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold" htmlFor="aff-page">
        Link to any page
      </label>
      <input
        className="h-11 w-full rounded-card border border-line bg-white px-3 text-sm outline-none focus:border-ink/60"
        id="aff-page"
        inputMode="url"
        onChange={(e) => setPage(e.target.value)}
        placeholder={`${origin}/products/…`}
        value={page}
      />
      {link ? (
        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 break-all rounded bg-surface-alt px-2 py-1 text-xs">{link}</code>
          <CopyCode code={link} />
        </div>
      ) : page ? (
        <p className="text-xs text-ink-soft">Paste a page of this store.</p>
      ) : null}
    </div>
  )
}
