# Screens: Storefront PWA (what shoppers see)

Build spec for every storefront page. Generated from the clickable wireframes by
`node docs/wireframes/build-specs.js`; edit the wireframe or this intro, never the generated
sections by hand. Open `docs/wireframes/index.html` (or https://tenantecom-wireframes.vercel.app)
and switch Mobile / Desktop to see each page. The sample vendor is the fictional Aquaverde Sanitary.

## What this is

- Each vendor's own store on its own domain, a responsive PWA. Pages live in
  `src/app/(storefront)/[tenant]/` and are thin: load data, get the vendor UI, render.
- The drawings show the **shared default kit** (`src/storefront/vendors/default`). Each vendor's
  look is hand-built code in `src/storefront/vendors/<slug>/` that overrides kit components;
  page structure, data and behaviour described here stay the same for every vendor
  (`docs/10-storefront-and-vendor-ui.md`).
- Sections between header and footer on the home page and CMS pages are CMS blocks; their order
  and content come from the vendor's Pages, never hard-coded.
- Features marked with a flag render only when that feature is on for the tenant, and the server
  checks the flag again (`isFeatureEnabled`).

## Layout rules (mobile first)

- Phone frame is 390 px wide, desktop 1200 px. Design for the phone first; the "first screen" line
  in the wireframes marks what must be visible without scrolling (390 × 844, 1200 × 800).
- Phone: sticky top header (menu, logo, search, cart), bottom navigation (Home, Shop, Dealers,
  Account, Cart), floating WhatsApp button. The wishlist sits in the account menu on phones. Product, cart and checkout pages replace the bottom
  navigation with a sticky action bar (Add to cart / Checkout / Pay).
- Desktop: announcement bar (the live scheme's announcement when one is live), header with
  categories, search box and icons (account, wishlist with a count when `wishlist` is on, cart);
  filters in a left sidebar instead of the phone's bottom sheet.
- Footer: the offers sign-up (`offer-messages`), an Offers link and an Affiliate program link
  (`affiliate`).
- Tap targets at least 44 px; WCAG 2.1 AA; Lighthouse mobile 90+ on listing and product pages.

## Rules that apply to every page

- Prices always include GST and come from the server; show MRP struck through and % off. During
  a scheme the card and product page show the scheme price, its badge and its real end; nothing
  counts down to anything else (`docs/14`, dark patterns).
- Guest checkout is on unless the platform switches it off for a store (`guest-checkout`); account
  creation never blocks buying. A sequential order number never opens an order on its own
  (`docs/05-auth-and-roles.md`, guest access).
- Product pages show the Legal Metrology details and the store shows a grievance officer
  (`docs/14-security-and-compliance.md`).
- Filters and chosen variants live in the URL.
- Shopper accounts are per store; a login on one vendor's store means nothing on another.

## Phase notes as of 3 October 2026

- **Growth features in Phase 1** (mudit, 3 October 2026): offers page and scheme landing pages,
  coupons at the cart, wishlist, reviews, offer consent and offer messages, abandoned cart
  reminders, the affiliate program and dashboard.
- **Phase 2**: product compare, loyalty points, and trade schemes for dealers, retailers,
  wholesalers and interior designers (drawn as Phase 2 zones).

- **Shiprocket** is Phase 1 (MVP): tracking pages get courier, AWB and status updates from it.
- **WhatsApp opt-in at checkout, the no-login tracking page and the WhatsApp/SMS messages** are
  drawn as MVP per `docs/18-notifications.md`; still waiting on mudit's confirmation.
