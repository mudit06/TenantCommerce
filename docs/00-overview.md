# 00 Overview: product, decisions, glossary

## Product in one line

A white-label, multi-tenant commerce platform where each Indian manufacturer gets its own branded,
installable (PWA) online store and CMS, run by our team on one shared codebase.

## Who uses it

| Actor | Where | What they do |
|---|---|---|
| Platform admin (our team) | `admin.<platform-domain>` Payload admin, all tenants | Onboard vendors, manage plans and subscriptions, switch modules and connectors on per vendor, and manage any store's data end to end (super admins); support reads |
| Vendor staff (owner, manager, editor, support) | Same Payload admin, scoped to their tenant | Manage products, CSV import, CMS pages, orders, invoices, shipping, connectors, dealers, enquiries |
| Shopper | Vendor's storefront domain | Browse, search, buy, apply coupons, save a wishlist, review products, get offers, track orders, register warranty (Phase 2), raise service requests (Phase 2) |
| Affiliate (MVP) | Vendor's storefront, affiliate dashboard | Referral link and code, commission on referred orders, payout statements |
| Trade partner (Phase 2): dealer, retailer, wholesaler, interior designer | Vendor's storefront, trade login | Trade prices, quick and bulk order, quotes, credit terms, trade schemes and dealer anniversary offers; designers also earn commission on client orders |

## Decisions already made (source of truth)

| Topic | Decision |
|---|---|
| Tenancy | Separate store per vendor: own storefront, branding, domain; data isolated by `tenant` field in one DB |
| Onboarding | Platform team creates tenants and vendor logins. No self sign-up in MVP |
| Market | India first (INR, GST). Code ready for multi-currency later |
| Revenue | Monthly SaaS subscription per vendor. Billed manually in MVP, Razorpay Subscriptions in Phase 2 |
| Plans (interim) | Starter ₹3,499 a month for up to 500 products; Enterprise ₹6,999 a month for up to 10,000 products. New Starter vendors start with ₹9,999 for the first 3 months, then pay monthly. Prices plus GST; staff, storage and order limits still placeholders. Editable in the admin (Billing, Plans), to be revised (mudit, 3 October 2026) |
| Two-step login | Deferred for now; staff sign in with email and password, lockout and 8-hour sessions (mudit, 3 October 2026). Needed before real vendor data goes live |
| Payments | Per-vendor connectors using the vendor's own gateway keys. Razorpay first. COD supported |
| Shipping | Shiprocket connector in MVP (moved from Phase 2), on the vendor's own Shiprocket account: pincode serviceability, courier booking, labels, pickups, tracking, failed deliveries, RTO, return pickups. Manual shipping (zones, rates, tracking no.) stays for vendors without it. Shopper delivery charges come from the vendor's own rates |
| Shopper messages | Order updates (confirmed, packed, shipped, out for delivery, delivered...) on WhatsApp, SMS and email in MVP, sent from each vendor's own WhatsApp number and SMS sender on the vendor's own accounts (ADR 0005, docs/18) |
| Shopper accounts | Separate per store (same email can exist in two stores as two accounts) |
| Products | Physical only, simple variants (size, colour, finish), one warehouse per vendor |
| Tax | GST with HSN codes, GST invoice PDF in MVP |
| Storefront UI | Hardcoded in code per vendor by our team, over a shared default kit. Not configurable from admin |
| Super admin scope | Our team only, never a vendor's staff (mudit, 3 October 2026). Super admins have complete control of every store: products, categories, customers, trade partners (Phase 2), affiliates, orders, payments, inventory, schemes, coupons, commissions, notifications, reports, website and CMS content, staff users and roles, and settings. They work on a store's data by opening its CMS with "Manage store" (full edit, a reason asked once per session, every change audited); support stays read-only. The platform panel itself covers vendors, plans, billing, features (including each vendor's WhatsApp offers switch), connectors, domains and staff. Storefront design stays in code |
| CMS content | Typed blocks (hero, banner, product grid...) rendered differently per vendor UI |
| Optional modules | Schemes, coupons, affiliates, reviews, trade accounts, warranty, dealers, etc. switched on per vendor |
| Growth features in Phase 1 | Festival schemes (Diwali, Holi, New Year, Wedding Season) and special launch offers, coupons, affiliates with commissions, wishlist, reviews, offer messages and abandoned cart reminders move into the MVP (mudit, 3 October 2026). In the MVP schemes and coupons are for retail shoppers and commissions are paid to affiliates only |
| Trade partners | Dealers, retailers, wholesalers and interior designers become trade account types in Phase 2, with dealer anniversary offers, trade schemes, partner commissions, loyalty points and product compare (mudit, 3 October 2026) |
| Discounts | Computed on the server by one promotions engine (docs/11). One automatic scheme per item and at most one coupon per order; no fake urgency or fake reviews (docs/14) |
| Commissions | The vendor pays its affiliates directly and records each payout; the platform never holds vendor or affiliate money |
| Languages | Data model localized from day one; extra languages in Phase 2, chosen per tenant |
| Apps | Responsive PWA only. No native apps (API stays reusable) |
| Scale target | Under 50 vendors, under 2k products each in year one; design for 500 vendors without rewrite |
| Hosting | Vercel + MongoDB Atlas, Docker-ready for self-hosting |
| Architecture | Modular monolith (see 01-architecture.md) |
| Stack | Next.js 16 + Payload CMS 3 in one app on MongoDB, as listed in CLAUDE.md and docs/02. A NestJS backend with a separate React frontend was considered and not chosen (mudit, 3 October 2026) |
| Repo | Local development only for now; no GitHub remote |

## Glossary

- **Tenant / vendor / store**: one manufacturer's store. Same thing in code: `tenant`.
- **Platform**: our SaaS, all tenants together.
- **Module**: an optional feature (schemes, affiliate, warranty...) that a tenant may have enabled.
- **Scheme**: a time-bound offer the vendor runs for an occasion (Diwali, Holi, New Year, Wedding
  Season, a special launch): the discount rule, what it applies to, who gets it, its dates and how
  the store shows it. Applied automatically, no code needed.
- **Coupon**: a code a shopper types at the cart (`DIWALI10`), with its own rules and limits.
- **Offer message**: a promotional email or WhatsApp message (scheme launch, abandoned cart
  reminder) sent only to shoppers who opted in to offers. Separate from order updates.
- **Affiliate / referral / commission**: a person the vendor approves to promote the store; an
  order they referred (by link or their coupon); the amount the vendor owes them for it.
- **Trade account** (Phase 2): a dealer, retailer, wholesaler or interior designer buying on trade
  terms (price list, minimum quantities, credit).
- **Connector**: an integration with an external provider (payment, shipping, messaging) configured per tenant.
- **Plan**: a subscription tier that decides which modules and connectors a tenant may enable.
- **Feature flag**: per-tenant on/off switch for a module, constrained by the plan.
- **Vendor UI**: the hardcoded React component folder for one tenant's storefront.
- **Kit**: the shared default storefront components every vendor UI falls back to.
- **Block**: a typed CMS content section (hero, banner, product grid...).
- **Attribute set**: per-category list of product attributes (finish, material, size chart...).
- **Minor units**: integer paise for INR (₹1 = 100).
- **Parcel journey / milestone**: the steps of a shipment (packed, shipped, out for delivery,
  delivered...); a milestone is a step the shopper gets a message about.
- **WABA**: WhatsApp Business Account, the vendor's account on Meta that owns its sending number,
  display name and approved message templates.
- **DLT**: India's telecom registry (TRAI rules) where an SMS sender registers its company, its
  6-letter sender ID, its message templates and the links it may send.

## Phases

- **MVP (Phase 1)**: a vendor can launch a branded, installable store, take paid orders with GST
  invoices, and grow sales with festival schemes, launch offers, coupons, affiliates, wishlist,
  reviews, offer messages and abandoned cart reminders.
- **Phase 2**: trade partners (dealers, retailers, wholesalers, interior designers) with trade
  prices, schemes and dealer anniversary offers, loyalty points, product compare, warranty and
  service, multilingual, custom domains with auto SSL, automated subscription billing.
- **Later**: scale and extras (multi-currency, public API and webhooks for vendors, gift cards, 3D/AR).

Full list in docs/17-roadmap.md. Product research behind it in research/features.html.

## Non-goals (do not build unless a decision changes)

- Shared marketplace, cross-store cart, platform-collected payments and vendor payouts
- Digital goods, services, bookings, subscriptions sold to shoppers
- Multi-warehouse inventory
- Native mobile apps
- Visual theme editor for vendors
