/** Request header set by src/proxy.ts with the store host it rewrote for. */
export const STORE_HOST_HEADER = 'x-te-store-host'

/**
 * Set by src/proxy.ts (and only there: an incoming copy is dropped) after it checked a draft
 * preview link's signature. Holds the page id the link is for.
 */
export const PREVIEW_PAGE_HEADER = 'x-te-preview-page'

/** Path prefix of draft previews on a store's domain (`/preview/pages/<page id>?token=...`). */
export const PREVIEW_PREFIX = '/preview/pages/'

/**
 * Where src/proxy.ts sends a preview link once its signature checks out:
 * `/store-preview/<host>/<page id>`, served by src/app/(preview). Its own route, with its own
 * layout, so the shoppers' pages stay free of request reads and can be cached.
 */
export const PREVIEW_ROUTE = '/store-preview'

/**
 * Scheme of public addresses. Production always sits behind HTTPS (Vercel, or Caddy on a server,
 * docs/19), where the app itself sees plain http and its own address in `request.url`, so links
 * and redirects are built from this and the Host header instead.
 */
export const PUBLIC_PROTOCOL = process.env.NODE_ENV === 'production' ? 'https' : 'http'
