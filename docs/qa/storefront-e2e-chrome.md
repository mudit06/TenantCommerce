# Storefront end-to-end QA script (Claude in Chrome)

One script that tests every shopper-facing feature of the storefront, written to be handed to
**Claude in Chrome** as is. Built 14 October 2026 against `docs/progress.md` (Storefront section),
`docs/screens/storefront.md` and `docs/manual-testing.md` section 3.

- Store under test: **Home Orbit**, http://home-orbit.localhost:3000 (the vendor UI).
- Second store for isolation and the default look: **Demo Sanitary**, http://demo-sanitary.localhost:3000.
- Admin (only for the few setup steps marked **[CMS]**): http://localhost:3000/admin.
- Case IDs are `SF-<module>-<nnn>`. They don't clash with the SA, VC and E2E suites in `regression/`.

---

## Part A. Before the run (the human does this, about 10 minutes)

1. **QA database and app.** Docker Mongo running, then start the `app-qa` launch entry (or
   `DATABASE_URI="mongodb://localhost:27017/tenantecom_qa?replicaSet=rs0&directConnection=true" pnpm dev:fresh`).
   Never run this against your working database: the script places orders and changes data.
2. **Fresh data** (recommended), with that `DATABASE_URI` set:
   `pnpm seed`, `pnpm seed:home-orbit`, `pnpm demo:selling home-orbit`.
   For online payment cases also put Razorpay **test** keys in `.env` before `demo:selling`
   (`RAZORPAY_TEST_KEY_ID`, `RAZORPAY_TEST_KEY_SECRET`). Without them SF-09 is Not Applicable.
3. **[CMS] as the super admin or the Home Orbit owner** (Manage store):
   - Features: make sure **wishlist, reviews, schemes, coupons, offer-messages, abandoned-cart,
     dealer-locator, downloads, product-videos, whatsapp-button** are on. **Affiliate** needs the
     Enterprise plan: switch Home Orbit to Enterprise (or turn the feature on) to run SF-17;
     otherwise SF-17 is Not Applicable.
   - Coupons: a public coupon **HOME200**, ₹200 off on carts above ₹1,000 (VC-15).
   - Schemes: a **live** scheme "Diwali 2026", 10% off, max ₹1,500, covering Door hardware, shown
     on the Offers page, with coupons not combinable (VC-14). Optionally one **upcoming** scheme
     marked "show before it starts".
   - Store settings → Branding → **Animations on the store**: on.
   - Dealers: at least 2 dealers with pincodes and map positions, one in 411045 (VC-23).
   - Documents: at least 1 PDF with "Show on the Downloads page", linked to HOPH-504 (VC-07).
   - Home Orbit's store status: leave it **Draft** (the preview bar and robots cases expect it).
4. Keep the **`pnpm dev` terminal visible**. Login codes, emails (order, review, offer, cart
   reminder, unsubscribe links) and WhatsApp messages are printed there as `[dev-log email]` and
   `[dev-log whatsapp]`. Claude in Chrome cannot read the terminal, so it will **stop and ask you**
   for a code or link. Paste it in the chat when asked.
5. Chrome with the Claude extension, **signed out** of the store (clear cookies for
   `home-orbit.localhost` if you ran it before). Close heavy apps: the dev server compiles each
   page on its first visit and can take up to a minute.

### Test data

| What | Value |
|---|---|
| Shopper | Rahul Kulkarni, `rahul.k@example.com`, mobile `9876543210`, city Pune |
| Second shopper (isolation, guest list merge) | `priya.qa@example.com`, mobile `9123456780` |
| Pincodes | `411045` Pune, Maharashtra (home state zone, ₹99, free above ₹999); `110001` Delhi (rest of India, ₹149, free above ₹1,999); `12345` invalid |
| Address | `Flat 4, Sai Residency, Baner Road`, Pune |
| GSTIN | valid `27AAPFU0939F1ZV`; invalid checksum `29AABCT1234F1ZN` |
| Products | `HOPH-504` Feather stainless steel pull handle (sizes and finishes): `/products/feather-stainless-steel-pull-handle-hoph-504`; `HOGDH-610` Lotus glass door handle; an aldrop from `/c/door-hardware/aldrops` |
| Coupons | `HOME200` (valid above ₹1,000), `NOSUCHCODE` (invalid) |
| Razorpay test UPI | `success@razorpay` (test mode only) |
| Viewports | Desktop 1280×800, small desktop 1024×768, phone 390×844 |

---

## Part B. Instructions for Claude in Chrome (paste this whole file, then the run prompt)

You are a QA tester. Test the storefront at http://home-orbit.localhost:3000 by following the
cases below **in order**. Rules:

1. **Stay on localhost.** Only open `*.localhost:3000` addresses. For links that leave the site
   (WhatsApp `wa.me`, Google Maps, courier tracking, YouTube) **read the link's address and check
   it, but do not open it**. Razorpay's test checkout window is the only exception (SF-09).
2. **Test data only.** Use only the data in "Test data". Never type real personal data, real
   passwords, real card numbers or live keys. Don't sign in to anything outside localhost.
3. **Codes and links from the terminal.** When a case needs a login code, an emailed link or a
   message text, **stop and ask me**: "Please paste the code/link printed in the pnpm dev
   terminal for <what>". Wait for my reply, then continue. If I say "skip", mark the case Blocked.
4. **[CMS] steps.** A step marked [CMS] happens in the admin. If I have left an admin tab signed in
   you may do it there; otherwise ask me to do it and tell you when it's done.
5. **[HUMAN] cases** need something you can't do (operating system settings, a second browser,
   a phone). Mark them **Not Run (human)** and move on.
6. **Wait for visible conditions**, not fixed delays. A first visit can take up to 60 seconds to
   compile. Retry once before calling it a failure. Text typed before a page has finished loading
   is lost: wait for the page to settle. If the *type* action doesn't reach a field, use form
   input or individual key presses.
7. After every case, also glance at the **console** for red errors and the **network** for 4xx/5xx
   responses on that page (ignore the Next.js dev overlay's own HMR messages). Note any you see
   in that case's Actual result, even when the case passes.
8. **Remember values** the run creates and reuse them: `ORDER_1`, `ORDER_2`… (order numbers such as
   HOM-10001), `TRACK_1` (the `/t/<code>` address), `ENQ_1` (enquiry reference).
9. Status per case: **Pass**, **Fail**, **Blocked** (a precondition is missing: say which),
   **Not Applicable** (feature not available in this setup: say why), **Not Run (human)**.
   On a Fail write: page address, what you did, what you expected, what you saw (exact text),
   and a suggested severity (Critical, High, Medium, Low).
10. Don't stop the run on a failure. Continue with the next case unless the whole site is down.

### The report to send back (use exactly this format)

```
# Storefront QA run: <date> <time>, run <1|2|3|4|all>
Environment: <store URL>, viewport(s) used, Razorpay test keys present? yes/no

## Summary
Total: N · Pass: N · Fail: N · Blocked: N · Not Applicable: N · Not Run (human): N

## Results
| ID | Status | Actual result (one line) |
|---|---|---|
| SF-01-001 | Pass | ... |

## Defects
### D1 · <short title> · <severity> · <case ID>
- URL:
- Steps:
- Expected:
- Actual (exact text, console or network error):

## Values created
ORDER_1=..., ORDER_2=..., TRACK_1=..., ENQ_1=...

## Notes
Anything slow, flaky, confusing or worth a second look, even if it passed.
```

### Run prompts (the script is long; run it in four sittings)

- **Run 1, browsing** (SF-01 to SF-06, SF-18 to SF-21): "Run Part C cases SF-01 to SF-06 and
  SF-18 to SF-21 of this script. Report in the format above."
- **Run 2, buying** (SF-07 to SF-11): "Run SF-07 to SF-11. Report in the format above."
- **Run 3, account and after-sale** (SF-12 to SF-14): "Run SF-12 to SF-14…"
- **Run 4, growth** (SF-15 to SF-17, SF-22): "Run SF-15 to SF-17 and SF-22…"
- Or "Run every case in Part C in order" if your session can hold it.

---

## Part C. Test cases

Priority: **P1** critical path (smoke), **P2** important, **P3** detail.

### SF-01 · Store shell: header, menus, footer, bottom navigation

Desktop 1280×800 unless stated.

**SF-01-001 · Preview bar on a draft store** (P2)
Open http://home-orbit.localhost:3000.
Expect: a thin bar at the top: "Preview: this store is not live yet, so search engines don't list it."

**SF-01-002 · Top line** (P3)
Read the line above the logo.
Expect: Find a dealer, the live offer (Diwali 2026) or the tagline, phone, WhatsApp, Track order.

**SF-01-003 · Header** (P1)
Read the header.
Expect: logo, a wide "Search products or model no." box, account icon, wishlist icon with a
count, cart icon with a count. Nothing overlaps.

**SF-01-004 · Category bar and large dropdowns** (P1)
Hover **Door hardware**, then **Home decor**, then **Bathroom**.
Expect: a large dropdown with up to four headed columns (e.g. "Aldrops and latches" with
Laser-cut, BMC-cut, Heavy, Classic), a picture on the right and Shop all. Bathroom lists Towel
rings, Towel racks, Bathroom shelves, Soap dishes, Soap dispensers, Tumbler holders, Toilet paper
holders. The menu eases in (motion on).

**SF-01-005 · All categories** (P2)
Hover **All categories**.
Expect: every category with its photo. Clicking one opens its listing.

**SF-01-006 · Menu links** (P2)
Click About us, Contact, Find a dealer and Offers in the bar, going back each time.
Expect: `/pages/about-us`, `/contact`, `/dealers`, `/offers` open in Home Orbit's design.

**SF-01-007 · Header at 1024 px** (P2)
Resize to 1024×768.
Expect: menu on one line or wrapped neatly, search bar on its own row, no overlap, no
horizontal scroll (`document.documentElement.scrollWidth <= innerWidth`).

**SF-01-008 · Footer** (P1)
Scroll to the footer.
Expect: logo, phone and WhatsApp, **Get our offers first** (email box, "By email" unticked), Shop
(with Offers), Help (Track order, the published policies, Contact us), Company (About us, Find a
dealer, Downloads, Affiliate program when on), bottom line with business name, GSTIN, grievance
officer and the ways to pay (COD; UPI, Visa, RuPay, Netbanking when Razorpay is connected).

**SF-01-009 · Footer policy links** (P2)
Click each policy under Help (Privacy policy and the others listed).
Expect: each opens `/pages/<slug>` with content, no 404.

**SF-01-010 · Phone header and menu** (P1)
Resize to 390×844, reload. Tap the menu button. Open Door hardware.
Expect: a menu panel eases in; each item opens to its columns; nothing runs off the screen; close
works.

**SF-01-011 · Phone bottom navigation** (P1)
At 390×844 read the bottom of the screen.
Expect: a bar with Home, Shop, Dealers, Account, Cart (cart shows its count). **Shop** opens `/c`
listing every category; Dealers opens `/dealers`; Account opens login or the account.

**SF-01-012 · Bottom bar gives way to sticky actions** (P2)
At 390×844 open HOPH-504's product page, then `/cart` (with an item), then `/checkout`.
Expect: on these pages the bottom bar is replaced by the page's own sticky button (Add to cart,
Checkout, Place order). Return to 1280×800 afterwards.

**SF-01-013 · Motion on** (P3)
Reload home and scroll slowly.
Expect: sections after the hero rise in as they arrive; cards rise in; nothing jumps (no layout
shift); hero buttons get a light sweep on hover.

**SF-01-014 · Reduced motion** (P3) [HUMAN]
OS setting "Animation effects" off, reload.
Expect: everything shows at once, the scrolling line stops, the hero doesn't autoplay.

**SF-01-015 · Motion switched off in the CMS** (P3) [CMS]
Store settings → Branding → Animations on the store: off. Reload the home page.
Expect: no rise-in or sweep; content shows straight away. Switch it back on.

### SF-02 · Home page

**SF-02-001 · One h1 and title** (P2)
On home, run `document.querySelectorAll('h1').length` and read `document.title`.
Expect: exactly 1 h1; a title naming Home Orbit.

**SF-02-002 · Hero slider** (P1)
Read the hero. Click the right arrow, then a dot.
Expect: rounded charcoal slider, 3 slides with a small label above each heading, dots under it,
arrows on desktop; arrows and dots change the slide; the next slide's words slide in after it.

**SF-02-003 · Hero autoplay** (P2)
Move the pointer once over the page (off the hero), then watch for 15 s. Then hover the hero for
10 s.
Expect: the slide changes about every 6 s; while hovered or focused it stays still. (On first
load without interaction it stays still until you scroll, move or tap.)

**SF-02-004 · Offer strip** (P2)
Look under the hero.
Expect: with Diwali 2026 live, an offer strip; it is absent when no scheme is live.

**SF-02-005 · Benefits line** (P3)
Expect: the benefits block under the hero (e.g. GST invoice, returns, COD).

**SF-02-006 · Shop by category** (P1)
Use its arrows (desktop), then **View all**.
Expect: square category cards in a row that scroll; View all opens `/c`.

**SF-02-007 · Promo card and products** (P3)
Expect: "Designed for modern homes" with a tall promo card "Hexagon towel rings" beside products.

**SF-02-008 · Product carousels** (P2)
Scroll the glass door handles, key hangers and bathroom accessories carousels; click View all.
Expect: cards with photo, name, model number, price (MRP struck, offer price where a scheme
covers it), stars once reviewed; View all opens the category.

**SF-02-009 · Second photo on hover** (P3)
Hover a product card whose product has 2+ photos.
Expect: the second photo shows.

**SF-02-010 · Scrolling line, brand story, banner** (P3)
Expect: the towel rack banner, a slowly scrolling line of ranges, the brand story.

**SF-02-011 · Dealer finder block** (P2)
In "See it before you buy" type `411045` and submit.
Expect: `/dealers?near=411045` opens with nearest dealers first.

**SF-02-012 · Offers sign-up on home** (P2)
In "Get our offers first" submit an empty email; then `rahul.k@example.com` without ticking the
consent; then with it ticked.
Expect: empty is refused with a message; without consent it asks for consent (or doesn't
subscribe); with consent a thank-you message. Consent boxes start unticked.

**SF-02-013 · Questions (FAQ)** (P3)
Open and close two questions.
Expect: each expands and collapses; keyboard Enter/Space works too.

**SF-02-014 · Enquiry form on home** (P2)
Submit it empty, then with name Rahul Kulkarni, mobile 9876543210, a message and consent.
Expect: errors under the required fields first; then "Thank you… Your reference is ENQ-<n>".
Save as `ENQ_1`.

**SF-02-015 · What buyers say** (P3)
Expect: shows only once there are published reviews (after SF-14). Re-check at SF-14-005.

### SF-03 · Categories, listing, filters, sort

**SF-03-001 · All categories page** (P2)
Open `/c`.
Expect: every top category with photo; each opens its listing.

**SF-03-002 · Parent category** (P2)
Open `/c/door-hardware`.
Expect: breadcrumbs, subcategory links, and products from all subcategories.

**SF-03-003 · Subcategory listing** (P1)
Open `/c/door-hardware/aldrops`.
Expect: breadcrumbs Home › Door hardware › Aldrops, cards with photo and model number,
"Prices include GST" at the bottom.

**SF-03-004 · Attribute filters with counts** (P1)
Tick one Finish.
Expect: the list narrows, counts shown beside options, address gains e.g. `?finish=antique`.
Options that would show nothing are not listed.

**SF-03-005 · Filters survive a reload and a new tab** (P2)
Copy the filtered address, open it in a new tab.
Expect: the same filtered list and ticked boxes.

**SF-03-006 · Price filter** (P1)
Min 500, max 1000, Go.
Expect: only ₹500 to ₹1,000 products; address has `?min=500&max=1000`; filter count shows 1.
**Clear all** empties every filter.

**SF-03-007 · Price filter edge cases** (P3)
Min 1000 max 500; min `-5`; min `abc`.
Expect: no crash; swapped, ignored or refused with a message; never a server error.

**SF-03-008 · In stock only** (P2)
Tick In stock only.
Expect: no card says Out of stock.

**SF-03-009 · On offer** (P2)
On `/c/door-hardware` tick On offer.
Expect: only products covered by Diwali 2026, each with the offer badge.

**SF-03-010 · Rating filter** (P3)
Expect: appears only once products have published reviews (after SF-14).

**SF-03-011 · Sort** (P1)
Try Popular, Newest, Price low to high, Price high to low, Name.
Expect: each reorders; low to high puts the cheapest first (check the first 3 prices); the choice
is kept in the address.

**SF-03-012 · Load more and pages** (P2)
On a category with many products (e.g. `/c/door-hardware`) press **Load more**.
Expect: the next products appear under the first without a full reload; numbered page links exist
in the page (for search engines) and `?page=2` opens page 2 directly.

**SF-03-013 · Add to cart from a card (one finish)** (P1)
Press **Add to cart** on a card for a product with a single option.
Expect: "Added ✓", the header cart count rises (and bumps), you stay on the page.

**SF-03-014 · Choose options picker** (P1)
Press **Choose options** on a card with several finishes/sizes.
Expect: a picker opens on the page with each option's price and stock, quantity, Add to cart and
Buy now; adding updates the count. Escape or Close closes it and focus returns.

**SF-03-015 · Out of stock and Ask for a quote on cards** (P3)
Find a card that says Out of stock or **Ask for a quote** (a product without an online price).
Expect: Out of stock can't be added; Ask for a quote opens the quote form in place.

**SF-03-016 · Quick add on home cards** (P2)
On the home page hover a card and use the round + button.
Expect: same behaviour as SF-03-013/014.

**SF-03-017 · Phone filter sheet** (P1)
At 390×844 on `/c/door-hardware/aldrops` tap **Filter**.
Expect: a sheet from the bottom over a dimmed page with Close, **Clear** and **Show N products**;
ticking updates N; Show applies; the address carries the filters.

**SF-03-018 · Old category address redirects** (P2)
Open `/c/bathroom-accessories/soap-dishes-and-dispensers`.
Expect: a redirect to the Soap dishes category (no 404).

**SF-03-019 · Unknown category** (P2)
Open `/c/no-such-category`.
Expect: the store's own "page not found" in Home Orbit's design.

### SF-04 · Search

**SF-04-001 · Instant results by model number** (P1)
Type `610` in the header search.
Expect: a list under the box with "Lotus glass door handle HOGDH-610" (photo, model number,
price) and "See all results for “610”".

**SF-04-002 · Model number without dash or partly** (P2)
Type `hogdh610`, then `1120`.
Expect: matching model numbers come first.

**SF-04-003 · Words, categories and typos** (P2)
Type `key`, then `glas handel`, then `basin mixr`.
Expect: `key` shows products and a Key hangers category; typos still find glass door handles.

**SF-04-004 · Keyboard** (P2)
Type `handle`, press Down twice, Enter.
Expect: the highlighted item opens. Escape closes the list.

**SF-04-005 · Results page** (P1)
Type `handle` and press Enter.
Expect: `/search?q=handle`, "Results for “handle”", the category filters and sort, **Best match**
first.

**SF-04-006 · Recent searches** (P3)
Click the empty search box.
Expect: **Recent searches** with your last terms (kept on this device only).

**SF-04-007 · No results** (P2)
Search `zzqxv`.
Expect: "Nothing matches “zzqxv”. Try a shorter word or the model number printed in our catalogue."

**SF-04-008 · Unsafe input** (P2)
Search `<script>alert(1)</script>` and `"; drop`.
Expect: shown as plain text, no alert, no server error.

**SF-04-009 · Phone search** (P2)
At 390×844 open search and type `610`.
Expect: results fit the screen and are tappable.

### SF-05 · Product page

Open `/products/feather-stainless-steel-pull-handle-hoph-504`.

**SF-05-001 · Content** (P1)
Expect: gallery, title with model number HOPH-504, Size and Finish choices (finishes with colour
dots), price with MRP struck and "% off", "Inclusive of all taxes", quantity, stock ("In stock"),
specification table, label details (manufacturer, country of origin), related products.

**SF-05-002 · Gallery** (P2)
Click thumbnails / swipe.
Expect: the main photo changes; photos have alt text.

**SF-05-003 · Option pickers change price and stock** (P1)
Pick **12 inch** and **Rose gold**, then another finish.
Expect: price, MRP and stock follow the chosen option; unavailable combinations are marked.

**SF-05-004 · Quantity limits** (P2)
Set quantity to 0, a negative number, and 9999.
Expect: clamped or refused; never more than stock; a clear message.

**SF-05-005 · Pincode check, home state** (P1)
Check delivery for `411045`.
Expect: a delivery date, the fee or "Free delivery on this order", "Cash on delivery available".

**SF-05-006 · Pincode check, other state and invalid** (P2)
Check `110001`, then `12345`, then empty.
Expect: 110001 gives a date and the rest-of-India fee rule; 12345 and empty give a clear error.

**SF-05-007 · Promises line** (P3)
Expect: "7-day returns · GST invoice · Cash on delivery" (return days from Store settings;
warranty when the specifications have one).

**SF-05-008 · Offers for you** (P2)
Expect: **Offers for you** shows HOME200 with **Copy** (copies the code) and the live or next
scheme with its real dates and Details.

**SF-05-009 · Scheme price** (P1)
Expect (product covered by Diwali 2026): an offer badge, "Offer ends <date>", the offer price per
finish with the real MRP struck through.

**SF-05-010 · Add to cart** (P1)
Add 12 inch / Rose gold, quantity 1.
Expect: "Added to your cart"; the header cart shows 1.

**SF-05-011 · Buy now** (P2)
Pick another option, Buy now.
Expect: goes to checkout (or cart) with that item.

**SF-05-012 · Save to wishlist** (P2)
Press **Save** (heart).
Expect: saved state; header wishlist count +1. Leave it saved for SF-13.

**SF-05-013 · Quote form validation** (P1)
In **Request a bulk quote**, send empty.
Expect: errors under Name and the consent box, and "Add a mobile number or an email so the store
can reply". The summary names the chosen options ("Size: 12 inch, Finish: Rose gold").

**SF-05-014 · Quote form sends** (P1)
Name Rahul Kulkarni, mobile 9876543210, city Pune, quantity 50, consent ticked. Send.
Expect: "Thank you, your request has been sent. Your reference is ENQ-<n>. The Home Orbit team
will contact you soon."

**SF-05-015 · Quote form, bad values** (P3)
Mobile `12345`, email `abc@`, name `<b>x</b>`.
Expect: mobile and email refused with messages; HTML shown as text, never rendered.

**SF-05-016 · WhatsApp link** (P2)
Read the WhatsApp button's link (don't open it).
Expect: `https://wa.me/<store number>?text=…` naming the product, model number, size and finish.

**SF-05-017 · Downloads on the product** (P3)
Expect: the PDF linked in Part A with its name and size; its link points at the store's media.

**SF-05-018 · Installation video** (P3)
Scroll to the video (if the product has one).
Expect: loads only when scrolled to, from `youtube-nocookie.com`. Not Applicable if no video.

**SF-05-019 · Goes well with** (P3)
Expect: the product's own picks, or more from its category, as cards with quick add.

**SF-05-020 · Structured data** (P2)
Run `[...document.querySelectorAll('script[type="application/ld+json"]')].map(s=>JSON.parse(s.textContent)['@type'])`.
Expect: Product (with an Offer, price, INR, availability) and BreadcrumbList.

**SF-05-021 · Title, description, canonical** (P2)
Read `document.title`, the meta description and `link[rel=canonical]`.
Expect: product name in the title, a description, canonical on home-orbit.localhost.

**SF-05-022 · Phone sticky actions** (P1)
At 390×844 scroll the product page.
Expect: Add to cart (or Request a quote / WhatsApp for a catalogue product) stays fixed at the
bottom and works.

**SF-05-023 · Catalogue-only product** (P2)
Open a product without an online price (if any, from SF-03-015).
Expect: no price or Add to cart; Request a quote and WhatsApp instead.

**SF-05-024 · Unknown product** (P2)
Open `/products/no-such-product`.
Expect: the store's 404 page.

### SF-06 · Cart and coupons

**SF-06-001 · Cart content** (P1)
Open `/cart`.
Expect: each line with photo, finish, code, price and MRP, quantity, Remove; Price details with
items, discounts, delivery ("At checkout" until a pincode is set), total, "Includes GST of …",
savings on MRP; payment chips; Checkout.

**SF-06-002 · Quantity** (P1)
Press + then −.
Expect: line and total update from the server each time; can't go above stock or below 1 (or
going to 0 removes the line).

**SF-06-003 · Delivery pincode in cart** (P2)
Enter `411045`.
Expect: the delivery fee (₹99, or free above ₹999) and a date.

**SF-06-004 · Scheme discount line** (P1)
With a Door hardware item in the cart.
Expect: "Diwali 2026 − ₹…" under Discounts, 10%, capped at ₹1,500.

**SF-06-005 · Coupon below minimum** (P1)
With the cart under ₹1,000 (non-scheme items) enter `HOME200`.
Expect: "Add ₹<n> more…"; not applied.

**SF-06-006 · Coupon applied** (P1)
Raise the cart above ₹1,000 (non-scheme items), apply `HOME200`.
Expect: applied; the total drops by ₹200; Remove takes it off.

**SF-06-007 · Coupon vs scheme** (P2)
With a scheme-covered item, apply `HOME200`.
Expect: the cart keeps the better offer and says why ("can't be used with Diwali offer, which
saves you more"), or applies both if the scheme allows coupons.

**SF-06-008 · Invalid and empty code** (P2)
Apply `NOSUCHCODE`, then an empty box.
Expect: "This code isn't valid in this store." / a prompt to enter a code.

**SF-06-009 · Public codes in the cart** (P3)
Expect: public codes for this cart listed with Apply.

**SF-06-010 · Coupon rate limit** (P3)
Apply wrong codes 10 times quickly.
Expect: after several tries a "try again later" message; no server error.

**SF-06-011 · Move to wishlist** (P2)
**Move to wishlist** on a line.
Expect: the line leaves the cart; header wishlist count +1.

**SF-06-012 · Complete the look** (P3)
Expect: more from the cart's categories with Add to cart that adds and updates the cart.

**SF-06-013 · Remove and empty cart** (P2)
Remove every line.
Expect: an empty cart message with a way back to shopping; Checkout not offered. Then add
HOPH-504 (12 inch, Rose gold) and one aldrop back for SF-07.

**SF-06-014 · Cart survives a reload and a new tab** (P2)
Reload; open `/cart` in a new tab.
Expect: same lines and totals.

**SF-06-015 · Phone sticky checkout bar** (P2)
At 390×844 on `/cart`.
Expect: a sticky bar with the total and Checkout.

### SF-07 · Guest checkout and cash on delivery

Signed out. Cart from SF-06-013.

**SF-07-001 · Checkout page** (P1)
Open `/checkout`.
Expect: one page with contact (mobile, email), WhatsApp updates tick, address, business GSTIN
option, delivery, payment (COD, plus Pay online with Razorpay), order summary, test-mode notice
(with test keys), "Have an account? Log in".

**SF-07-002 · Required fields** (P1)
Place order with everything empty.
Expect: an error on each required field; focus moves to the first; nothing placed.

**SF-07-003 · Field validation** (P2)
Mobile `12345`, email `rahul@`, pincode `12345`.
Expect: each refused with a clear message.

**SF-07-004 · State from pincode** (P1)
Pincode `411045`.
Expect: state fills itself as Maharashtra; delivery Standard with a date and fee.

**SF-07-005 · Business GSTIN** (P2)
Tick business invoice, enter `29AABCT1234F1ZN`, then `27AAPFU0939F1ZV`.
Expect: the first refused (checksum); the second accepted. Untick it again.

**SF-07-006 · Offer consent unticked** (P2)
Expect: "Offers and new launches" by email (and WhatsApp if on) start **unticked**.

**SF-07-007 · COD fee** (P1)
Choose Cash on delivery.
Expect: the ₹49 fee joins the summary; button reads "Place order · ₹<total>"; total = items −
discounts + delivery + COD fee.

**SF-07-008 · Place a COD order** (P1)
Fill Rahul's details and the address, COD, Place order **once**.
Expect: "Thank you, Rahul. Your order is placed." with the order number (HOM-…), amount "to pay
in cash on delivery", delivery date and address, the items, Track order. Save `ORDER_1` and the
Track order address as `TRACK_1`.

**SF-07-009 · Cart empties** (P1)
Expect: the header cart count is empty after the order.

**SF-07-010 · Shop again after an order (DEF-003 regression)** (P1)
Open a category and **Add to cart** on a card.
Expect: the cart count goes to 1 and the cart holds only the new item.

**SF-07-011 · Double submit** (P2)
Go to checkout with that item, fill in, COD, and click Place order twice quickly.
Expect: exactly one order (`ORDER_2`); the confirmation shows one number.

**SF-07-012 · Confirmation is private** (P2) [HUMAN]
Open the confirmation address in another browser.
Expect: "We can’t show this order here".

**SF-07-013 · COD limits** (P3)
With a cart below ₹299 (or above ₹50,000) open checkout.
Expect: COD unavailable with the reason. Not Applicable if no product fits.

**SF-07-014 · Delivery to another state** (P2)
At checkout use pincode `110001`.
Expect: state Delhi; the ₹149 rate (free above ₹1,999); GST shown as IGST in the summary or later
on the invoice.

**SF-07-015 · Empty cart checkout** (P2)
With an empty cart open `/checkout`.
Expect: sent to the cart or told the cart is empty; no form to place an order.

**SF-07-016 · Price tampering** (P1)
On checkout run `document.querySelectorAll('input[type=hidden]')` and note any price or total
fields; if present change one in the DOM, then place order.
Expect: the order total is the server's, not the edited value (rule 7). Pass if no client price
fields exist.

**SF-07-017 · Create account from confirmation** (P3)
On a confirmation page press **Create account**.
Expect: the login page with the email filled in.

### SF-08 · Order tracking page

**SF-08-001 · Track page** (P1)
Open `TRACK_1`.
Expect: order number and where it is, the journey (placed, confirmed, packed, shipped, delivered
by), what's in the order, the masked phone (e.g. ••••••3210) with the WhatsApp updates switch.

**SF-08-002 · No personal data** (P1)
Read the page text.
Expect: no address, no full phone, no email, no invoice link.

**SF-08-003 · Stop updates** (P2)
Press **Stop updates for this number**.
Expect: confirmation; the switch shows off; turning it back on works.

**SF-08-004 · Unknown code** (P2)
Open `/t/ABCDEFGH`.
Expect: a not-found message, no other order's data.

**SF-08-005 · Log in to see more** (P3)
Press **Log in to see more**.
Expect: the login page; after login (SF-10) it lands on the order.

**SF-08-006 · Journey moves** (P2) [CMS]
[CMS] Orders → ORDER_1 → Mark as packed, then save a tracking number and "tell the shopper it
shipped". Reload `TRACK_1`.
Expect: packed and shipped steps done; courier and AWB with Track on the courier's site (link
checked, not opened).

### SF-09 · Online payment (Razorpay test mode)

Not Applicable without test keys.

**SF-09-001 · Pay online success** (P1)
Checkout with one item, **Pay online**, Place order. In Razorpay's test window choose UPI and
enter `success@razorpay`.
Expect: back on the confirmation: "paid by UPI"; `ORDER_3`.

**SF-09-002 · Window closed** (P1)
Again, but close the Razorpay window.
Expect: the order is waiting for payment with **Complete payment**; pressing it reopens Razorpay.

**SF-09-003 · Payment failure** (P2)
Use the test failure option in the test window.
Expect: a clear failure message; retry is offered; no paid order.

**SF-09-004 · Invoice download on a paid order** (P2)
On the paid confirmation press **Download invoice**.
Expect: the GST invoice opens (INV/26-27/…), seller, buyer, HSN lines, tax, amount in words.

### SF-10 · Shopper login and My account

Signed out.

**SF-10-001 · Account needs login** (P1)
Open `/account`.
Expect: sent to `/account/login`, "Log in or create an account", Email code and Password tabs.

**SF-10-002 · Code login** (P1)
Email `rahul.k@example.com`, **Send code**. Ask me for the code. Type it into the six boxes.
Expect: "Resend code in 0:2x" while waiting; after the code: **My account**, "Hi Rahul".

**SF-10-003 · Guest orders join the account** (P1)
Read Your orders.
Expect: ORDER_1 and ORDER_2 (placed as a guest with this email) with status, total, photos,
Track or View order.

**SF-10-004 · Wrong code** (P2)
Log out, send a code to `priya.qa@example.com`, enter `000000` five times.
Expect: an error each time; after five, "Send a new one"; no account access.

**SF-10-005 · Same message for any email** (P2)
Send a code to `nobody.qa@example.com`.
Expect: the same "We sent a code" message as for an existing account.

**SF-10-006 · Order detail** (P1)
Log in as Rahul again (ask for the code). Open ORDER_1.
Expect: `/account/orders/HOM-…` with breadcrumb, status, date and payment, the journey, items,
discounts, delivery, COD fee, total, GST line, address, WhatsApp switch, Download invoice once
packed, Get help on WhatsApp (link checked), **Cancel order** only until it ships.

**SF-10-007 · Cancel an order** (P1)
Cancel ORDER_2 with a reason.
Expect: confirm step; then Cancelled; Cancel no longer offered; (stock goes back: product page
stock rises by the quantity).

**SF-10-008 · Someone else's order** (P1)
Open `/account/orders/HOM-99999` and an order number placed by another email (if any).
Expect: not found; never another shopper's order.

**SF-10-009 · Saved addresses** (P1)
Saved addresses → **+ Add address** (Rahul's), save; edit the city; add a second; make it the
default; remove it.
Expect: each change shows and survives a reload.

**SF-10-010 · Profile and password** (P1)
Profile: set mobile 9876543210, **Set a password** (a test password you choose, at least the
length asked).
Expect: saved. A too-short password is refused.

**SF-10-011 · Password login** (P1)
Log out. Password tab: Rahul's email and the password.
Expect: My account. A wrong password 5 times locks for 15 minutes with a clear message (try only
with priya's account if it has a password; otherwise mark Not Applicable).

**SF-10-012 · Signed-in checkout** (P1)
Add an item, open checkout.
Expect: "Logged in as rahul.k@example.com", contact and default address filled in, "Save this
address to my account" offered. Place a COD order (`ORDER_4`): it appears in Your orders.

**SF-10-013 · Order updates and offers preferences** (P2)
Toggle the WhatsApp order updates switch and the offers by email setting.
Expect: each saves and survives a reload; offers are separate from order updates.

**SF-10-014 · Log out** (P1)
Log out.
Expect: signed out; `/account` asks for login again.

**SF-10-015 · Log out of all devices** (P2) [HUMAN]
Sign in in two browsers, Log out of all devices in one.
Expect: the other is signed out on its next page.

**SF-10-016 · Accounts are per store** (P1)
Open http://demo-sanitary.localhost:3000/account.
Expect: not signed in there; Rahul's Home Orbit session doesn't carry over.

**SF-10-017 · Buy again** (P3)
On a delivered order (after SF-11-001) press **Buy again**.
Expect: its items go into the cart.

**SF-10-018 · Phone layout** (P2)
At 390×844 open `/account`.
Expect: the menu becomes a list; no horizontal scroll.

### SF-11 · Returns

**SF-11-001 · Deliver an order** (P1) [CMS]
[CMS] Move ORDER_1 to Out for delivery, then Delivered.
Expect (store, signed in as Rahul): ORDER_1 shows Delivered; Request return and Write a review are
offered.

**SF-11-002 · Request a return** (P1)
On ORDER_1 press **Request return**: pick the item, quantity 1, a reason, a note. Send (photo
upload: skip if the extension can't upload; mark that part [HUMAN]).
Expect: "Return requested" on the order.

**SF-11-003 · Return validation** (P2)
Try sending with no item or no reason.
Expect: refused with messages.

**SF-11-004 · Return approved** (P2) [CMS]
[CMS] Orders → Returns → approve with pickup instructions. Reload the order.
Expect: Return approved with the pickup instructions.

**SF-11-005 · Return rejected** (P3) [CMS]
Deliver ORDER_4, request a return, [CMS] reject with a reason.
Expect: the shopper sees why it wasn't accepted.

### SF-12 · Wishlist

**SF-12-001 · Wishlist page** (P1)
Open `/wishlist` (signed out, after SF-05-012 / SF-06-011).
Expect: the saved items with today's price, scheme price and its end where live, stock; "Log in to
keep your wishlist on all your devices".

**SF-12-002 · Hearts on cards** (P2)
Heart a card on a listing; un-heart another.
Expect: the header count follows; the list follows.

**SF-12-003 · Move to cart** (P1)
**Move to cart** on an item saved with a finish.
Expect: it lands in the cart with that finish.

**SF-12-004 · Remove and Undo** (P2)
Remove an item, then Undo.
Expect: it disappears then comes back.

**SF-12-005 · Guest list merges on login** (P1)
Signed out, heart two products. Log in as Rahul.
Expect: after the first page, the account's wishlist holds both (plus earlier ones), no duplicates.

**SF-12-006 · Empty wishlist** (P3)
Remove everything.
Expect: an empty state with a way to shop.

### SF-13 · Offers and schemes

**SF-13-001 · Offers page** (P1)
Open `/offers`.
Expect: Diwali 2026 with the offer in words, what it covers, whether it works with coupons, the
real end and time left; public coupons (HOME200) with Copy; "Hear about the next offer first".

**SF-13-002 · Coming-up scheme** (P3)
Expect (if set up): the upcoming scheme with its start date and Remind me (goes to the sign-up).

**SF-13-003 · Scheme page** (P1)
Open the Diwali 2026 page (`/offers/<slug>`).
Expect: the covered products with their offer prices (or the vendor's landing page).

**SF-13-004 · Offer sign-up consent** (P2)
In "Hear about the next offer first" submit without consent, then with.
Expect: unticked by default; refused without consent; thanks with.

**SF-13-005 · Ended scheme** (P3) [CMS]
[CMS] End the upcoming/test scheme (not Diwali). Open its page.
Expect: the page stays and says the offer has ended; no offer price on products.

**SF-13-006 · Unknown offer page** (P3)
Open `/offers/no-such-offer`.
Expect: the store's 404.

**SF-13-007 · Honest offers** (P2)
Across home, listing, product and cart.
Expect: end dates match the scheme; no fake countdowns, stock warnings or "X people viewing".

### SF-14 · Reviews

**SF-14-001 · Write a review from the account** (P1)
On delivered ORDER_1 press **Write a review**.
Expect: only delivered items; stars, title, text, up to 4 photos, "Show my name as" with the name
and city.

**SF-14-002 · Stars required** (P2)
Submit without stars.
Expect: refused with a message.

**SF-14-003 · Submit** (P1)
5 stars, title "Solid handle", text, submit.
Expect: thanks; held for approval (or published straight away if the store does).

**SF-14-004 · One review per item** (P2)
Open Write a review again for the same item.
Expect: already reviewed; no second form.

**SF-14-005 · Published on the product page** (P1) [CMS]
[CMS] Reviews → approve it (add a store reply). Open the product.
Expect: average, count, bars, the review with "Verified purchase" and the reply; cards show stars;
the Rating filter (SF-03-010) and the home "What buyers say" (SF-02-015) now appear.

**SF-14-006 · Review email link** (P2)
Ask me for a `/review/<token>` link from the terminal (review email). Open it.
Expect: the review form for that order without logging in. Not Applicable if none was sent yet.

**SF-14-007 · Bad review link** (P2)
Open `/review/not-a-real-token`.
Expect: a clear "link not valid or expired" message, no form.

### SF-15 · Offer messages, abandoned cart, unsubscribe

**SF-15-001 · Contact kept on the cart** (P2)
Signed out, add an item, start checkout, type email `priya.qa@example.com` and mobile, then leave.
Expect: nothing visible; the cart becomes eligible for a reminder ([CMS] Abandoned carts lists it).

**SF-15-002 · Cart restore link** (P1)
Ask me for a `/cart/restore/<token>` link (send a reminder from [CMS] Abandoned carts, or wait for
the job). Clear the cart, open the link.
Expect: the exact cart comes back with prices worked out again.

**SF-15-003 · Bad restore link** (P2)
Open `/cart/restore/bad-token`.
Expect: a clear message or the cart page; no error page.

**SF-15-004 · Unsubscribe link** (P1)
Ask me for an unsubscribe link from an offer email. Open it.
Expect: "You won't get offers from Home Orbit by <channel>"; order updates still come.

**SF-15-005 · Bad unsubscribe link** (P3)
Open `/unsubscribe/bad-token`.
Expect: a clear message, no error page.

### SF-16 · Contact, pages, dealers, downloads

**SF-16-001 · Contact page** (P1)
Open `/contact`.
Expect: the form, phone, email, WhatsApp, address, grievance officer.

**SF-16-002 · Contact validation and send** (P1)
Send empty, then filled with consent.
Expect: errors first; then an ENQ reference.

**SF-16-003 · Contact spam limit** (P2)
Send the contact form 6 times within 10 minutes.
Expect: the 6th says "You have sent several requests already. Please wait a few minutes, or call
us." (Restarting the server clears it; note that the limit is now hit for the run.)

**SF-16-004 · Honeypot** (P3)
Fill the hidden honeypot field via JS (`document.querySelector('input[name*=company i], input[tabindex="-1"]')`) and send.
Expect: no enquiry created (it may still say thanks). Not Applicable if no hidden field is found.

**SF-16-005 · About us and CMS pages** (P2)
Open `/pages/about-us` and each policy.
Expect: content in Home Orbit's design; unknown `/pages/no-such-page` gives the 404.

**SF-16-006 · Dealer locator by pincode** (P1)
Open `/dealers`, type `411045`, Search.
Expect: nearest first with km; each dealer has Call (`tel:`), WhatsApp (`wa.me`), Directions
(Google Maps, new tab) links (checked, not opened).

**SF-16-007 · Dealer type chips and Map tab** (P2)
Use the type chips and the Map tab.
Expect: chips filter the list; Map shows the chosen dealer.

**SF-16-008 · City with no dealer** (P2)
Search a city with no dealer (e.g. `Shillong`).
Expect: says so and lists everyone.

**SF-16-009 · Use my location** (P3)
Press Use my location and deny the browser prompt.
Expect: a polite message; the page keeps working.

**SF-16-010 · Downloads page** (P1)
Open `/downloads`.
Expect: tabs by kind (only kinds with files), each file with size and month; search by title, by
the product name and by model number `HOPH-504` finds the linked PDF; Download link opens the PDF
on the store's media (check the address).

### SF-17 · Affiliate program

Not Applicable unless the affiliate feature is on (Enterprise).

**SF-17-001 · Program page as a guest** (P1)
Signed out, open `/affiliate`.
Expect: what affiliates earn (rate, hold days, minimum payout) and "Log in to apply".

**SF-17-002 · Apply** (P1)
Log in as Rahul, open `/affiliate`, submit empty, then fill (name, mobile, where you share,
profile URL, audience, PAN `ABCDE1234F`, terms ticked).
Expect: errors first; then the application status "under review".

**SF-17-003 · Dashboard before approval** (P2)
Open `/affiliate/dashboard`.
Expect: sent back to the status, no dashboard.

**SF-17-004 · Dashboard after approval** (P1) [CMS]
[CMS] Affiliates → approve Rahul. Open `/affiliate/dashboard`.
Expect: clicks and orders (30 days), pending and approved commission, the link with Copy, "Link to
any page", the personal coupon, referred orders, payouts, payout details (masked).

**SF-17-005 · Referral link** (P1)
Signed out (or in a fresh profile), open `/r/<CODE>` and `/r/<CODE>?to=/offers`.
Expect: lands on home, then on `/offers`; a referral cookie is set; the click count rises on the
dashboard.

**SF-17-006 · Referred order** (P2)
After the referral link, place a COD order as a guest (`priya.qa@example.com`).
Expect: the dashboard lists it with value before GST and pending commission, never priya's name,
email or phone.

**SF-17-007 · Bad referral code** (P3)
Open `/r/NOSUCH`.
Expect: lands on the store home without an error.

### SF-18 · Errors, store status, SEO, isolation

**SF-18-001 · Store 404** (P1)
Open `/no-such-page`.
Expect: the store's own "page not found" in Home Orbit's design, HTTP 404.

**SF-18-002 · Unknown store** (P1)
Open http://unknown-store.localhost:3000.
Expect: a plain 404. Never another store.

**SF-18-003 · robots.txt on a draft** (P1)
Open `/robots.txt`.
Expect: `Disallow: /` while Home Orbit is a draft.

**SF-18-004 · Sitemap** (P3)
Open `/sitemap.xml`.
Expect: empty or not found for a draft store (sitemaps for live stores only). After SF-18-008 it
lists home-orbit addresses only.

**SF-18-005 · Default look for another store** (P2)
Open http://demo-sanitary.localhost:3000.
Expect: the default design with Demo Sanitary's name; no Home Orbit products or branding.

**SF-18-006 · Catalogue isolation** (P1)
Open http://demo-sanitary.localhost:3000/products/feather-stainless-steel-pull-handle-hoph-504 and
search `HOPH` on Demo Sanitary.
Expect: 404 and no results. Home Orbit's products never show there.

**SF-18-007 · Cart isolation** (P1)
With items in Home Orbit's cart, open Demo Sanitary's `/cart`.
Expect: empty (or Demo's own cart).

**SF-18-008 · Live store** (P2) [CMS]
[CMS] Go live for Home Orbit. Reload home and `/robots.txt`.
Expect: no preview bar; robots allows crawling and names the sitemap. Put it back to Draft after
if the rest of the run expects it.

**SF-18-009 · Suspended or maintenance store** (P2) [CMS]
[CMS] Suspend Home Orbit (or maintenance). Reload the store.
Expect: "Store unavailable" page, no products, no checkout. [CMS] Resume, reload: the store is back.

**SF-18-010 · Redirect from a moved product** (P3) [CMS]
[CMS] Change a product's slug. Open the old address.
Expect: a redirect to the new one.

**SF-18-011 · Page preview link** (P3) [CMS]
[CMS] Open a draft page's Preview.
Expect: the store's `/preview/pages/<id>` renders the draft for staff; signed out of the admin
it is refused.

### SF-19 · Responsive layout and accessibility

**SF-19-001 · No horizontal scroll at 390 px** (P1)
At 390×844 visit home, `/c/door-hardware/aldrops`, the HOPH-504 product, `/cart`, `/checkout`,
`/account`, `/offers`, `/dealers`, `/downloads`, `/wishlist`, `/contact`. On each run
`document.documentElement.scrollWidth <= window.innerWidth`.
Expect: true on every page; nothing cut off.

**SF-19-002 · Tablet 768 and desktop 1440** (P2)
Same pages at 768×1024 and 1440×900.
Expect: sensible layouts, no overlap, no empty gaps.

**SF-19-003 · Keyboard only** (P1)
On home, Tab from the top through the header, menu, search, hero, a card; open a dropdown and the
quick add picker with Enter; close with Escape.
Expect: a visible focus ring on every stop; nothing reachable only by mouse; Escape closes and
focus returns.

**SF-19-004 · Images have alt text** (P2)
Run `[...document.images].filter(i=>!i.hasAttribute('alt')).length` on home, a listing and a
product.
Expect: 0.

**SF-19-005 · Form labels** (P2)
On checkout and the quote form, run
`[...document.querySelectorAll('input,select,textarea')].filter(e=>e.type!=='hidden'&&!e.labels?.length&&!e.getAttribute('aria-label')).length`.
Expect: 0 (honeypot excepted).

**SF-19-006 · Headings** (P3)
On each main page count h1.
Expect: one h1 per page.

**SF-19-007 · Tap targets on phone** (P3)
At 390×844 check the bottom bar, quantity buttons, filter chips.
Expect: comfortably tappable (about 44 px), not crowded.

**SF-19-008 · Lighthouse** (P2) [HUMAN]
Lighthouse mobile on the production build for home, a listing and a product.
Expect: performance 90+ on product and listing (rule 10), accessibility, best practices, SEO 100.

### SF-20 · Console, network and performance health

**SF-20-001 · Console clean** (P1)
Across the pages visited in SF-19-001, read console errors.
Expect: no red errors (hydration errors, failed fetches, React key warnings count as defects).

**SF-20-002 · No failed requests** (P1)
Read network requests on home, listing, product, cart, checkout.
Expect: no 4xx/5xx (except intentional 404 pages); no image 404s.

**SF-20-003 · Images sized** (P3)
On a listing, check images load via `/_next/image` or sized sources.
Expect: no full-size originals on cards.

**SF-20-004 · No secrets in the page** (P1)
On checkout run `document.documentElement.outerHTML.match(/rzp_live|key_secret|CONNECTOR|mongodb:\/\//gi)`.
Expect: null (only a `rzp_test_` key id is allowed, never a secret).

### SF-21 · Security checks a shopper can make

**SF-21-001 · Session cookie** (P1)
Signed in, run `document.cookie`.
Expect: the shopper session cookie is **not** visible (HTTP-only).

**SF-21-002 · Security headers** (P2)
Read the response headers of the home document (network panel).
Expect: `X-Content-Type-Options: nosniff`, a Referrer-Policy, frame protection
(`X-Frame-Options` or CSP frame-ancestors), Permissions-Policy.

**SF-21-003 · Admin not reachable from the store domain** (P2)
Open http://home-orbit.localhost:3000/admin.
Expect: not the Payload admin (404 or redirected), or the admin with no store data before login.

**SF-21-004 · API scoped** (P1)
Open http://home-orbit.localhost:3000/api/orders and /api/customers signed out.
Expect: 401/403 or empty; never order or customer data.

**SF-21-005 · Script in text fields** (P2)
Send a contact enquiry with name `<img src=x onerror=alert(1)>`.
Expect: no alert on the store; [CMS] the enquiry shows the text as plain text.

### SF-22 · Install and offline (production build only)

Not Applicable on `pnpm dev`. Run only on `pnpm build && pnpm start` with the store live.

**SF-22-001 · Manifest** (P2)
Open `/manifest.webmanifest`.
Expect: the store's name, colour and icons (192, 512, maskable).

**SF-22-002 · Service worker** (P2)
Run `navigator.serviceWorker.getRegistrations().then(r=>r.length)`.
Expect: 1, scope on the store's origin.

**SF-22-003 · Offline page** (P2) [HUMAN]
Go offline (DevTools Network Offline). Open a page visited before and one never visited.
Expect: the visited one loads; the other shows "You're offline" with recently viewed products and
Try again; cart and checkout don't load from cache.

**SF-22-004 · Install banner** (P3) [HUMAN]
Second visit on a phone.
Expect: Install (Android) or the iPhone Share instructions; Not now is remembered.

---

## Part D. After the run

Paste the report back into the Claude Code session. Claude will match results by ID, log
defects, fix them on a branch and ask for a retest of the failed cases.
