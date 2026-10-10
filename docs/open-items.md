# Open items before development

What is still undecided or unverified before building, from the review of the whole Ecom folder
(2 October 2026), the fixes applied on 3 October 2026, and a second full check the same day after
the feature sheet update. Don't build on an open item; tick or delete items as they are resolved.

## Verdict

The docs are complete and consistent enough to start Sprint 1 once test code is allowed. The
stack is settled (Next.js + Payload, docs/00), the Phase 1 growth features (schemes, coupons,
affiliates, wishlist, reviews, offer messages, abandoned carts) are specified end to end, and the
errors found in both checks are fixed (lists at the end). The 68 screen specs match the
wireframes. What is left: three product decisions, the Sprint 1 spikes, and checks before launch.

## 1. Decisions only mudit can make

| Decision | Blocks | Where it's asked |
|---|---|---|
| ~~WhatsApp and SMS order updates in the MVP, or Phase 2~~ | Decided 6 October 2026: email and WhatsApp in Phase 1, SMS later | — |
| ~~Live Shiprocket rates as the shopper's delivery fee~~ | Decided 6 October 2026: live Shiprocket rates, the vendor's rate card as the fallback | — |
| Allow throwaway test code for the spikes below | Sprint 1 | The "no code yet" rule currently stops them |
| The sheet's "Not Required" tab marks the page builder "Optional". The docs keep it core MVP; say if it should become a feature flag | Pages screens | "Feature sheet gap check" thread |
| Media storage provider for production: Cloudflare R2 (no download fees, recommended) or AWS S3 Mumbai | Going live, not development (local disk works) | docs/12 "Media" |
| A plan's "orders a month" limit is shown and warned about at 90% (counted from the orders since 10 October 2026), but never refuses a shopper's order. Should it, or should it only warn our team? | Plan limits | QA run of 10 October 2026 (docs/qa, DEF-002) |

## 2. Spikes for Sprint 1 (each ends in an ADR and doc updates)

1. **Payload ecommerce plugin fit.** Done: ADR 0006 accepted 3 October 2026, we own the
   collections. The plugin's shapes differ from docs/06 and docs/11: prices in
   per-currency fields such as `priceInINR` (not `{ amountMinor, currency }`), its own
   `variantTypes`/`variantOptions` collections (not attribute-set axes), one `inventory` number
   lowered when an order is placed (not reserve-at-checkout), and cart endpoints under
   `/api/carts/:id/...` that don't resolve the tenant from the host as docs/07 requires. Decide:
   adopt its shapes and rewrite docs/06, 11 and 12, or own the commerce collections and drop the
   plugin. Flagged at the top of docs/06.
2. **Shopper login per store** (ADR 0003, docs/05), including the guest order access cookie and
   email code (docs/05 "Guest access to an order").
3. **Razorpay adapter**, only if the plugin stays.
4. **Staff two-step login.** Payload has none built in; pick a Payload 3 plugin (for example
   `payload-totp`) or write it (docs/02, docs/05).

## 2b. Found while building the platform panel (3 October 2026)

The super admin panel is built (README status). These came up while building it:

| Item | What was done for now | Needs |
|---|---|---|
| Two-step login for platform admins (spike 4 above) | Built 10 October 2026 as our own TOTP (docs/05 "Two-step sign-in, as built"): required for our team, optional for vendor staff, reset by super admins | — |
| Per-vendor "Allowed" connector switch (super admin Connectors tab) | Built 6 October 2026 (mudit asked for the full tab): `tenants.blockedConnectors` lists providers our team switched off; a provider is usable when the plan allows it and it isn't blocked | — |
| Invite links | Reuse Payload's reset-password token (72 h, single use). Payload stores it unhashed, docs/05 says hashed | Accept, or write our own invite token (small job) |
| Admin fonts | Plus Jakarta Sans is self-hosted (@fontsource) since 4 October 2026; code text uses the system monospace font | — |
| Scheduled publish after a store session ends | A publish scheduled by our team during "Manage store" runs as that admin; once the session has ended the job is refused (docs/05 "As built") | Accept (store staff schedule their own pages), or let jobs run as the store |
| Git hosting | Code lives on GitHub (`mudit06/tenantcommerce`), recorded in docs/00 | Hosted CI to replace the local `pnpm verify` |
| Content-Security-Policy on the storefront | Other security headers are set in `src/proxy.ts` | A CSP with per-request nonces (Next inline scripts, analytics IDs from settings, Razorpay later) |
| Primary domain redirect | `tenant-domains.redirectToPrimary` is stored, not acted on | 301 to the primary host in the storefront layout or proxy, with custom domains (Phase 2) |
| Rate limits across instances | Enquiry limit in memory per server (`src/lib/rate-limit`) | Upstash Redis when the app runs on more than one instance (docs/14) |
| Home Orbit's missing details | Store in draft with placeholders | docs/vendors/home-orbit.md "Still needed" |
| Enquiry attachments (BOQs, drawings from shoppers) | Not stored yet: the media library's files are public, which is wrong for shoppers' documents | A private upload collection served through a signed, expiring link, built with the storefront enquiry form |
| Category slug changes | Changing a slug changes the store address; no redirect is created yet | The `redirects` collection (docs/06), before the storefront goes live |
| Dealer map position | Staff type latitude and longitude (from Google Maps) | Fill it from the pincode once the platform `pincodes` table is loaded (docs/06) |
| Enquiry numbers | `ENQ-<n>` per store, taken outside the save's transaction so two enquiries at the same moment don't clash; a save that then fails leaves a gap | Fine for enquiries and orders. GST invoices must stay consecutive: take those inside the transaction with a retry (docs/11) |
| Dependency audit | `undici` and `dompurify` (inside Payload) pinned to patched versions with pnpm overrides. One left: `braces` in the SCSS compiler's file watcher, no fix released, build-time only | Remove the overrides once Payload ships the patched versions; recheck `pnpm audit` on each upgrade |

## 3. Before launch (not blocking development)

- Final plan prices and the staff, storage and order limits (interim prices set on 3 October 2026,
  docs/00), and what happens at the monthly order limit
- The platform domain, which must not contain "sr", "kr" or "shiprocket", or Shiprocket rejects the
  tracking webhook
- A CA to confirm the GST rules now written into docs/11: delivery charge and COD fee at the goods'
  rate, the clothing ₹2,500 rule and its price band with no consistent rate, and the exchange
  flow's zero-value order
- A lawyer to review checkout and consent wording, and the privacy request deadline in docs/06,
  before 13 May 2027 (DPDP Rules); also the offer consent wording per channel, whether a review
  request email may go to buyers who didn't opt in to offers (docs/18 assumes yes unless they
  opted out), the affiliate program terms template (disclosure of paid partnership) and the
  review policy shown on the store
- A CA to confirm the growth features' tax treatment: TDS under s.393(1) of the Income-tax Act
  2025 (s.194H of the 1961 Act until 31 March 2026) on affiliate commissions
  (2%, above ₹20,000 a year, 20% without PAN), GST on affiliate commission invoices, buy X get Y
  shown as a discount line rather than a free supply, and (Phase 2) loyalty points as a discount
- Each vendor's affiliate program terms (commission, cookie days, payout timing) and review policy
  page, before switching those features on
- The breach runbook (docs/14) and the first vendor's storefront design
- How subscription invoices to vendors are issued while billing is manual
- Republish the research page, which still shows the 2 October version, and the wireframes
  (private link and Vercel), which miss only the role matrix split made in the second check

## Housekeeping

The Ecom folder is not a git repository, and several threads edit the same docs, so there is no
history or undo. A local `git init` (no GitHub), after adding a root `.gitignore` for `.env`,
`.env.local`, `.vercel`, `node_modules` and `.next`, would fix that.

## Decided on 3 October 2026 (feature sheet answers)

- **Super admin is our team only**, with complete control of every store: super admins open any
  vendor's CMS with "Manage store" (full edit, reason asked, every change audited); support stays
  read-only (docs/00, docs/05, docs/14, super admin wireframes).
- **CAD downloads removed**: no `cad` document type or DWG/SKP uploads, no CAD tab or packs on the
  store, and the Phase 2 professional zone (built around CAD and BIM files) is dropped. Documents
  can still be limited to signed-in trade partners in Phase 2 (docs/06, 08, 12, 17, wireframes,
  research page).
- **WhatsApp offers are a per-vendor switch in super admin** (`whatsapp-offers`, off by default);
  until our team switches it on, offers and cart reminders go by email (docs/08, 17, 18, wireframes).
- **Wireframes republished** (draft 2) to the private link and the public Vercel site.

## Phase 1 and Phase 2 scope set on 3 October 2026

mudit moved festival schemes (Diwali, Holi, New Year, Wedding Season), special launch offers,
coupons, affiliates with commissions, wishlist, reviews, offer messages and abandoned cart
reminders into Phase 1, and put dealers, retailers, wholesalers, interior designers, dealer
anniversary offers, loyalty points and product compare in Phase 2. Updated: docs/00, 01, 03, 04,
05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18, the wireframes and screen specs, and the
research page. Defaults picked where the sheet didn't say: schemes and coupons are for retail
shoppers in Phase 1 (trade audiences come with trade accounts), Phase 1 commissions go to
affiliates only, the vendor pays affiliates itself, one coupon per order, one automatic scheme per
item. The MVP grows by three sprints (docs/17).

## Fixed on 3 October 2026

- **Store settings, Menus and Order updates** are per-store singleton collections at
  `/admin/collections/<slug>`, never Payload globals (docs/04, CMS wireframes and spec intro)
- **Invoice numbers** fit GST's 16 characters: `INV/26-27/00123` (docs/06, CMS wireframes)
- **GST rates** updated to the 2025 slabs (0, 5, 18, 40%), with a value rule for clothing (docs/06,
  docs/11, docs/12)
- **Delivery charge and COD fee** take the goods' GST rate, split by value across mixed rates
  (docs/11, Shipping zones wireframe)
- **Legal details**: Legal Metrology fields on products, a grievance officer and label defaults in
  store settings, a country-of-origin filter (docs/06, 10, 12, 14, 15, 17; product editor, store
  settings, product page and contact wireframes)
- **Guest order access**: signed cookie after checkout, email code later (docs/05, 07, 14;
  confirmation and order tracking wireframes)
- **Audit log** writes in the MVP, viewer later (docs/01, 05, 06, 14, 17)
- **One model for COD and guest checkout**: `cod` flag (platform) plus the vendor's COD setting and
  rules; guest checkout is the flag only. COD is no longer a connector-config (docs/06, 08, 09;
  super admin wireframes)
- **COD invoice** made when the first parcel is packed, prepaid at payment (docs/11)
- **Permissions**: media access for catalog editors, a Dealers row (docs/05, Staff wireframe)
- **Names and routes**: `merch-collections`; storefront folders `contact/`, `warranty/` and
  `offline/` replace `support/` (docs/01, docs/03, folder skeleton)
- **Local email** goes to the `dev-log` connector; mailpit dropped (README, docs/02, docs/15)
- **CI** defined as a local `pnpm verify` until a remote exists (docs/16)
- **Gaps filled**: pincode directory (docs/06, 07, 11), emails outside the order journey (docs/18),
  staff invites (docs/05, 07), privacy requests, idempotency keys, order-number prefix, enquiry
  reference and notes, subscription payments, daily stats, plan usage and a popularity count
  (docs/04, 06, 07), ADR 0004 (money in paise), docs map entry in CLAUDE.md
- **Research page**: COD row no longer claims the Phase 2 prepaid discount
- **Spec generator** keeps tags beside buttons and short labels inside Phase 2 zones; screen specs
  regenerated

## Second check on 3 October 2026 (after the feature sheet update)

Every changed doc, the 14 new screens and the research page were re-read and cross-checked. The
fixes from the first pass were all still in place. Fixed in this pass:

- **Contact preferences**: one row per phone and per email (`(tenant, type, value)`), since one row
  with both unique would collide when a shopper changes phone or email (docs/04, 06)
- **Reviews** unique per order item, matching "one review per item" (docs/04)
- **Tenant-scoped list** in docs/04 now names every tenant collection; the Resend webhook's tenant
  routing is documented and `RESEND_WEBHOOK_SECRET` added to `.env.example`
- **docs/11**: the delivery charge GST, place of supply and test paragraphs moved back under
  Pricing (they had ended up under Affiliate commissions); affiliate TDS cited as Income-tax Act
  2025 s.393(1), in force since 1 April 2026 (docs/06, 11)
- **Who edits feature settings**: owners and managers edit a switched-on feature's config, never its
  switch or the platform caps (docs/05, 08); reviews config gains `showOnProductPages` and
  `requestChannels`; offer messages and abandoned carts are separate rows in the role matrix
  (docs/05, Staff and roles wireframe)
- **Email sending domain** onboarding, with a platform fallback address until the vendor's domain
  verifies (docs/09, 18); offer message tests (docs/18)
- **Roadmap** names Manage store, View as support and the WhatsApp offers switch (docs/17)
- **Cart restore route** folder `cart/restore/[token]` (docs/03, folder skeleton)
- **Research page** shows the `whatsapp-offers` flag
- **Spec generator** no longer cuts tables at 12 rows, which had dropped 5 rows of the CMS role
  matrix and 2 Phase 2 rows of the plan features table; screen specs regenerated

## Sources checked on 2 and 3 October 2026

- [GST 2.0 slabs (ClearTax)](https://cleartax.in/s/next-generation-gst-reforms) and
  [the apparel threshold (PIB)](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2163905&reg=48&lang=2)
- [Delivery charges as a composite supply (Razorpay Learn)](https://razorpay.com/learn/gst-on-freight-charges/)
- [Legal Metrology amendment rules 2026 (SCC Online)](https://www.scconline.com/blog/post/2026/02/21/legal-metrology-packaged-commodities-amendment-rules-2026-explained/)
  and [e-commerce declarations (S.S. Rana)](https://ssrana.in/articles/legal-metrology-compliance-for-e-commerce-businesses/)
- [Consumer Protection (E-Commerce) Rules 2020 (ICSI)](https://www.icsi.edu/media/webmodules/Consumer_Protection_E-Commerce_Rules_2020.pdf)
- [Payload ecommerce plugin docs](https://payloadcms.com/docs/ecommerce/plugin) and
  [multi-tenant plugin docs](https://payloadcms.com/docs/plugins/multi-tenant) (`isGlobal`)
- [Income-tax Act 2025 s.393 TDS mapping (TDSMAN)](https://blog.tdsman.com/2026/06/tds-on-brokerage-and-commission-section-3931-section-194h/)
- Two-step login plugins for Payload 3: [payload-totp](https://payload.market/item/payload-totp-NJ162BH),
  [@clocklimited/payload-2fa](https://github.com/clocklimited/payload-2fa)
