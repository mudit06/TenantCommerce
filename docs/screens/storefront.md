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

## Screen index

**Browse**

- [Home](#st-home) `st-home`
- [Category listing](#st-category) `st-category`
- [Filter sheet](#st-filters) `st-filters`
- [Search](#st-search) `st-search`

**Product**

- [Product page](#st-product) `st-product`

**Buy**

- [Cart](#st-cart) `st-cart`
- [Checkout](#st-checkout) `st-checkout`
- [Order confirmed](#st-confirmation) `st-confirmation`

**Account**

- [Log in with a code](#st-login) `st-login`
- [My account](#st-account) `st-account`
- [Order tracking](#st-order) `st-order`
- [Wishlist](#st-wishlist) `st-wishlist`
- [Write a review](#st-review) `st-review`

**Order updates**

- [Tracking page (no login)](#st-track) `st-track`
- [What the shopper receives](#st-messages) `st-messages`

**Offers**

- [Offers page](#st-offers) `st-offers`
- [Offer messages the shopper receives](#st-offer-messages) `st-offer-messages`

**Affiliates**

- [Affiliate program](#st-affiliate) `st-affiliate`
- [Affiliate dashboard](#st-affiliate-dash) `st-affiliate-dash`

**Store info**

- [Dealer locator](#st-dealers) `st-dealers`
- [Downloads](#st-downloads) `st-downloads`
- [Contact and quote request](#st-contact) `st-contact`
- [Warranty and service](#st-warranty) `st-warranty` (Phase 2)
- [Install, offline and unavailable](#st-offline) `st-offline`

<a id="st-home"></a>

## Home

The vendor’s front door: hero, benefits, categories, best sellers, the brand story and a way to find a dealer, all arranged by the vendor from CMS blocks.

- **Route:** `/`
- **Who:** Shoppers
- **Collections:** `pages (home)`, `navigation`, `site-settings`, `products`, `schemes`, `reviews`, `contact-preferences`
- **Read first:** `docs/10-storefront-and-vendor-ui.md`, `docs/13-pwa-seo-performance.md`
- **Wireframe:** `docs/wireframes/index.html#st-home`
- **Links to:** [Category listing](#st-category), [Offers page](#st-offers), [Product page](#st-product), [Dealer locator](#st-dealers), [Install, offline and unavailable](#st-offline)

### On the screen (top to bottom, sample data)

- Image: Hero slide 1 of 3 · desktop image 1920 × 800 Bathrooms that last a lifetime Solid brass faucets with a 5-year warranty Shop basin mixers
- Part shown only as: flag: schemes
  - MRP ₹3,500 · 200 mm overhead shower in chrome and matt black · offer ends Sat, 31 Oct, 11:59 pm
  - Actions: Shop the launch
- Free delivery above ₹999
- 5-year warranty on faucets
- ✓ ISI-marked sanitaryware
- Cash on delivery
- Heading: Shop by category
- Heading: Bestsellers
- Actions: View all
- Product card: Product photo Bestseller AV-BM-1120 Aria single-lever basin mixer 4.6 (38) ₹4,250 ₹5,600 24% off 3 finishes
- Product card: Product photo AV-WH-2041 Nimbus wall-hung WC with soft-close seat 4.4 (12) ₹18,450 ₹24,990 26% off
- Product card: Product photo Launch price AV-OS-3200 Rainline 200 mm overhead shower 4.5 (21) ₹2,290 ₹3,500 35% off Launch price · until 31 Oct 2 finishes
- Product card: Product photo AV-BM-1125 Aria tall basin mixer ₹6,150 ₹7,900 22% off 3 finishes
- Image: Matt black range
- Section: New range
- Heading: The matt black range
- Text: Mixers, showers and accessories in a finish that hides water spots.
- Actions: Explore the range
- Section: Our story
- Heading: Made in Morbi since 1991
- Text: Family-run, with our own foundry and ceramic plant.
- years
- dealers
- cities
- Image: Factory photo
- Part shown only as: flag: dealer-locator
  - Heading: See it before you buy
  - Text: Visit one of 1,200 dealers and experience centres.
  - Field (sample: “Your pincode”)
  - Actions: Find a dealer
- Part shown only as: flag: reviews
  - Heading: What buyers say
  - Text: 5.0 “The matt black mixer still looks new after a year of hard water.” Meera, Ahmedabad · Verified purchase · Aria basin mixer
  - Text: 5.0 “Delivered in 4 days with a proper GST invoice for our builder.” Sanjay, Nashik · Verified purchase · Nimbus wall-hung WC
  - Text: 4.0 “Good flow, but the wall bracket needed longer screws.” Arvind, Pune · Verified purchase · Rainline overhead shower
- Part shown only as: flag: offer-messages
  - Heading: Get our offers first
  - Text: Festival offers and new launches from Aquaverde. At most 2 messages a week.
  - Field (sample: “Email or WhatsApp number”)
  - Actions: Sign up
  - Checkbox: By email
  - Part shown only as: flag: whatsapp-offers
    - Checkbox: On WhatsApp
- Heading: Questions
- FAQ item: Do you deliver to my pincode?
- FAQ item: Is cash on delivery available?
- FAQ item: How do I claim warranty?
- FAQ item: Do you install the products?
- Opens like an app and loads faster.
- Actions: Install · Not now

### Rules and behaviour

1. Everything between header and footer is a CMS block the vendor arranges in Pages, Home. This drawing uses the shared default kit; a vendor’s own UI restyles the same blocks.
2. The benefits strip is editable text and icons. Typical lines for this industry: free delivery, warranty, ISI mark, cash on delivery.
3. Carousels pull from a category, a hand-picked list or “featured” products. Prices always include GST.
4. The dealer finder block takes a pincode and opens the dealer locator. Shown only with the dealer-locator feature.
5. On phones the store offers to install itself as an app after a little browsing. iPhones get “Share, then Add to Home Screen” instead.
6. The offer strip block shows the live scheme: its rule in plain words and its real end time. The countdown runs to the scheme’s end and nowhere else; with no live scheme the block hides itself. Needs the schemes feature.
7. The reviews block shows real published reviews with “Verified purchase”, never typed testimonials, and the average comes from the same reviews. Needs the reviews feature.
8. The offers sign-up asks for an email or WhatsApp number with one unticked box per channel. It never pre-ticks, and order updates are never mixed in. Needs the offer-messages feature.

<a id="st-category"></a>

## Category listing

Products in one category with filters that match the industry: finish, mounting and flow for faucets; size and fabric for clothing; door thickness for locks.

- **Route:** `/c/faucets/basin-mixers?finish=matt-black&mounting=deck`
- **Who:** Shoppers
- **Collections:** `products`, `variants`, `categories`, `attribute-sets`
- **Read first:** `docs/12-catalog-and-import.md`, `docs/10-storefront-and-vendor-ui.md`
- **Wireframe:** `docs/wireframes/index.html#st-category`
- **Links to:** [Home](#st-home), [Filter sheet](#st-filters), [Product page](#st-product)

### On the screen (top to bottom, sample data)

- Breadcrumb: Home › Faucets › Basin mixers
- Heading: Basin mixers
- Select (sample: “Sort: Popular”)
- Filters Clear all
- Heading: Finish
- ✓ Matt black 14
- Chrome 38
- Brushed gold 8
- Gun metal 4
- Heading: Price
- Field (sample: “₹1,000”)
- Field (sample: “₹12,000”)
- Heading: Mounting
- ✓ Deck mounted 52
- Wall mounted 12
- Heading: Cartridge
- 35 mm 40
- 40 mm 24
- Heading: Flow rate
- Up to 6 litres a minute 30
- Above 6 litres a minute 34
- Heading: Rating
- 4 stars and above 48
- 3 stars and above 57
- [off] In stock only
- [off] On offer
- Actions: Filter (2) · Sort: Popular
- Matt black Deck mounted 14 results?finish=matt-black&mounting=deck
- Product card: Product photo Bestseller AV-BM-1120-MB Aria single-lever basin mixer 4.6 (38) ₹5,190 ₹6,900 25% off 3 finishes Add to cart
- Product card: Product photo AV-BM-1125-MB Aria tall basin mixer 4.7 (15) ₹6,990 ₹8,900 21% off 3 finishes Add to cart
- Product card: Product photo AV-BM-1140-MB Linea single-lever basin mixer 4.2 (9) ₹4,290 ₹5,590 23% off 2 finishes Add to cart
- Product card: Product photo AV-BM-1118-MB Aria compact basin mixer ₹4,590 ₹5,990 23% off 2 finishes
- Product card: Product photo Projects AV-BM-1150-MB Aria sensor basin mixer Price on request 2 finishes
- Product card: Product photo AV-WM-1130-MB Aria wall-mounted mixer 4.5 (6) ₹6,240 ₹7,990 22% off 2 finishes
- Prices include GST · Price on request leads to a quote form
- Actions: Load more

### Rules and behaviour

1. Filters are built from the category’s attribute set, so each industry gets the right filters with counts and no vendor-specific code.
2. Chosen filters live in the web address, so a shared link or the back button keeps them.
3. Prices include GST, with the MRP struck through and the discount shown, as Indian shoppers expect.
4. “Price on request” cards lead to a quote form instead of the cart.
5. “Load more” keeps the list fast on phones; numbered page links stay in the page for search engines.
6. Cards carry a heart (wishlist, saved on the device until the shopper signs in) and the star rating from published reviews. Products covered by a live scheme show its badge and the scheme price, worked out on the server. The “Rating” and “On offer” filters appear only when reviews and schemes are on.

<a id="st-filters"></a>

## Filter sheet

On phones, filters open in a bottom sheet over the list; on desktop the same choices open in a side panel.

- **Route:** `/c/faucets/basin-mixers (filters open)`
- **Who:** Shoppers
- **Collections:** `attribute-sets`, `products (counts)`
- **Read first:** `docs/10-storefront-and-vendor-ui.md`
- **Wireframe:** `docs/wireframes/index.html#st-filters`
- **Links to:** [Category listing](#st-category)

### On the screen (top to bottom, sample data)

- Actions: Close
- Finish 1
- Price
- Mounting 1
- Cartridge
- Flow rate
- Rating
- Stock and offers
- ✓ Matt black 14
- Chrome 38
- Brushed gold 8
- Gun metal 4
- Actions: Clear · Show 14 products

### Rules and behaviour

1. Counts update as options are ticked, so shoppers never land on an empty list.
2. The button states how many products will show and applies the filters in one tap.
3. Groups sit on the left and options on the right, all within reach of a thumb.

<a id="st-search"></a>

## Search

Instant search that understands model numbers, the way dealers, plumbers and repeat buyers actually search.

- **Route:** `/search?q=1120`
- **Who:** Shoppers
- **Collections:** `products`, `variants`, `categories`
- **Read first:** `docs/12-catalog-and-import.md`
- **Wireframe:** `docs/wireframes/index.html#st-search`
- **Links to:** [Product page](#st-product), [Category listing](#st-category)

### On the screen (top to bottom, sample data)

- Field (sample: “1120”)
- Section: Products
- Aria single-lever basin mixer
- AV-BM- 1120
- Aria tall basin mixer
- AV-BM-1125 · same series
- 35 mm cartridge for Aria
- AV-SP-0035 · fits 1120
- Section: Categories
- Basin mixers Spare parts
- See all results for “1120”
- Section: Recent searches
- matt black shower wall hung wc basin mixr

### Rules and behaviour

1. Model numbers and SKUs match first, even when typed partly, like “1120”.
2. Small typos still find results (“basin mixr”). Recent searches stay on the device.
3. Enter opens the full results page, which uses the same layout and filters as a category.

<a id="st-product"></a>

## Product page

Everything a buyer of fittings needs to decide: finish and price, delivery date and COD for their pincode, full specifications, manuals, drawings and installation video.

- **Route:** `/products/aria-single-lever-basin-mixer?finish=matt-black`
- **Who:** Shoppers
- **Collections:** `products`, `variants`, `product-documents`, `shipping-zones`, `reviews`, `schemes`, `coupons`, `wishlists`
- **Read first:** `docs/10-storefront-and-vendor-ui.md`, `docs/12-catalog-and-import.md`, `docs/13-pwa-seo-performance.md`, `docs/11-orders-payments-gst.md`
- **Wireframe:** `docs/wireframes/index.html#st-product`
- **Links to:** [Home](#st-home), [Category listing](#st-category), [Cart](#st-cart), [Checkout](#st-checkout), [Wishlist](#st-wishlist), [Contact and quote request](#st-contact), [Offers page](#st-offers), [Warranty and service](#st-warranty)

### On the screen (top to bottom, sample data)

- Breadcrumb: Home › Faucets › Basin mixers › Aria single-lever basin mixer
- Image: Main photo · matt black Zoom
- Part shown only as: flag: product-videos
  - Image
- Heading: Aria single-lever basin mixer
- Part shown only as: flag: reviews
  - 4.6 38 reviews · 92% would recommend
- ₹5,190 MRP ₹6,900 25% off
- Finish: Matt black
- Chrome ₹4,250 Matt black ₹5,190 Brushed gold ₹5,890
- Quantity 1 In stock
- Part shown only as: flag: pincode-check
  - Check delivery
  - Field (sample: “411045”)
  - Actions: Check
  - Delivery by Wed, 7 Oct to Pune ✓ Free delivery on this order Cash on delivery available
- Actions: Add to cart · Buy now
- Part shown only as: flag: wishlist
  - Actions: Save
- Part shown only as: flag: enquiries
  - Actions: Request a bulk quote
- Part shown only as: flag: whatsapp-button
  - Actions: Ask on WhatsApp
- Part shown only as: flag: coupons, flag: schemes
  - Offers for you
  - AQUA500 ₹500 off orders above ₹20,000
  - Actions: Copy
  - Diwali offer: 10% off faucets, from Sun, 1 Nov Details
- Part shown only as: P2, flag: compare
  - Add to compare up to 4 products
- 5-year warranty 7-day returns GST invoice
- Heading: Highlights
- Text: Solid brass body, lead-free
- Text: 35 mm ceramic disc cartridge
- Text: Aerator limits flow to 6 litres a minute
- Text: Fits counter-top and wall-hung basins
- Heading: Specifications
- Table (label | value)
  - row: Material | Brass
  - row: Mounting | Deck mounted
  - row: Cartridge | 35 mm ceramic disc
  - row: Flow rate | 6 LPM at 3 bar
  - row: Working pressure | 0.5 to 5 bar
  - row: Spout reach | 120 mm
  - row: Height | 165 mm
  - row: Warranty | 5 years
- Heading: Product details
- Table (label | value)
  - row: Generic name | Basin mixer
  - row: Country of origin | India
  - row: Net quantity | 1 piece
  - row: Manufactured by | Aquaverde Ceramics Pvt Ltd, Morbi, Gujarat 363642
  - row: Consumer care | 1800 000 0000, care@aquaverde.example
  - row: MRP | ₹6,900 incl. of all taxes
- Part shown only as: flag: downloads
  - Heading: Downloads
  - Row: Aria spec sheet · PDF · 420 KB
  - Row: Installation manual · PDF · 1.8 MB
- Part shown only as: flag: product-videos
  - Heading: Installation video
- Part shown only as: Phase 2, flag: spare-parts
  - Heading: Spare parts for this mixer
  - 35 mm cartridge
  - AV-SP-0035
  - Aerator M24
  - AV-SP-0110
- Part shown only as: Phase 2, flag: warranty
  - Notice: “Bought this already? Register your 5-year warranty. Register”
- Part shown only as: flag: reviews
  - Heading: Ratings and reviews
  - Actions: See all 38
  - 4.6 out of 5
  - 5 74%
  - 4 18%
  - 3 5%
  - 2 0%
  - 1 3%
  - With photos 9 Matt black 14
  - 5.0 Looks premium, no water spots
  - Text: Fitted it on a counter-top basin. The matt black hides hard-water marks better than our old chrome tap.
  - 3.0 Good tap, aerator was loose
  - Text: Works well, but the aerator came loose in a week.
  - Notice: “Reply from Aquaverde: Sorry about that. Tighten the aerator with the key in the box, or WhatsApp us and we’ll send a new one free.”
- Heading: Goes well with
- Product card: Product photo AV-TR-6060 Quadra towel rail 600 ₹1,890 ₹2,490 24% off 2 finishes
- Product card: Product photo Launch price AV-OS-3200 Rainline 200 mm overhead shower 4.5 (21) ₹2,290 ₹3,500 35% off Launch price · until 31 Oct 2 finishes
- Product card: Product photo AV-CB-5600 Edge countertop basin 600 ₹7,990 ₹9,990 20% off
- Product card: Product photo AV-WH-2041 Nimbus wall-hung WC with soft-close seat 4.4 (12) ₹18,450 ₹24,990 26% off
- Sticky bottom bar (phone): ₹5,190 Matt black Add to cart

### Rules and behaviour

1. The price comes from the server and includes GST. MRP and discount are shown next to it.
2. Each finish is a variant. Picking one changes the photos, model number, price and stock, and updates the web address.
3. The pincode check asks Shiprocket (when connected) and the vendor’s shipping zones: a pincode is deliverable, and cash on delivery possible, only when both say yes. The delivery fee always comes from the zones.
4. Quote and WhatsApp buttons send the product with the message. For enquire-only products the quote button replaces Add to cart.
5. Specifications come grouped from the attribute set, so they match the CMS exactly.
6. Manuals and spec sheets are public. In Phase 2 a document can be limited to signed-in trade partners.
7. On phones Add to cart stays pinned to the bottom. The page carries product data for Google (price, stock, rating).
8. Product details carry the declarations India’s Legal Metrology rules require online: generic name, country of origin, net quantity, who made, packed or imported it, consumer care and MRP. They come from the product’s legal details in the CMS.
9. Save adds the chosen finish to the wishlist. Guests keep it on this device; signing in moves it to the account. Needs the wishlist feature.
10. “Offers for you” lists public coupons this product qualifies for and the next scheme that covers it, with its real start date. When a scheme is live, the price block shows the scheme price and its end time instead. Codes are applied in the cart; the server decides the final price.
11. Ratings and reviews come only from shoppers who received this product (verified purchase). The average, the count and the bars use published reviews only. The vendor can reply publicly but never edit a review or hide it for a low rating. Needs the reviews feature.
12. Product compare comes in Phase 2: up to four products side by side from the attributes marked “Compare” in the attribute set.

<a id="st-cart"></a>

## Cart

Review items, see the delivery date and the full price including GST before checkout.

- **Route:** `/cart`
- **Who:** Shoppers, signed in or not
- **Collections:** `carts`, `products`, `variants`, `shipping-zones`, `coupons`, `schemes`
- **Read first:** `docs/11-orders-payments-gst.md`
- **Wireframe:** `docs/wireframes/index.html#st-cart`
- **Links to:** [Product page](#st-product), [Checkout](#st-checkout)

### On the screen (top to bottom, sample data)

- Heading: Your cart
- Matt black · AV-BM-1120-MB
- ₹5,190 ₹6,900
- Actions: Less · More
- Part shown only as: flag: wishlist
  - Move to wishlist
- White · AV-WH-2041-WH
- ₹18,450 ₹24,990
- Actions: Less · More
- Part shown only as: flag: wishlist
  - Move to wishlist
- Delivering to 411045, Pune · by Wed, 7 Oct Change
- Part shown only as: flag: coupons
  - Field (sample: “Coupon code”)
  - Actions: Apply
  - Section: Coupons for this cart
  - AQUA500 ₹500 off orders above ₹20,000
  - Actions: Apply
  - PREPAID5 5% off up to ₹750 when you pay online · choose Pay online at checkout
- Part shown only as: Phase 2, flag: loyalty
  - You have 120 points (₹120)
  - Actions: Use points
- Heading: Complete the look
- Product card: Product photo AV-TR-6060 Quadra towel rail 600 ₹1,890 ₹2,490 24% off 2 finishes Add to cart
- Product card: Product photo Launch price AV-OS-3200 Rainline 200 mm overhead shower 4.5 (21) ₹2,290 ₹3,500 35% off Launch price · until 31 Oct 2 finishes Add to cart
- **Price details**
  - Row: Items (2) ₹23,640.00
  - Row: Discounts none applied
  - Row: Delivery Free
  - Row: Total ₹23,640.00
  - Actions: Checkout
  - UPI Cards Netbanking COD
  - Cart saved on this device · Stock is held at checkout
- Sticky bottom bar (phone): ₹23,640.00 incl. GST Checkout

### Rules and behaviour

1. Every change asks the server to work out the totals again. The browser never sends prices.
2. A guest cart lives in a cookie for this store and joins the account cart on sign-in.
3. Stock is reserved only at checkout, not while items sit in the cart.
4. One coupon per order. The server checks it and, when it can’t be used, says why in plain words (“Add ₹600 more”, “Not with the Diwali offer”). Public codes this cart qualifies for are listed with an Apply button; private codes are only typed. A live scheme’s discount appears on its own line without any code. Needs the coupons feature.
5. Applied discounts show as separate lines (scheme, coupon) above the total, and the GST note is worked out after them.
6. Loyalty points come in Phase 2: a balance and “Use points”, capped at a share of the order.

<a id="st-checkout"></a>

## Checkout

One page from contact to payment, with no account required, address filled from the pincode and the right payment options for that address.

- **Route:** `/checkout`
- **Who:** Shoppers, guest or signed in
- **Collections:** `orders`, `addresses`, `shipping-zones`, `connector-configs (public part)`, `contact-preferences`, `referrals`
- **Read first:** `docs/11-orders-payments-gst.md`, `docs/09-connectors.md`, `docs/18-notifications.md`
- **Wireframe:** `docs/wireframes/index.html#st-checkout`
- **Links to:** [Log in with a code](#st-login), [Order confirmed](#st-confirmation)

### On the screen (top to bottom, sample data)

- Order summary · 2 items ₹23,640.00
- **1. Contact**
  - Field: Mobile number * (sample: “+91 98xxx xx210”)
  - Field: Email * (sample: “rahul.k@example.com”)
  - ✓ Send me order updates from Aquaverde on WhatsApp
  - Part shown only as: flag: offer-messages
    - Offers and new launches from Aquaverde
    - Checkbox: By email
    - Part shown only as: flag: whatsapp-offers
      - Checkbox: On WhatsApp
  - Have an account? Log in to fill this in.
- **2. Delivery address**
  - Field: Pincode * (sample: “411045”)
  - Field: City (sample: “Pune”)
  - Field: State (sample: “Maharashtra”)
  - Field: Full name * (sample: “Rahul Kulkarni”)
  - Field: Flat, house, building * (sample: “Flat 12, Shanti Kunj”)
  - Field: Area, street * (sample: “Baner Road”)
  - Field: Landmark (sample: “Optional”)
  - Field: Address type
  - ✓ Billing address is the same
  - Add GSTIN for a business invoice
- **3. Delivery**
  - Standard Free · arrives by Wed, 7 Oct
- **4. Payment**
  - Choice: Pay online (selected in sample)
  - UPI Visa RuPay Netbanking
  - Part shown only as: flag: cod
    - Cash on delivery ₹49 fee · pay when it arrives
- Actions: Pay ₹23,640.00
- **Order summary**
  - Aria single-lever basin mixer
  - Matt black · Qty 1
  - Nimbus wall-hung WC
  - White · Qty 1
  - Row: Items ₹23,640.00
  - Row: Delivery Free
  - Row: To pay ₹23,640.00
- Sticky bottom bar (phone): Pay ₹23,640.00

### Rules and behaviour

1. Guests can buy without an account. Signing in only pre-fills details.
2. The pincode fills city and state. The state is the place of supply, which decides IGST or CGST plus SGST on the invoice.
3. Pay online opens Razorpay’s own window (UPI, cards, netbanking, wallets). Cash on delivery appears only when the zone and order value allow it, with its fee shown.
4. Placing the order recomputes every total on the server and holds the stock for 30 minutes while payment completes.
5. The WhatsApp box names the store and is ticked by default (a vendor setting). Unticked means SMS and email only. Offers need their own unticked box and are never mixed with order updates.
6. Offer consent is one unticked box per channel. Ticking one lets the store send offers and, if the shopper leaves without paying, up to two cart reminders on that channel. The contact step is saved as soon as it is filled so a reminder can go out; without a ticked box nothing is sent.
7. A referral (affiliate link in the last 30 days, or an affiliate’s coupon) is attached to the order on the server. The shopper sees nothing extra; affiliates never see the shopper’s name or contact.

<a id="st-confirmation"></a>

## Order confirmed

Reassure the shopper, show what happens next and give them tracking and the invoice.

- **Route:** `/checkout/success?order=AQV-10482`
- **Who:** Shoppers
- **Collections:** `orders`, `invoices`
- **Read first:** `docs/11-orders-payments-gst.md`
- **Wireframe:** `docs/wireframes/index.html#st-confirmation`
- **Links to:** [Order tracking](#st-order), [Home](#st-home), [Log in with a code](#st-login)

### On the screen (top to bottom, sample data)

- Heading: Thank you, Rahul. Your order is placed.
- Text: Order AQV-10482 · ₹23,640.00 paid by UPI
- Text: We’ve emailed the details to rahul.k@example.com
- Actions: Track order · Download invoice · Continue shopping
- **Delivery**
  - Arrives by Wed, 7 Oct Flat 12, Shanti Kunj, Baner Road, Pune, Maharashtra 411045
- **Items**
  - Row: Aria single-lever basin mixer · Matt black ₹5,190.00
  - Row: Nimbus wall-hung WC · White ₹18,450.00
- Notice: “Save your details for next time. Create an account with a one-time code. Create account”

### Rules and behaviour

1. The confirmation email goes out when payment is confirmed. A COD order gets it straight away.
2. The GST invoice PDF is made a few seconds after payment by a background job; the button appears when it is ready.
3. Guests can create an account here with a one-time code, and their earlier orders attach to it.
4. Order numbers run in sequence, so the number in the address never opens an order on its own. Only the browser that placed it (a signed cookie for 24 hours) or a signed-in owner sees this page and the invoice; later, guests use the tracking link or an email code.

<a id="st-login"></a>

## Log in with a code

Passwordless sign-in by email code, with password as an option. The account belongs to this store only.

- **Route:** `/account/login`
- **Who:** Shoppers
- **Collections:** `customers`, `customer-sessions`
- **Read first:** `docs/05-auth-and-roles.md`, `docs/14-security-and-compliance.md`
- **Wireframe:** `docs/wireframes/index.html#st-login`
- **Links to:** [My account](#st-account)

### On the screen (top to bottom, sample data)

- Image: Brand photo
- Row: ✓ Track orders and download invoices
- Row: ✓ Check out faster with saved addresses
- Row: ✓ Register warranties [P2]
- Heading: Log in or create an account
- Tabs: Email code · Password
- Field: Email (sample: “rahul.k@example.com”)
- Actions: Send code
- Part shown only as: Phase 2
  - Actions: Use mobile number instead
- Enter the 6-digit code sent to r•••@example.com
- 6-digit code boxes
- Actions: Verify
- If an account exists for this email, we’ve sent a code. New here? The code creates your account.
- Actions: Continue with Google [Later]

### Rules and behaviour

1. Accounts are per store. A login for Aquaverde does not work on another vendor’s store, even with the same email.
2. The message is the same whether or not the email has an account. Codes expire in 10 minutes, allow 5 tries and are rate limited.
3. Phone OTP over SMS or WhatsApp comes in Phase 2 (needs DLT-registered templates). Google sign-in comes later.

<a id="st-account"></a>

## My account

Orders with tracking and invoices, saved addresses and profile, in one place.

- **Route:** `/account`
- **Who:** Signed-in shoppers
- **Collections:** `orders`, `addresses`, `customers`, `wishlists`, `reviews`, `contact-preferences`
- **Read first:** `docs/05-auth-and-roles.md`, `docs/10-storefront-and-vendor-ui.md`, `docs/18-notifications.md`
- **Wireframe:** `docs/wireframes/index.html#st-account`
- **Links to:** [Wishlist](#st-wishlist), [Write a review](#st-review), [Affiliate dashboard](#st-affiliate-dash), [Order tracking](#st-order), [Warranty and service](#st-warranty)

### On the screen (top to bottom, sample data)

- Part shown only as: Phase 2
  - Warranties Loyalty points
- Log out of all devices
- Heading: Hi Rahul
- Row: Orders
- Row: Wishlist → Wishlist
- Row: My reviews → Write a review
- Row: Addresses
- Row: Profile
- Section: Your orders
- AQV-10482 Confirmed ₹23,640.00
- Actions: Track order · Invoice
- AQV-09811 Delivered ₹4,250.00
- Delivered 18 Aug · Return window closed 25 Aug
- Part shown only as: flag: reviews
  - Actions: Write a review
- Actions: Buy again · Invoice
- AQV-09102 Delivered ₹4,580.00
- Part shown only as: P2
  - Actions: Register warranty
- Actions: Invoice
- **Order updates**
  - WhatsApp updates to +91 98xxx xx210 [on]
  - SMS updates [on]
- Part shown only as: flag: offer-messages
  - **Offers and new launches**
    - Offers by email to rahul.k@example.com [on]
    - Part shown only as: flag: whatsapp-offers
      - Offers on WhatsApp [off]
- **Saved address**
  - Home · Flat 12, Shanti Kunj, Baner Road, Pune, Maharashtra 411045
  - Actions: Edit · Add address

### Rules and behaviour

1. Orders, tracking, invoices, addresses and profile are in the MVP.
2. A return can be requested from a delivered order while the return window is open.
3. “Log out of all devices” ends every session for this account.
4. Wishlist, My reviews and the affiliate dashboard appear when those features are on (affiliate only for approved affiliates). Warranties and loyalty points come in Phase 2.
5. Update preferences are kept by phone number, so they also cover guest orders placed with the same number.
6. Offers by email and by WhatsApp are separate switches from order updates. Turning offers off never stops order updates.
7. “Write a review” appears on delivered items until they are reviewed. The review is checked by the store before it shows.

<a id="st-order"></a>

## Order tracking

Where the order is, when it arrives, the invoice, and what the shopper can still do (cancel, return, get help).

- **Route:** `/account/orders/AQV-10482`
- **Who:** Signed-in shoppers; guests after a one-time code sent to the order’s email
- **Collections:** `orders`, `shipments`, `invoices`, `order-events`
- **Read first:** `docs/11-orders-payments-gst.md`
- **Wireframe:** `docs/wireframes/index.html#st-order`
- **Links to:** [My account](#st-account)

### On the screen (top to bottom, sample data)

- Breadcrumb: Account › Orders › AQV-10482
- Heading: Order AQV-10482 Shipped
- **Delivery**
  - Progress: ✓ Placed 2 Oct → ✓ Confirmed 2 Oct → ✓ Packed 3 Oct → Shipped 3 Oct → Delivered by 7 Oct
  - Delhivery · AWB 1490 2210 0458
  - Actions: Track on Delhivery
- **Items**
  - Row: Aria single-lever basin mixer Matt black · Qty 1 ₹5,190.00
  - Row: Nimbus wall-hung WC White · Qty 1 ₹18,450.00
  - Row: Delivery Free
  - Row: Total ₹23,640.00
- **Delivery address**
  - Rahul Kulkarni Flat 12, Shanti Kunj, Baner Road, Pune, Maharashtra 411045
- **Order updates**
  - WhatsApp to +91 98xxx xx210 [on]
  - SMS when WhatsApp can’t reach you [on]
- Actions: Download invoice · Get help on WhatsApp
- Notice: “Can’t cancel now that it has shipped. Returns open for 7 days after delivery. Request return”

### Rules and behaviour

1. Drawn on 3 October, after the vendor marked it packed and added the shipment. The steps mirror the statuses staff set in the CMS.
2. With Shiprocket (Phase 1), the AWB, courier and tracking updates arrive automatically. For manual shipments the link comes from the carrier and AWB number staff typed.
3. The invoice is a GST invoice PDF with the vendor’s GSTIN, HSN codes and the IGST line.
4. Cancel is possible until the order ships. Returns open for 7 days after delivery, with photos.
5. Shoppers can stop WhatsApp or SMS updates here, on the tracking page, or by replying STOP on WhatsApp.

<a id="st-wishlist"></a>

## Wishlist

Products the shopper saved to come back to, with today’s price, offers and stock.

- **Route:** `/wishlist`
- **Who:** Shoppers, signed in or not
- **Collections:** `wishlists`, `products`, `variants`, `schemes`
- **Read first:** `docs/07-api.md`, `docs/10-storefront-and-vendor-ui.md`
- **Wireframe:** `docs/wireframes/index.html#st-wishlist`
- **Links to:** [Log in with a code](#st-login), [Product page](#st-product), [Cart](#st-cart)

### On the screen (top to bottom, sample data)

- Heading: Your wishlist
- Notice: “Saved on this device. Log in to keep your wishlist on all your devices. Log in”
- Matt black · AV-OS-3200-MB
- ₹2,290 ₹3,500 35% off
- Launch price until Sat, 31 Oct
- Actions: Move to cart
- Brushed gold · AV-BM-1125-BG
- ₹7,450 ₹9,500 22% off
- Actions: Move to cart
- Chrome · AV-TR-6060-CP
- ₹1,890 ₹2,490 24% off
- Actions: Move to cart
- Move to cart adds the finish you saved · Price alerts come later

### Rules and behaviour

1. Hearts on product cards and the Save button on the product page add here. Guests keep the list on this device; signing in moves it into the account so it follows them to other devices.
2. Prices, offers and stock are read fresh every time. A product covered by a live scheme shows the scheme price and its real end date; a sold-out finish says so and can’t be moved to the cart.
3. “Move to cart” adds the saved finish and removes it from the list. Remove offers Undo for a few seconds.
4. Needs the wishlist feature. Price-drop and back-in-stock alerts for saved products are Later.

<a id="st-review"></a>

## Write a review

A buyer rates and reviews a product they received, from the review email or from their orders.

- **Route:** `/review/<token> · /account (Write a review)`
- **Who:** Shoppers who received the product
- **Collections:** `reviews`, `orders`, `media`
- **Read first:** `docs/06-data-model.md`, `docs/14-security-and-compliance.md`, `docs/18-notifications.md`
- **Wireframe:** `docs/wireframes/index.html#st-review`
- **Links to:** [My account](#st-account)

### On the screen (top to bottom, sample data)

- Heading: Review your purchase
- Matt black · AV-BM-1120-MB
- Field: Your rating *
- Field: Title (sample: “Looks premium, easy to fit”)
- Text area: Your review (sample: “Fitted it myself with the video. The matt black finish hides water spots. Lever is a little stiff in the first week.”)
- Field: Photos
- Select: Show my name as (sample: “Rahul K., Pune”) — Your email and phone are never shown
- Actions: Submit review
- Notice: “We check reviews before they appear, usually within two days. We publish honest reviews, good or bad.”

### Rules and behaviour

1. Only delivered order items can be reviewed, one review per item. The link in the review email carries a single-use token, so no login is needed; from the account the order proves the purchase.
2. Stars are required; title, text and up to 4 photos are optional. Photos are re-encoded and their location data removed.
3. The store checks reviews before they show (a vendor setting). It publishes honest reviews whatever the rating and rejects only abuse, personal details, spam or text not about the product, with the reason kept.
4. The name shown is first name and initial with the city, chosen here. Email and phone are never shown.
5. Nothing is offered in return for a review or for a good rating (docs/14).

<a id="st-track"></a>

## Tracking page (no login)

The page behind the “Track order” link in every WhatsApp, SMS and email: where the parcel is, without signing in.

- **Route:** `/t/K7Q2M9XW4P`
- **Who:** Anyone with the link
- **Collections:** `orders (trackingCode)`, `shipments`, `contact-preferences`
- **Read first:** `docs/18-notifications.md`, `docs/07-api.md`
- **Wireframe:** `docs/wireframes/index.html#st-track`
- **Links to:** [Log in with a code](#st-login)

### On the screen (top to bottom, sample data)

- Heading: Order AQV-10482
- Progress: ✓ Placed 2 Oct → ✓ Confirmed 2 Oct → ✓ Packed 3 Oct → Shipped 3 Oct → Delivered by 7 Oct
- Delhivery · AWB 1490 2210 0458
- Actions: Track on Delhivery
- **In this parcel**
  - Row: Aria single-lever basin mixer · Matt black × 1
  - Row: Nimbus wall-hung WC · White × 1
  - Notice: “(locked) Address and invoice are hidden on this page. Log in to see more”
- **Updates for +91 98xxx xx210**
  - WhatsApp updates [on]
  - SMS updates [on]
  - Actions: Stop updates for this number
- Opened from a Track order link

### Rules and behaviour

1. Every message links here on the vendor’s own domain, so the link is whitelisted on DLT once and needs no third-party link shortener.
2. The random code in the link shows the journey, courier and tracking number only. Address, phone and invoice need the shopper to log in or enter a one-time code.
3. “Stop updates” turns off WhatsApp and SMS for this order’s phone number. Order emails still arrive.
4. The page is rate limited so codes can’t be guessed in bulk.

<a id="st-messages"></a>

## What the shopper receives

The order updates as they arrive on the shopper’s phone: WhatsApp from the vendor’s own number, and SMS when WhatsApp can’t reach them.

- **Route:** `Shopper’s WhatsApp and SMS apps`
- **Who:** Shoppers
- **Collections:** `notification-logs`, `notification-templates`
- **Read first:** `docs/18-notifications.md`, `docs/adr/0005-per-vendor-messaging-senders.md`
- **Wireframe:** `docs/wireframes/index.html#st-messages`
- **Links to:** [Tracking page (no login)](#st-track)

### On the screen (top to bottom, sample data)

- Section: WhatsApp
- Business account
- Day divider: Friday
- Message: “Hi Rahul, your Aquaverde order AQV-10482 is confirmed. Total ₹23,640, paid. We’ll message you when it ships. 09:41”
- Message button: Track order
- Message button: Stop updates
- Day divider: Saturday
- Message: “Hi Rahul, your Aquaverde order AQV-10482 has shipped with Delhivery. Tracking number: 1490 2210 0458 Expected delivery: Wed 7 Oct We’ll message you again when it is out for delivery. 16:05”
- Message button: Track order
- Shopper reply: “Can it come after 6 pm? 16:20”
- Message: “Thanks for your message. This number only sends order updates. For help, WhatsApp us on +91 90000 00000, call 1800 000 0000 or email care@aquaverde.example. 16:20”
- Day divider: Wednesday
- Message: “Hi Rahul, your Aquaverde order AQV-10482 is out for delivery today. 09:12”
- Message button: Track order
- Section: SMS
- This sender can’t receive replies
- Day divider: Wednesday
- Message: “Aquaverde: your order AQV-10482 is out for delivery today. Track: https://aquaverde.tenantecom.in/t/K7Q2M9XW4P 09:12”
- Day divider: Example: shopper not on WhatsApp
- Message: “Your Aquaverde order AQV-10482 has shipped via Delhivery, tracking no. 1490 2210 0458. Track: https://aquaverde.tenantecom.in/t/K7Q2M9XW4P 16:05”

### Rules and behaviour

1. Messages come from the vendor’s own WhatsApp number and name, so shoppers see “Aquaverde”, never the platform.
2. Each one is a Meta-approved utility template: facts about this order only. Adding offers would make Meta treat it as marketing, which costs much more.
3. Every message has a “Track order” button to the tracking page on the vendor’s domain. “Stop updates”, or replying STOP, turns WhatsApp updates off.
4. In the MVP the updates number doesn’t take chats. Any reply gets one automatic answer per day pointing to the vendor’s chat number, phone and email, and the reply shows on the order in the CMS.
5. SMS goes out for out for delivery, and for other steps only when WhatsApp can’t reach the shopper. It is one-way, fits in one SMS, and every link and number in it is whitelisted on DLT.

<a id="st-offers"></a>

## Offers page

Every live offer in one place: festival schemes, launch prices and public coupon codes, with honest dates and a way to hear about the next one.

- **Route:** `/offers · /offers/<scheme-slug>`
- **Who:** Shoppers
- **Collections:** `schemes`, `coupons`, `contact-preferences`
- **Read first:** `docs/11-orders-payments-gst.md`, `docs/14-security-and-compliance.md`, `docs/18-notifications.md`
- **Wireframe:** `docs/wireframes/index.html#st-offers`
- **Links to:** [Product page](#st-product)

### On the screen (top to bottom, sample data)

- Heading: Offers
- Part shown only as: flag: schemes
  - Section: Live now
  - Image: Rainline launch banner
  - Heading: Rainline 200 mm overhead shower at ₹2,290
  - Text: Launch price instead of ₹2,690 (MRP ₹3,500), chrome and matt black. Works with coupons.
  - Ends Sat, 31 Oct, 11:59 pm 28 d 13 h left
  - Actions: Shop the launch
- Part shown only as: flag: schemes
  - Section: Coming up
  - Actions: Remind me
  - Each offer has its own page with the products it covers
- Part shown only as: flag: coupons
  - Section: Coupon codes
  - ₹500 off orders above ₹20,000
  - Until 31 Dec · once per customer
  - Actions: Copy
  - 5% off up to ₹750 when you pay online
  - Not with cash on delivery
  - Actions: Copy
- Part shown only as: flag: offer-messages
  - Heading: Hear about the next offer first
  - Field (sample: “Email or WhatsApp number”)
  - Actions: Sign up
  - Checkbox: Send me offers by email
  - Part shown only as: flag: whatsapp-offers
    - Checkbox: Send me offers on WhatsApp
- Part shown only as: Phase 2, flag: trade-schemes
  - Notice: “Trade partners see their trade schemes here when signed in to a trade account.”

### Rules and behaviour

1. Live schemes come first, each with its rule in plain words, what it covers and its real end time. The countdown is the scheme’s own end; nothing restarts or extends it.
2. Upcoming schemes show only when the vendor ticked “Show before it starts”, with their real start date. Prices don’t change until the scheme starts.
3. Each scheme has a landing page at /offers/ listing the products it covers with their offer prices. After the scheme ends the page stays up saying the offer has ended, so shared links don’t break.
4. Public coupon codes are listed with a copy button; private codes never appear. One coupon per order, and a scheme can block coupons.
5. The sign-up stores offer consent per channel, unticked. Order updates are separate. Needs offer-messages; the WhatsApp box shows only when the platform team has switched WhatsApp offers on for this vendor. The page needs schemes or coupons.
6. In Phase 2, trade partners signed in to their trade account also see their trade schemes here.

<a id="st-offer-messages"></a>

## Offer messages the shopper receives

What an opted-in shopper gets: an abandoned cart email, a festival offer on WhatsApp from the vendor’s own number, and the one-tap unsubscribe page.

- **Route:** `Shopper’s email and WhatsApp · /cart/restore/<token> · /unsubscribe/<token>`
- **Who:** Shoppers who opted in to offers
- **Collections:** `offer-campaigns`, `notification-logs`, `contact-preferences`, `carts`
- **Read first:** `docs/18-notifications.md`, `docs/14-security-and-compliance.md`
- **Wireframe:** `docs/wireframes/index.html#st-offer-messages`
- **Links to:** [Cart](#st-cart)

### On the screen (top to bottom, sample data)

- Section: Email: abandoned cart
- From Aquaverde <offers@news.aquaverde.example>
- Text: Hi Rahul, your cart is saved. Prices include GST and can change when an offer ends.
- Row: Aria single-lever basin mixer · Matt black ₹5,190
- Row: Nimbus wall-hung WC · White ₹18,450
- Actions: Return to your cart
- You get this because you asked for offers from Aquaverde by email. Unsubscribe · Aquaverde Ceramics Pvt Ltd, Survey 112, NH 8-A, Morbi, Gujarat 363642
- Section: WhatsApp: festival offer
- Business account
- Day divider: Sunday
- Image: Diwali banner
- Message: “Hi Rahul, our Diwali offer is on: 10% off all faucets and showers, up to ₹1,500, on orders above ₹3,000. Ends Mon, 9 Nov. 10:30”
- Message button: Shop the offer
- Message button: Stop offers
- Section: Unsubscribe page
- rahul.k@example.com · Order updates for your orders still arrive.
- Actions: Undo
- Caps and send window

### Rules and behaviour

1. Sent only on channels where the shopper ticked the offers box. Order updates never carry offers, and offers never use order-update templates.
2. Abandoned cart: first reminder an hour after the cart goes quiet, an optional second after 24 hours, never more. The button restores this exact cart on any device for 7 days. Ordering, emptying the cart or unsubscribing stops the reminders.
3. WhatsApp offers are Meta “marketing” templates from the vendor’s own number, about ₹1.02 each including GST on the vendor’s Meta bill. Each has a “Stop offers” button. Sent only when the platform team has switched WhatsApp offers on for this vendor; otherwise offers and reminders go by email.
4. Every offer email has an Unsubscribe link and one-click unsubscribe headers. The page confirms in one tap and keeps order updates on.
5. At most 2 offer messages a week per shopper (vendor setting, platform cap 3), sent only between 10:00 and 20:00.

<a id="st-affiliate"></a>

## Affiliate program

Invite creators, stylists and fitters to promote the store for a commission, and take their application.

- **Route:** `/affiliate`
- **Who:** Anyone; applying needs a store account
- **Collections:** `affiliates`, `customers`
- **Read first:** `docs/11-orders-payments-gst.md`, `docs/14-security-and-compliance.md`, `docs/05-auth-and-roles.md`
- **Wireframe:** `docs/wireframes/index.html#st-affiliate`
- **Links to:** [Affiliate dashboard](#st-affiliate-dash)

### On the screen (top to bottom, sample data)

- Image: Creator photo
- Heading: Earn with Aquaverde
- Text: Share bathrooms you love. Earn 5% of every order you refer, paid monthly.
- Row: 1 Apply with your store account We reply within 3 working days
- Row: 2 Share your link or code Instagram, YouTube, WhatsApp or your website
- Row: 3 Earn on delivered orders Confirmed after the 7-day return window
- Notice: “Paid by Aquaverde by UPI or bank transfer each month, once you have ₹500 or more confirmed. TDS applies above ₹20,000 a year.”
- **Apply**
  - Field: Full name * (sample: “Riya Sharma”)
  - Field: Mobile * (sample: “+91 98xxx xx455”)
  - Field: Where do you share? *
  - Field: Profile link (sample: “instagram.com/riya.homes”)
  - Text area: Tell us about your audience (sample: “Home styling for apartments in Pune and Mumbai, about 18,000 followers.”)
  - Field: PAN (sample: “Needed before your first payout”)
  - I accept the affiliate terms and will mark my posts as a paid partnership
  - Also send me offers by email
  - Actions: Send application
  - Signed in as riya@example.com

### Rules and behaviour

1. Commission is a share of the order value before GST, delivery and COD fee, after discounts. It is confirmed once the return window closes and cancelled if the order is cancelled or returned.
2. Applying needs a store account (email code). The vendor approves each application; approved affiliates get a link (/r/CODE) and can be given a personal coupon.
3. The vendor pays affiliates itself each month by UPI or bank transfer and records it. Above ₹20,000 a year, 2% TDS is deducted (20% without PAN), so PAN is asked before the first payout.
4. Affiliates must say a post is a paid partnership. The terms they accept say so; the vendor writes the terms.
5. Needs the affiliate feature. Interior designers join as trade partners in Phase 2, with commission on client orders.

<a id="st-affiliate-dash"></a>

## Affiliate dashboard

An approved affiliate’s link and code, referred orders, commission by status and payouts.

- **Route:** `/affiliate/dashboard`
- **Who:** Approved affiliates (signed in)
- **Collections:** `affiliates`, `referrals`, `affiliate-payouts`, `affiliate-clicks`
- **Read first:** `docs/11-orders-payments-gst.md`, `docs/07-api.md`
- **Wireframe:** `docs/wireframes/index.html#st-affiliate-dash`

### On the screen (top to bottom, sample data)

- Heading: Hi Riya
- Figure: Clicks, 30 days = 1,240
- Figure: Orders, 30 days = 18
- Figure: Pending = ₹2,140 (return windows open)
- Figure: Approved = ₹1,180 (paid in early November)
- **Your link and code**
  - Field: Link
  - Field: Link to any page
  - Field: Your coupon
- **Payouts**
  - Row: PAY/26-27/0012 September · gross ₹4,900 · TDS ₹0 · paid 2 Oct · UTR ending 7731 ₹4,900
  - Row: PAY/26-27/0007 August · gross ₹2,350 · TDS ₹0 · paid 1 Sep ₹2,350
  - Actions: Edit
- **Referred orders**
  - Table: Date, Order value, Commission, Status
    - row: 2 Oct | ₹20,033.90 | ₹1,001.70 | Pending: not delivered yet
    - row: 29 Sep | ₹1,940.68 | ₹155.25 | Pending until 9 Oct Shower, 8%
    - row: 21 Sep | ₹3,601.69 | ₹180.08 | Approved
    - row: 14 Sep | ₹4,398.31 | ₹219.92 | Reversed Returned
  - Text: Order value before GST, delivery and COD fee

### Rules and behaviour

1. Referred orders show date, order value and commission only. Affiliates never see the shopper’s name, phone or address.
2. Pending commission waits for the order’s return window; approved commission goes into the next monthly statement; a cancelled or returned order reverses it, with the reason.
3. Any store page can be turned into a referral link. The link sets a 30-day cookie; the last link clicked wins. The personal coupon also credits the affiliate, but never for their own orders.
4. Statements show gross commission, TDS and the amount paid with the UTR, as a PDF. Payout details are stored encrypted and shown masked; changing them sends an email to the affiliate.

<a id="st-dealers"></a>

## Dealer locator

Find the nearest dealer or experience centre to see products in person, call them, message them or get directions.

- **Route:** `/dealers?near=411045`
- **Who:** Shoppers, fitters, architects
- **Collections:** `dealers`
- **Read first:** `docs/08-modules-and-feature-flags.md`
- **Wireframe:** `docs/wireframes/index.html#st-dealers`

### On the screen (top to bottom, sample data)

- Part shown only as: flag: dealer-locator
  - Heading: Find a dealer
  - Field (sample: “Pune”)
  - Actions: Use my location
  - All Dealers Experience centres Distributors
  - Tabs: List · Map
  - Shree Sanitation Dealer 2.1 km
  - Actions: Call · WhatsApp · Directions
  - Aqua Bath Studio Experience centre 7.8 km
  - Actions: Call · WhatsApp · Directions
  - Kumar Bath House Dealer 6.4 km
  - Actions: Call · WhatsApp · Directions
  - Directions open Google Maps
  - Image: Map with dealer pins

### Rules and behaviour

1. Shown only with the dealer-locator feature, typical for sanitary, locks and decor brands.
2. Using the phone’s location is optional. Pincode or city search always works.
3. Call and WhatsApp open on the phone. Directions opens Google Maps in a new tab.

<a id="st-downloads"></a>

## Downloads

Catalogues, price lists, spec sheets, manuals and drawings in one place, which dealers and architects use constantly.

- **Route:** `/downloads`
- **Who:** Shoppers, dealers, architects
- **Collections:** `product-documents`, `media`
- **Read first:** `docs/08-modules-and-feature-flags.md`, `docs/06-data-model.md`
- **Wireframe:** `docs/wireframes/index.html#st-downloads`
- **Links to:** [Log in with a code](#st-login)

### On the screen (top to bottom, sample data)

- Part shown only as: flag: downloads
  - Heading: Downloads
  - Tabs: All · Catalogues · Price lists · Spec sheets · Manuals
  - Field (sample: “Search by product or model no.”)
  - Row: Aquaverde product catalogue 2026 PDF · 24 MB · updated Sep 2026 Download
  - Row: Price list, October 2026 PDF · 1.1 MB Download
  - Row: Aria series spec sheet PDF · 420 KB Download
  - Row: Nimbus WC installation manual PDF · 2.3 MB Download
  - Row: [P2] (locked) Dealer price list, October 2026 PDF · 1.4 MB · for trade partners Log in to download
  - Text: Files are served from storage through a CDN

### Rules and behaviour

1. Lists every document marked “show on downloads page” in the CMS. Needs the downloads feature.
2. Some files can be limited to signed-in trade partners in Phase 2, such as a dealer price list.
3. Large files come straight from media storage through a CDN, so they do not slow the store.

<a id="st-contact"></a>

## Contact and quote request

One form for quotes, product questions, dealership enquiries and service, prefilled with the product when opened from a product page.

- **Route:** `/contact?product=AV-TD-4410&type=quote`
- **Who:** Shoppers, builders, would-be dealers
- **Collections:** `enquiries`
- **Read first:** `docs/06-data-model.md`, `docs/14-security-and-compliance.md`
- **Wireframe:** `docs/wireframes/index.html#st-contact`
- **Links to:** [Dealer locator](#st-dealers)

### On the screen (top to bottom, sample data)

- Part shown only as: flag: enquiries
  - **Request a quote**
    - Select: What do you need? (sample: “Request a quote”)
    - Notice: “Sola thermostatic diverter AV-TD-4410 Quantity 40”
    - Field: Name * (sample: “Rakesh Mehta”)
    - Field: Mobile * (sample: “+91 96xxx xx771”)
    - Field: Email (sample: “purchase@mehta.example”)
    - Field: Company (sample: “Mehta Builders”)
    - Field: City (sample: “Surat”)
    - Field: Pincode (sample: “395007”)
    - Text area: Message (sample: “Need 40 units for a residential project, delivery by November.”)
    - Field: Attach BOQ or drawing (sample: “PDF or image, up to 10 MB”)
    - ✓ Aquaverde may contact me about this enquiry.
    - Actions: Send enquiry
    - Notice: “✓ Thanks, Rakesh. Reference ENQ-3108. We reply within one working day.”
  - **Other ways to reach us**
    - Row: 1800 000 0000 · Mon to Sat, 9:30 to 6:30
    - Row: +91 90000 00000
    - Row: care@aquaverde.example
    - Row: Survey 112, NH 8-A, Morbi, Gujarat 363642
    - Row: Grievance officer: Priya Shah, Director · grievance@aquaverde.example
    - Actions: Find a dealer near you

### Rules and behaviour

1. Each submission lands in the CMS Enquiries inbox with the product attached. Needs the enquiries feature.
2. Only the fields needed to reply, with a clear consent line, in line with India’s DPDP Act.
3. The form is rate limited and spam checked. The shopper gets a reference number and an email copy.
4. The grievance officer’s name and contact are shown here and in the footer, as India’s e-commerce rules require. Complaints are acknowledged within 48 hours and resolved within a month.

<a id="st-warranty"></a>

## Warranty and service (Phase 2)

Register a product’s warranty and book a service visit, for brands that sell locks, fittings and sanitaryware.

- **Route:** `/warranty`
- **Who:** Shoppers
- **Collections:** `warranty-registrations`, `service-requests`
- **Read first:** `docs/08-modules-and-feature-flags.md`, `docs/17-roadmap.md`
- **Wireframe:** `docs/wireframes/index.html#st-warranty`

### On the screen (top to bottom, sample data)

- Part shown only as: Phase 2, flag: warranty, flag: service-requests
  - Heading: Warranty and service
  - Tabs: Register a product · Request service · Track a request
  - **Register your warranty**
    - Field: Product or model no. (sample: “AV-BM-1120 · Aria single-lever basin mixer”)
    - Field: Purchase date (sample: “18 Aug 2026”)
    - Field: Bought from
    - Field: Invoice photo (sample: “Not needed for online orders”)
    - Notice: “Covered until 18 Aug 2031”
    - Actions: Register
  - **Request a service visit**
    - Select: Product (sample: “Aria basin mixer · registered”)
    - Select: Problem (sample: “Leaking”)
    - Field: Pincode (sample: “411045”)
    - Text area: Describe it (sample: “Water drips from the base when the tap is open.”)
    - Field: Photos or video (sample: “Add up to 4 files”)
    - Field: Preferred visit
    - Actions: Request a visit
    - Notice: “SR-0192 · visit booked Thu 8 Oct, 10 to 12. We’ll message you on the day.”

### Rules and behaviour

1. Phase 2, shown only when the warranty and service-requests features are on for the vendor.
2. The warranty end date is worked out from the purchase date and the product’s warranty months. Online orders fill in automatically.
3. Requests appear on the CMS Service requests board. Visit updates go by email, and by WhatsApp once that connector exists.

<a id="st-offline"></a>

## Install, offline and unavailable

The app-like moments of the PWA: installing the store, using it without a connection, and what shoppers see when a store is paused.

- **Route:** `/offline · manifest.webmanifest`
- **Who:** Shoppers
- **Collections:** `site-settings (name, icons, theme colour)`
- **Read first:** `docs/13-pwa-seo-performance.md`, `docs/10-storefront-and-vendor-ui.md`
- **Wireframe:** `docs/wireframes/index.html#st-offline`
- **Links to:** [Product page](#st-product)

### On the screen (top to bottom, sample data)

- **Offline**
  - You’re offline Check your connection. Pages you opened recently still work.
  - Section: Recently viewed
  - Row: Aria single-lever basin mixer ₹4,250 → Product page
  - Row: Nimbus wall-hung WC ₹18,450 → Product page
  - Actions: Try again
- **Install the app**
  - Image: 512 px icon
  - aquaverde.tenantecom.in
  - Actions: Install · Not now
  - Notice: “On iPhone: tap Share, then Add to Home Screen.”
- **Store unavailable**
  - AQUAVERDE Our store is getting an update We’ll be back shortly. For urgent help call 1800 000 0000.

### Rules and behaviour

1. The service worker keeps the store’s shell and recently viewed pages, so they open without signal. Cart changes, checkout and payment always need a connection.
2. Each vendor gets its own app name, icon and colour from their store settings. Android shows the install prompt; iPhone needs Share, then Add to Home Screen.
3. Shown when the platform team suspends a store or the vendor turns on maintenance mode. It tells search engines to come back later rather than dropping the pages.

