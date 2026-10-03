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
- DB: lean projections (`select`), `depth: 0/1`, compound indexes, no N+1 relationship loading.
- Lazy-load below-the-fold blocks and carousels.
