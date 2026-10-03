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

## Screen index

**Access**

- [Sign in and two-step check](#sa-login) `sa-login`

**Overview**

- [Platform dashboard](#sa-dashboard) `sa-dashboard`

**Vendors**

- [All vendors](#sa-vendors) `sa-vendors`
- [New vendor](#sa-vendor-new) `sa-vendor-new`

**Vendor detail**

- [Vendor overview](#sa-vendor) `sa-vendor`
- [Vendor features](#sa-vendor-features) `sa-vendor-features`
- [Vendor connectors](#sa-vendor-connectors) `sa-vendor-connectors`
- [Vendor domains](#sa-vendor-domains) `sa-vendor-domains`
- [Vendor billing](#sa-vendor-billing) `sa-vendor-billing`
- [Vendor staff](#sa-vendor-staff) `sa-vendor-staff`

**Billing**

- [Plans](#sa-plans) `sa-plans`
- [Subscriptions](#sa-subscriptions) `sa-subscriptions`

**Platform**

- [Team and access](#sa-team) `sa-team`

<a id="sa-login"></a>

## Sign in and two-step check

One sign-in page for your team and for every vendor’s staff. After sign-in, the account’s role decides which panel opens.

- **Route:** `/admin/login`
- **Who:** Platform admins, support, vendor staff
- **Collections:** `users`
- **Read first:** `docs/05-auth-and-roles.md`
- **Wireframe:** `docs/wireframes/index.html#sa-login`
- **Links to:** [Platform dashboard](#sa-dashboard), [Store dashboard](vendor-cms.md#cms-dashboard)

### On the screen (top to bottom, sample data)

- TE TenantEcom admin
- Heading: Sign in
- Field: Email (sample: “rohit@tenantecom.in”)
- Field: Password (sample: “•••••••••••• Show”)
- Checkbox: Keep me signed in on this device
- Actions: Sign in
- Notice: “(locked) Too many attempts. Try again in 15 minutes, or reset your password.”
- Section: Step 2 of 2
- Heading: Two-step verification
- Text: Enter the 6-digit code from your authenticator app.
- 6-digit code boxes
- Actions: Verify and continue · see CMS dashboard

### Rules and behaviour

1. Same Payload admin login for everyone. Platform admins land on the platform dashboard; vendor staff land on their own store’s dashboard and never see other stores.
2. Two-step verification (authenticator app) is required for platform admins and recommended for vendor owners.
3. After 5 wrong passwords the account locks for 15 minutes. Messages never reveal whether an email has an account. The session lasts 8 hours in an HTTP-only cookie.

<a id="sa-dashboard"></a>

## Platform dashboard

The first screen your team sees: how many stores are live, what the platform earns, total sales across stores, and anything that needs action.

- **Route:** `/admin`
- **Who:** Super admin; support sees it read-only
- **Collections:** `tenants`, `subscriptions`, `orders (all tenants)`, `connector-configs`, `tenant-domains`
- **Read first:** `docs/17-roadmap.md`, `docs/15-scalability-and-ops.md`
- **Wireframe:** `docs/wireframes/index.html#sa-dashboard`
- **Links to:** [New vendor](#sa-vendor-new), [All vendors](#sa-vendors), [Subscriptions](#sa-subscriptions), [Vendor connectors](#sa-vendor-connectors), [Vendor domains](#sa-vendor-domains), [Vendor overview](#sa-vendor)

### On the screen (top to bottom, sample data)

- Page title: Good morning, Rohit (Friday, 2 October 2026 · all stores)
- Actions: New vendor
- Figure: Live stores = 42 (38 paying · 4 on trial)
- Figure: MRR = ₹3.70 L (before GST)
- Figure: Past due = 2 (₹17,697.64 outstanding)
- Figure: Orders today = 1,284 (across all stores)
- Figure: GMV, September = ₹2.62 Cr (paid orders, incl. GST)
- **Sales across all stores, September**
  - Bar chart (x: 1 Sep 15 Sep 30 Sep)
- **Needs attention**
  - Row: Aquaverde Sanitary Razorpay webhook failing since 10:42 Payments → Vendor connectors
  - Row: Ironclad Locks Meta rejected the WhatsApp “Shipped” template Messaging → Vendor connectors
  - Row: Loomhouse Apparel Subscription past due for 9 days Billing → Subscriptions
  - Row: Hingewell Hardware shop.hingewell.com waiting for SSL Domain [P2] → Vendor domains
  - Row: Loomhouse Apparel 1,880 of 2,000 products used (94%) Limit → All vendors
  - Row: Brasskraft Fittings Trial ends Wed, 14 Oct Trial → Subscriptions
- **Top stores this month**
  - Table: Vendor, Industry, Orders, GMV, vs August
    - row: Loomhouse Apparel | Clothing | 2,104 | ₹46.8 L | +12%
    - row: Aquaverde Sanitary | Sanitary | 1,312 | ₹33.7 L | +8%
    - row: Hingewell Hardware | Hardware | 903 | ₹28.1 L | −3%
    - row: Ironclad Locks | Locks | 742 | ₹19.6 L | +21%
    - row: Teakline Decor | Decor | 286 | ₹12.4 L | +5%
- **Recently onboarded**
  - Row: Brasskraft Fittings Trial · products imported 212 Trialing → Vendor overview
  - Row: Doorcraft Interiors Owner has not accepted the invite Resend invite
  - Row: Ironclad Locks Live since 18 Sep Active → Vendor overview

### Rules and behaviour

1. MRR comes from subscriptions; GMV is the sum of paid orders across all stores, stored in paise. Suggest a nightly rollup per store so this page stays fast at 500 stores instead of scanning every order.
2. Needs attention collects past-due subscriptions, failing connectors (connector-configs.lastError), rejected or paused WhatsApp and SMS templates, domains waiting for SSL and stores above 90% of a plan limit. Each row opens the right vendor tab.
3. The support role sees the same page without edit buttons.

<a id="sa-vendors"></a>

## All vendors

Every vendor store on the platform, with its plan, subscription state and how much of its plan it uses.

- **Route:** `/admin/collections/tenants`
- **Who:** Super admin; support read-only
- **Collections:** `tenants`, `subscriptions`, `plans`
- **Read first:** `docs/04-multi-tenancy.md`, `docs/06-data-model.md`
- **Wireframe:** `docs/wireframes/index.html#sa-vendors`
- **Links to:** [New vendor](#sa-vendor-new), [Vendor overview](#sa-vendor)

### On the screen (top to bottom, sample data)

- Page title: Vendors (46 stores · 42 live)
- Actions: Export CSV · New vendor
- Tabs: All 46 · Active 42 · Draft 1 · Suspended 1 · Archived 2
- Field (sample: “Search name, slug or GSTIN”)
- Select (sample: “Plan: all”)
- Select (sample: “Industry: all”)
- Select (sample: “Subscription: all”)
- Table: Vendor, Industry, Plan, Store, Subscription, Products, Orders, 30 days, Created
  - row: Aquaverde Sanitary aquaverde.tenantecom.in | Sanitary | Growth | Active | Active | 1,240 / 2,000 | 1,312 | 12 Aug 2026
  - row: Loomhouse Apparel loomhouse.in | Clothing | Growth | Active | Past due | 1,880 / 2,000 94% used | 2,104 | 3 Jun 2026
  - row: Hingewell Hardware hingewell.com | Hardware | Enterprise | Active | Active | 4,620 / 10,000 | 903 | 21 Apr 2026
  - row: Ironclad Locks ironclad.tenantecom.in | Locks | Growth | Active | Active | 486 / 2,000 | 742 | 18 Sep 2026
  - row: Teakline Decor teakline.tenantecom.in | Decor | Starter | Active | Active | 318 / 500 | 286 | 9 Jul 2026
  - row: Brasskraft Fittings brasskraft.tenantecom.in | Hardware | Starter | Active | Trialing | 212 / 500 | 38 | 30 Sep 2026
  - row: Doorcraft Interiors No domain yet | Hardware | Starter | Draft | — | 0 / 500 | 0 | 1 Oct 2026
  - row: Kalakriti Home kalakriti.tenantecom.in | Decor | Growth | Suspended | Paused | 402 / 2,000 | 0 | 12 Mar 2026
- Actions: Previous · Next
- Text: Row clicks open the vendor detail

### Rules and behaviour

1. Store status (draft, active, suspended, archived) is separate from subscription status (trialing, active, past due, paused, cancelled), so a store can be live while its payment is late.
2. Products used against the plan’s product limit. At 90% the row is flagged and the vendor sees a warning in their CMS.
3. Clicking a row opens the vendor detail tabs. New vendor runs the same steps as the create-tenant script.

<a id="sa-vendor-new"></a>

## New vendor

Your team onboards a manufacturer in one form: business and GST details, store address, plan, starting features and the owner’s login.

- **Route:** `/admin/collections/tenants/create`
- **Who:** Super admin
- **Collections:** `tenants`, `tenant-domains`, `subscriptions`, `feature-flags`, `users`, `site-settings`
- **Read first:** `docs/04-multi-tenancy.md`, `docs/08-modules-and-feature-flags.md`, `docs/10-storefront-and-vendor-ui.md`
- **Wireframe:** `docs/wireframes/index.html#sa-vendor-new`
- **Links to:** [Vendor overview](#sa-vendor)

### On the screen (top to bottom, sample data)

- Page title: New vendor (Creates a draft store. It goes live when you switch the store to active.)
- Heading: 1 Business
- Text: Legal details used on GST invoices.
- Field: Store name * (sample: “Brasskraft Fittings”)
- Field: Legal name * (sample: “Brasskraft Industries Pvt Ltd”)
- Field: GSTIN * (sample: “24AAKCB1234F1Z5”) — PAN and state fill in from the GSTIN
- Field: PAN (sample: “AAKCB1234F”) — From GSTIN
- Select: State (sample: “Gujarat (24)”)
- Field: Registered address (sample: “Plot 41, GIDC Phase 2, Dared, Jamnagar 361004”)
- Field: Industry *
- Field: Support email (sample: “care@brasskraft.example”)
- Field: Support phone (sample: “1800 000 0000”)
- Heading: 2 Store
- Text: Address and defaults.
- Field: Slug * (sample: “brasskraft”) — Store address: brasskraft.tenantecom.in · cannot be changed later
- Select: Default language [more in P2] (sample: “English”)
- Select: Currency (sample: “INR (₹)”) — Fixed to INR in the MVP
- Select: Time zone (sample: “Asia/Kolkata”)
- Notice: “Storefront design: uses the shared default kit until our team adds src/storefront/vendors/brasskraft. Design is never set from this panel.”
- Heading: 3 Plan and trial
- Text: The plan caps features, connectors and limits.
- Starter ₹4,999 / month 500 products · 3 staff
- Growth ₹9,999 / month 2,000 products · 10 staff
- Enterprise ₹24,999 / month 10,000 products · 30 staff
- Select: Free trial (sample: “14 days”)
- Field: Billing
- Heading: 4 Starting features
- Text: Preset for Hardware. You can change these any time.
- [on] Guest checkout
- [on] Cash on delivery
- [on] Enquiries inbox
- [on] Enquire-only products preset
- [on] Dealer locator preset
- [on] Downloads page preset
- [on] WhatsApp button
- [on] Pincode check
- [on] Product videos
- [off] Size guide
- [on] Schemes and offers
- [on] Coupons
- [on] Wishlist
- [on] Reviews
- [on] Offer messages
- [on] Abandoned cart reminders
- [locked] (locked) Affiliate program Growth plan · in the Hardware preset
- Part shown only as: P2
  - [locked] (locked) Trade accounts Enterprise plan
- Part shown only as: P2
  - [locked] (locked) Product compare Growth plan
- Heading: 5 Owner login
- Text: The owner can add their own staff later.
- Field: Owner name * (sample: “Hitesh Vora”)
- Field: Owner email * (sample: “hitesh@brasskraft.example”)
- Field: Mobile (sample: “+91 90000 00000”)
- Field: Security
- ✓ Email the invite now
- **Will be created**
  - Row: Draft store Brasskraft Fittings
  - Row: brasskraft.tenantecom.in
  - Row: Starter plan, 14-day trial
  - Row: 15 features on from the defaults and the Hardware preset
  - Row: Store settings, counters, tax rates, empty menu
  - Row: Invite to hitesh@brasskraft.example
  - Actions: Create vendor · Save as draft
- Notice: “Next steps for our team: start the WhatsApp (Meta) and SMS (DLT) approvals on day one, because they take a few days. Then the vendor UI folder, CSV import, Razorpay keys and shipping zones. See docs/10 and docs/18.”

### Rules and behaviour

1. GSTIN fills in the PAN and the GST state code. The state code decides CGST plus SGST (same state) or IGST (other state) on every invoice.
2. The slug is permanent. It becomes the subdomain and the name of the vendor’s UI folder in code.
3. Choosing an industry pre-selects features from the preset, but only those the chosen plan allows.
4. There is no self sign-up. The owner gets an emailed invite to set a password and can then invite their own staff.
5. Creating also sets up store settings, invoice and order counters, default tax rates and an empty navigation, the same as the create-tenant script.

<a id="sa-vendor"></a>

## Vendor overview

One vendor at a glance: business details, plan usage, store health and recent changes, with tabs for everything you control.

- **Route:** `/admin/collections/tenants/:id`
- **Who:** Super admin; support read-only
- **Collections:** `tenants`, `subscriptions`, `plans`, `connector-configs`, `audit-logs`
- **Read first:** `docs/04-multi-tenancy.md`, `docs/14-security-and-compliance.md`
- **Wireframe:** `docs/wireframes/index.html#sa-vendor`
- **Links to:** [Home](storefront.md#st-home), [Store dashboard](vendor-cms.md#cms-dashboard), [Vendor features](#sa-vendor-features), [Vendor connectors](#sa-vendor-connectors), [Vendor domains](#sa-vendor-domains), [Vendor billing](#sa-vendor-billing), [Vendor staff](#sa-vendor-staff)

### On the screen (top to bottom, sample data)

- Image: Logo
- Heading: Aquaverde Sanitary
- Store active Growth plan aquaverde.tenantecom.in Sanitary · Morbi, Gujarat
- Actions: View store · Manage store · View as support · Suspend store
- Tabs: Overview · Features · Connectors · Domains · Billing · Staff
- **Business details**
  - Actions: Edit
  - Aquaverde Ceramics Pvt Ltd
  - 24AAQCA4821K1Z9
  - AAQCA4821K
  - Gujarat (24)
  - Survey 112, National Highway 8-A, Morbi, Gujarat 363642
  - Sanitary
  - care@aquaverde.example
  - +91 90000 00000
  - 12 Aug 2026 by Ananya Iyer
  - 20 Aug 2026
- **Manage this store**
  - Part shown only as: P2
    - Dealers, retailers, wholesalers, designers
  - Field (sample: “Reason, for example: vendor asked us to set up the Diwali scheme”)
  - Actions: Manage store
- **Internal notes**
  - Text area (sample: “Visible to our team only. For example: prefers WhatsApp, renewal call in March.”)
- **Recent changes**
  - Row: 2 Oct Rohit managed the store: added coupon AQUA500 (vendor asked by phone)
  - Row: 28 Sep Ananya switched on Dealer locator
  - Row: 19 Aug Priya (owner) added live Razorpay keys
  - Row: 15 Aug Plan changed from Starter to Growth
  - Row: 12 Aug Store created with the Sanitary preset
- **Plan usage**
  - Usage bar: Products 1,240 / 2,000
  - Usage bar: Staff users 6 / 10
  - Usage bar: Storage 7.8 / 20 GB
  - Usage bar: Orders this month 64 / 5,000
- **Store health**
  - Row: Last order 4 min ago
  - Row: Razorpay, live Webhook failing → Vendor connectors
  - Row: Primary domain aquaverde.tenantecom.in → Vendor domains
  - Row: Storefront design vendors/aquaverde

### Rules and behaviour

1. Suspend shows shoppers a “store unavailable” page and blocks staff edits. Nothing is deleted, and resuming brings the store back as it was.
2. “Manage store” (super admins only) opens the vendor’s CMS with full edit rights: products, categories, customers, affiliates, orders, payments, inventory, schemes, coupons, commissions, order updates and offer messages, reports, pages and menus, staff and roles, and settings. A reason is asked once, the session lasts 2 hours, a banner shows on every CMS page, and every change is written to the audit log, which the vendor owner can see. “View as support” opens the same CMS read-only, also logged.
3. Usage is measured against the plan’s limits. Vendors see the same meters in their CMS.

<a id="sa-vendor-features"></a>

## Vendor features

Switch optional features on or off for one vendor, within what their plan allows.

- **Route:** `/admin/collections/tenants/:id (Features tab)`
- **Who:** Super admin
- **Collections:** `feature-flags`, `plans`
- **Read first:** `docs/08-modules-and-feature-flags.md`
- **Wireframe:** `docs/wireframes/index.html#sa-vendor-features`
- **Links to:** [Home](storefront.md#st-home), [Store dashboard](vendor-cms.md#cms-dashboard), [Vendor overview](#sa-vendor), [Vendor connectors](#sa-vendor-connectors), [Vendor domains](#sa-vendor-domains), [Vendor billing](#sa-vendor-billing), [Vendor staff](#sa-vendor-staff), [Plans](#sa-plans)

### On the screen (top to bottom, sample data)

- Image: Logo
- Heading: Aquaverde Sanitary
- Store active Growth plan aquaverde.tenantecom.in Sanitary · Morbi, Gujarat
- Actions: View store · Manage store · View as support · Suspend store
- Tabs: Overview · Features · Connectors · Domains · Billing · Staff
- Notice: “Growth plan · industry preset Sanitary applied on 12 Aug 2026 Re-apply preset Compare plans”
- Section: Always on
- ✓ Catalog ✓ Cart and checkout ✓ Orders and GST invoices ✓ CMS pages ✓ Customers ✓ CSV import
- **MVP features**
  - Table: Feature, Key, In plan, On
    - row: Guest checkout | guest-checkout | ✓ | [on]
    - row: Cash on delivery | cod | ✓ | [on]
    - row: Enquiries inbox | enquiries | ✓ | [on]
    - row: Enquire-only products preset | enquire-only-products | ✓ | [on]
    - row: Dealer locator preset | dealer-locator | ✓ | [on]
    - row: Downloads page preset | downloads | ✓ | [on]
    - row: WhatsApp button | whatsapp-button | ✓ | [on]
    - row: Pincode check | pincode-check | ✓ | [on]
    - row: Product videos preset | product-videos | ✓ | [on]
    - row: Size guide | size-guide | ✓ | [off]
- **Growth features, Phase 1**
  - Table: Feature, Key, In plan, On
    - row: Schemes and offers Festival schemes, launch offers | schemes | ✓ | [on] | Settings
    - row: Coupons | coupons | ✓ | [on] | —
    - row: Wishlist | wishlist | ✓ | [on] | —
    - row: Reviews and ratings | reviews | ✓ | [on] | Settings
    - row: Offer messages Offer emails to opted-in shoppers | offer-messages | ✓ | [on] | Settings
    - row: WhatsApp offers Offers and cart reminders on WhatsApp, about ₹1.02 each on the vendor’s Meta bill. Needs Offer messages | whatsapp-offers | ✓ | [off] | —
    - row: Abandoned cart reminders Needs Offer messages | abandoned-cart | ✓ | [on] | —
    - row: Affiliate program Commissions to affiliates | affiliate | ✓ | [off] | Settings
- Part shown only as: Phase 2
  - **Phase 2 modules**
    - Table: Feature, Key, In plan, On
      - row: Warranty registration | warranty | ✓ | [off] | Settings
      - row: Service requests Needs Warranty registration | service-requests | ✓ | [off] | —
      - row: Spare parts finder | spare-parts | ✓ | [off] | —
      - row: Product compare | compare | ✓ | [off] | —
      - row: Loyalty points | loyalty | ✓ | [off] | Settings
      - row: Multilingual store | multilingual | ✓ | [off] | Settings
      - row: Trade accounts Dealers, retailers, wholesalers, interior designers | b2b | (locked) Enterprise | [locked] (locked) | —
      - row: Trade schemes and dealer anniversary Needs Trade accounts and Schemes | trade-schemes | (locked) Enterprise | [locked] (locked) | —
- Text: Saved changes reach the live store right away. Switching off keeps the data.

### Rules and behaviour

1. A feature works only when the plan allows it and the switch is on. The plan is the ceiling; this switch is the per-vendor choice.
2. Locked rows are not in the vendor’s plan. Change the plan first, from the Billing tab or Plans.
3. Some features depend on others. Abandoned cart reminders need Offer messages, Service requests needs Warranty registration and Trade schemes need Trade accounts, so switching one on asks to switch both.
4. Switching a feature off hides its CMS screens and makes its store pages and API return “not found”. The data stays, so switching back on restores it. Changes reach the live store right away.
5. The industry preset only fills defaults when the store is created. Re-applying it is a deliberate action.
6. Schemes, coupons, wishlist, reviews, offer messages, abandoned cart reminders and affiliates moved into Phase 1 on 3 October 2026. The first six are on for every new store; affiliates follow the industry preset and the plan. Settings opens the feature’s config, including the platform caps (for example offer messages per shopper per week).
7. WhatsApp offers are switched on or off here by our team, per vendor, when the vendor asks. The vendor has no switch of its own. Switching on also means submitting the vendor’s WhatsApp marketing templates; until they are approved, offers keep going by email.

<a id="sa-vendor-connectors"></a>

## Vendor connectors

Decide which payment, shipping and messaging providers a vendor may use, and watch their health. The vendor enters their own keys.

- **Route:** `/admin/collections/tenants/:id (Connectors tab)`
- **Who:** Super admin
- **Collections:** `connector-configs`, `plans`
- **Read first:** `docs/09-connectors.md`, `docs/14-security-and-compliance.md`
- **Wireframe:** `docs/wireframes/index.html#sa-vendor-connectors`
- **Links to:** [Home](storefront.md#st-home), [Store dashboard](vendor-cms.md#cms-dashboard), [Vendor overview](#sa-vendor), [Vendor features](#sa-vendor-features), [Vendor domains](#sa-vendor-domains), [Vendor billing](#sa-vendor-billing), [Vendor staff](#sa-vendor-staff), [Payments](vendor-cms.md#cms-payments)

### On the screen (top to bottom, sample data)

- Image: Logo
- Heading: Aquaverde Sanitary
- Store active Growth plan aquaverde.tenantecom.in Sanitary · Morbi, Gujarat
- Actions: View store · Manage store · View as support · Suspend store
- Tabs: Overview · Features · Connectors · Domains · Billing · Staff
- Notice: “Razorpay webhook failing since 10:42 today 14 events failed the signature check. The webhook secret saved in the CMS probably does not match the one in Razorpay. Orders paid since then are being settled by the 15-minute reconciliation job. Email the owner Open vendor CMS”
- **Payments**
  - Razorpay [on] Allowed
  - Row: Connected by Priya Shah (owner), 19 Aug
  - Row: Mode Live
  - Row: Key ID rzp_live_••••••a91F
  - Row: Key secret Encrypted, never shown
  - Row: Last webhook OK Today 10:41
  - Row: Last error 10:42 signature mismatch
  - Cash on delivery Feature switch, see Features
- **Shipping**
  - Manual shipping Always on
  - Shiprocket [on] Allowed
- **Order updates to shoppers**
  - WhatsApp (Meta Cloud API) [on] Allowed
  - Quality high 2,000 a day 14 order templates approved 3 offer templates approved
  - Offer messages use marketing templates, about ₹1.02 each incl. GST on the vendor’s Meta bill. Our team switches WhatsApp offers on per vendor in the Features tab.
  - SMS (MSG91 with DLT) [on] Allowed
  - Field: Daily SMS limit for this store (sample: “2,000”) — Alert at 80%. Today: 312 sent.
  - Email Platform Resend
  - Part shown only as: Phase 2
    - Self-serve “Connect WhatsApp” [off] Allowed

### Rules and behaviour

1. “Allowed” is your switch, capped by the plan. The vendor owner then connects the provider with their own keys from their CMS, so money goes straight to the vendor’s account.
2. Secrets are encrypted at rest and are never shown here, in the CMS, in logs or in the browser.
3. Health comes from the last webhook and the last error. A failing webhook means payments may not be marked paid, so it also appears on the platform dashboard.
4. WhatsApp and SMS order updates go out from the vendor’s own accounts (ADR 0005). Your team sets them up during onboarding and sets each store’s daily SMS limit. Planned for the MVP; still waiting on your MVP or Phase 2 call.
5. Offer messages (Phase 1) reuse the same WhatsApp number with separate marketing templates, approved by Meta per vendor. Your team submits the starter offer templates at onboarding if the vendor wants WhatsApp offers; offer emails need no extra setup.

<a id="sa-vendor-domains"></a>

## Vendor domains

The web addresses that open this vendor’s store, and which one is primary.

- **Route:** `/admin/collections/tenant-domains?tenant=:id`
- **Who:** Super admin
- **Collections:** `tenant-domains`
- **Read first:** `docs/04-multi-tenancy.md`, `docs/15-scalability-and-ops.md`
- **Wireframe:** `docs/wireframes/index.html#sa-vendor-domains`
- **Links to:** [Home](storefront.md#st-home), [Store dashboard](vendor-cms.md#cms-dashboard), [Vendor overview](#sa-vendor), [Vendor features](#sa-vendor-features), [Vendor connectors](#sa-vendor-connectors), [Vendor billing](#sa-vendor-billing), [Vendor staff](#sa-vendor-staff)

### On the screen (top to bottom, sample data)

- Image: Logo
- Heading: Aquaverde Sanitary
- Store active Growth plan aquaverde.tenantecom.in Sanitary · Morbi, Gujarat
- Actions: View store · Manage store · View as support · Suspend store
- Tabs: Overview · Features · Connectors · Domains · Billing · Staff
- **Domains**
  - Table: Host, Type, Primary, DNS, SSL
    - row: aquaverde.tenantecom.in | Subdomain | Primary | Managed by us | Active | —
    - row: shop.aquaverde.in | Custom [P2] | Make primary | CNAME found | Issuing certificate | —
    - row: aquaverde.in | Custom [P2] | — | Not found | — | Check again
- Part shown only as: Phase 2
  - **Add a custom domain**
    - Field: Domain (sample: “www.aquaverde.in”)
    - Actions: Add domain
    - Notice: “Ask the vendor to add this DNS record CNAME www → cname.tenantecom.in The certificate is issued automatically once the record is found.”
- **Settings**
  - [on] Send other domains to the primary domain (permanent redirect)

### Rules and behaviour

1. In the MVP every store gets a subdomain of the platform domain, ready the moment the vendor is created.
2. Custom domains with automatic SSL come in Phase 2. The request’s host name is looked up here (cached) to find the store on every visit.
3. Only one domain is primary. With redirect on, the others send visitors and search engines to it with a permanent redirect.

<a id="sa-vendor-billing"></a>

## Vendor billing

This vendor’s subscription: plan, price, status and payment history, with a way to record payments by hand in the MVP.

- **Route:** `/admin/collections/subscriptions/:id`
- **Who:** Super admin
- **Collections:** `subscriptions`, `plans`, `platform-invoices`
- **Read first:** `docs/06-data-model.md`, `docs/00-overview.md`
- **Wireframe:** `docs/wireframes/index.html#sa-vendor-billing`
- **Links to:** [Home](storefront.md#st-home), [Store dashboard](vendor-cms.md#cms-dashboard), [Vendor overview](#sa-vendor), [Vendor features](#sa-vendor-features), [Vendor connectors](#sa-vendor-connectors), [Vendor domains](#sa-vendor-domains), [Vendor staff](#sa-vendor-staff), [Plans](#sa-plans)

### On the screen (top to bottom, sample data)

- Image: Logo
- Heading: Aquaverde Sanitary
- Store active Growth plan aquaverde.tenantecom.in Sanitary · Morbi, Gujarat
- Actions: View store · Manage store · View as support · Suspend store
- Tabs: Overview · Features · Connectors · Domains · Billing · Staff
- **Subscription**
  - Growth · ₹9,999 / month
  - ₹9,999 + 18% = ₹11,798.82
  - Active
  - Manual [Razorpay in P2]
  - 1 Oct to 31 Oct 2026
  - Sun, 1 Nov 2026
  - Actions: Record payment · Change plan · Pause · Cancel subscription
- **History**
  - Table: Date, Event, Amount, Reference, By
    - row: 1 Oct 2026 | Payment recorded | ₹11,798.82 | NEFT · UTR ending 4417 | Ananya
    - row: 2 Sep 2026 | Payment recorded | ₹11,798.82 | UPI · ref ending 9032 | Ananya
    - row: 15 Aug 2026 | Plan changed, Starter to Growth | — | — | Rohit
    - row: 12 Aug 2026 | Trial started, 14 days | — | — | Ananya
- **Record payment**
  - Field: Amount (sample: “₹11,798.82”)
  - Field: Paid on (sample: “1 Oct 2026”)
  - Select: Method (sample: “NEFT / RTGS”)
  - Field: UTR or reference (sample: “For example SBIN0000000000”)
  - Select: Covers (sample: “October 2026”)
  - Actions: Save payment
- Part shown only as: Phase 2
  - **Invoices to vendor**
    - Row: TE/2026-27/0142 ₹11,798.82
    - Row: TE/2026-27/0097 ₹11,798.82

### Rules and behaviour

1. Plan price plus 18% GST. Our invoice to the vendor carries their GSTIN so they can claim input tax credit.
2. MVP billing is manual: your team records bank transfers and UPI payments. When a period ends unpaid the status becomes past due; suspending the store stays your team’s decision.
3. Recording a payment moves the period forward and adds a line to the history.
4. Phase 2 switches to Razorpay Subscriptions: automatic charges, status changes from webhooks, and GST invoices to vendors generated as PDFs.

<a id="sa-vendor-staff"></a>

## Vendor staff

The people who can sign in to this vendor’s CMS, their roles and their security status.

- **Route:** `/admin/collections/users?tenant=:id`
- **Who:** Super admin; vendor owners manage the same list in their CMS
- **Collections:** `users`
- **Read first:** `docs/05-auth-and-roles.md`
- **Wireframe:** `docs/wireframes/index.html#sa-vendor-staff`
- **Links to:** [Home](storefront.md#st-home), [Store dashboard](vendor-cms.md#cms-dashboard), [Vendor overview](#sa-vendor), [Vendor features](#sa-vendor-features), [Vendor connectors](#sa-vendor-connectors), [Vendor domains](#sa-vendor-domains), [Vendor billing](#sa-vendor-billing)

### On the screen (top to bottom, sample data)

- Image: Logo
- Heading: Aquaverde Sanitary
- Store active Growth plan aquaverde.tenantecom.in Sanitary · Morbi, Gujarat
- Actions: View store · Manage store · View as support · Suspend store
- Tabs: Overview · Features · Connectors · Domains · Billing · Staff
- Usage bar: Staff users 6 / 10
- Actions: Invite staff
- Table: Name, Email, Roles, Two-step, Last sign-in
  - row: Priya Shah | priya@aquaverde.example | Owner | On | Today 09:05 | —
  - row: Arjun Mehta | arjun@aquaverde.example | Manager | On | Yesterday | —
  - row: Neha Patel | neha@aquaverde.example | Catalog editor | Off | Today 09:12 | Reset two-step
  - row: Imran Sheikh | imran@aquaverde.example | Order manager | Off | Today 08:40 | —
  - row: Kavya Rao | kavya@aquaverde.example | Content editor | Off | 28 Sep | —
  - row: Support desk | support@aquaverde.example | Support | Off | 30 Sep | —
- Text: Platform team can manage every vendor’s staff · Two-step resets are logged

### Rules and behaviour

1. Your team can add, remove or change any vendor’s staff. Vendor owners do the same for their own store from CMS, Staff and roles.
2. Roles are per store. One person can work for two stores with different roles, and never sees a store they are not added to.
3. Reset two-step verification when someone loses their phone. The reset is logged.
4. The staff count is capped by the plan.

<a id="sa-plans"></a>

## Plans

Subscription tiers: price, limits, and which features and connectors each tier allows.

- **Route:** `/admin/collections/plans`
- **Who:** Super admin
- **Collections:** `plans`
- **Read first:** `docs/08-modules-and-feature-flags.md`, `docs/06-data-model.md`
- **Wireframe:** `docs/wireframes/index.html#sa-plans`

### On the screen (top to bottom, sample data)

- Page title: Plans (3 active plans)
- Actions: New plan
- **Starter**
  - ₹49,990 / year · plus GST
  - Row: Products 500
  - Row: Staff users 3
  - Row: Storage 5 GB
  - Row: Orders / month 1,000
  - Actions: Edit plan
- **Growth**
  - ₹99,990 / year · plus GST
  - Row: Products 2,000
  - Row: Staff users 10
  - Row: Storage 20 GB
  - Row: Orders / month 5,000
  - Actions: Edit plan
- **Enterprise**
  - ₹2,49,990 / year · plus GST
  - Row: Products 10,000
  - Row: Staff users 30
  - Row: Storage 100 GB
  - Row: Orders / month No limit
  - Actions: Edit plan
- **Features allowed**
  - Table: Feature, Phase, Starter, Growth, Enterprise
    - row: Guest checkout, COD, pincode check | MVP | ✓ | ✓ | ✓
    - row: Enquiries, enquire-only products | MVP | ✓ | ✓ | ✓
    - row: Dealer locator, downloads, product videos | MVP | ✓ | ✓ | ✓
    - row: WhatsApp button, size guide | MVP | ✓ | ✓ | ✓
    - row: Schemes and offers, coupons | MVP | ✓ | ✓ | ✓
    - row: Wishlist, reviews | MVP | ✓ | ✓ | ✓
    - row: Offer messages, abandoned cart reminders | MVP | ✓ | ✓ | ✓
    - row: Affiliate program and commissions | MVP | — | ✓ | ✓
    - row: Warranty and service requests | [P2] | — | ✓ | ✓
    - row: Spare parts finder, product compare | [P2] | — | ✓ | ✓
    - row: Loyalty points | [P2] | — | ✓ | ✓
    - row: Multilingual store | [P2] | — | ✓ | ✓
    - row: Trade accounts: dealers, retailers, wholesalers, interior designers | [P2] | — | — | ✓
    - row: Trade schemes, dealer anniversary offers | [P2] | — | — | ✓
- **Connectors allowed**
  - Table: Connector, Phase, Starter, Growth, Enterprise
    - row: Razorpay | MVP | ✓ | ✓ | ✓
    - row: Manual shipping | MVP | ✓ | ✓ | ✓
    - row: WhatsApp order updates | MVP | ✓ | ✓ | ✓
    - row: SMS order updates | MVP | ✓ | ✓ | ✓
    - row: Shiprocket | MVP | ✓ | ✓ | ✓

### Rules and behaviour

1. Plan names, prices and limits here are placeholders until you set them.
2. A plan is a ceiling, not a switch. Vendors on Growth can have Warranty, but it is off until someone switches it on in their Features tab.
3. Removing a feature from a plan first lists the vendors using it. Their data is kept and the feature is switched off for them.
4. Limits are checked on the server. Suggested behaviour: warn at 90%, block new products at 100% with a clear message.

<a id="sa-subscriptions"></a>

## Subscriptions

Who pays what, who is on trial and who owes money, across all vendors.

- **Route:** `/admin/collections/subscriptions`
- **Who:** Super admin; support read-only
- **Collections:** `subscriptions`, `plans`, `tenants`
- **Read first:** `docs/06-data-model.md`, `docs/17-roadmap.md`
- **Wireframe:** `docs/wireframes/index.html#sa-subscriptions`
- **Links to:** [Vendor billing](#sa-vendor-billing)

### On the screen (top to bottom, sample data)

- Page title: Subscriptions (Manual billing [Automatic in P2])
- Actions: Export CSV
- Figure: MRR = ₹3.70 L (38 paying vendors, before GST)
- Figure: On trial = 4 (2 end this week)
- Figure: Past due = 2 (₹17,697.64 incl. GST)
- Figure: Renewing in 7 days = 11 (₹1,42,786 incl. GST)
- Tabs: All 44 · Trialing 4 · Active 36 · Past due 2 · Paused 1 · Cancelled 1
- Table: Vendor, Plan, Status, Billing, Period ends, Amount incl. GST, Last payment
  - row: Loomhouse Apparel | Growth | Past due | Manual | 22 Sep 2026 | ₹11,798.82 | 24 Aug | Record payment
  - row: Saffron Weaves | Starter | Past due | Manual | 30 Sep 2026 | ₹5,898.82 | 1 Sep | Record payment
  - row: Brasskraft Fittings | Starter | Trialing | Manual | Trial ends 14 Oct | ₹5,898.82 | — | —
  - row: Aquaverde Sanitary | Growth | Active | Manual | 31 Oct 2026 | ₹11,798.82 | 1 Oct | —
  - row: Hingewell Hardware | Enterprise | Active | Manual | 31 Oct 2026 | ₹29,498.82 | 1 Oct | —
  - row: Kalakriti Home | Growth | Paused | — | — | — | 12 Mar | —
- Part shown only as: Phase 2
  - Notice: “Razorpay Subscriptions: vendors pay by card or UPI autopay; failed charges retry and move the status to past due automatically.”

### Rules and behaviour

1. In the MVP this is your team’s billing desk: payments arrive by bank transfer or UPI and are recorded by hand.
2. Past due starts the day after a period ends unpaid. Suggested: the vendor sees a banner in their CMS; suspending the store stays a manual decision.
3. From Phase 2, Razorpay Subscriptions charges vendors automatically and webhooks move these statuses without anyone typing.

<a id="sa-team"></a>

## Team and access

Your own team’s accounts: who can change things across all vendors and who can only look.

- **Route:** `/admin/collections/users?platformRole=*`
- **Who:** Super admin
- **Collections:** `users`
- **Read first:** `docs/05-auth-and-roles.md`, `docs/14-security-and-compliance.md`
- **Wireframe:** `docs/wireframes/index.html#sa-team`

### On the screen (top to bottom, sample data)

- Page title: Team and access (4 people)
- Actions: Invite teammate
- Table: Name, Email, Role, Two-step, Last sign-in
  - row: Rohit Verma | rohit@tenantecom.in | Super admin | On | Today 08:58 | —
  - row: Ananya Iyer | ananya@tenantecom.in | Super admin | On | Yesterday | —
  - row: Sahil Khan | sahil@tenantecom.in | Support | On | Today 09:20 | —
  - row: Meera Joshi | meera@tenantecom.in | Support | On | 29 Sep | —
- **Invite a teammate**
  - Field: Email (sample: “name@tenantecom.in”)
  - Field: Role
  - Actions: Send invite
- **Security**
  - Row: Two-step verification [locked] (locked) Required
  - Row: Session length 8 hours
  - Row: Lock after failed sign-ins 5 tries, 15 min
  - Row: Support access log [Viewer later]

### Rules and behaviour

1. Two platform roles, our team only. Super admin has complete control of every store (Manage store opens its CMS with full edit, audited); Support can open any store read-only to help.
2. Two-step verification is required for every platform account and cannot be switched off.
3. Every time someone from our team manages or views a vendor’s CMS it is logged with the reason, and every change made while managing is logged too. A screen to browse the audit log comes later.

