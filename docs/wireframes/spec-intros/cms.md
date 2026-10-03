# Screens: Vendor CMS (each vendor's admin)

Build spec for every vendor CMS screen. Generated from the clickable wireframes by
`node docs/wireframes/build-specs.js`; edit the wireframe or this intro, never the generated
sections by hand. Open `docs/wireframes/index.html` (or https://tenantecom-wireframes.vercel.app)
to see each screen while you read. The sample vendor is the fictional Aquaverde Sanitary.

## What this panel is

- The Payload admin at `admin.<platform-domain>/admin`, scoped to one tenant by
  `@payloadcms/plugin-multi-tenant`. Staff of one vendor only ever see that vendor's data.
- **The same CMS for every vendor.** It is not per-vendor code: vendors differ only by their data,
  plan, feature flags, logo and store name. Never add vendor-specific screens or `if (tenant === x)`.
- Most screens are standard Payload list and edit views of the collections named on each screen.
  Custom views (Payload `admin.components.views` / custom components): Dashboard, CSV import flow,
  Order detail actions and Messages panel, Page builder preview, Order updates settings,
  Reports, the scheme timeline and preview, the offer message composer, the affiliate payout
  form and the review moderation queue.
- Store settings, Menus and Order updates are per-store singleton collections (`isGlobal: true` in
  the multi-tenant plugin) at `/admin/collections/<slug>`, never Payload globals, which every store
  would share (`docs/04`).
- Roles: owner, manager, catalog-editor, order-manager, content-editor, support. What each can do is
  the matrix in `docs/05-auth-and-roles.md` (also drawn on the Staff and roles screen). Hide what a
  role can't use, and enforce it in access control, not just the UI.
- Optional features (schemes, coupons, offer messages, abandoned carts, affiliates, reviews, and in
  Phase 2 service requests, trade accounts, loyalty points) appear in the menu only when their
  feature flag is on, and their collections return no access when off (`docs/08`).

## Menu

Dashboard · Catalog (Products, Categories, Attribute sets, Import and export, Media) · Sales
(Orders, Customers, Enquiries) · Marketing (Schemes and offers, Coupons, Offer messages, Abandoned
carts, Affiliates, Reviews) · Content (Pages, Navigation) · Store (Dealers, Shipping, Payments,
WhatsApp and SMS, Order updates, Settings, Staff and roles) · Insights (Reports) · Modules (Phase 2,
only when switched on: Service requests, Trade accounts, Loyalty points).

## Rules that apply to every screen

- Every query is filtered by `tenant` (`docs/04`). Money: type rupees, store integer paise.
  Prices include GST by default; totals and tax are always computed on the server (`docs/11`).
- Status pills show order, payment and delivery status separately (`docs/11`).
- Discounts are never typed on an order or a product. Schemes and coupons are rules the server
  applies (`docs/11`); the order keeps a snapshot of what was applied.
- Secrets are write-only ("Saved · hidden" + Replace).
- Problems that stop money or messages (failing Razorpay webhook, broken WhatsApp channel) show
  as a banner on every CMS page until fixed.
- When one of our super admins manages the store ("Manage store" in super admin, docs/05), every
  page shows "You are managing Aquaverde as platform admin (Rohit Verma) · reason · ends 11:40";
  they can use every screen, including owner-only ones, and each change lands in the audit log
  with their name and reason. A support login sees the same screens read-only.

## Look and feel (the Design view in the wireframes)

One TenantEcom theme applied to Payload's admin through its custom CSS variables and
`admin.components.graphics` (logo, icon). Light and dark both supported.

| Token | Light | Dark | Used for |
|---|---|---|---|
| Brand | `#2B4ACB` | `#7D93FF` | Primary buttons, active tab, toggles, checkboxes, charts |
| Brand soft | `#E8ECFB` | `#1D2648` | Info callouts, selected chips, row hover |
| Text / secondary / faint | `#111827` / `#4B5565` / `#8A93A3` | `#E8ECF2` / `#A8B2C1` / `#77839A` | Text levels |
| Page / card / line | `#F5F7FA` / `#FFFFFF` / `#E3E7ED` | `#10151D` / `#161C26` / `#283141` | Backgrounds, borders |
| Success | `#0B7A53` on `#E1F3EA` | `#4FCB9C` on `#10302A` | Paid, active, delivered |
| Warning | `#965A00` on `#FCEFD8` | `#F0B355` on `#352812` | Pending, COD to collect, fallback |
| Danger | `#BE3328` on `#FBE5E2` | `#FF8577` on `#3B1B18` | Failed, past due, rejected |
| Sidebar | `#0F1A2B`, active `#1B2A41`, text `#B6C1D2` | `#0B1018`, `#18212F`, `#A0ACBE` | Dark left menu |

Type: Plus Jakarta Sans (UI), IBM Plex Mono (order numbers, SKUs, codes). Cards 12 px radius with a
light shadow; buttons and inputs 8 px radius; status pills are soft-coloured with a dot.

## Phase notes as of 3 October 2026

- **Growth features in Phase 1** (mudit, 3 October 2026): Schemes and offers (Diwali, Holi, New
  Year, Wedding Season, special launch), Coupons, Offer messages, Abandoned carts, Affiliates with
  commissions, Reviews and the wishlist. Schemes and coupons are for retail shoppers in Phase 1;
  commissions go to affiliates only.
- **Phase 2**: Trade accounts for dealers, retailers, wholesalers and interior designers, trade
  schemes and dealer anniversary offers, loyalty points and product compare. The Trade accounts
  screen is drawn as a Phase 2 example.

- **Shiprocket** is a Phase 1 (MVP) connector for post-order handling (moved from Phase 2 by mudit):
  each vendor connects its own account; it answers the pincode check (COD, delivery dates), picks a
  courier by rate when booking, and handles AWB, labels, pickups and tracking. The shopper's
  delivery fee still comes from the vendor's own shipping zones (rate card); live rates at checkout
  are an open question for mudit. Manual shipping stays for vendors with their own vans or couriers. Setup and rules: `docs/09-connectors.md`.
- **WhatsApp and SMS order updates** (Order updates, WhatsApp and SMS screens, Messages panel) are
  drawn as MVP per `docs/18-notifications.md`; still waiting on mudit's confirmation.
