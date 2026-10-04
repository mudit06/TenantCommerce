import { NextResponse, type NextRequest } from 'next/server'

import { verifyPreviewToken } from '@/lib/preview-token'
import { PREVIEW_PAGE_HEADER, PREVIEW_PREFIX, STORE_HOST_HEADER } from '@/storefront/constants'

// Next 16 proxy (docs/01 "Request flow: storefront page"). A request on a store's domain is
// rewritten to /<host>/<path>, served by src/app/(storefront)/[tenant]; the store is looked up
// from the host there, with a cached Local API query (src/lib/data/store.ts), so this file stays
// free of database code. The admin host serves Payload only.

const adminUrl = (() => {
  try {
    return new URL(process.env.ADMIN_URL ?? 'http://localhost:3000')
  } catch {
    return new URL('http://localhost:3000')
  }
})()
const adminHost = adminUrl.hostname

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

/**
 * A draft preview link (docs/screens Page builder rule 4): the page id when its signature is
 * genuine and current. The page still checks the store; this only decides the headers.
 */
async function previewPageId(request: NextRequest): Promise<string | null> {
  const { pathname, searchParams } = request.nextUrl
  if (!pathname.startsWith(PREVIEW_PREFIX)) return null
  const claims = await verifyPreviewToken(searchParams.get('token'), process.env.PAYLOAD_SECRET)
  const pageId = decodeURIComponent(pathname.slice(PREVIEW_PREFIX.length).split('/')[0] ?? '')
  return claims && claims.pageId === pageId ? pageId : null
}

export async function proxy(request: NextRequest) {
  const host = (request.headers.get('host') ?? '').toLowerCase().replace(/:\d+$/, '')
  const { pathname } = request.nextUrl

  if (ADMIN_HOSTS.has(host)) {
    if (pathname === '/') return NextResponse.redirect(new URL('/admin', request.url))
    // Our internal headers are only ever set below, for a store's own domain: a copy sent by a
    // browser to the admin host must not open a store's pages there
    const headers = new Headers(request.headers)
    headers.delete(STORE_HOST_HEADER)
    headers.delete(PREVIEW_PAGE_HEADER)
    return NextResponse.next({ request: { headers } })
  }

  const url = request.nextUrl.clone()
  // Per-store sitemap: a plain route (a folder named sitemap.xml would be built as a static file)
  url.pathname = pathname === '/sitemap.xml' ? `/${host}/store-sitemap` : `/${host}${pathname}`
  const headers = new Headers(request.headers)
  headers.set(STORE_HOST_HEADER, host)
  headers.delete(PREVIEW_PAGE_HEADER)
  const previewing = await previewPageId(request)
  if (previewing) headers.set(PREVIEW_PAGE_HEADER, previewing)
  const response = NextResponse.rewrite(url, { request: { headers } })
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) response.headers.set(name, value)
  if (previewing) {
    // The editor shows the preview in a frame: only our admin may frame it, and it is never cached
    response.headers.delete('X-Frame-Options')
    response.headers.set('Content-Security-Policy', `frame-ancestors 'self' ${adminUrl.origin}`)
    response.headers.set('Cache-Control', 'private, no-store')
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  }
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
