/** Request header set by src/proxy.ts with the store host it rewrote for. */
export const STORE_HOST_HEADER = 'x-te-store-host'

/**
 * Set by src/proxy.ts (and only there: an incoming copy is dropped) after it checked a draft
 * preview link's signature. Holds the page id the link is for.
 */
export const PREVIEW_PAGE_HEADER = 'x-te-preview-page'

/** Path prefix of draft previews on a store's domain (src/app/(storefront)/[tenant]/preview). */
export const PREVIEW_PREFIX = '/preview/pages/'
