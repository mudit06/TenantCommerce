# TenantEcom: instructions for AI coding assistants

This file is the entry point for any LLM (Claude Code, Cursor, Copilot, etc.) working in this repo.
Read it fully before writing code, then open only the `docs/` files your task touches.

## What we are building

A multi-tenant e-commerce SaaS for Indian manufacturers (sanitary ware, bathroom fittings, locks,
door and furniture hardware, home decor, clothing, and more). Each vendor ("tenant") gets its own
separate store: own domain, own hardcoded storefront UI, own CMS login, isolated data. It is NOT a
shared marketplace. Vendors pay a monthly SaaS subscription. The platform team onboards vendors.

## Stack (do not change without a recorded decision in docs/00-overview.md)

- TypeScript (strict) everywhere
- Next.js 16 App Router with Payload CMS 3 embedded in the same app (one deployable)
- MongoDB Atlas via `@payloadcms/db-mongodb`
- `@payloadcms/plugin-multi-tenant`, `@payloadcms/plugin-ecommerce` (custom Razorpay payment adapter)
- Tailwind CSS + shadcn/ui, Serwist for the PWA
- Vercel + Atlas in production, Docker image kept working

## Architecture in one paragraph

A **modular monolith**: one Next.js + Payload app, split internally into domain modules with
strict boundaries (`src/modules/*`). The request's hostname resolves to a tenant in `src/proxy.ts`;
every database read and write is scoped by `tenant`. Storefront UI lives in
`src/storefront/vendors/<vendor-slug>/` and falls back to `src/storefront/vendors/default/`.
Optional features are modules switched on per tenant by plan + feature flags. Payment, shipping and
messaging (WhatsApp, SMS, email) providers are connectors behind one interface each. See
`docs/01-architecture.md`.

## Docs map (read the ones relevant to your task)

| File | Read when you are... |
|---|---|
| docs/00-overview.md | new to the project; need decisions, glossary, phases |
| docs/01-architecture.md | touching structure, request flow, module boundaries, scaling |
| docs/02-tech-stack.md | adding a dependency or choosing a library |
| docs/03-folder-structure.md | creating any new file |
| docs/04-multi-tenancy.md | writing any query, collection, cache key, or job |
| docs/05-auth-and-roles.md | touching login, sessions, access control, roles |
| docs/06-data-model.md | adding or changing a collection or field |
| docs/07-api.md | adding or calling an endpoint |
| docs/08-modules-and-feature-flags.md | building an optional feature (schemes, coupons, affiliate, reviews, trade accounts, warranty...) |
| docs/09-connectors.md | integrating payment, shipping, messaging, or any third-party provider |
| docs/10-storefront-and-vendor-ui.md | building storefront pages, vendor UI, CMS blocks |
| docs/11-orders-payments-gst.md | cart, checkout, orders, parcel journey, refunds, invoices, GST, schemes and coupons (promotions engine), affiliate commissions |
| docs/12-catalog-and-import.md | products, variants, attributes, CSV import, search |
| docs/13-pwa-seo-performance.md | PWA, SEO, caching, Core Web Vitals |
| docs/14-security-and-compliance.md | secrets, PII, DPDP Act, rate limits, audit |
| docs/15-scalability-and-ops.md | deployment, jobs, monitoring, backups, scaling path |
| docs/16-conventions-and-testing.md | before opening any PR |
| docs/17-roadmap.md | deciding whether a feature is MVP, Phase 2 or Later |
| docs/18-notifications.md | sending shoppers order updates or offer messages (campaigns, abandoned cart, review requests) on WhatsApp, SMS or email; templates, opt-in |
| docs/open-items.md | starting work: decisions and spikes still open (don't build on an open item) |
| research/features.html | product research on competitor sites (human-readable) |
| docs/screens/super-admin.md | building any super admin (platform panel) screen: per-screen spec |
| docs/screens/vendor-cms.md | building any vendor CMS screen, or the shared admin theme: per-screen spec |
| docs/screens/storefront.md | building any storefront page: per-screen spec, mobile and desktop rules |
| docs/wireframes/ | seeing a screen (clickable wireframes the docs/screens specs are generated from) |

## Hard rules (never break these)

1. **Every tenant-owned document has a `tenant` field and every query filters on it.** Never call
   the Payload Local API with `overrideAccess: true` from storefront code without an explicit
   `where: { tenant: { equals: tenantId } }`. See docs/04-multi-tenancy.md.
2. **Money is an integer in paise** (`amountMinor`), with a `currency` code. Never use floats for money.
3. **No vendor-specific `if (tenant === 'x')` in shared code.** Vendor differences go in
   `src/storefront/vendors/<slug>/`, tenant settings, feature flags, or attribute sets.
4. **Optional features check the feature flag on the server** via `isFeatureEnabled(tenant, key)`,
   not just by hiding UI.
5. **Connector secrets are encrypted at rest** and never sent to the browser or logged.
6. **Webhooks are verified (signature) and idempotent** (dedupe on provider event id).
7. **Prices, discounts, tax and totals are always computed on the server.** Never trust client
   totals. Schemes and coupons go through the promotions engine only (docs/11), and offers stay
   honest: no fake countdowns, stock warnings or reviews (docs/14).
8. **Modules talk to each other only through their `index.ts` public API or Payload hooks/events,**
   never by importing another module's internals.
9. **No secrets in code or git.** Use `.env` (see `.env.example`).
10. **Keep UI accessible and mobile first**: Lighthouse mobile 90+ on product and listing pages.

## How to do common tasks

- **Add a collection**: follow the checklist in docs/06-data-model.md ("Adding a collection").
- **Add an optional feature**: follow docs/08-modules-and-feature-flags.md ("Adding a module").
- **Add a payment or shipping provider**: follow docs/09-connectors.md ("Adding a connector").
- **Onboard a new vendor UI**: follow docs/10-storefront-and-vendor-ui.md ("New vendor checklist").
- **Add a CMS block**: follow docs/10-storefront-and-vendor-ui.md ("Adding a block").
- **Add a shopper message (order update)**: follow docs/18-notifications.md ("Adding a milestone").
  Never call a messaging connector directly; emit an event.

## When unsure

Prefer the simplest thing that keeps tenant isolation and the rules above. If a decision is
architectural (new service, new database, new paid dependency), write it as an ADR in
`docs/adr/` and ask a human before implementing.
