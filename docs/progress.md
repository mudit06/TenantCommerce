# Progress: what is built and what is left

The single place to check build status. Update it in the same commit as the work (docs/16
definition of done). Screen ids match `docs/screens/*.md` and the wireframes.

Last updated: 3 October 2026. Nothing is deployed anywhere yet; the code runs locally (README).

## At a glance

| Area | Screens in spec | Done | Partial | Not started | Rough share built |
|---|---|---|---|---|---|
| Super admin (platform panel) | 13 | 7 | 6 | 0 | about 80% |
| Vendor CMS | 31 (2 are Phase 2) | 0 | 2 (placeholder dashboard, staff invites backend) | 29 | about 5% (foundations only) |
| Storefront | 24 (1 is Phase 2) | 0 | 0 | 24 | 0% |
| **All 68 screens** | | **7** | **8** | **53** | |

Against the 12-sprint MVP plan (docs/17): sprint 1 (scaffold, tenancy, staff auth, isolation tests,
local CI) is done except two-step login, and the super admin screens from the roadmap's Platform
list are built ahead of the vendor CMS. Sprints 2 to 12 have not started.

Legend: **Done** = built and tested to the screen spec for MVP. **Partial** = usable, with the
listed gaps. **Not started** = nothing built yet.

## Super admin (docs/screens/super-admin.md)

| Screen | Status | Built | Left, and why |
|---|---|---|---|
| `sa-login` Sign in | Partial | Sign-in, lockout after 5 tries for 15 min, 8-hour session, same message for unknown and disabled accounts, 10-character passwords | Two-step login: waits on the decision in docs/open-items 2b |
| `sa-dashboard` Platform dashboard | Partial | Live stores (paying, on trial), MRR, past due with amount, trials, Needs attention (past due, trials ending, plan limits at 90%, draft stores, owners who haven't accepted), Recently onboarded | Orders today, GMV, sales chart, top stores (need orders and daily-stats, sprints 4 and 5); failing connectors, WhatsApp templates, SSL rows (need connectors) |
| `sa-vendors` All vendors | Done | List, search by name, slug, legal name or GSTIN, status tabs with counts, filters and columns | Export CSV; subscription and products-used columns |
| `sa-vendor-new` New vendor | Done | All five steps, GSTIN check and PAN/state fill, industry preset capped by plan, trial, owner invite, same service as `pnpm create-tenant` | Store settings, counters, tax rates and menus are created by those modules when they are built (they listen to `tenant.created`) |
| `sa-vendor` Vendor overview | Partial | Business details (edit), status, plan, primary domain, plan usage, recent changes, Go live, Suspend, Resume, Archive with reason, internal notes | Manage store and View as support (next task); store health (last order, connector health); logo |
| `sa-vendor-features` Features | Done | Switches within the plan, dependency prompt, Phase 2 rows locked, settings with platform caps, re-apply preset | — |
| `sa-vendor-connectors` Connectors | Partial | What the vendor's plan allows | Keys ("Saved · hidden"), health, last webhook, SMS daily limit: arrive with each connector (sprints 4 to 7) |
| `sa-vendor-domains` Domains | Done (MVP) | Subdomain, primary, redirect flag | Custom domains with SSL are Phase 2 |
| `sa-vendor-billing` Billing | Done | Plan and price with GST, record payment (moves the period), change plan, pause, resume, cancel, history | Invoices to the vendor are Phase 2 |
| `sa-vendor-staff` Staff | Partial | Staff list, invite, resend invite, plan staff limit | Change roles or remove from this tab (possible today from the user's own edit page); reset two-step (needs two-step) |
| `sa-plans` Plans | Done | Create and edit plans: prices, limits, features and connectors allowed | Plans are placeholders until real ones are set (README "Plans"); the card layout of the wireframe |
| `sa-subscriptions` Subscriptions | Done | MRR, on trial, past due, renewing in 7 days, list and filters | Export CSV |
| `sa-team` Team and access | Partial | Team list, invite teammate (super admin or support), security summary | Two-step login |

## Vendor CMS (docs/screens/vendor-cms.md)

Vendor staff can sign in, see only their own store and its plan usage. The screens below wait on
the catalog and commerce modules; catalog, cart and orders also wait on the ecommerce plugin spike
(docs/open-items section 2).

| Screen | Status | Planned sprint (docs/17) |
|---|---|---|
| `cms-dashboard` Store dashboard | Partial: store name, status, plan usage | Grows with each sprint |
| `cms-staff` Staff and roles | Partial: invite API and plan limit work for owners; screen not built | Next platform task |
| `cms-products`, `cms-product-edit`, `cms-categories`, `cms-attributes`, `cms-import`, `cms-media` | Not started | 2 |
| `cms-orders`, `cms-order`, `cms-customers` | Not started | 4 and 5 |
| `cms-shipping`, `cms-payments`, `cms-notifications`, `cms-messaging`, `cms-settings` | Not started | 4 to 7 |
| `cms-enquiries`, `cms-dealers`, `cms-pages`, `cms-page-edit`, `cms-navigation` | Not started | 8 |
| `cms-schemes`, `cms-scheme-edit`, `cms-coupons` | Not started | 9 |
| `cms-campaigns`, `cms-abandoned`, `cms-reviews` | Not started | 10 |
| `cms-affiliates` | Not started | 11 |
| `cms-reports` | Not started | 5 onwards |
| `cms-service`, `cms-trade` | Phase 2 | — |

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
| Two-step login (TOTP) | Not started: decision pending |
| Manage store / View as support (audited platform access) | Not started: next platform task |
| Shopper accounts | Not started: Sprint 1 spike |
| Feature switches, plan ceilings, industry presets | Done |
| Audit log | Writes done for platform actions; viewer is "Later" |
| Jobs | Subscription past-due task done; Vercel cron for the job runner not configured |
| Email | Local log adapter and Resend adapter; React Email templates later |
| `proxy.ts`, security headers (CSP, HSTS), rate limiting | Not started: come with the storefront |
| Connector secret encryption | Not started: comes with the first connector |
| Error tracking (Sentry), structured logs | Not started |
| CI | Local `pnpm verify`; Husky pre-push hook and hosted CI not yet |
| End-to-end tests in the repo (Playwright) | Not started: this sprint's browser checks were run by hand |
| Dependency audit | 1 open: `braces` inside the SCSS compiler's file watcher, no fix released; build-time only, accepted |
