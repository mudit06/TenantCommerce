# Progress: what is built and what is left

The single place to check build status. Update it in the same commit as the work (docs/16
definition of done). Screen ids match `docs/screens/*.md` and the wireframes.

Last updated: 4 October 2026 (admin redesign, Manage store and View as support). Nothing is deployed anywhere yet; the code runs
locally (README).

## At a glance

| Area | Screens in spec | Done | Partial | Not started | Rough share built |
|---|---|---|---|---|---|
| Super admin (platform panel) | 13 | 7 | 6 | 0 | about 80% |
| Vendor CMS | 31 (2 are Phase 2) | 4 | 9 | 18 (2 of them Phase 2) | about 35%: stage A about 90%, stages B and C not started |
| Storefront | 24 (1 is Phase 2) | 3 | 5 | 16 (1 of them Phase 2) | about 25%: the catalogue store (browse, search, product, quote, contact) |
| **All 68 screens** | | **14** | **20** | **34** | |

Against the 12-sprint MVP plan (docs/17): sprint 1 (scaffold, tenancy, staff auth, isolation tests,
local CI) is done except two-step login, and the super admin screens from the roadmap's Platform
list are built ahead of the vendor CMS. Stage A of the vendor CMS (below) is built except CSV
import and slug redirects; products and variants are our own collections (ADR 0006, accepted).
Vendor data is entered by hand for now (mudit, 3 October 2026), so CSV import is not urgent.

**Vendor 1, Home Orbit (3 October 2026).** Onboarded on the local database with its catalogue:
110 products in 13 categories with photos cropped from its PDF, specification fields, About us
and a home page; launches as a catalogue with enquiries (no prices in the catalogue, mudit 3
October 2026). Its storefront runs at http://home-orbit.localhost:3000 after
`pnpm seed:home-orbit`. Lighthouse mobile on the production build, with the store temporarily
live (a draft store shows "coming soon" in production): performance 90 to 99, accessibility 100,
best practices 100, SEO 100 on home, category and product pages (warm server; the very first
request after a restart scored 85). What Home Orbit still has to
send: docs/vendors/home-orbit.md.

To check it all by hand on your machine: `docs/manual-testing.md` (last run end to end on a
fresh database on 3 October 2026).

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
categories, attribute sets, brands, documents, products and variants (specifications from the
attribute set, "Create variants" for every finish and size), pages with blocks and scheduled
publishing, menus, banners, dealers, enquiries, Staff and roles, and a setup checklist on the
store dashboard. **Still to build for stage A:** CSV import, slug redirects, dealer locator page.

**Entering vendor 1's data by hand, in this order:** Store settings (logo, contact, grievance
officer) → Attribute sets (the fields customers filter by) → Categories (each with its attribute
set) → Media (photos, PDFs) → Documents → Dealers → Pages (policies, then the home page) → Menus.
→ Products (main category, photos, specifications, then "Create variants" when prices and stock
matter). The store dashboard's checklist tracks it.

## Super admin (docs/screens/super-admin.md)

| Screen | Status | Built | Left, and why |
|---|---|---|---|
| `sa-login` Sign in | Partial | Sign-in, lockout after 5 tries for 15 min, 8-hour session, same message for unknown and disabled accounts, 10-character passwords | Two-step login: deferred by mudit (3 October 2026) |
| `sa-dashboard` Platform dashboard | Partial | Live stores (paying, on trial), MRR, past due with amount, trials, Needs attention (past due, trials ending, plan limits at 90%, draft stores, owners who haven't accepted), Recently onboarded | Orders today, GMV, sales chart, top stores (need orders and daily-stats, sprints 4 and 5); failing connectors, WhatsApp templates, SSL rows (need connectors) |
| `sa-vendors` All vendors | Done | List, search by name, slug, legal name or GSTIN, status tabs with counts, filters and columns | Export CSV; subscription and products-used columns |
| `sa-vendor-new` New vendor | Done | All five steps, GSTIN check and PAN/state fill, industry preset capped by plan, trial, owner invite, same service as `pnpm create-tenant` | Store settings, counters, tax rates and menus are created by those modules when they are built (they listen to `tenant.created`) |
| `sa-vendor` Vendor overview | Partial | Business details (edit), status, plan, primary domain, plan usage, recent changes, Go live, Suspend, Resume, Archive with reason, internal notes, **Manage store** and **View as support** (reason, 2-hour session, banner, audit; docs/05 "As built") | Store health (last order, connector health); logo |
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
| `cms-dashboard` Store dashboard | Partial | Greeting, store status notice, cards for published, draft and scheduled pages, products and new enquiries; needs your attention; recent activity with who and when; coming up (scheduled publishes); quick actions; setup checklist; plan usage | Sales figures, orders to ship, low stock: come with orders and products |
| `cms-staff` Staff and roles | Done | Staff list, invite, resend, change roles, remove, what each role can do, plan staff limit; a store always keeps an owner | Two-step column (two-step deferred) |
| `cms-settings` Store settings | Partial | Branding, contact, grievance officer, label defaults, GST details (read only), order and invoice prefixes, returns, announcement bar, policy links, search and analytics IDs, maintenance mode. Created for every store at onboarding | Cash on delivery and prepaid rules come with the Payments screen (stage B) |
| `cms-media` Media library | Done | Upload images and PDFs, WebP sizes, alt text required, size limits, storage counted against the plan, S3/R2 + CDN switch (docs/12 "Media") | Production bucket (docs/open-items) |
| `cms-categories` Categories | Partial | Tree with parent, slug filled from the name, attribute set (or the parent's), tile image, banner, description, size chart (size-guide feature), sort order, show on store, SEO; no loops, at most 3 levels | Drag-to-reorder tree view (Payload list for now); redirect when a slug changes |
| `cms-attributes` Attribute sets | Done | Fields with type, unit, group, filter, variant option, compare (Phase 2), required; options with swatch colour or photo; codes and values filled from labels; checked (unique codes, options present, at most 3 variant options) | — |
| `cms-pages` Pages | Done | Own list screen: status tabs with counts (published, unpublished changes, drafts, scheduled), search by title or address, filters (template, changed by, modified), sort, template and status badges, last changed by, published date, edit, view on store, duplicate, delete with confirmation; "Create page" asks Default, Landing or Policy first. Drafts, versions, scheduled publishing; draft policy pages and home page created for every store | Archived state (not in the data model) |
| `cms-page-edit` Page builder | Partial | 14 block types (hero, banner, product grid, category tiles, rich text, image and text, benefits, testimonials, FAQ, video, downloads, dealer finder, enquiry form, brand story); Content and SEO tabs; template chosen as cards in the sidebar; block rows named by their content; "Add block" library grouped Marketing, Commerce, Basic, Utility with pictures and descriptions; live preview of the draft in the store's own storefront code (Phone, Tablet, Desktop) on a signed link; search result preview with length guidance | A side panel for block settings (Payload edits blocks in place); offer, coupon, review and newsletter blocks come with stage C |
| `cms-navigation` Menus | Partial | Header with dropdown columns, footer columns, phone menu; links to pages, categories or URLs | Preview needs the storefront |
| `cms-enquiries` Enquiries inbox | Partial | `ENQ-<n>` per store, New / In progress / Closed tabs with counts, type and status, assign to a colleague, reply by email or WhatsApp (staff's own apps), internal notes, staff can log phone enquiries; enquiries feature only | Attachments (need private storage); the storefront forms that fill it |
| `cms-dealers` Dealers | Partial | Name, type, address, pincode, map position, phone, hours, categories stocked, show on store; dealer-locator feature only | CSV import, map preview, position from the pincode |
| `cms-products` Products | Partial | List with search by name, model number or keywords; status, featured, plan product limit with the count on the dashboard | Bulk actions, stock column (with stage B) |
| `cms-product-edit` Product editor | Partial | Basics, photos and YouTube videos, specifications built from the category's attribute set (inherited from the parent), finishes and sizes with "Create variants for every combination", price, MRP, GST rate, HSN, weight and size, label details defaulting from store settings, documents, related products, search fields, versions. Can't go active without a photo and label details; online selling needs a price and HSN | GST split preview, scheduled publish, translations (Phase 2), spare parts (Phase 2) |
| `cms-import` CSV import | Not started | — | Not urgent: data is entered by hand for now |
| `cms-orders`, `cms-order`, `cms-customers` | Not started | — | Stage B (sprints 4 and 5) |
| `cms-shipping`, `cms-payments`, `cms-notifications`, `cms-messaging` | Not started | — | Stage B (sprints 4 to 7) |
| `cms-schemes`, `cms-scheme-edit`, `cms-coupons` | Not started | — | Stage C (sprint 9) |
| `cms-campaigns`, `cms-abandoned`, `cms-reviews` | Not started | — | Stage C (sprint 10) |
| `cms-affiliates` | Not started | — | Stage C (sprint 11) |
| `cms-reports` | Not started | — | Sprint 5 onwards |
| `cms-service`, `cms-trade` | Phase 2 | — | — |

Brands, banners and variants have no screen of their own in the spec; they are built as lists
under Catalog and Content.

## Storefront (docs/screens/storefront.md)

Built on 3 October 2026 for Home Orbit's catalogue launch: `src/proxy.ts` (store domain to its
pages, security headers), tenant-scoped cached data helpers (`src/lib/data`), the shared kit and
vendor registry (`src/storefront`), Home Orbit's theme and hero (`src/storefront/vendors/home-orbit`).
Every store without its own folder gets the kit's default look (the demo stores show it).

| Screen | Status | Built | Left, and why |
|---|---|---|---|
| `st-home` Home | Partial | The store's published home page from blocks (all 14 types), or a default from its catalog; vendor hero override | Offer strip and wishlist blocks (stage C) |
| `st-category` Category listing | Done (catalogue mode) | Breadcrumbs, subcategories, filters with counts from the attribute set, sort, pages, clean URLs that redirect to the current address | Price and in-stock filters (stage B); Atlas Search facets when catalogues grow |
| `st-filters` Filter sheet | Done | Bottom sheet on phones, side panel on desktop, filters kept in the URL | — |
| `st-search` Search | Partial | Search by name, model number or keywords | Autocomplete and typo tolerance (Atlas Search) |
| `st-product` Product page | Partial (catalogue mode) | Gallery, model number, finish and size pickers, Request a quote with the chosen options, WhatsApp with a ready message, sticky actions on phones, specifications, label details, downloads, related products, Product and Breadcrumb markup | Price, add to cart, pincode check, stock (stage B); reviews (stage C) |
| `st-contact` Contact and quote request | Done | Form to the Enquiries inbox with honeypot and rate limit, contact details, grievance officer | — |
| `st-downloads` Downloads | Partial | Downloads block on pages, documents on product pages | Own page with filters |
| `st-offline` Install, offline and unavailable | Partial | Store unavailable (suspended, maintenance), coming soon (draft in production), 404 | PWA install and offline page (Serwist) |
| `st-dealers` Dealer locator | Not started | — | Dealer data and the map |
| `st-cart`, `st-checkout`, `st-confirmation`, `st-login`, `st-account`, `st-order`, `st-track`, `st-messages` | Not started | — | Stage B (selling) |
| `st-wishlist`, `st-review`, `st-offers`, `st-offer-messages`, `st-affiliate`, `st-affiliate-dash` | Not started | — | Stage C (growth) |
| `st-warranty` | Phase 2 | — | — |

Also built: CMS and policy pages (`/pages/<slug>`), per-store `robots.txt` and `sitemap.xml`
(live stores only), page titles and descriptions, canonical URLs.

## Cross-cutting

| Item | Status |
|---|---|
| Project setup: TypeScript strict, ESLint, Prettier, Vitest, Docker image, `pnpm verify` | Done |
| Tenant isolation: plugin + role access + integration tests | Done for every collection that exists; each new collection adds its test |
| Staff accounts, roles, invites, lockout, password policy | Done |
| Two-step login (TOTP) | Deferred by mudit (3 October 2026); needed before real vendor data goes live |
| Manage store / View as support (audited platform access) | Done (4 October 2026): platform panel and store CMS are separate workspaces; our team reaches store data only in a store session (docs/05 "As built") |
| Admin look and feel | Redesigned 4 October 2026: one menu per workspace (grouped, icons, counts, collapsible to icons), new theme over all of Payload's screens, light and dark, self-hosted font (docs/screens/vendor-cms.md "Look and feel") |
| Shopper accounts | Not started: Sprint 1 spike |
| Feature switches, plan ceilings, industry presets | Done |
| Audit log | Writes done for platform actions; viewer is "Later" |
| Jobs | Subscription past-due task and scheduled page publishing run locally; Vercel cron for the job runner not configured |
| Media storage | Local disk in development; S3/Cloudflare R2 + CDN switched on by `S3_BUCKET` (docs/12), one folder per store (`media/<tenantId>/`), boot check refuses local disk on Vercel. Production bucket not chosen yet |
| Email | Local log adapter and Resend adapter; React Email templates later |
| `proxy.ts`, security headers, rate limiting | Proxy and headers done (nosniff, referrer, frame, permissions, HSTS in production); enquiry rate limit in memory per server. Left: Content-Security-Policy with nonces, Upstash for several instances, redirect to the primary domain |
| Connector secret encryption | Not started: comes with the first connector |
| Error tracking (Sentry), structured logs | Not started |
| CI | Local `pnpm verify`; Husky pre-push hook and hosted CI not yet |
| End-to-end tests in the repo (Playwright) | Not started: browser checks are run by hand, following `docs/manual-testing.md` |
| Dependency audit | 1 open: `braces` inside the SCSS compiler's file watcher, no fix released; build-time only, accepted |
