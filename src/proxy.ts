import { NextResponse, type NextRequest } from 'next/server'

import { STORE_HOST_HEADER } from '@/storefront/constants'

// Next 16 proxy (docs/01 "Request flow: storefront page"). A request on a store's domain is
// rewritten to /<host>/<path>, served by src/app/(storefront)/[tenant]; the store is looked up
// from the host there, with a cached Local API query (src/lib/data/store.ts), so this file stays
// free of database code. The admin host serves Payload only.

const adminHost = (() => {
  try {
    return new URL(process.env.ADMIN_URL ?? 'http://localhost:3000').hostname
  } catch {
    return 'localhost'
  }
})()

const ADMIN_HOSTS = new Set(
  process.env.NODE_ENV === 'production' ? [adminHost] : [adminHost, 'localhost', '127.0.0.1'],
)

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self), payment=()',
  ...(process.env.NODE_ENV === 'production'
    ? { 'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload' }
    : {}),
}

export function proxy(request: NextRequest) {
  const host = (request.headers.get('host') ?? '').toLowerCase().replace(/:\d+$/, '')
  const { pathname } = request.nextUrl

  if (ADMIN_HOSTS.has(host)) {
    if (pathname === '/') return NextResponse.redirect(new URL('/admin', request.url))
    return NextResponse.next()
  }

  const url = request.nextUrl.clone()
  // Per-store sitemap: a plain route (a folder named sitemap.xml would be built as a static file)
  url.pathname = pathname === '/sitemap.xml' ? `/${host}/store-sitemap` : `/${host}${pathname}`
  const headers = new Headers(request.headers)
  headers.set(STORE_HOST_HEADER, host)
  const response = NextResponse.rewrite(url, { request: { headers } })
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(name, value)
  return response
}

export const config = {
  // Never rewrite the admin, the API, Next's own files or static files (robots and sitemap are
  // per store, so they are rewritten)
  matcher: [
    '/((?!_next/|api/|admin(?:/|$)|favicon\\.|.*\\.(?:svg|png|jpe?g|webp|avif|gif|ico|css|js|map|woff2?|txt)$).*)',
    '/robots.txt',
  ],
}
