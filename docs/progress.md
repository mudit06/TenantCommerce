# Progress: what is built and what is left

The single place to check build status. Update it in the same commit as the work (docs/16
definition of done). Screen ids match `docs/screens/*.md` and the wireframes.

Last updated: 3 October 2026 (vendor CMS stage A). Nothing is deployed anywhere yet; the code runs
locally (README).

## At a glance

| Area | Screens in spec | Done | Partial | Not started | Rough share built |
|---|---|---|---|---|---|
| Super admin (platform panel) | 13 | 7 | 6 | 0 | about 80% |
| Vendor CMS | 31 (2 are Phase 2) | 4 | 7 | 20 (2 of them Phase 2) | about 25% (stage A without products) |
| Storefront | 24 (1 is Phase 2) | 0 | 0 | 24 | 0% |
| **All 68 screens** | | **11** | **13** | **44** | |

Against the 12-sprint MVP plan (docs/17): sprint 1 (scaffold, tenancy, staff auth, isolation tests,
local CI) is done except two-step login, and the super admin screens from the roadmap's Platform
list are built ahead of the vendor CMS. Stage A of the vendor CMS (below) is built except
products, variants and CSV import, which wait for the decision in ADR 0006 (proposed). Vendor
data is entered by hand for now (mudit, 3 October 2026), so CSV import is not urgent.

Legend: **Done** = built and tested to the screen spec for MVP. **Partial** = usable, with the
listed gaps. **Not started** = nothing built yet.

## Path to vendor 1's storefront

The storefront shows what the vendor CMS holds, so the CMS is built in three stages and the
vendor 1 storefront starts after stage A, in parallel with stage B.

| Stage | Vendor CMS screens | Storefront it unlocks | Needs before it starts |
|---|---|---|---|
| A. Catalog and store setup | Store settings, Categories, Attribute sets, Products, Product editor, Media, CSV import, Pages, Page builder, Menus, Dealers, Enquiries, Staff and roles screen, basic dashboard | Home, category listing and filters, search, product page, CMS and policy pages, dealer locator, downloads, contact and quote forms | Shop plugin test build and its ADR (docs/open-items section 2); page builder core or per vendor; vendor 1's industry, category tree and a sample product sheet |
| B. Selling | Payments (Razorpay, COD), Shipping zones, Orders, Order detail, Customers, Order updates, WhatsApp and SMS, basic Reports | Cart, checkout, account, order tracking, invoices | Shopper login test build; WhatsApp and SMS in MVP or not; delivery fee from rate card or live Shiprocket; vendor 1's Razorpay test keys and shipping method |
| C. Growth | Schemes, Coupons, Offer messages, Abandoned carts, Reviews, Affiliates, full Reports | Offers pages, coupon box, reviews, wishlist, affiliate pages | Which of these vendor 1 wants at launch |

If vendor 1 launches as a catalogue with enquiries (no online payment), stage A alone is enough
for its first storefront.

**Stage A as built (3 October 2026):** store settings, media library (object storage ready),
categories, attribute sets, brands, documents, pages with blocks and scheduled publishing,
menus, banners, dealers, enquiries, Staff and roles, and a setup checklist on the store
dashboard. **Still to build for stage A:** products and variants (after ADR 0006 is approved),
CSV import, slug redirects.

**Entering vendor 1's data by hand, in this order:** Store settings (logo, contact, grievance
officer) → Attribute sets (the fields customers filter by) → Categories (each with its attribute
set) → Media (photos, PDFs) → Documents → Dealers → Pages (policies, then the home page) → Menus.
Products follow once their screens exist. The store dashboard's checklist tracks it.

## Super admin (docs/screens/super-admin.md)

| Screen | Status | Built | Left, and why |
|---|---|---|---|
| `sa-login` Sign in | Partial | Sign-in, lockout after 5 tries for 15 min, 8-hour session, same message for unknown and disabled accounts, 10-character passwords | Two-step login: deferred by mudit (3 October 2026) |
| `sa-dashboard` Platform dashboard | Partial | Live stores (paying, on trial), MRR, past due with amount, trials, Needs attention (past due, trials ending, plan limits at 90%, draft stores, owners who haven't accepted), Recently onboarded | Orders today, GMV, sales chart, top stores (need orders and daily-stats, sprints 4 and 5); failing connectors, WhatsApp templates, SSL rows (need connectors) |
| `sa-vendors` All vendors | Done | List, search by name, slug, legal name or GSTIN, status tabs with counts, filters and columns | Export CSV; subscription and products-used columns |
| `sa-vendor-new` New vendor | Done | All five steps, GSTIN check and PAN/state fill, industry preset capped by plan, trial, owner invite, same service as `pnpm create-tenant` | Store settings, counters, tax rates and menus are created by those modules when they are built (they listen to `tenant.created`) |
| `sa-vendor` Vendor overview | Partial | Business details (edit), status, plan, primary domain, plan usage, recent changes, Go live, Suspend, Resume, Archive with reason, internal notes | Manage store and View as support (next task); store health (last order, connector health); logo |
| `sa-vendor-features` Features | Done | Switches within the plan, dependency prompt, Phase 2 rows locked, settings with platform caps, re-apply preset | — |
| `sa-vendor-connectors` Connectors | Partial | What the vendor's plan allows | Keys ("Saved · hidden"), health, last webhook, SMS daily limit: arrive with each connector (sprints 4 to 7) |
| `sa-vendor-domains` Domains | Done (MVP) | Subdomain, primary, redirect flag | Custom domains with SSL are Phase 2 |
| `sa-vendor-billing` Billing | Done | Plan and price with GST, starting offer (first payment covers the offer's months), record payment (moves the period), change plan, pause, resume, cancel, history | Invoices to the vendor are Phase 2 |
| `sa-vendor-staff` Staff | Partial | Staff list, invite, resend invite, change roles, remove from the store (never the last owner), plan staff limit | Reset two-step (needs two-step) |
| `sa-plans` Plans | Done | Create and edit plans: prices, starting offer, limits, features and connectors allowed. Seeded with the interim Starter and Enterprise plans (docs/00) | Final prices and limits; the card layout of the wireframe |
| `sa-subscriptions` Subscriptions | Done | MRR, on trial, past due, renewing in 7 days, list and filters | Export CSV |
| `sa-team` Team and access | Partial | Team list, invite teammate (super admin or support), security summary | Two-step login (deferred) |

## Vendor CMS (docs/screens/vendor-cms.md)

Vendor staff sign in to their own store only, with menus grouped as the spec (Catalog, Sales,
Content, Store, Team) and screens hidden when the store's feature is off. Every collection below
has tenant isolation, role and feature tests (`tests/integration/store.test.ts`).

| Screen | Status | Built | Left, and why |
|---|---|---|---|
| `cms-dashboard` Store dashboard | Partial | Store, status, plan usage (products, staff, storage), new enquiries, a setup checklist for stage A | Sales figures, orders to ship, low stock: come with orders and products |
| `cms-staff` Staff and roles | Done | Staff list, invite, resend, change roles, remove, what each role can do, plan staff limit; a store always keeps an owner | Two-step column (two-step deferred) |
| `cms-settings` Store settings | Partial | Branding, contact, grievance officer, label defaults, GST details (read only), order and invoice prefixes, returns, announcement bar, policy links, search and analytics IDs, maintenance mode. Created for every store at onboarding | Cash on delivery and prepaid rules come with the Payments screen (stage B) |
| `cms-media` Media library | Done | Upload images and PDFs, WebP sizes, alt text required, size limits, storage counted against the plan, S3/R2 + CDN switch (docs/12 "Media") | Production bucket (docs/open-items) |
| `cms-categories` Categories | Partial | Tree with parent, slug filled from the name, attribute set (or the parent's), tile image, banner, description, size chart (size-guide feature), sort order, show on store, SEO; no loops, at most 3 levels | Drag-to-reorder tree view (Payload list for now); redirect when a slug changes |
| `cms-attributes` Attribute sets | Done | Fields with type, unit, group, filter, variant option, compare (Phase 2), required; options with swatch colour or photo; codes and values filled from labels; checked (unique codes, options present, at most 3 variant options) | — |
| `cms-pages` Pages | Done | Pages with drafts, versions, scheduled publishing; draft policy pages and home page created for every store | — |
| `cms-page-edit` Page builder | Partial | 14 block types (hero, banner, product grid, category tiles, rich text, image and text, benefits, testimonials, FAQ, video, downloads, dealer finder, enquiry form, brand story) | Live preview needs the storefront; offer, coupon, review and newsletter blocks come with stage C |
| `cms-navigation` Menus | Partial | Header with dropdown columns, footer columns, phone menu; links to pages, categories or URLs | Preview needs the storefront |
| `cms-enquiries` Enquiries inbox | Partial | `ENQ-<n>` per store, New / In progress / Closed tabs with counts, type and status, assign to a colleague, reply by email or WhatsApp (staff's own apps), internal notes, staff can log phone enquiries; enquiries feature only | Attachments (need private storage); the storefront forms that fill it |
| `cms-dealers` Dealers | Partial | Name, type, address, pincode, map position, phone, hours, categories stocked, show on store; dealer-locator feature only | CSV import, map preview, position from the pincode |
| `cms-products`, `cms-product-edit`, `cms-import` | Not started | — | Wait for ADR 0006 (own product collections, proposed) |
| `cms-orders`, `cms-order`, `cms-customers` | Not started | — | Stage B (sprints 4 and 5) |
| `cms-shipping`, `cms-payments`, `cms-notifications`, `cms-messaging` | Not started | — | Stage B (sprints 4 to 7) |
| `cms-schemes`, `cms-scheme-edit`, `cms-coupons` | Not started | — | Stage C (sprint 9) |
| `cms-campaigns`, `cms-abandoned`, `cms-reviews` | Not started | — | Stage C (sprint 10) |
| `cms-affiliates` | Not started | — | Stage C (sprint 11) |
| `cms-reports` | Not started | — | Sprint 5 onwards |
| `cms-service`, `cms-trade` | Phase 2 | — | — |

Brands and banners have no screen of their own in the spec; they are built as lists under Catalog
and Content.

## Storefront (docs/screens/storefront.md)

Not started. It needs `src/proxy.ts` (host to store), the shared kit, the first vendor's UI folder
and the catalog. All 24 screens (`st-home` to `st-offline`; `st-warranty` is Phase 2) are open.
For the first client, the inputs are in docs/10 "New vendor checklist" plus their brand files,
domain, GST details and product data.

## Cross-cutting

| Item | Status |
|---|---|
| Project setup: TypeScript strict, ESLint, Prettier, Vitest, Docker image, `pnpm verify` | Done |
| Tenant isolation: plugin + role access + integration tests | Done for every collection that exists; each new collection adds its test |
| Staff accounts, roles, invites, lockout, password policy | Done |
| Two-step login (TOTP) | Deferred by mudit (3 October 2026); needed before real vendor data goes live |
| Manage store / View as support (audited platform access) | Not started: next platform task |
| Shopper accounts | Not started: Sprint 1 spike |
| Feature switches, plan ceilings, industry presets | Done |
| Audit log | Writes done for platform actions; viewer is "Later" |
| Jobs | Subscription past-due task and scheduled page publishing run locally; Vercel cron for the job runner not configured |
| Media storage | Local disk in development; S3/Cloudflare R2 + CDN switched on by `S3_BUCKET` (docs/12). Production bucket not chosen yet |
| Email | Local log adapter and Resend adapter; React Email templates later |
| `proxy.ts`, security headers (CSP, HSTS), rate limiting | Not started: come with the storefront |
| Connector secret encryption | Not started: comes with the first connector |
| Error tracking (Sentry), structured logs | Not started |
| CI | Local `pnpm verify`; Husky pre-push hook and hosted CI not yet |
| End-to-end tests in the repo (Playwright) | Not started: this sprint's browser checks were run by hand |
| Dependency audit | 1 open: `braces` inside the SCSS compiler's file watcher, no fix released; build-time only, accepted |
