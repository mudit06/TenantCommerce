# 10 Storefront and vendor UI

## Principle

The CMS stores **data in the same shape for every vendor**. Each vendor's **look** is React code
in `src/storefront/vendors/<slug>/`, written by our team. Anything a vendor does not override
comes from `vendors/default` (the shared kit). Vendors change content and products, not layout code.

## Resolution

```ts
// src/storefront/registry.ts (shape)
const vendors = {
  default: () => import('./vendors/default'),
  'acme-sanitary': () => import('./vendors/acme-sanitary'),
} satisfies Record<string, () => Promise<{ default: Partial<VendorUI> }>>

export async function getVendorUI(slug: string): Promise<VendorUI> {
  const base = (await vendors.default()).default as VendorUI
  const own = vendors[slug] ? (await vendors[slug]()).default : {}
  return { ...base, ...own, blocks: { ...base.blocks, ...own.blocks } }
}
```

`VendorUI` contract (in `src/storefront/types.ts`): `Header`, `Footer`, `HomePage`,
`CategoryPage`, `ProductPage`, `ProductCard`, `SearchPage`, `CartPage`, `CheckoutLayout`,
`AccountLayout`, `NotFound`, `blocks: Record<BlockType, Component>`, `theme` (CSS file import).

**As built (3 October 2026):** the contract has `theme` (colour, font and radius tokens set as CSS
variables on `<html>`), `tagline` and `blocks` (own renderers for some block types; Home Orbit
overrides `hero`). Page-level overrides (Header, ProductPage…) get added when a vendor's design
needs them. Fonts are self-hosted with `@fontsource-variable/*` (no request to Google).
Page files under `app/(storefront)/[tenant]/` are thin: load data, get UI, render.

**11 October 2026:** the contract also takes `Header` and `Footer` (`({ ctx }) => JSX`), used by
the store layout instead of the kit's when a vendor sets them; Home Orbit has its own header
(`vendors/home-orbit/layout/Header.tsx`). Both headers build on shared kit pieces so behaviour
stays the same for every vendor: `kit/layout/nav.ts` (the menu from Menus, or the category tree;
the announcement line), `kit/layout/MegaMenu.tsx` (the large dropdowns: up to four headed columns,
category photos, the featured image, Shop all; the phone menu's accordions), `kit/Slider.tsx` (hero
slides and carousels: scroll-snap, arrows, dots, autoplay that pauses and respects reduced motion)
and `kit/shop/QuickAdd.tsx` (the cards' quick add, below).

Use static `import()` maps (not string-built paths) so the bundler can code-split per vendor.

## Theme tokens

`vendors/<slug>/theme.css` sets CSS variables consumed by Tailwind (`--color-primary`,
`--color-accent`, `--radius`, `--font-heading`, `--font-body`...). Fonts via `next/font` declared
in the vendor's `index.ts`. Logo, favicon and colours that vendors may change live in site-settings.

## CMS blocks (data in `src/blocks/`, renderers in `kit/blocks/` and vendor `blocks/`)

| Block | Fields (summary) | Phase |
|---|---|---|
| `hero` | slides[] {image, mobileImage, heading, sub, cta} | MVP |
| `banner` | image, link, layout (full/split) | MVP |
| `product-grid` | source (category/collection/manual/featured), limit, layout | MVP |
| `product-carousel` | same as grid | MVP |
| `category-tiles` | categories[], style | MVP |
| `rich-text` | content | MVP |
| `image-text` | image, text, alignment | MVP |
| `usp-strip` | items[] {icon, text} (free shipping, warranty, BIS certified) | MVP |
| `testimonials` | items[] | MVP |
| `faq` | items[] {q, a} (emits FAQPage schema) | MVP |
| `video` | YouTube URL / media | MVP |
| `downloads` | documents[] or by type | MVP |
| `dealer-cta` | text, link to locator | MVP |
| `enquiry-form` | form, product context | MVP |
| `brand-story` / `stats` | numbers (years, dealers, cities) | MVP |

Layout options added 11 October 2026 (same blocks, more ways to show them): hero slides and
product grids and category tiles take a small label above the heading (`eyebrow`); the product
grid's `layout` is Grid, Carousel, or **Promo card and products** (a tall picture card with its own
label, heading and button before a row of products); category tiles' `style` adds **Cards in a
row** (square cards that scroll sideways) and a "View all" switch; the benefits block's `style` is
Icons in a row or a **Scrolling line** (still for visitors who reduce motion). The shared renderers
are in `kit/blocks/CommerceBlocks.tsx`.
| `offer-strip` | scheme (live one by default), style; shows badge, rule in plain words and the real end time; hides itself when no scheme is live | MVP (`schemes`) |
| `scheme-products` | scheme, limit, layout: products the scheme covers, with offer prices | MVP (`schemes`) |
| `coupon-list` | public coupons with copy buttons | MVP (`coupons`) |
| `reviews` | product or category, minimum rating, count: real published reviews (not typed testimonials) | MVP (`reviews`) |
| `newsletter` | heading, channels (email, WhatsApp): the offers sign-up with its consent line | MVP (`offer-messages`) |
| `affiliate-cta` | heading, text: invites visitors to join the affiliate program | MVP (`affiliate`) |
| `lookbook` | image with product hotspots | Phase 2 |
| `instagram-feed` | handle | Phase 2 |

A block type can be restricted to certain tenants via `admin.condition` + a feature flag when only
one vendor needs it.

## Adding a block

1. Schema in `src/blocks/<Name>.ts` (localized text fields). Add to the `pages.layout` blocks list.
2. Default renderer in `src/storefront/kit/blocks/<Name>.tsx`, registered in `vendors/default`.
3. Optional vendor-specific renderer in `vendors/<slug>/blocks/`.
4. Generate types; add a Storybook-like example page in `tests/fixtures` if useful.

## Kit components (minimum for MVP)

Header (logo, mega menu, search, cart, account), mobile bottom nav, Footer, ProductCard (image,
title, model no., price, MRP strike, badges, swatches), ProductGallery (zoom, video), VariantPicker
(swatches for finish/colour, size buttons), PincodeCheck, PriceBlock (incl. GST note), StockBadge,
AddToCart / BuyNow / RequestQuote buttons, SpecTable (grouped attributes), LegalDetails (generic
name, country of origin, net quantity, manufacturer/packer/importer, consumer care, MRP), DocumentsList,
SizeGuideModal, FilterSidebar / mobile filter sheet, SortSelect, Pagination / infinite load,
Breadcrumbs, SearchAutocomplete, QuickAdd (on every product card: one tap for a single finish, a
picker with server prices for finishes and sizes, the quote form for "price on request"; the
card's second photo shows on hover), CartDrawer, CheckoutForm (address with pincode -> city/state
autofill), WhatsAppOptIn (checkout checkbox, docs/18), OrderSummary, OrderTracker (parcel journey
timeline), WhatsAppButton, DealerLocator (map + list), EnquiryForm, Toasts, Skeletons, EmptyStates.
Growth features (MVP): OfferBadge, OfferPrice (scheme price, MRP, real end time), Countdown (only
to a scheme's real end), CouponBox and AvailableCoupons (cart), DiscountLines (cart, checkout,
order), WishlistButton (heart on ProductCard and the product page), WishlistPage, RatingStars,
ReviewSummary (average and histogram), ReviewList, ReviewForm (stars, text, photos), OffersOptIn
(checkout, account, newsletter block: one checkbox per channel, unticked), UnsubscribePage,
ReferralBanner ("You were referred by…" only when a referral cookie is set), AffiliateApplyForm,
AffiliateDashboard. Phase 2: CompareToggle and CompareTable, TradePriceBlock, LoyaltyPoints.

## New vendor checklist

1. Create tenant via script/admin (docs/04).
2. Create `src/storefront/vendors/<slug>/index.ts` (copy `home-orbit`); register it in `registry.ts`.
   Put the vendor's catalogue data, photos and seed in `scripts/vendors/<slug>/` and what they
   sent and still owe in `docs/vendors/<slug>.md`.
3. Set theme tokens and fonts; override only what the design needs (start with Header, Footer, Home).
4. Configure attribute sets for their categories; import products via CSV.
5. Enable modules per their plan; configure Razorpay; shipping zones; GST details; policies.
6. Lighthouse mobile >= 90 on home, listing, product; run e2e smoke for that tenant.
7. Point DNS / subdomain; go live checklist in docs/15.

## What to collect from a new vendor

Ask for these when the contract is signed; stage letters match docs/progress.md.

| When | What |
|---|---|
| Onboarding | Legal name, GSTIN, registered address, support email and phone, WhatsApp number, grievance officer (name, designation, email, phone), owner's name and email |
| Stage A (catalog) | Category tree; the attributes customers filter by per category (finish, size, material...); product sheet (Excel or CSV) with name, model number, SKU, variants, MRP, selling price, HSN, GST rate, weight, dimensions, stock, country of origin, maker or importer details; product images; spec sheets, manuals and catalogues (PDF); dealer and showroom list; policy texts (shipping, returns, privacy, terms, warranty) |
| Storefront design | Logo (SVG or large PNG), brand colours and fonts, any existing website or Figma design, the domain they want |
| Stage B (selling) | Razorpay account (test keys first), COD yes or no and its limits, Shiprocket account or their own couriers with a delivery rate card, order and invoice number prefixes, signature image for invoices; for WhatsApp and SMS updates, Meta Business and DLT paperwork (takes days, start early) |
| Stage C (growth) | Which offers they run (festival schemes, coupons), affiliate program terms, review policy |

## Storefront page inventory

Home, category listing (filters, sort), search results, product detail, compare (Phase 2), cart,
checkout (single page: contact, address, delivery, payment), order confirmation, login/register/OTP,
account (orders, order detail + tracking + invoice download, addresses, profile, notification
and offer preferences, wishlist, my reviews, warranties and loyalty points in Phase 2), order
tracking page `/t/<code>` (no login; opened from messages), offers page and scheme landing pages
(`/offers`, `/offers/<slug>`), wishlist (`/wishlist`), write a review (`/review/<token>` and from
the account), affiliate program and dashboard (`/affiliate`, `/affiliate/dashboard`), referral
redirect (`/r/<code>`), unsubscribe from offers (`/unsubscribe/<token>`), cart restore link,
CMS pages, policy pages (plus the grievance officer on the contact page and in the footer),
dealer locator, downloads/catalogues, contact/enquiry, warranty
registration + service request (Phase 2), trade portal for dealers, retailers, wholesalers and
interior designers (Phase 2), 404, store-unavailable, offline.

## UX rules

Mobile first; tap targets 44px; sticky add-to-cart on mobile product page; show price inclusive
of GST; show MRP and discount; show the product's Legal Metrology details (docs/06 `legal`);
show delivery ETA and COD availability after pincode; never block checkout with account creation
(guests open their order through the signed cookie or an email code, docs/05); preserve filters in URL query; accessible (WCAG 2.1 AA): labels,
focus states, alt text, colour contrast. Offers stay honest (docs/14): countdowns only to a
scheme's real end, stock warnings only from real stock, no pre-ticked consent or add-ons, the
reason a coupon doesn't apply said plainly, and the discount shown as its own line wherever the
total is shown. Offer badges are text (`badgeText`), so each vendor UI styles them its own way.

## Motion

Animations are CSS only (`src/app/(storefront)/[tenant]/globals.css`, "Motion"), so pages ship no
animation library and Lighthouse stays at 90+. Only `opacity`, `translate` and `scale` move, so the
compositor runs them. Everything sits inside `prefers-reduced-motion: no-preference`, and a store
can switch it all off in the CMS (Store settings → Branding → **Animations on the store**, which
puts `data-motion="off"` on `<html>`); browsers without scroll-driven animations just show those
parts still. Tailwind classes that move use the `motion-ok:` variant (globals.css), which follows
both. Shared classes a vendor UI can use:

| Class | Effect | Used on |
|---|---|---|
| `reveal` | Rises in as it scrolls into view (scroll-driven, no script) | Every page block after the first (RenderBlocks), product grid cards |
| `slide-words` | Its children follow their slide in sideways, each a little further | Hero text (kit and Home Orbit) |
| `drop-in` | Eases in each time it is shown | Menu dropdowns, phone menus |
| `sheet` | On a `<dialog>`: slides up on phones, pops in on wider screens; the backdrop fades | Quick add |
| `bump` | A short scale bump; set it with a changing `key` so it replays | Cart and wishlist counts, wishlist heart |
| `shine` | A light sweep on hover | Hero and promo buttons |

Never animate the first block (it loads first and holds the h1), and never use motion to fake
urgency (docs/14). The benefits block's scrolling line (`marquee`) also stops for reduced motion.

### Loaders

One loader, in the store's own colours: a small house with a dot circling it (`kit/Loader.tsx`,
inline SVG and a few lines of CSS in globals.css "Loaders", no image, font or library; about 1 KB).

- **Between pages**: `kit/layout/NavigationLoader.tsx` (in the store layout) shows a thin bar in
  `--brand` at the top as soon as a shopper clicks a link to another page or submits a search or
  filter form, and the loader in the middle if the page takes longer than half a second. Code that
  moves to another page with `router.push` or `router.replace` calls `startNavigation()` first.
- **Busy buttons**: give the button `aria-busy={pending}` and keep its words ("Adding…"); a small
  ring takes the place of its icon. Only the pressed button gets it.
- **Part of a page**: `<Loader label="Loading your wishlist…" />` where client data is still coming
  (wishlist); a still outline of the content is fine too (quick add options).
- **No `loading.tsx` under `app/(storefront)`**: it streams the page, which commits a 200 before
  the page runs, so a missing page would answer 200 and a moved one would redirect in the browser
  instead of with a 308 (Next.js docs, `loading.js` "Status codes"). The first load of a page is
  the server's HTML, which needs no loader.
- With reduced motion or the store's Animations switch off, the dot and the ring fade in and out
  instead of turning, so the busy state still shows.
