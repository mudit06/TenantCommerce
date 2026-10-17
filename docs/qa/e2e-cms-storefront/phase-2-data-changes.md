# Phase 2 of 4 · Data changes: catalogue and content, CMS → storefront

**What this phase does:** changes data in the CMS and checks the storefront follows every change
(and its undo) quickly and correctly, at desktop and phone widths. It creates a QA category, a QA
product, a QA page, a menu item, a dealer and a redirect, all starting with QA_TAG, and briefly
changes a few store settings (each restored in the same case). About 90 minutes.

**Why Bathroom accessories:** the live Diwali 2026 scheme takes 10% off everything under Door
hardware. The QA category goes under **Bathroom accessories** (not covered by any scheme, and its
attribute set "Bathroom accessories" has finish, mounting and material), so the QA product's
prices are plain and easy to check. Phase 3 adds its own scheme on top.

Flow tags: **CMS→SF** = change in CMS, check the store. Timings follow Part B rule 8: record
"seen on reload N / after Ns" in every parity case.

Test data for this phase:

| Item | Value |
|---|---|
| Category | `QA_TAG Robe hooks` under **Bathroom accessories**, Show on store on, attribute set "Bathroom accessories" (or the parent's) |
| Product | `QA_TAG Robe Hook`, model number `QA_TAG-HOOK-1` (e.g. `QA-E2E-1015-HOOK-1`), main category `QA_TAG Robe hooks`, 2 photos from the Media library (any two existing bathroom photos) with alt text, price ₹1,499 incl. GST, MRP ₹1,999, GST 18%, HSN 8302, How shoppers buy: Buy online, stock 10 |
| Legal details | Generic name "Robe hook", net quantity "1 N", country IN, made by: the store's label defaults |
| Finishes | Two variants from the set's finish options: finish 1 (e.g. Chrome) ₹1,499 stock 10; finish 2 (e.g. Black) ₹1,699 stock 0 |
| Page | `QA_TAG Test page`, Default template, slug `qa-e2e-test-page` |
| Dealer | `QA_TAG Dealer`, pincode PIN_HOME, phone QA_PHONE |
| Redirect | from `/qa-e2e-old-address` to `/pages/qa-e2e-test-page` |

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

### P2-01 · Store settings changes

Before each case write the old value. Restore it at the end of the case and check the store again.

**P2-01-001 · Announcement bar on, edit, off** (P1 · CMS→SF)
CMS Store → Settings → Announcement bar: tick Show, text `QA_TAG notice`, link `/offers`. Save.
Expect on STORE: the bar with that text and link on home, a category, PRODUCT_A, cart. Change the
text to `QA_TAG notice 2` → updated on the first reload. Restore the old values → bar back to
how it was.

**P2-01-002 · Contact phone** (P2 · CMS→SF)
Change Contact → phone to a QA_PHONE-like test value, Save; check the top line, footer and
`/contact`; restore.
Expect: all three places update together on the first reload; after restore all three show the
original.

**P2-01-003 · Animations off and on** (P3 · CMS→SF)
Branding → Animations on the store: off, Save. Reload STORE.
Expect: `<html data-motion="off">`, no rise-in on scroll. Restore → attribute gone.

**P2-01-004 · Maintenance mode** (P1 · CMS→SF)
Tick Store status → "Maintenance mode: show shoppers a “back soon” page". Save. Reload STORE home,
PRODUCT_A and `/cart`.
Expect: every page shows "Home Orbit will be back soon" with no header, menu or prices (note the
HTTP status). The CMS shows a maintenance bar. STORE2_URL is unaffected.
Untick, Save → the store is back on the first reload. If you can't turn it off, **stop the run**
(Part B, Stop or continue): every later storefront case depends on it.

### P2-02 · Category lifecycle

**P2-02-001 · New category appears** (P1 · CMS→SF)
Create the QA category (test data). Save. Record `CAT_NEW` (its address on STORE).
Expect on STORE: listed in "All categories" and on `/c` with its tile image or a placeholder;
`CAT_NEW` opens with an empty state ("No products yet" or similar, not an error, status 200).

**P2-02-002 · Rename changes the address and keeps the old one working** (P1 · CMS→SF)
Rename to `QA_TAG Robe and towel hooks` and let the slug follow (or edit the slug). Save.
Expect: the new address works; the old `CAT_NEW` answers with a permanent redirect (308/301) to
the new one; update `CAT_NEW`.

**P2-02-003 · Hide and show** (P1 · CMS→SF)
Untick Show on store, Save.
Expect: gone from All categories and `/c`; its address is 404. Tick it again → back.

**P2-02-004 · Description, banner and SEO** (P3 · CMS→SF)
Add a description `QA_TAG description`, SEO title `QA_TAG Robe hooks title`. Save.
Expect: the description shows on the listing; `<title>` uses the SEO title.

### P2-03 · Product lifecycle

**P2-03-001 · CMS validation before Active** (P1 · CMS)
Create the QA product with title, model number and category only; try to set status **Active
(on the store)** and Save.
Expect: refused with clear messages that a photo and the label (legal) details are needed. Set
How shoppers buy = Buy online without price or HSN → refused, needs a price and HSN. Nothing half
saved shows on STORE.

**P2-03-002 · Draft is invisible** (P1 · CMS→SF)
Fill everything from the test data but save as **Draft**. Record its slug as `PROD_NEW`.
Expect on STORE: `/products/PROD_NEW` is 404; not in `CAT_NEW`, search (title or model number) or
the sitemap.

**P2-03-003 · Active makes it visible everywhere** (P1 · CMS→SF)
Set status Active, Save.
Expect on the first reload: product page 200; card in `CAT_NEW` with ₹1,499, MRP ₹1,999 struck
through, 25% off, **no** offer badge; search suggestions find it by title, by its model number, and
by the model number typed without dashes (e.g. `qae2e1015hook1`); listed in
`/sitemap.xml`; the CMS Products Active count went up by 1.

**P2-03-004 · Product page matches the editor** (P1 · CMS↔SF)
Expect: title, model number, both photos in order with their alt text, specifications you filled,
legal details, "Prices include GST", breadcrumb Home › Bathroom accessories › QA category ›
product. The pincode box with PIN_HOME says free delivery (₹1,499 is above ₹999).

**P2-03-005 · Variants: price and stock per finish** (P1 · CMS→SF)
Use "Create variants" or add the two variants from the test data. Save.
Expect: STORE shows a finish picker; finish 1 → ₹1,499 and Add to cart; finish 2 → ₹1,699 and
Out of stock (Add to cart disabled); the card shows a price range or "from ₹1,499".

**P2-03-006 · Price change** (P1 · CMS→SF)
Change finish 1's price to ₹1,299. Save.
Expect: product page, card, search suggestion and Quick add picker all show ₹1,299 and the new
% off (35%) on the first reload. Write down the time it took.

**P2-03-007 · Stock to zero and back** (P1 · CMS→SF)
Set finish 1 stock 0. Save.
Expect: Out of stock on the page and card; Add to cart disabled; "In stock only" filter on
`CAT_NEW` hides it. Set stock 10 → buyable again.

**P2-03-008 · Low stock message is honest** (P2 · CMS→SF)
Set finish 1 stock 2. Save.
Expect: any low-stock message says 2 (or none at all); never a different number. Add 3 to the
cart is refused or capped at 2. Set back to 10.

**P2-03-009 · How shoppers buy** (P1 · CMS→SF)
Switch to "Request a quote only", Save → STORE: no price, no Add to cart, Ask for a quote shown,
card has no price. Switch to "Both" → price, Add to cart and a quote button. Back to "Buy online".

**P2-03-010 · Photos: reorder and alt text** (P2 · CMS→SF)
Swap the two photos' order; change photo 1's alt text in Media to `QA_TAG alt changed`. Save.
Expect: the card and gallery lead with the new first photo; the image's `alt` on STORE is the new
text; the hover (second) photo on cards is the other one.

**P2-03-011 · Specification drives a filter** (P2 · CMS→SF)
Give the product a value in a specification the attribute set marks as Filter.
Expect: `CAT_NEW` (and the parent listing) show that filter with the value and count 1; ticking
it keeps the product.

**P2-03-012 · Document on the product and Downloads** (P2 · CMS→SF)
Link an existing document (or upload a small QA PDF named `QA_TAG manual.pdf` with "Show on the
Downloads page"). Save.
Expect: listed on the product page; on `/downloads` searchable by `QA_TAG-HOOK-1`; download is 200.

**P2-03-013 · Goes well with** (P3 · CMS→SF)
Pick PRODUCT_A under "Goes well with". Save.
Expect: PRODUCT_A shows in that section on PROD_NEW's page.

**P2-03-014 · SEO fields** (P2 · CMS→SF)
Meta title `QA_TAG Robe Hook title`, description `QA_TAG Robe Hook description`. Save.
Expect: `<title>` and meta description updated; JSON-LD Product price = current price.

**P2-03-015 · Slug change keeps old links** (P1 · CMS→SF)
Change the slug to `qa-e2e-robe-hook-v2`. Save.
Expect: new address 200; old `PROD_NEW` address redirects permanently (308/301) to it; the sitemap
lists only the new one. Update `PROD_NEW`.

**P2-03-016 · Same product in a second category** (P3 · CMS→SF)
Add Home decor › Key hangers under "Also show in". Save.
Expect: the product appears in both listings; its breadcrumb and canonical still use the main
category.

**P2-03-017 · Archive hides it** (P1 · CMS→SF) (we bring it back after)
Set status Archived. Save.
Expect: product page 404; gone from listings, search and sitemap; if it was in a cart (not yet),
n/a. Set back to **Active** (Phase 3 uses it) and check it returns.

**P2-03-018 · Bulk actions on the list** (P2 · CMS)
In Products search `QA_TAG`, tick PROD_NEW only, use **Archive**, then tick it in the Archived tab
and **Publish**.
Expect: each action reports success for 1 product; the store follows each (404, then 200).
**Never tick a product that doesn't start with QA_TAG.**

**P2-03-019 · Long and Indian-language text** (P2 · CMS→SF)
Set the title to `QA_TAG Robe Hook दीवार हुक with an extra long name to test wrapping on small phones 123` and a finish named
with 30 characters if the attribute set allows. Save. View the page and card at 360×740 and
1440×900.
Expect: Devanagari renders, the title wraps, no overflow, the card keeps its price and button.
Restore the title `QA_TAG Robe Hook`.

**P2-03-020 · Big price formatting** (P3 · CMS→SF)
Set finish 1 price ₹12,34,567 (MRP ₹15,00,000), Save; view card and page at 360×740.
Expect: shown as ₹12,34,567 (Indian grouping), fits on the card. Restore ₹1,299.

**P2-03-021 · Unsaved-changes guard and errors** (P3 · CMS)
Change the title, then click another menu item without saving.
Expect: a "leave without saving?" prompt. Enter a negative price → validation error, nothing saved.

### P2-04 · Pages and the page builder

**P2-04-001 · New page as draft** (P1 · CMS→SF)
Create page (Default template) from the test data, with a Rich text block `QA_TAG body text` and
an FAQ/Questions block with one question, save as draft. Record `PAGE_NEW` = `/pages/qa-e2e-test-page`.
Expect: STORE `PAGE_NEW` is 404.

**P2-04-002 · Live preview** (P2 · CMS)
In the editor open the live preview and switch Phone, Tablet, Desktop.
Expect: the draft renders in the store's design at each size; the preview address is on the
store's domain with a token and isn't indexed.

**P2-04-003 · Publish** (P1 · CMS→SF)
Publish.
Expect: `PAGE_NEW` 200 with both blocks, in the store's design, on the first reload; in sitemap.

**P2-04-004 · Unpublished changes stay hidden** (P1 · CMS→SF)
Change the body to `QA_TAG body text v2` and **save draft** (don't publish).
Expect: STORE still shows "QA_TAG body text"; the Pages list shows "unpublished changes". Publish →
STORE shows v2.

**P2-04-005 · Scheduled publish** (P2 · CMS→SF)
Change the body to `QA_TAG scheduled`, schedule it to publish 3 minutes from now.
Expect: STORE shows v2 until then, `QA_TAG scheduled` within 2 minutes after the time (the job
runner runs every minute in `pnpm dev`). Record the delay. Not changed after 5 minutes = **Fail
(High, scheduled publishing not running)**.

**P2-04-006 · Page in the footer menu** (P2 · CMS→SF)
Content → Navigation: add `QA_TAG link` to a footer column pointing at the QA page. Save.
Expect: the footer shows it on every page and it opens PAGE_NEW. Remove it, Save → gone.

**P2-04-007 · Header menu item and dropdown** (P1 · CMS→SF)
Add a header item `QA_TAG Menu` with a one-column dropdown linking to `CAT_NEW` and PROD_NEW.
Save. Check desktop hover and the Phone menu.
Expect: shown in both, links work, nothing pushes the header onto an ugly second line at 1024 px
(note if it wraps). Remove it, Save → gone in both.

**P2-04-008 · Unpublish and delete** (P2 · CMS→SF)
Unpublish (or set to draft) → 404. Publish again (P2-04-009 needs it).

**P2-04-009 · Home page change** (P2 · CMS→SF)
On the Home page add a Rich text block `QA_TAG home check` at the bottom, publish, check STORE
home, then remove the block and publish.
Expect: appears and disappears on the first reload each time; the other home sections unchanged.

### P2-05 · Dealers, redirects, media

**P2-05-001 · New dealer on the locator** (P2 · CMS→SF)
Create the QA dealer, use "Fill from the pincode", Shown on. Save.
Expect: STORE `/dealers?near=PIN_HOME` lists it with distance, Call `tel:`, WhatsApp and Directions;
the CMS map shows its pin.

**P2-05-002 · Hide dealer** (P2 · CMS→SF)
Turn Shown off → gone from `/dealers`. Leave it off.

**P2-05-003 · Redirect** (P2 · CMS→SF)
Content → Redirects: add the test redirect. Save. Open `STORE_URL/qa-e2e-old-address`.
Expect: permanent redirect to PAGE_NEW. Note the status code.

**P2-05-004 · Redirect loop protection** (P3 · CMS)
Try adding a redirect from `/pages/qa-e2e-test-page` to `/qa-e2e-old-address` (a loop).
Expect: refused, or the store doesn't loop (ERR_TOO_MANY_REDIRECTS = Fail Medium). Delete this one.

**P2-05-005 · Media "where used"** (P3 · CMS)
In Media open one of PROD_NEW's photos.
Expect: "where it is used" lists PROD_NEW; Delete warns or is blocked while in use (don't delete).

### P2-06 · Everything at phone width after the changes

**P2-06-001 · New items at 390×844 and 360×740** (P1 · SF)
Open `CAT_NEW`, PROD_NEW, PAGE_NEW and `/dealers?near=PIN_HOME` at both widths.
Expect: no overflow; sticky Add to cart on PROD_NEW; the filter sheet on `CAT_NEW` shows the new
filter; bottom navigation hidden where a sticky bar is shown.

**P2-06-002 · Cache freshness summary** (P1 · CMS→SF)
List every parity timing you recorded in this phase.
Expect: all "first reload". Put any slower ones in Defects (stale cache).

---

## Run prompt for this phase

"Run Phase 2 of this script: every case in Part C, in order, using the values in Part A. Follow
Part B's rules. Restore every store setting in the case that changed it. Report in the Part B
format, including Settings changed and restored, and Values created (CAT_NEW, PROD_NEW, PAGE_NEW,
the dealer and redirect)."
