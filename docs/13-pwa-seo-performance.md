# 13 PWA, SEO, performance

## PWA (Serwist)

- **Manifest per tenant**: route `app/(storefront)/[tenant]/manifest.webmanifest/route.ts` returns
  name, short_name, icons (from site-settings `pwaIcon`, 192/512 + maskable), `theme_color`,
  `background_color`, `start_url: '/'`, `display: 'standalone'`, `scope: '/'`.
- **Service worker** (`src/pwa/sw.ts`): precache app shell; runtime caching:
  - images: CacheFirst, 30 days, max 300 entries
  - Next static assets: CacheFirst (immutable)
  - product/category HTML: NetworkFirst with 3 s timeout, fallback to cache
  - `/api/store/v1/cart`, checkout, account, auth, wishlist, affiliate: **NetworkOnly** (never
    cache personal data)
  - offer prices and badges come with the product HTML, which is NetworkFirst, so a cached page
    seen offline may show an ended offer; the cart always shows the server's current price
  - offline fallback page `/offline` with the store logo and recently viewed products
- Service worker scope is per origin, and each tenant has its own origin, so caches never mix
  between stores. On the shared `*.platform` subdomains the origin still differs per tenant.
- Install prompt: custom "Add to home screen" banner after 2 visits (respect dismissal).
- **As built (9 October 2026, ADR 0007):** `public/sw.js` (hand-written, no Serwist) registered
  from the storefront layout in production only. On install it saves `/offline` and the script
  and style files that page needs. Pages are NetworkFirst (3 s) into a 50-page cache; an unsaved
  page redirects to `/offline?from=<path>` (the app's router needs the address to match the
  page). `/_next/static` and images are CacheFirst, matched ignoring `Vary` (the colour-scheme
  hint). Private paths (`/api/` except media files, `/admin`, `/cart`, `/checkout`, `/account`,
  `/wishlist`, `/affiliate`, `/review/`, `/r/`, `/u/`, `/unsubscribe`, `/t/`, `/preview`) always
  use the network. Bump `VERSION` in the file when its rules change. The manifest is
  `/manifest.webmanifest` and icons `/app-icon/180|192|512` (sharp, from the store's App icon or
  logo, else its initials). Recently viewed products are kept on the device (`te_recent`).
- Push notifications (Phase 2): Web Push with VAPID keys per platform; subscription stored per
  customer per tenant. Push is a fourth channel of the same notification engine (docs/18), so it
  follows the same milestones, dedupe and opt-outs, and offers over push need offer consent.
- Wishlist works offline for viewing (product ids on the device); adding to it offline queues
  until the connection is back.

## SEO

- Server-rendered pages (RSC) with `generateMetadata` per page using tenant SEO defaults.
- Canonical URLs on the tenant's primary domain; variants via query param are canonicalized.
- Per-tenant `robots.txt` and `sitemap.xml` (route handlers): products, categories, pages, with
  `lastmod`. Split sitemaps at 10k URLs.
- Structured data (JSON-LD): `Organization`, `WebSite` + `SearchAction`, `Product` + `Offer`
  (price, availability, priceCurrency INR, `hasMerchantReturnPolicy`, `shippingDetails`; during a
  scheme the scheme price with `priceValidUntil` = the scheme's end), `AggregateRating` and
  `Review` from published, verified reviews only (never from testimonials typed by staff),
  `BreadcrumbList`, `FAQPage`, `LocalBusiness` for dealers/showrooms.
- `/offers` and `/offers/<slug>` are indexable while a scheme is live; an ended scheme's page stays
  up with "This offer has ended" and links to live offers, so shared links don't break.
- `/r/<code>` redirects with `noindex` and a `rel=canonical` to the target page, so referral links
  don't create duplicate pages.
- Clean URLs: `/products/<slug>`, `/c/<parent>/<child>`, `/pages/<slug>` (or vendor-chosen short
  routes like `/about` mapped to pages).
- Redirects collection for migrations from vendors' old sites.
- `hreflang` when multilingual (Phase 2), with locale prefix `/hi/...`.
- Google Merchant Center product feed per tenant (Phase 2): `/feeds/google.xml`.

## Performance budgets (mobile, 4G)

| Metric | Budget |
|---|---|
| LCP | < 2.5 s (aim 1.8 s) |
| INP | < 200 ms |
| CLS | < 0.1 |
| JS per route (gzipped, first load) | < 170 KB |
| Lighthouse mobile performance | ≥ 90 on home, listing, product |

How:
- RSC by default; `'use client'` only for interactive islands.
- `next/image` with explicit sizes, priority on LCP image, AVIF/WebP via CDN.
- `next/font` with `display: swap`, max 2 font families.
- Third-party scripts (analytics, chat) with `next/script` `lazyOnload` and only after consent.
- Caching: product/category/page data via `unstable_cache`/`use cache` with tenant tags and
  on-demand revalidation from Payload hooks; ISR-style static generation for top pages.
  As built (14 October 2026):
  - Home, product, CMS page, offers, downloads, contact, category index and offline pages export
    `generateStaticParams = async () => []`: each store's page is rendered on its first visit and
    then served from the cache (`s-maxage` from its data's shortest expiry, 60 s today), cleared by
    the same tags as the data. They and the `[tenant]` layout must not read the request
    (`headers()`, `cookies()`, `searchParams`): pass the store down (`ProductCard` takes `tenantId`)
    instead. Listings with filters (`/c/...`), search, cart, checkout and account stay dynamic.
  - One page render is about 35 ms of server CPU, so an uncached page tops out near 30 requests a
    second per Node process; a cached one costs a few milliseconds, or nothing behind a CDN.
  - Data cache entries over 2 MB are silently never cached. Cached lists stay lean: `populate` only
    the fields pages read (`src/lib/data/populate.ts`), the category tree is cached flat, category
    lists without photos (the cards on screen get them), and search ranks a small index (title,
    model number, keywords) before reading cards for the best matches. Rough limits per entry: about
    3,000 products in one category, 12,000 in a store's search, 1,400 categories. Past those, move
    listing and search to Atlas Search (docs/12).
  - Loaders that every card or block calls (`getStoreByHost`, `getStoreContent`, `getSellingInfo`,
    `getCategoryTree`, `getStoreOffers`) are also memoised per request with React `cache`.
  - Media served by the app (local disk, or a bucket without `MEDIA_PUBLIC_URL`) is sent with
    `Cache-Control: public, max-age=86400, stale-while-revalidate=604800`.
- Admin (vendor CMS and platform panel), as built 15 October 2026. Admin pages are rendered for
  each request, so their cost is server CPU and database round trips:
  - Payload works out every collection's permissions (create, read, update, delete, versions) on
    every admin page. An access function that reads the database runs about sixty times per page:
    memoise per request instead (`featureGatedAccess` reads the stores' features once per request,
    `src/modules/tenancy/services/featureAccess.ts`).
  - Never create an `Intl` formatter per row: one costs about 0.1 ms to create and a microsecond to
    use. `src/lib/dates.ts` and `formatINR` keep one per shape; use them, or a module-level
    formatter, rather than `new Intl...` or `toLocaleString(locale, options)` in a loop.
  - Under our own list screens Payload still loads its default list (whole documents, products with
    their variants joined); collections with a custom list view use the list select API so it loads
    only its columns (`leanDefaultList`, `src/payload.config.ts`).
  - Helpers several components ask for on one page are memoised with React `cache` (current store,
    new enquiry count, the store's category tree).
  - Measured on one production process (10 concurrent requests, small catalogue): CMS dashboard
    1.8 -> 5.9 pages a second, products list 2.6 -> 8.7, product form 2.7 -> 9.7, platform dashboard
    5.3 -> 10.4; storefront category listing 7.8 -> 34 and search 13 -> 33 (each card's price
    made a new formatter).
  - `next dev` is not a speed test: admin pages take 1.5 to 3 s there against about 0.1 s in a
    production build (React's development build records a stack trace for every promise a Server
    Component creates, and Payload creates thousands per page), and each route compiles on its
    first visit. Judge speed with `pnpm build && pnpm start`.
- Hosting: the app server and Atlas must be in the same region (Mumbai, docs/19): an admin page
  makes 20 to 90 database calls, so 200 ms of distance between them costs seconds per page. With
  object storage, set `MEDIA_PUBLIC_URL` so photos come from the CDN; otherwise every photo is a
  request to the app.
- DB: lean projections (`select`), `depth: 0/1`, compound indexes, no N+1 relationship loading.
- Lazy-load below-the-fold blocks and carousels.
