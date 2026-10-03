# 01 Architecture

## Decision: modular monolith, not microservices

**We build one deployable app (Next.js + Payload) split into strictly bounded internal modules.**

Why:

- Small in-house team. Microservices add network calls, distributed transactions, per-service
  deploys, service discovery and tracing that a small team cannot afford to run well. Industry
  guidance puts the break-even around 50 to 100 engineers.
- Scale target (50 to 500 tenants, ~2k products each, i.e. 100k to 1M products) fits comfortably
  in one well-indexed MongoDB cluster and horizontally scaled stateless app instances.
- Shopify runs on a modular monolith at far larger scale and extracts services only where a
  hotspot proves it. We copy that approach.
- Payload is designed to run inside Next.js as one app; splitting it would fight the framework.

What keeps it a *modular* monolith (and therefore splittable later):

1. Each domain lives in `src/modules/<module>/` with a public `index.ts`. Other code imports only from
   that `index.ts`.
2. Modules own their collections. No module writes another module's collections directly; it calls
   the owner's service function or reacts to an event.
3. Cross-module side effects go through a tiny in-process event bus (`src/lib/events`) backed by
   Payload hooks and the Payload jobs queue for anything slow or retryable.
4. Long-running or bursty work (CSV import, PDF invoices, emails, search sync, webhooks out) runs
   as jobs, so it can move to a separate worker process without code changes.

### When we would extract a service (not now)

| Trigger | Candidate to extract |
|---|---|
| CSV imports or image processing slow down admin/storefront | Worker process running the same codebase in "jobs only" mode |
| Search needs beyond Atlas Search (typo-heavy, synonyms at scale) | Meilisearch/Typesense sidecar fed by jobs |
| A single tenant's traffic dominates | Give that tenant a dedicated DB/cluster (see 04-multi-tenancy.md) |
| Storefront traffic needs independent scaling from admin | Deploy the same image twice with route-based split (storefront vs admin) |

## System context

```
 Shopper (PWA)          Vendor staff / Platform admin
      |                          |
      v                          v
 vendor-domain.com          admin.platform.com
      \                          /
       \----> Vercel Edge / CDN <----/
                    |
              Next.js 16 app  (one codebase, stateless, N instances)
              |- proxy.ts: host -> tenant resolution, locale, security headers
              |- (storefront) routes: RSC pages, per-vendor UI
              |- (payload) routes: /admin, /api (REST), /api/graphql
              |- Payload core + plugins (multi-tenant, ecommerce, seo, form-builder, ...)
              |- src/modules/*: domain logic
              |- src/connectors/*: Razorpay, Shiprocket, WhatsApp, SMS, email
                    |
     +--------------+------------------+-----------------+
     v              v                  v                 v
 MongoDB Atlas   Object storage +   Email (Resend,   Providers (Razorpay,
 (+Atlas Search) image CDN (S3/R2   platform         Shiprocket, WhatsApp,
                 or Cloudinary)     account)         MSG91) via vendor's own keys
                    |
              Jobs runner (Payload jobs queue: same codebase, cron/worker)
```

## Request flow: storefront page

1. Browser requests `https://shop.vendor-a.com/products/basin-mixer`.
2. `src/proxy.ts` (Next 16 replacement for `middleware.ts`) reads the `host` header, looks up the
   tenant in a cached host map (`tenant-domains`), and rewrites (not redirects) to
   `/[tenant]/products/basin-mixer`, served by `src/app/(storefront)/[tenant]/`. The shopper's URL
   never shows the slug. Reserved slugs (`admin`, `api`, `_next`, `platform`...) can't be tenant
   slugs. Unknown host -> 404 page.
   Suspended tenant -> "store unavailable" page.
3. The page (React Server Component) calls the data layer `src/lib/data/*` which uses the Payload
   Local API with `tenant` filter, wrapped in Next cache with tags like `t:<tenantId>:product:<id>`.
4. The page asks `getVendorUI(tenantSlug)` for the component set; missing components fall back to
   `vendors/default`. Vendor folders are dynamically imported so each store ships only its own code.
5. HTML streams back; client islands (cart, search, gallery) hydrate. Cart and checkout call
   `/api/store/*` endpoints.

## Request flow: admin

`admin.platform.com/admin` -> Payload admin. The multi-tenant plugin adds a tenant selector and
filters every list by the user's tenants. Platform admins see all tenants.

## Module map

| Module (`src/modules/`) | Owns collections | Phase |
|---|---|---|
| `tenancy` | tenants, tenant-domains, plans, subscriptions, feature-flags, daily-stats | MVP |
| `identity` | users (staff/admin), customers, customer-sessions, addresses, privacy-requests | MVP |
| `catalog` | products, variants, categories, attribute-sets, brands, merch-collections, product-documents | MVP |
| `inventory` | stock fields on variants, stock-movements | MVP |
| `content` | pages, navigation, banners, site-settings, redirects, media, forms | MVP |
| `cart` | carts (incl. abandoned cart detection and the restore link) | MVP |
| `orders` | orders, order-events, returns, idempotency-keys | MVP |
| `payments` | transactions, refunds, connector-configs (one collection for every kind; the payment module owns it, `src/connectors/core` reads it) | MVP |
| `shipping` | shipping-zones, shipping-rates, shipments, pincodes (platform directory) | MVP |
| `tax-invoicing` | tax-rates (GST), invoices, counters | MVP |
| `notifications` | notification-settings, notification-templates, notification-logs, contact-preferences, offer-campaigns (offer messages) | MVP |
| `promotions` | schemes, coupons, coupon-redemptions; the promotions engine that the cart pricing service calls | MVP |
| `reviews` | reviews, wishlists | MVP |
| `affiliate` | affiliates, referrals (the commission ledger), affiliate-payouts, affiliate-clicks | MVP |
| `import-export` | import-jobs, export-jobs | MVP |
| `enquiries` | enquiries (quote/bulk/product enquiry) | MVP |
| `dealers` | dealers (store/dealer locator) | MVP |
| `search` | (indexes only) | MVP |
| `warranty` | warranty-registrations, service-requests | Phase 2 |
| `b2b` | trade-accounts (dealers, retailers, wholesalers, interior designers), price-lists, quotes | Phase 2 |
| `loyalty` | loyalty-ledger (points per customer) | Phase 2 |
| `spare-parts` | part-diagrams (hotspots linking to products) | Phase 2 |
| `platform-billing` | platform-invoices (vendor subscriptions) | Phase 2 |
| `audit` | audit-logs (writes in MVP; viewer screen Later) | MVP |

How the Phase 1 growth modules connect, without reaching into each other's internals:

- `cart` pricing calls `promotions` (`applyPromotions(tenantId, lines, context)` from its
  `index.ts`) and gets back per-line discounts and the applied scheme and coupon. Checkout stores
  that result on the order; promotions never write orders.
- `promotions` records a coupon use when it hears `order.placed` and releases it on
  `order.cancelled`.
- `affiliate` sets the referral cookie, and at checkout `cart` reads the attribution through
  `affiliate`'s `index.ts`. The commission ledger follows order events (`order.paid`,
  `order.delivered`, `order.cancelled`, `refund.processed`, `return.received`).
- `reviews` hears `order.delivered` to allow verified-purchase reviews and to queue the review
  request through `notifications`.
- `cart` emits `cart.abandoned`; `notifications` sends the reminders and offer messages, so consent,
  caps, quiet hours and logging stay in one place (docs/18).

## Cross-cutting libraries (`src/lib/`)

`tenant/` (resolve, context, guards), `money/` (paise math, formatting), `gst/` (tax split),
`events/` (bus), `cache/` (tag helpers), `crypto/` (secret encryption), `pdf/`, `email/`,
`logger/`, `rate-limit/`, `validation/` (zod schemas shared by API and forms), `i18n/`.

## Architecture rules

- Server-first: data fetching in Server Components or route handlers, never `useEffect` fetch for
  initial page data.
- No direct Mongo driver calls outside `src/lib/db/` (aggregations for reports only).
- Every external call goes through a connector with timeout, retry and circuit-breaker defaults.
- All writes that affect money or stock are idempotent and recorded as events (`order-events`,
  `stock-movements`).
- Config comes from env vars validated at boot (`src/lib/env.ts` with zod).

## ADRs

Record any architectural change as `docs/adr/NNNN-title.md` (context, decision, consequences).
Initial ADRs to write when coding starts: 0001 modular monolith, 0002 single DB with tenant field,
0003 custom auth strategy for customers (after its Sprint 1 spike), and one for the ecommerce
plugin decision (adopt its shapes or own the commerce collections, also a Sprint 1 spike).
Already written: 0001, 0002, 0004 (money in paise) and 0005 (each vendor sends WhatsApp and SMS
from its own accounts).
