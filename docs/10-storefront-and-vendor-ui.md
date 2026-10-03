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
Page files under `app/(storefront)/[tenant]/` are thin: load data, get UI, render.

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
Breadcrumbs, SearchAutocomplete, CartDrawer, CheckoutForm (address with pincode -> city/state
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
2. `cp -r src/storefront/vendors/_template src/storefront/vendors/<slug>`; register in `registry.ts`.
3. Set theme tokens and fonts; override only what the design needs (start with Header, Footer, Home).
4. Configure attribute sets for their categories; import products via CSV.
5. Enable modules per their plan; configure Razorpay; shipping zones; GST details; policies.
6. Lighthouse mobile >= 90 on home, listing, product; run e2e smoke for that tenant.
7. Point DNS / subdomain; go live checklist in docs/15.

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
