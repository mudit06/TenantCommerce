# Screens: Super admin (platform panel)

Build spec for every super admin screen. Generated from the clickable wireframes by
`node docs/wireframes/build-specs.js`; edit the wireframe or this intro, never the generated
sections by hand. Open `docs/wireframes/index.html` (or https://tenantecom-wireframes.vercel.app)
to see each screen while you read.

## What this panel is

- Our own team's panel inside the **same Payload admin app** as the vendor CMS, at
  `admin.<platform-domain>/admin`. Users with `platformRole` `super-admin` (full access) or
  `support` (read-only everywhere) see it; vendor staff never do. See `docs/05-auth-and-roles.md`.
- Jobs: onboard vendors, manage plans and subscriptions, switch features and connectors on per
  vendor (including each vendor's WhatsApp offers), watch store health, and manage any store's
  data end to end. "Super admin" is our team only (mudit, 3 October 2026), with complete control
  of every store: products, categories, customers, affiliates, orders, payments, inventory,
  schemes, coupons, commissions, notifications, reports, website and CMS, users, roles and
  settings. That work happens in the store's own CMS screens through "Manage store" (full edit,
  reason asked, audited); support uses "View as support" (read-only). It never edits storefront
  design (that lives in code, `docs/10-storefront-and-vendor-ui.md`).
- Built with Payload collections (`tenants`, `tenant-domains`, `plans`, `subscriptions`,
  `feature-flags`, `connector-configs`, `users`) plus custom admin views for the dashboard, the
  new-vendor form and the per-vendor tabs.

## Menu

Dashboard · Vendors (All vendors, New vendor) · Billing (Plans, Subscriptions) · Platform (Team and
access, Audit log later). Vendor detail has tabs: Overview, Features, Connectors, Domains, Billing,
Staff.

## Rules that apply to every screen

- The **plan is the ceiling, the feature flag is the switch**: a feature works only when
  `plan.allowedModules` includes it and the vendor's flag is on (`docs/08`). Same for connectors
  with `plan.allowedConnectors`.
- Money is shown in rupees with Indian grouping (₹1,12,400) but stored as integer paise
  (`amountMinor`). Subscription prices are plus 18% GST.
- Secrets (Razorpay, WhatsApp, MSG91, Shiprocket keys) are never displayed: show "Saved · hidden"
  with a Replace action only (`docs/14`).
- Every support or super-admin action on a vendor is written to the audit log.
- Status values come straight from the data model enums: store `draft|active|suspended|archived`,
  subscription `trialing|active|past_due|cancelled|paused`.

## Phase notes as of 3 October 2026

- **Growth features in Phase 1** (mudit, 3 October 2026): schemes, coupons, wishlist, reviews,
  offer messages and abandoned cart reminders are on for every new store; the affiliate program
  follows the industry preset and the plan. Trade accounts, trade schemes, dealer anniversary
  offers, loyalty points and compare are Phase 2 (Features tab, Plans).

- **Shiprocket** is a Phase 1 (MVP) connector for post-order handling (moved from Phase 2 by
  mudit); each vendor connects its own account and the delivery fee still comes from its rate card. Setup: `docs/09-connectors.md`.
- **WhatsApp and SMS order updates** are drawn as MVP, as `docs/18-notifications.md` proposes;
  still waiting on mudit's MVP or Phase 2 confirmation.
- Plan names, prices and limits are placeholders.

## Look and feel

Same theme as the vendor CMS: see "Look and feel" in `docs/screens/vendor-cms.md`.
