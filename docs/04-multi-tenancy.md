# 04 Multi-tenancy

## Model: shared database, tenant column (pool model)

One MongoDB database. Every tenant-owned document has `tenant: ObjectId` (added by
`@payloadcms/plugin-multi-tenant`). This is the cheapest model to run and what Payload supports
natively. Isolation is enforced in code at three layers (below), and proven by tests.

### Collections by scope

| Scope | Collections |
|---|---|
| Platform (no tenant field) | tenants, tenant-domains, plans, subscriptions, platform-invoices, pincodes, platform-settings (global), users (has `tenants[]` array instead) |
| Tenant-scoped (has `tenant`) | everything else: products, variants, categories, attribute-sets, brands, merch-collections, product-documents, stock-movements, media, pages, navigation, banners, site-settings, customers, customer-sessions, addresses, privacy-requests, carts, orders, order-events, transactions, refunds, returns, invoices, shipments, shipping-zones, shipping-rates, tax-rates, connector-configs, feature-flags, dealers, enquiries, schemes, coupons, coupon-redemptions, reviews, wishlists, affiliates, referrals, affiliate-payouts, affiliate-clicks, offer-campaigns, import-jobs, counters, idempotency-keys, daily-stats, audit-logs, notification-settings, notification-templates, notification-logs, contact-preferences, redirects, forms; Phase 2: warranty-registrations, service-requests, part-diagrams, trade-accounts, price-lists, quotes, loyalty-ledger |

`site-settings`, `navigation` and `notification-settings` are per-tenant singleton collections
(plugin option `isGlobal: true`), **not** Payload globals, because Payload globals are
platform-wide: one global would be shared by every store. Their admin route stays
`/admin/collections/<slug>` (the plugin opens the current tenant's single document).

## Tenant resolution

| Surface | How tenant is known |
|---|---|
| Storefront page | `proxy.ts` rewrites to `/<host>/...`; the `[tenant]` layout calls `getStoreContext(host)`: `getStoreByHost` (cached `tenant-domains` lookup) and checks the `x-te-store-host` header the proxy set. Data helpers in `src/lib/data` take the tenant id first and cache under `t:<tenantId>:store`, cleared by `withStorefrontRevalidation` hooks on every store collection |
| Storefront API (`/api/store/*`) | Same host lookup inside the endpoint via `resolveTenantFromRequest(req)`. Never trust a `tenantId` sent in the body or query |
| Admin | Logged-in user's `tenants[]` + the plugin's tenant selector cookie |
| Webhooks | Tenant id in the URL path (`/api/webhooks/razorpay/:tenantId`), then verified with that tenant's webhook secret or token. Exception (Phase 2): WhatsApp through the platform's Meta app posts to one URL; the tenant comes from the payload's `phone_number_id` (unique in connector-configs) after the signature is checked with the platform app secret. Exception (MVP): Resend email events post to one URL (`/api/webhooks/resend`); the tenant comes from the tags we set on each email when sending, after the Svix signature is checked with `RESEND_WEBHOOK_SECRET` |
| Tracking link | `https://<store>/t/<code>`: tenant from the host as usual, order from `trackingCode` within that tenant only |
| Jobs | `tenantId` stored in the job input. Every job task starts with `assertTenantActive(tenantId)` |

Host map cache: in-memory LRU per instance (60 s TTL) + Next cache tag `tenant-domains`.
Revalidate the tag when a domain or tenant status changes.

## Three layers of isolation

1. **Access control (admin + REST/GraphQL)**: the multi-tenant plugin adds tenant constraints to
   collection access. Our `access/` functions add role checks. Customers can read only their own
   orders/addresses.
2. **Data layer (storefront)**: storefront code never calls `payload.find` directly. It calls
   `src/lib/data/*` helpers which require `tenantId` as the first argument and always add
   `where.tenant.equals`. Lint rule: ban `payload.find(`/`payload.update(` imports outside
   `src/lib/data` and `src/modules/*/services`.
3. **Hooks (writes)**: a shared `beforeChange` hook stamps `tenant` on create from the request
   context and rejects updates that try to change `tenant`. Relationship fields use
   `filterOptions` so a product can only reference categories/media of the same tenant.

## Uniqueness is per tenant

Anything unique must be unique per tenant, enforced by compound unique indexes:
`(tenant, slug)` on products, categories, pages; `(tenant, sku)` on variants;
`(tenant, email)` on customers; `(tenant, orderNumber)` on orders;
`(tenant, financialYear, invoiceNumber)` on invoices; `(tenant, codeNormalized)` on coupons
(codes match without regard to case); `(tenant, slug)` on schemes; `(tenant, code)` on
affiliates; `(tenant, order)` on referrals; `(tenant, order, orderItem)` on reviews (one review per order item);
`(tenant, customer)` on wishlists; `(tenant, affiliate, date)` on affiliate-clicks;
`(tenant, trackingCode)` on orders; `(tenant, type, value)` on contact-preferences
(one row per phone and per email, docs/06); `(tenant, dedupeKey)` on notification-logs; `(tenant, referenceNumber)` on
enquiries; `(tenant, key)` on idempotency-keys; `(tenant, date)` on daily-stats.

A coupon code, an affiliate code or a scheme slug is unique only inside its store: two vendors can
both run `DIWALI10`, and the code resolves against the store's host like everything else.

## Indexes

Every tenant-scoped collection's hot queries start with `tenant`:
`{ tenant: 1, status: 1, createdAt: -1 }` on orders, `{ tenant: 1, category: 1, status: 1 }` on
products, etc. Atlas Search index must include `tenant` as a `token`/`objectId` field and every
search query must use it in a `filter` clause.

## Caching

- Cache keys and tags always include the tenant: `t:<tenantId>:...`.
- Revalidate via `afterChange` hooks: a product change revalidates `t:<id>:product:<pid>` and
  `t:<id>:listing`.
- Never put tenant-scoped data in a cache entry without the tenant in its key.
- Scheme prices and badges change at a scheme's start and end time, not on a save. The scheduled
  `promotions/switch-schemes` job (every minute) revalidates `t:<id>:offers`, `t:<id>:listing` and
  the affected product tags when a scheme starts or ends. Cart and checkout never use cached
  prices: they recompute on the server (docs/11).

## Tenant lifecycle

`draft` -> `active` -> (`suspended` <-> `active`) -> `archived`.

- **Create** (platform admin, script `scripts/create-tenant`): tenant doc, default site-settings,
  owner user, subdomain `<slug>.<platform-domain>`, default plan, feature flags from the plan and
  the industry preset (docs/08),
  GST settings, counters, sample pages. Then a developer creates `src/storefront/vendors/<slug>/`.
- **Suspend**: storefront shows "store unavailable", checkout disabled, admin read-only for vendor.
- **Archive**: data export generated, storefront off. Hard delete only via a reviewed script after
  the retention period.

## Custom domains (Phase 2 automated, MVP manual)

`tenant-domains` holds `{ host, tenant, isPrimary, verifiedAt, sslStatus }`. Non-primary hosts 301
to the primary. Automated flow (Phase 2): vendor adds domain -> we call Vercel Domains API ->
show DNS records -> poll verification -> mark verified.

## Scaling path for tenancy

1. Today: one cluster, one DB, tenant field. Good to hundreds of tenants and ~1M products.
2. A heavy tenant: move it to its own database. Keep `tenants.dbRef` (default `shared`) so the
   data layer can pick a connection. Do not build this until needed, but never assume
   cross-tenant joins exist (there are none in this product).
3. Regional data residency: same mechanism with a cluster per region.

## Mandatory tests

`tests/integration/tenant-isolation.test.ts` must, for every tenant-scoped collection, create data
in tenant A and B and assert that: B's staff cannot list/read/update A's docs through REST,
GraphQL and Local API with user context; storefront data helpers for B never return A's docs;
creating a doc with another tenant's relationship id fails.
