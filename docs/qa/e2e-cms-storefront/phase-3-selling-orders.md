# Phase 3 of 4 · Selling: cart, offers, checkout and the order lifecycle

**What this phase does:** buys with cash on delivery as a guest shopper and follows each order
through the CMS (pack, invoice, ship, deliver, cancel, return, refund), checking that the store,
the shopper's account, the tracking page and the CMS agree at every step. Also tests coupons and
schemes on prices, and the server's own totals. About 90 to 120 minutes.

**Preconditions:** Phase 2 done (PROD_NEW is Active, ₹1,299 for finish 1, stock 10, under
Bathroom accessories so no store scheme covers it). The store sells with **cash on delivery**
(₹49 fee, ₹299 to ₹50,000) and Razorpay is **not** connected. Order updates and login codes are
printed in the `pnpm dev` terminal, not sent: ask me when a case needs one.

**Orders note:** the orders are records in the QA database (order numbers, invoice and credit
note numbers, reports). Every order uses the name `QA_TAG Tester` so they are easy to spot.
QA_EMAIL may already have orders from earlier runs: count **new** ones only.

Test data for this phase:

| Item | Value |
|---|---|
| Shopper | Name `QA_TAG Tester`, email QA_EMAIL, mobile QA_PHONE |
| Address | `QA_TAG, Flat 1, Test Building`, pincode PIN_HOME, city from the pincode |
| Business GSTIN | GSTIN_OK `27AAPFU0939F1ZV`; GSTIN_BAD `29AABCT1234F1ZN` |
| Coupon | code `QAE2E` + MMDD (e.g. `QAE2E1015`), ₹100 off, minimum order ₹1,000, whole store, total uses 5, per shopper 1, **not** shown at the cart or on the Offers page |
| Scheme | `QA_TAG Scheme`, 10% off, covers **chosen products: PROD_NEW only**, works with coupons **off**, badge on, announcement bar **off**, banner **off**, not on the Offers page if that's a choice |

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

### P3-01 · Delivery fees and COD rules, CMS ↔ store

**P3-01-001 · Pincode answer is the same in three places** (P1 · CMS↔SF)
CMS Store → Shipping → **Test a pincode** with PIN_HOME, PIN_OTHER and PIN_BAD. On STORE use the
pincode box on PROD_NEW and later the checkout (P3-04).
Expect: the same delivery fee (or free above a threshold), delivery days and COD yes/no in CMS
and on the product page for each pincode; PIN_BAD is rejected in both. Record the zone, fee and
"free above" for each: `ZONE_HOME`, `ZONE_OTHER`.

**P3-01-002 · COD limits** (P2 · CMS↔SF)
Read Store → Payments → cash on delivery rules (minimum, maximum order, any fee) and Settings →
Checkout and returns.
Expect: noted for P3-04 (COD offered only inside those limits, its fee shown as its own line).

**P3-01-003 · Payment choices follow the Payments screen** (P2 · CMS↔SF)
Read Store → Payments: Razorpay is not connected in this database.
Expect: checkout (P3-04) offers **only cash on delivery**, with no "pay online" option and no
test-payments notice. Mismatch = Fail (High).

### P3-02 · Cart

**P3-02-001 · Add and count** (P1 · SF)
Signed out, in a clean tab (clear STORE's site data first). Add PROD_NEW finish 1 qty 1 from the
product page, PRODUCT_A (8 inch · Antique) qty 2 from its page.
Expect: the cart icon count bumps to 3; a confirmation ("Added ✓" or a mini cart) each time.

**P3-02-002 · Cart lines match the products** (P1 · SF)
Open `/cart`.
Expect: each line has photo, title, finish, model number, unit price, MRP, quantity, line total;
prices equal the product pages.

**P3-02-003 · Totals add up** (P1 · SF)
Expect: Items total = Σ(qty × price) = ₹1,299 + 2 × ₹2,049 = ₹5,397; a **Diwali 2026** discount
line for PRODUCT_A = 10% of ₹4,098 ≈ ₹410 (under the ₹1,500 cap); Savings on MRP = Σ(qty × (MRP −
price)); delivery free with PIN_HOME (above ₹999); Total = items − discounts + delivery (+ ₹49 COD
fee at checkout); "GST included" is stated. Check the arithmetic and write it in Actual.

**P3-02-004 · Quantity and remove** (P1 · SF)
Change PRODUCT_A qty to 1, then remove it, then add it back.
Expect: totals recalculate each time; the header count follows.

**P3-02-005 · Can't exceed stock** (P1 · SF)
Set PROD_NEW quantity to 50 (stock is 10).
Expect: refused or capped at 10 with a message; never accepts 50.

**P3-02-006 · Cart persists** (P2 · SF)
Reload; open STORE in a new tab.
Expect: same cart in both.

**P3-02-007 · CMS price change reaches an existing cart** (P1 · CMS→SF)
In CMS set PROD_NEW finish 1 price to ₹1,349. Save. Reload `/cart`.
Expect: the line shows ₹1,349 (the server reprices; never the old price at checkout). Set it back
to ₹1,299, reload, ₹1,299.

**P3-02-008 · Product made unavailable while in cart** (P1 · CMS→SF)
In CMS set PROD_NEW finish 1 stock 0. Reload `/cart`.
Expect: the line says out of stock (or is removed with a note) and checkout can't include it. Set
stock 10 again; the line is buyable again.

**P3-02-009 · Delivery pincode in the cart** (P2 · SF)
Enter PIN_HOME then PIN_OTHER in the cart's pincode box.
Expect: delivery fee and date change per P3-01-001. With a cart of only PRODUCT_C (₹849, Diwali
price about ₹764): PIN_HOME → ₹99, PIN_OTHER → ₹149; with ₹1,000+ in the cart PIN_HOME is free;
PIN_OTHER becomes free only above ₹1,999. Put the cart back to PROD_NEW + PRODUCT_A afterwards.

**P3-02-010 · Move to wishlist and Complete the look** (P3 · SF)
Use Move to wishlist on PRODUCT_A (if wishlist is on), then add it back from `/wishlist`.
Expect: it leaves the cart, is on the wishlist with the same finish, and Move to cart restores it.
"Complete the look" lists products from the cart's categories with working Add to cart.

**P3-02-011 · Phone cart** (P1 · SF)
At 390×844 view `/cart`.
Expect: sticky checkout bar with the total; lines readable; quantity buttons ≥ 40 px; no overflow.

### P3-03 · Coupons and schemes, CMS → prices

**P3-03-001 · Create the QA coupon** (P1 · CMS)
Marketing → Coupons: create the test coupon. Save. Record `COUPON_1`.
Expect: listed as Active with "₹100 off, min ₹1,000, 0 of 5 used".

**P3-03-002 · Coupon below its minimum** (P1 · CMS→SF)
Empty the cart, add PRODUCT_CHEAP (₹249) qty 1. Apply COUPON_1.
Expect: refused with "Add ₹751 more" (₹1,000 − ₹249). Empty the cart again afterwards.

**P3-03-003 · Coupon applied** (P1 · CMS→SF)
Cart: only PROD_NEW qty 1 (₹1,299); no Door hardware item in the cart. Apply COUPON_1, then
remove it and apply it again typed in lowercase.
Expect: a discount line −₹100; total down by ₹100; the code works whatever the case.

**P3-03-004 · Invalid code** (P2 · SF)
Apply `NOSUCHCODE`.
Expect: a clear "not valid" message; the existing coupon stays applied (or is replaced cleanly).
Don't try more than 3 wrong codes (rate limit).

**P3-03-004b · Store coupon vs the Diwali scheme** (P1 · CMS↔SF)
Add PRODUCT_A to the cart (Diwali covers it; Diwali doesn't work with coupons). Apply HOME200.
Expect: the cart explains the conflict (for example that HOME200 can't be used with the Diwali
offer, which saves more) and keeps the better deal; totals add up. Remove PRODUCT_A and HOME200
afterwards so the cart is PROD_NEW only.

**P3-03-005 · Paused coupon stops working** (P1 · CMS→SF)
In CMS Pause COUPON_1. Reload the cart.
Expect: the cart drops it or says it can't be used now. Resume it → applies again.

**P3-03-006 · Create the QA scheme** (P1 · CMS)
Marketing → Schemes: create the test scheme starting now (or Start now), ending tomorrow. Save.
Record `SCHEME_1`. Check its Preview (product card and sample cart).
Expect: status Live; Preview shows PROD_NEW at about ₹1,169 (10% off ₹1,299; note how the store rounds
₹1,169.10).

**P3-03-007 · Scheme on the store** (P1 · CMS→SF)
Reload PROD_NEW and `CAT_NEW` (within 60 s).
Expect: the badge, the offer price per finish (finish 1 ₹1,169-ish) with the real MRP struck, and
"Offer ends <tomorrow's date>"; the card in the listing shows the same; `/offers` shows it only if
the scheme was set to be shown. PRODUCT_A unchanged (not covered). Record the delay.

**P3-03-008 · Scheme in the cart and coupon combination** (P1 · SF)
Reload `/cart` (PROD_NEW + COUPON_1 applied).
Expect: the scheme as its own discount line; COUPON_1 refused or removed with a message that it
can't be used with the QA scheme (works with coupons is off), saying which saves more. Totals
add up.

**P3-03-009 · Scheme paused** (P1 · CMS→SF)
Pause SCHEME_1. Reload PROD_NEW and the cart.
Expect: badge and offer price gone, normal price back; cart discount line gone; COUPON_1 can be
applied again. Resume it → back (record delays). **Leave it paused** for the orders below unless a
case says otherwise.

### P3-04 · Guest checkout with cash on delivery

**P3-04-001 · Checkout page** (P1 · SF)
Cart: PROD_NEW qty 1 + COUPON_1. Go to checkout.
Expect: one page: contact, WhatsApp updates tick (ticked by default), address, business GSTIN
(optional), delivery with date and fee, payment choices, order summary that equals the cart's
total. "Offers and new launches" consent boxes are **unticked**. "Have an account? Log in" shown.

**P3-04-002 · Validation** (P1 · SF)
Press Place order with everything empty, then with a 9-digit phone, a bad email, PIN_BAD and the
invalid GSTIN.
Expect: an inline message on each field, focus moves to the first error, nothing is placed.

**P3-04-003 · Pincode fills the state, GST changes** (P1 · SF)
Enter PIN_HOME.
Expect: state (and city) filled; delivery fee = ZONE_HOME; COD offered. Change to PIN_OTHER →
fee = ZONE_OTHER, COD per its rule. Back to PIN_HOME.

**P3-04-004 · COD minimum** (P2 · SF)
Note the cart, empty it, add only PRODUCT_CHEAP (₹249) and go to checkout with PIN_HOME (don't
place).
Expect: COD unavailable with a reason, because the COD minimum is ₹299 (note whether the store
compares the items total or the total with delivery: ₹249 + ₹99 = ₹348). As COD is the only
payment method here, the shopper must be told clearly they can't order yet, not shown an empty
payment section. Put the cart back to PROD_NEW + COUPON_1.

**P3-04-005 · Place a COD order** (P1 · SF)
Fill the test shopper and address (PIN_HOME), no GSTIN, COD. Place order **once**; double-click
quickly to test.
Expect: one order only; Order confirmed page with order number (record `ORDER_1`), amount, "Cash
on delivery", delivery date and address, items; Track order link (record `TRACK_1`). Total =
₹1,299 − ₹100 (COUPON_1) + ₹0 delivery + ₹49 COD fee = **₹1,248** (if delivery isn't free
because the store compares after the coupon, note it), equal to the checkout total exactly.

**P3-04-006 · Confirmation page is private** (P2 · SF)
Copy the confirmation address; open it in an incognito window [HUMAN] or after clearing STORE's
cookies in a separate profile.
Expect: not shown to another browser (redirect or "not found"), Not Run (human) if you can't.

**P3-04-007 · Shopping again after an order** (P1 · SF)
Back on the original tab: the cart count is 0. Add PRODUCT_A to the cart.
Expect: added normally (regression for DEF-003).

**P3-04-008 · Second order: other state, business GSTIN** (P1 · SF)
Cart: PRODUCT_A 8 inch · Antique qty 1. Checkout with PIN_OTHER (Delhi), GSTIN_OK, COD.
Record `ORDER_2`.
Expect: placed. Total ≈ ₹1,844 (Diwali price) + ₹149 delivery (below ₹1,999) + ₹49 COD =
**about ₹2,042**; write the exact figures.

**P3-04-009 · Third order on a phone** (P1 · SF)
At 390×844: add PROD_NEW, check out (PIN_HOME, COD). Record `ORDER_3`.
Expect: every field usable; number keyboard hints (`inputmode="numeric"` or `type="tel"`) on phone
and pincode; a sticky Place order; no overflow.

**P3-04-010 · Server totals can't be tampered with** (P1 · SF)
In the cart (PROD_NEW qty 1) open devtools via your JS tool and change the displayed price text
and any hidden input you find (price, total, quantity) to 1, then proceed to checkout and look at
the summary (don't place).
Expect: checkout shows the server's real price and total; nothing you edited in the page is used.

### P3-05 · The orders in the CMS

**P3-05-001 · Orders list** (P1 · CMS↔SF)
CMS Sales → Orders, search QA_TAG (or ORDER_1).
Expect: ORDER_1, ORDER_2, ORDER_3 under **To pack**; payment "Cash on delivery"; totals equal
the confirmation pages.

**P3-05-002 · ORDER_1 detail parity** (P1 · CMS↔SF)
Open ORDER_1.
Expect: items, finish, quantity, prices, coupon discount −₹100, delivery fee, total all equal the
store's confirmation; address and contact as typed; GST by rate **CGST + SGST** (same state as the
store) with place of supply; timeline "Placed" with time.

**P3-05-003 · ORDER_2 GST is IGST** (P1 · CMS)
Open ORDER_2.
Expect: **IGST** (other state) and the business GSTIN shown on the order.
(If PIN_OTHER is in the store's own state, note it and mark Not Applicable.)

**P3-05-004 · Stock went down** (P1 · CMS↔SF)
Open PROD_NEW in the product editor.
Expect: finish 1 stock = 10 − (units in ORDER_1 + ORDER_3). The store's stock message (if any)
agrees.

**P3-05-005 · Coupon use counted** (P2 · CMS)
Coupons: COUPON_1.
Expect: "1 of 5 used".

**P3-05-006 · Customer and dashboard** (P2 · CMS)
Customers: search QA_EMAIL. Dashboard.
Expect: the shopper listed; their order count went up by 3 since before this phase (guest
orders count by email, or note how it shows); masked phone; dashboard Orders today =
ORDERS_TODAY (Phase 1) + 3 if Phase 1 ran today; Sales today grew.

**P3-05-007 · Staff were told** (P3 · CMS) [HUMAN]
Ask me whether the `pnpm dev` terminal printed "new order" staff emails for the three orders.

### P3-06 · Fulfilment: CMS actions → shopper views

After each CMS step reload `TRACK_1` (signed out) and note what changed.

**P3-06-001 · Mark packed creates the invoice** (P1 · CMS→SF)
ORDER_1 → Mark as packed (enter a weight). Save.
Expect CMS: status Packed; a GST invoice number `INV/<FY>/<n>` (record `INVOICE_1`); Download
invoice shows seller GSTIN, buyer, HSN 8302 at 18%, CGST+SGST split, delivery as its own line,
amount in words, totals equal the order. Expect TRACK_1: "Packed" on the journey.

**P3-06-002 · Ship with your own courier** (P1 · CMS→SF)
On the parcel enter courier `QA Courier`, AWB `QAE2E0001`, tracking link left empty (or a dummy
`https://example.com/track`), and mark Shipped. Don't use Book with Shiprocket.
Expect: CMS status Shipped; TRACK_1 shows Shipped, courier and AWB; the timeline has who and when.

**P3-06-003 · Out for delivery, then delivered** (P1 · CMS→SF)
Mark Out for delivery, then Delivered.
Expect: each step appears on TRACK_1 in order with dates; the order is Delivered in the list.
Messages to the shopper on the order list one update per step, each with an outcome.

**P3-06-004 · Delivery failed path** (P2 · CMS→SF)
ORDER_3: Mark packed, ship (AWB `QAE2E0003`), then Delivery failed with reason "Shopper not
available", then re-attempt (Out for delivery).
Expect: TRACK_1-style page for ORDER_3 shows the failed attempt in words and then out for
delivery; nothing internal (staff notes) leaks to the shopper.

**P3-06-005 · Tracking page privacy** (P1 · SF)
Read TRACK_1's page text.
Expect: order number, journey, courier and AWB, items; phone **masked**; **no** address, email,
invoice or full phone. "Log in to see more" present.

**P3-06-006 · Tracking code guessing** (P2 · SF)
Change one character of the code in TRACK_1, open it; then try 3 random codes.
Expect: 404 each time, never another order; no order data in the 404.

**P3-06-007 · Messages were sent** (P2 · CMS↔SF) [HUMAN]
Ask me: did the `pnpm dev` terminal print `[dev-log email]` (and `[dev-log whatsapp]`) messages
for ORDER_1 (confirmed, packed, shipped, out for delivery, delivered), in Home Orbit's name, with a
Track order link to TRACK_1? Also compare with the order's "Messages to the shopper" card in CMS.

### P3-07 · Shopper account: login, orders, cancel, return

**P3-07-001 · Log in with an email code** (P1 · SF)
`/account/login` → Email code tab → QA_EMAIL → Send code. Ask me for the code from the terminal (rule 3), type it.
Expect: "Resend code in 0:30"-style timer; after the code, "Hi <name>"; ORDER_1, ORDER_2 and
ORDER_3 listed among any earlier orders (guest orders joined by email), with status and totals
equal to the CMS.

**P3-07-002 · Order detail in the account** (P1 · SF)
Open ORDER_1 in the account.
Expect: journey with courier and AWB, items, discounts, delivery, total, GST line, address,
Download invoice (same number as INVOICE_1, same totals), the return window and **Request return**.

**P3-07-003 · Cancel from the account** (P1 · SF→CMS)
Open ORDER_2 (still To pack) → Cancel order → confirm.
Expect STORE: Cancelled. Expect CMS: ORDER_2 Cancelled with "cancelled by shopper" in the
timeline; PRODUCT_A stock back up by 1; no invoice (COD not packed).

**P3-07-004 · Can't cancel once shipped** (P1 · SF)
Open ORDER_3 (shipped) in the account.
Expect: no Cancel order button (or it's refused with a reason).

**P3-07-005 · Staff cancel** (P2 · CMS→SF)
Place `ORDER_4` (PRODUCT_A, PIN_HOME, COD) while logged in. In CMS cancel ORDER_4 with a reason.
Expect: account and tracking show Cancelled; stock back; if a coupon was used, its use comes back.

**P3-07-006 · Request a return** (P1 · SF→CMS)
ORDER_1 → Request return: 1 item, reason, note `QA_TAG return note`. Submit (no photos).
Expect STORE: return requested with its status. CMS Sales → Returns: the request with item, value,
reason and note.

**P3-07-007 · Approve, receive, refund** (P1 · CMS→SF)
CMS: Approve return (choose how it comes back), Mark received, then Record refund (by hand, COD:
method bank transfer, reference `QAE2E-REF-1`, full item value).
Expect: each step visible to the shopper in the account (approved with instructions, received,
refunded); a credit note `CN/<FY>/<n>` on the order; the return closes after the refund. The
store shows the refunded amount equal to CMS.

**P3-07-008 · Reject path** (P2 · CMS→SF)
ORDER_3: once Delivered (mark it), request a return, then Reject return with a reason in CMS.
Expect: the shopper sees "not accepted" with the reason.

**P3-07-009 · Order list at phone width** (P2 · SF)
At 390×844 view `/account` and ORDER_1.
Expect: readable, no overflow, Invoice and Track buttons reachable.

### P3-08 · Reports reflect the orders

**P3-08-001 · Reports this month** (P2 · CMS)
Insights → Reports, this month.
Expect: orders and gross sales include the delivered/collected QA orders per the report's rule
(COD counts when cash collected/delivered); the refund shows under refunds; COUPON_1 under offers;
the GST summary includes HSN 8302 at 18%. Note any figure that doesn't add up.

---

## Run prompt for this phase

"Run Phase 3 of this script: every case in Part C, in order, using the values in Part A and
VALUES_IN from Phase 2. Follow Part B's rules: cash on delivery only, ask me for login codes.
Report in the Part B format with Values created (COUPON_1, SCHEME_1, ORDER_1 to ORDER_4, TRACK_1,
INVOICE_1)."
