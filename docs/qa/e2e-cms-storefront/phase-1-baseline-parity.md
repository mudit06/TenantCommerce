# Phase 1 of 4 · Baseline: read-only parity, responsiveness, SEO and access

**What this phase does:** checks that what the CMS holds today is exactly what the storefront
shows, at every screen width, without changing any data. Safe to run at any time.
About 60 to 90 minutes. Run it first: later phases assume it passed.

Flow tags: **CMS** = admin only, **SF** = storefront only, **CMS↔SF** = parity check.
Priority: **P1** critical, **P2** important, **P3** detail.

---

## Part A. Test values (filled in for the local QA setup)

Read from the local QA database `tenantecom_qa` on 15 October 2026 (Home Orbit, after
`pnpm seed`, `pnpm seed:home-orbit`, `pnpm demo:selling home-orbit`, `pnpm demo:orders home-orbit`).
If you reseed, these stay the same.

```
ADMIN_URL    = http://localhost:3000/admin
STORE_URL    = http://home-orbit.localhost:3000          # Home Orbit, status active (live), its own vendor UI
STORE2_URL   = http://demo-sanitary.localhost:3000       # Demo Sanitary, the default look (isolation checks)
OWNER_LOGIN  = owner@homeorbit.example                   # store owner; the human signs in (password is not in this file)
QA_TAG       = QA-E2E-1015                               # change the MMDD for each new run; every record this run makes starts with it
QA_EMAIL     = rahul.k@example.com                       # shopper 1 (name Rahul Kulkarni, Pune)
QA_PHONE     = 9876543210
QA_EMAIL_2   = priya.qa@example.com                      # shopper 2 (isolation, wishlist merge, sign-ups)
QA_PHONE_2   = 9123456780
PIN_HOME     = 411045    # Pune, Maharashtra = the store's own state: zone "Home state", ₹99, free above ₹999, COD yes
PIN_OTHER    = 110001    # New Delhi: zone "Rest of India", ₹149, free above ₹1,999, COD yes
PIN_BAD      = 12345     # invalid on purpose
GSTIN_OK     = 27AAPFU0939F1ZV                           # valid format and checksum (Maharashtra)
GSTIN_BAD    = 29AABCT1234F1ZN                           # wrong checksum
PRODUCT_A    = feather-stainless-steel-pull-handle-hoph-504   # HOPH-504, Door hardware › Pull handles, 15 variants (size 8/10/12 inch × finish Antique, Stainless steel, Chrome plated, Black matt, Rose gold), ₹2,049 to ₹2,749, MRP ₹2,459, stock 18 to 20; covered by the live Diwali scheme
PRODUCT_B    = square-base-oval-stainless-steel-towel-ring   # STR-001-A, Bathroom accessories › Towel rings, ₹2,249, no variants; NOT covered by any scheme
PRODUCT_CHEAP= rectangle-stainless-steel-towel-ring          # STR-001-D, ₹249: below the ₹299 COD minimum and the ₹1,000 coupon minimum
PRODUCT_C    = lotus-glass-door-handle-hogdh-610             # HOGDH-610, Door hardware › Glass door handles, ₹849, MRP ₹1,019
CATEGORY_A   = door-hardware/pull-handles
VALUES_IN    = none      # from Phase 2 on: paste the "Values created" block of the previous phase's report here
```

**What the store already has (expected results depend on it):**

| Item | Value in the QA database |
|---|---|
| Catalogue | 110 products, all **Active**, all "How shoppers buy: Both" (price, Add to cart and a quote button); 16 categories under Door hardware, Home decor, Bathroom accessories |
| Live scheme | **Diwali 2026**: 10% off, at most ₹1,500 off, covers **Door hardware** and all its subcategories, does **not** work with coupons, badge "Diwali offer", announcement "Diwali offer: 10% off door hardware", countdown on, ends 3 Nov 2026 |
| Upcoming scheme | **Winter launch**, starts 24 Oct 2026, ends 13 Nov 2026 |
| Coupon | **HOME200**: ₹200 off orders above ₹1,000, whole store, public, 20 uses per shopper |
| Cash on delivery | On: ₹49 fee, orders from ₹299 to ₹50,000 |
| Online payment | **Razorpay not connected**: only COD is offered and no test-payment notice should show |
| Return window | 7 days, refunds allowed |
| Contact | +91 98765 00000 (phone and WhatsApp), hello@home-orbit.example, Shop 1, Baner Road, Pune 411045, Maharashtra |
| Features on | guest checkout, COD, enquiries, downloads, product videos, dealer locator, WhatsApp button, pincode check, schemes, coupons, wishlist, reviews, offer messages, affiliate, abandoned cart. **Off:** size guide, WhatsApp offers |
| Other | 3 dealers, 1 document, 7 pages, 26 sample orders, 0 reviews, 4 enquiries, 2 shopper accounts |

## Part B. Rules for Claude in Chrome

You are a QA tester running an end-to-end test of a multi-tenant e-commerce app on the tester's
**own computer** (local QA database, `pnpm dev`). The app has two faces that must agree with each
other:

- **Vendor CMS** at ADMIN_URL: the store's staff edit the catalogue, content, offers and orders.
- **Storefront** at STORE_URL: what shoppers see and buy from.

Work with **two tabs**: tab "CMS" on ADMIN_URL and tab "STORE" on STORE_URL. Most cases change
something in CMS, then check STORE (and sometimes the reverse). That round trip is a **parity
check**.

1. **Stay local.** Only open `http://localhost:3000` and `http://*.localhost:3000` addresses. For
   links that leave the site (wa.me, Google Maps, courier tracking, YouTube, social) **read the
   address, don't open it**.
2. **Test data.** Use only the values in Part A. Create or change only records whose name, code or
   title starts with **QA_TAG**, plus the store settings a case names. Before changing a setting
   write its **old value** and put it back in the same case. Never bulk-change records that don't
   start with QA_TAG. This is a test database, but other suites reuse it.
3. **Sign-in, codes and links come from me.** Ask me to sign in to the CMS in tab "CMS" as
   OWNER_LOGIN and wait for "done" (if I paste a password in the chat for this local test account,
   you may type it). Nothing is really emailed or sent on WhatsApp here: login codes, emails,
   WhatsApp texts, review links, unsubscribe links and cart-reminder links are printed in my
   `pnpm dev` terminal as `[dev-log email]` / `[dev-log whatsapp]`. When a case needs one, **stop
   and ask me**: "Please paste the <code/link> printed in the pnpm dev terminal for <what>". If I
   say "skip", mark the case Blocked.
4. **Permission.** For this whole run you may fill and submit forms, place cash-on-delivery
   orders, and save, publish, archive and delete QA_TAG records on localhost. Anything else: ask.
5. **Payment:** cash on delivery only (Razorpay isn't connected). Never type card or UPI details.
6. **[HUMAN]** steps need something you can't do (a second device or profile, an operating system
   setting, reading the terminal). Ask me or mark them **Not Run (human)** and move on.
7. **Waiting.** This is a development server: **the first visit to each page compiles it and can
   take up to 60 seconds**, and the tab may stop answering briefly. Wait for a visible condition
   (a heading, a message, a row), not a fixed delay. Text typed before the page finishes loading
   is lost. If *type* doesn't reach a field, use form input or key presses. Retry once before
   calling something a failure.
8. **How fast must a CMS change reach the store?** After **Save** or **Publish** in CMS, reload
   STORE. Expected (from the code):
   - Catalogue, variants, categories, attribute sets, pages, menus, banners, store settings,
     dealers, documents, media, redirects, schemes, coupons: on the **first reload**.
   - Payment and cash on delivery switches: within **60 seconds**.
   - A scheme starting or ending by its own date, a scheduled page: within **2 minutes** of the
     time (jobs run every minute).
   If it isn't there, reload again at **30 s, 60 s and 120 s** and write down when it appeared. A
   "first reload" item seen only after 60 s = **Fail (stale cache, High)**. Never seen after
   120 s = **Fail (Critical)**.
9. **Every page you open**, also check: no red errors in the console (ignore Next.js dev overlay
   and HMR messages), no 4xx/5xx in network (except a 404 a case expects), no horizontal scroll
   (`document.documentElement.scrollWidth <= window.innerWidth`), no broken images
   (`[...document.images].filter(i => i.complete && i.naturalWidth === 0).length === 0`).
   Note anything you find in that case's Actual result even if it passes.
10. **Viewports.** Desktop 1440×900 unless a case says otherwise. "Phone" = 390×844, "Small
    phone" = 360×740, "Tablet" = 768×1024, "Laptop" = 1024×768. Go back to 1440×900 after.
11. **Remember values** you create and reuse them later: `CAT_NEW` (its `/c/...` address),
    `PROD_NEW` (slug), `PAGE_NEW`, `COUPON_1`, `SCHEME_1`, `ORDER_1`..., `TRACK_1` (the
    `/t/<code>` address), `ENQ_1`, `INVOICE_1`. Take earlier phases' values from VALUES_IN.
12. **Status per case:** Pass, Fail, Blocked (say which precondition), Not Applicable (say why),
    Not Run (human). On a Fail write: URL, what you did, expected, what you saw (exact text),
    console/network error, severity (Critical, High, Medium, Low).
13. **Don't guess.** If the screen differs from a case because of how the store is set up (a
    label, a menu), describe what you see; Pass only if the behaviour is right.

### Stop or continue

**Carry on** (record and go to the next case) when a case fails, a page is slow, a precondition is
missing, or a feature is off.

**Dependent cases.** When a case that creates something fails (the QA category, the QA product,
the QA page, the coupon, the scheme, an order), mark every later case that needs it **Blocked
(needs <ID>)**. **Never** use a real product, page or order in its place.

**Pause and ask me** when you need a sign-in, a code or link from the terminal, or anything not
covered by rule 4.

**Stop the run at once**, tell me why, and send the report so far, when:
- the app is down: 3 pages in a row fail to load after the 60-second wait and one retry (the dev
  server may have crashed; I'll restart it and tell you to resume);
- you changed or deleted something that does **not** start with QA_TAG, or can't put a setting
  back (especially maintenance mode);
- a **Critical** security problem shows: another shopper's order or details, another store's
  data, a secret key, or a script from a form running in the CMS.

**Progress reports.** At the end of every module (P1-01, P1-02, …) send a short checkpoint:
`Checkpoint <module>: N pass, N fail, N blocked · values so far: …`. If the run breaks, it
resumes from the next module.

**Resume.** If I say "resume from <case ID>" with a values block, start at that case with those
values, and skip any setup steps already reported done.

### Report to send back (exactly this format, in one message)

```
# E2E local run · Phase <N> · <date> <time>
Store: <STORE_URL> · Admin: <ADMIN_URL> · QA_TAG: <tag>
Signed in as: <role> · Viewports used: <list>

## Summary
Total N · Pass N · Fail N · Blocked N · Not Applicable N · Not Run (human) N

## Results
| ID | Status | Actual (one line; timings for parity checks) |
|---|---|---|

## Defects
### D<n> · <title> · <severity> · <case ID>
- URL:
- Steps:
- Expected:
- Actual (exact text, console or network error):

## Settings changed and restored
<setting: old → test value → restored? yes/no>

## Values created
CAT_NEW=… PROD_NEW=… PAGE_NEW=… COUPON_1=… SCHEME_1=… ORDER_1=… TRACK_1=… ENQ_1=…

## Notes
Slow pages (over 3 s after the first compile), flaky steps, confusing screens, anything worth a
second look.
```


## Part C. Test cases

### P1-01 · Environment and access

**P1-01-001 · Store is open** (P1 · SF)
Open STORE_URL in tab STORE (the first load compiles: wait up to 60 s).
Expect: Home Orbit's home page in its own design; no "coming soon", "back soon" or "Store
unavailable" page; no amber "Preview: this store is not live yet" bar (the store is active). If a
closed page shows, **stop the run** and tell me.

**P1-01-002 · Each store answers on its own address** (P1 · SF)
Open STORE2_URL in a third tab.
Expect: Demo Sanitary in the default look, its own name and products; no Home Orbit logo, menu or
products. Close the tab.

**P1-01-003 · Security headers** (P2 · SF)
In STORE run `fetch(location.href).then(r => [...r.headers].filter(([k]) => /x-content-type|referrer|x-frame|permissions|strict-transport/.test(k)))`.
Expect: `x-content-type-options: nosniff`, a `referrer-policy`, `x-frame-options` and a
`permissions-policy` are present. (`strict-transport-security` is added only in production, so
its absence here is fine.)

**P1-01-004 · The admin is not served on the store's domain** (P1 · SF)
Open `STORE_URL/admin`.
Expect: a 404 or a redirect to ADMIN_URL. **Fail (Medium, security)** if a working admin sign-in
page appears on `home-orbit.localhost:3000` (the proxy's matcher skips `/admin` paths, so this is
worth checking). Don't sign in there.

**P1-01-005 · The admin host doesn't serve store pages** (P2 · CMS)
Open `http://localhost:3000/products/PRODUCT_A` and `http://localhost:3000/`.
Expect: plain "Not found" (404). The bare admin host `/` redirects to `/admin`.

**P1-01-006 · The API refuses anonymous reads** (P1 · SF)
Signed out of nothing in particular, in a fresh tab open `STORE_URL/api/products?limit=1`, then
`STORE_URL/api/customers?limit=1` and `STORE_URL/api/orders?limit=1`.
Expect: each answers 401/403 or an error saying you are not allowed, never a list of documents.
Any product, customer or order data = **Fail (Critical, tenant data exposed)**.

**P1-01-007 · robots.txt and sitemap.xml** (P2 · SF)
Open `STORE_URL/robots.txt` and `STORE_URL/sitemap.xml`.
Expect: robots.txt allows crawling and names the sitemap on STORE_URL's own address; sitemap lists
home, category, product and page addresses, all on `home-orbit.localhost:3000` (no other store's
address, no bare `localhost:3000`). Note the number of `/products/` entries as `SITEMAP_PRODUCTS`.

**P1-01-008 · 404 page** (P2 · SF)
Open `STORE_URL/products/qa-e2e-does-not-exist` and `STORE_URL/qa-e2e-nothing-here`.
Expect: the store's own 404 page in its design (header and footer present) with a way back home;
the network status is 404, not 200 and not 500.

**P1-01-009 · Web app manifest** (P3 · SF)
Open `STORE_URL/manifest.webmanifest` and `STORE_URL/app-icon/192`.
Expect: the manifest has the store's name, theme colour and 192/512 icons; the icon loads. (The
service worker and offline page only run in production builds: not tested here.)

### P1-02 · CMS sign-in, dashboard and navigation

**P1-02-001 · Human signs in** (P1 · CMS)
Ask me to sign in to ADMIN_URL in tab CMS as OWNER_LOGIN (store owner). Wait for "done".
Expect: the store CMS dashboard opens: dark side menu grouped Catalog, Sales, Marketing,
Content, Store, Insights; top bar with search, **View store**, a bell, and "<name> · Owner".

**P1-02-002 · View store opens this store** (P1 · CMS↔SF)
Click **View store**.
Expect: it opens STORE_URL (the same store), not another store or the admin host.

**P1-02-003 · Dashboard figures are sane** (P2 · CMS)
Read the dashboard: launch checklist, Orders today, Sales today, To ship, New enquiries, Low
stock, Sales last 14 days, Orders to ship, plan usage.
Expect: every card renders without an error box; money shows as ₹ with Indian grouping
(₹1,23,456), no `NaN`, `undefined`, `null` or raw numbers like `123456` meant as paise.
Write down: ORDERS_TODAY, NEW_ENQUIRIES, LOW_STOCK count, plan product usage "N of M".

**P1-02-004 · Menu search (Ctrl K)** (P3 · CMS)
Press Ctrl+K, type "prod", choose Products.
Expect: the Products list opens.

**P1-02-005 · Feature parity: CMS menu vs storefront** (P1 · CMS↔SF)
In CMS list which of these menu entries exist and are not "Soon": Schemes and offers, Coupons,
Reviews, Dealers, Enquiries, Affiliates, Documents. In STORE check the matching store features.
Expect, for each pair, both on or both off:
Dealers ↔ "Find a dealer" link and `/dealers` page · Reviews ↔ star ratings on product pages and
cards · Schemes/Coupons ↔ `/offers` page and "Offers" link · Affiliates ↔ "Affiliate program" in the
footer and `/affiliate` · Documents ↔ `/downloads` · wishlist icon in the header ↔ hearts on cards.
A store feature that shows while its CMS screen is missing (or the reverse) = **Fail (High)**.

### P1-03 · Store settings ↔ storefront

In CMS open Store → Settings. Read each value, then find it on STORE.

**P1-03-001 · Name, logo and browser icon** (P1 · CMS↔SF)
Expect: the store name matches the page `<title>` suffix and the footer's business line; the logo
image shown in the header is the CMS logo (compare file names in the image URLs); the favicon
loads (no 404).

**P1-03-002 · Contact details** (P1 · CMS↔SF)
Compare phone, WhatsApp number, email and address in Settings → Contact with the top line,
footer and `/contact`.
Expect: identical values. The WhatsApp link is `https://wa.me/<digits with country code>`
(read it, don't open it). The phone link is `tel:`.

**P1-03-003 · Social links** (P3 · CMS↔SF)
Expect: every social link set in CMS is in the footer with the same address; empty ones are not
shown as dead icons.

**P1-03-004 · Legal and GST footer line** (P1 · CMS↔SF)
Compare the legal business name, GSTIN (GST and invoices) and grievance officer (name, email or
phone) with the footer's bottom line and `/contact`.
Expect: identical. The grievance officer is shown (Consumer Protection E-Commerce Rules need it).

**P1-03-005 · Announcement bar** (P2 · CMS↔SF)
Read Settings → Announcement bar (shown? text? link?).
Expect: if shown, the same text and link at the top of every store page; if not shown, no bar
(a live scheme may still put its own announcement in the top line, which is fine).

**P1-03-006 · Policy pages** (P1 · CMS↔SF)
Read Settings → Policies (privacy, terms, returns, shipping, and any others linked).
Expect: each policy is linked in the footer under Help, opens `/pages/<slug>` with real content
(not empty, not a template with blanks such as "[Company name]"), status 200.

**P1-03-007 · Return window shown to shoppers** (P2 · CMS↔SF)
Read Settings → Checkout and returns → Return window (days) and "Exchange only".
Expect: PRODUCT_A's page promise line states the same number of days (or exchange only).

**P1-03-008 · Animations switch** (P3 · CMS↔SF)
Read Settings → Branding → Animations on the store.
Expect: on → `document.documentElement.dataset.motion` is undefined; off → it is `"off"`.

**P1-03-009 · Theme colour** (P3 · CMS↔SF)
Read Settings → Branding → Theme colour.
Expect: `<meta name="theme-color">` on STORE has the same value.

**P1-03-010 · Analytics IDs** (P3 · CMS↔SF)
Read Search and analytics (GA4, Meta Pixel, GTM).
Expect: an ID set in CMS loads its script on STORE (look in the network list for googletagmanager
or facebook); none set → no such requests. Note whether a cookie banner appears.

### P1-04 · Menus ↔ storefront

**P1-04-001 · Header menu, desktop** (P1 · CMS↔SF)
In CMS open Content → Navigation (Menus). Write down the header items in order, each dropdown's
columns, column headings and links. On STORE hover each item.
Expect: same items in the same order; each dropdown has the same columns, headings and links;
every link opens a page with status 200 (open each in turn, go back).

**P1-04-002 · Footer columns** (P1 · CMS↔SF)
Expect: the footer's columns and links match the Menus screen's footer columns, same order; every
link 200.

**P1-04-003 · Phone menu** (P1 · CMS↔SF)
Resize to Phone, reload, open the menu.
Expect: the phone menu matches the Menus screen's phone menu (or the header menu when none is
set); each section opens; the panel closes with its Close button and with Escape.

**P1-04-004 · All categories menu vs category tree** (P2 · CMS↔SF)
In CMS open Catalog → Categories (tree). On STORE open "All categories" and `STORE_URL/c`.
Expect: every category with "Show on store" on appears, in the tree's order; categories with it
off don't appear anywhere on STORE.

### P1-05 · Catalogue ↔ storefront

**P1-05-001 · Active product count** (P1 · CMS↔SF)
In CMS Catalog → Products, read the **Active** tab count (`ACTIVE_COUNT`).
Expect: roughly equal to SITEMAP_PRODUCTS (P1-01-007). A gap over 2% = Fail (High), list a few
missing slugs if you can find them (Draft/Archived products must **not** be in the sitemap).

**P1-05-002 · Category product counts** (P2 · CMS↔SF)
Pick 3 categories. In CMS filter Products by each category (with subcategories) and tab Active.
On STORE open each `/c/<path>`.
Expect: the listing's "N products" equals the CMS count for each.

**P1-05-003 · PRODUCT_A: basics** (P1 · CMS↔SF)
Open PRODUCT_A in the CMS product editor and `STORE_URL/products/PRODUCT_A`.
Expect equal: title, model number, main category (breadcrumb), short description, photos (same
count and first photo), "How shoppers buy" (Buy online → price + Add to cart + Buy now; Request a
quote only → no price, Ask for a quote; Both → price, Add to cart and a quote button).

**P1-05-004 · PRODUCT_A: price, MRP and GST** (P1 · CMS↔SF)
Expect: the store price equals "Selling price incl. GST" (or the chosen finish's price); MRP is
struck through and % off = round((MRP − price) / MRP × 100); "Prices include GST" is stated.
PRODUCT_A is covered by the live **Diwali 2026** scheme, so expect: the "Diwali offer" badge; the
offer price 10% below each variant's price (8 inch Antique ₹2,049 → about ₹1,844; the store's
rounding: note it); MRP ₹2,459 struck through; "Offer ends" 3 Nov 2026, matching the scheme's end
in Marketing → Schemes. PRODUCT_B (towel ring, not covered) shows its plain price ₹2,249.

**P1-05-005 · PRODUCT_A: finishes, sizes and stock** (P1 · CMS↔SF)
In CMS read Finishes, prices and stock (each variant's finish/size, price, stock).
On STORE pick each finish and size in turn.
Expect: each option exists on both sides; picking it changes the price to that variant's price
and the photo to its photo when it has one; a variant with stock 0 shows Out of stock and can't
be added; a low stock shows the same "Only N left" the CMS stock implies (if the store shows it).
**CLAUDE.md hard rule 7:** no fake stock warnings: a stock message must match the real number.

**P1-05-006 · PRODUCT_A: specifications and label details** (P2 · CMS↔SF)
Expect: every filled specification row in CMS shows in the store's specifications with the same
label and value; empty ones are not shown as blank rows; Legal details (generic name, net
quantity, country of origin, made by, consumer care) show under the label details.

**P1-05-007 · PRODUCT_A: documents, video, goes well with** (P2 · CMS↔SF)
Expect: each linked document is downloadable from the product page (PDF opens, 200); a YouTube
link shows the installation video (youtube-nocookie address) when the product-videos feature is
on; "Goes well with" lists the products picked in CMS (else more from its category).

**P1-05-008 · PRODUCT_A: SEO fields** (P2 · CMS↔SF)
Read Search engines (meta title, description) in CMS.
Expect: `<title>` and `<meta name="description">` on the product page use them (or the store's
title pattern when empty); `<link rel="canonical">` is `STORE_URL/products/PRODUCT_A`; the page has
JSON-LD `Product` (with offers price equal to the shown price in INR) and `BreadcrumbList`;
exactly one `<h1>`.

**P1-05-009 · Request-a-quote-only product** (P2 · CMS↔SF)
In CMS check whether any product has "Request a quote only" (in this database all 110 are "Both").
Expect: none, so **Not Applicable** here (Phase 2 P2-03-009 tests this mode on the QA product).

**P1-05-010 · Draft and archived products are hidden** (P1 · CMS↔SF)
In CMS open the Draft tab and the Archived tab.
Expect: both empty in this database, so **Not Applicable** (Phase 2 P2-03-002 and P2-03-017 test
it). If either has products, open one on STORE: 404 (or a 308 to a moved address), not in search,
listings or the sitemap.

### P1-06 · Content ↔ storefront

**P1-06-001 · Home page blocks** (P1 · CMS↔SF)
In CMS Content → Pages, open the Home page. List its blocks top to bottom. Scroll STORE's home.
Expect: the same sections in the same order with the same headings, products and links; a block
set to hide (e.g. Offer strip with no live scheme) is absent, not an empty box.

**P1-06-002 · Published pages** (P1 · CMS↔SF)
In CMS Pages, Published tab: open 3 pages on STORE (`/pages/<slug>`, or "View on store").
Expect: title and content match, 200.

**P1-06-003 · Draft and scheduled pages are hidden** (P1 · CMS↔SF)
Pick one Draft or Scheduled page (if any). Open its address on STORE.
Expect: 404; not in the footer, menus or sitemap.

**P1-06-004 · Dealers** (P2 · CMS↔SF)
In CMS Store → Dealers, count rows with **Shown** on (`DEALERS_SHOWN`); note one dealer's
pincode. On STORE open `/dealers?near=<that pincode>`.
Expect: that dealer is listed first or near the top with the same name, address and phone;
Call is `tel:`, Directions is a Google Maps address (read, don't open); hidden dealers never
appear; the total listed when searching broadly matches DEALERS_SHOWN.

**P1-06-005 · Downloads** (P2 · CMS↔SF)
In CMS Catalog → Documents, count those with "Show on the Downloads page". Open `STORE_URL/downloads`.
Expect: same count; tabs only for kinds that have files; search by a product's model number
finds its document; Download returns a PDF (200).

**P1-06-006 · Offers page** (P1 · CMS↔SF)
In CMS Marketing → Schemes: note Live schemes and Upcoming ones marked "show before it starts";
Coupons: note Active ones with "show on the Offers page". Open `STORE_URL/offers`.
Expect: exactly those schemes and coupon codes. In this database: **Diwali 2026** live (10% off
door hardware, up to ₹1,500, not with coupons, ends 3 Nov 2026 with the time left), **Winter
launch** as coming up only if it's set to show before it starts, and **HOME200** with Copy. Each
scheme shows the offer in words, what it covers and its real end date. No expired, paused or private item. A countdown, if shown, ends at
the scheme's real end time (CLAUDE.md hard rule 7: no fake countdowns).

### P1-07 · Storefront browsing behaviour

**P1-07-001 · Instant search by model number** (P1 · SF)
Type PRODUCT_A's model number in the header search, then the same without dashes, then its first
4 characters.
Expect: suggestions show PRODUCT_A with photo, model number and price within about a second;
"See all results" opens `/search?q=…` with it first.

**P1-07-002 · Search forgives typos** (P2 · SF)
Type a word from PRODUCT_A's title with one letter wrong.
Expect: PRODUCT_A still found.

**P1-07-003 · No results** (P2 · SF)
Search `zzqqxx`.
Expect: a friendly "no results" message with suggestions or a way back, status 200, no error.

**P1-07-004 · Filters and URL state** (P1 · SF)
Open `/c/CATEGORY_A`. Apply one attribute filter, a price range and In stock only. Copy the URL,
open it in a new tab.
Expect: counts update; the URL holds the filters; the new tab shows the same filtered list;
Clear removes them. Each filter option shows a count; options that would show nothing are absent.

**P1-07-005 · Sort** (P2 · SF)
Sort by Price low to high, then high to low, then Newest, then Name.
Expect: the visible order follows each sort (check the first 5 prices or names).

**P1-07-006 · Load more and pages** (P3 · SF)
On a category with many products press Load more.
Expect: more cards append without duplicates; numbered page links exist for search engines.

**P1-07-007 · Product page pincode check** (P1 · SF)
On PRODUCT_A enter PIN_HOME, then PIN_OTHER, then PIN_BAD.
Expect: PIN_HOME → Home state zone (₹99, free above ₹999), COD available; PIN_OTHER → Rest of
India (₹149, free above ₹1,999), COD available; each with a delivery date. PIN_BAD gives a clear
error, not a crash. Note exactly what is shown as FEE_HOME and FEE_OTHER.

**P1-07-008 · WhatsApp and quote buttons** (P2 · SF)
On PRODUCT_A choose a finish. Read the WhatsApp button's link; open Ask for a quote (don't
submit).
Expect: the WhatsApp text names the product, model number and the chosen finish; the quote form
is prefilled with the product and finish.

**P1-07-009 · Quick add on cards** (P2 · SF)
On a listing, press Choose options (or Quick add) on a multi-finish product. Close it without
adding.
Expect: a picker with each finish's price and stock opens on the page and closes cleanly; the
cart count is unchanged.

**P1-07-010 · Breadcrumbs and back** (P3 · SF)
From home → category → subcategory → product, then use each breadcrumb and the browser Back.
Expect: each lands on the right page; filters you set earlier are kept when you go back.

### P1-08 · Responsiveness (screen widths)

For each case use these widths in turn: **1440×900, 1024×768, 768×1024, 390×844, 360×740**.
At each width check: no horizontal scroll, nothing overlaps or is cut off, text readable
(body ≥ 14 px), tap targets on phone ≥ 40×40 px for main buttons, images not stretched.

**P1-08-001 · Home** (P1 · SF)
Expect: hero, category cards, carousels and footer adapt; carousels swipe or scroll on phone;
the bottom navigation (Home, Shop, Dealers, Account, Cart, or Search/Contact for a catalogue store)
shows only below 1024 px.

**P1-08-002 · Header and menus** (P1 · SF)
Expect: desktop dropdowns never run off screen at 1024 px; at phone widths a menu button opens a
panel; the search box is reachable at every width.

**P1-08-003 · Category listing and filter sheet** (P1 · SF)
Expect: desktop has a side filter panel; at phone widths Filters opens a bottom sheet over a dimmed
page with Close, Clear and "Show N products"; 2 cards per row on phone (no cramped 3), price and
button visible on each card.

**P1-08-004 · Product page** (P1 · SF)
Expect: gallery swipes on phone; finish picker wraps; on phone a sticky bar with Add to cart (or
Ask for a quote) replaces the bottom navigation and doesn't cover content at the end of the page;
specifications table doesn't overflow (scrolls inside itself if wide).

**P1-08-005 · Search, offers, dealers, downloads, contact, a policy page** (P2 · SF)
Expect: each adapts with no overflow; the dealer list and map tab are usable on phone.

**P1-08-006 · Long content** (P2 · SF)
Find the product with the longest title in the store (or one with many finishes) and view it and
its card at 360×740.
Expect: the title wraps (no overflow), finish chips wrap, the card keeps its button visible.

**P1-08-007 · Rotate** (P3 · SF)
Resize 844×390 (phone landscape) on home and product page.
Expect: usable, sticky bars don't take over half the screen.

**P1-08-008 · CMS at laptop and tablet widths** (P2 · CMS)
In CMS open Dashboard, Products, a product editor and Orders at 1024×768 and 768×1024.
Expect: the menu collapses to icons or a toggle; tables scroll inside themselves; the editor's
side column moves below or stays usable; Save is always reachable.

### P1-09 · Accessibility and speed spot checks

**P1-09-001 · Keyboard** (P2 · SF)
On home, press Tab from the top.
Expect: a "Skip to content" link appears first; focus is always visible; menus open with Enter
and close with Escape; you can reach search, cart and Add to cart by keyboard.

**P1-09-002 · Images and labels** (P2 · SF)
On home and PRODUCT_A run
`[...document.images].filter(i => !i.hasAttribute('alt')).length` and
`[...document.querySelectorAll('input,select,textarea')].filter(e => e.type!=='hidden' && !e.labels?.length && !e.getAttribute('aria-label')).length`.
Expect: 0 and 0.

**P1-09-003 · Reduced motion** (P3 · SF) [HUMAN]
Turn on "reduce motion" in the operating system and reload.
Expect: no slide or rise-in animations; the hero doesn't autoplay.

**P1-09-004 · Page speed** (P2 · SF)
For home, `/c/CATEGORY_A` and PRODUCT_A at Phone width, after one warm-up load, reload and run
`(() => { const n = performance.getEntriesByType('navigation')[0]; return { ttfb: Math.round(n.responseStart), dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd), bytes: performance.getEntriesByType('resource').reduce((s, r) => s + (r.transferSize || 0), 0) } })()`.
Expect: photos served as WebP or AVIF and below-the-fold images lazy; record the numbers. On the
development server timings are only for comparison between runs (no pass mark); the targets
(TTFB under 800 ms, load under 3 s, under 2.5 MB) apply to a production build (`pnpm build` then
`pnpm start`). A full Lighthouse mobile run is [HUMAN] (project target: 90+ on product and
listing pages).

**P1-09-005 · Layout shift** (P3 · SF)
Reload PRODUCT_A at Phone and watch the first 3 seconds.
Expect: nothing jumps after it appears (fonts, images, banners keep their space).

---

## Run prompt for this phase

"Run Phase 1 of this script: every case in Part C, in order, using the values in Part A. Follow
Part B's rules. Don't change any data in this phase. Report in the Part B format."
