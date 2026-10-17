# Phase 4 of 4 · Accounts, growth features, enquiries, security, isolation and clean-up

**What this phase does:** the shopper's account, wishlist, reviews, enquiries and offer sign-ups,
each checked from both sides; then negative and security cases (other shoppers' data, other
stores, scripts in forms, open redirects); then removes or archives everything the run created
and proves the store is clean. About 90 minutes.

**Preconditions:** Phases 2 and 3 done (VALUES_IN has PROD_NEW, CAT_NEW, PAGE_NEW, COUPON_1,
SCHEME_1, ORDER_1 to ORDER_4, TRACK_1). ORDER_1 is Delivered. A case for a feature that's off for
this store (Phase 1 P1-02-005) is **Not Applicable**.

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

### P4-01 · Shopper account

**P4-01-001 · Wrong codes and lockout** (P1 · SF)
Log out. `/account/login` → Email code → QA_EMAIL → Send code. Type `000000` five times.
Expect: "wrong code" each time, then a lock or "request a new code" after the 5th; no hint whether
the email has an account. Then ask me for a fresh code and log in.

**P4-01-002 · Same answer for unknown emails** (P2 · SF)
Log out, request a code for `qa-e2e-nobody@example.com`.
Expect: the same "we sent a code" screen as for a real address (no account enumeration). Don't
continue.

**P4-01-003 · Profile** (P2 · SF→CMS)
Log in as QA_EMAIL. Profile: name `QA_TAG Tester Edited`. Save.
Expect: "Hi QA_TAG Tester Edited"; CMS Customers shows the new name.

**P4-01-004 · Saved addresses fill checkout** (P1 · SF)
Add address `QA_TAG Home` (PIN_HOME) as default and `QA_TAG Office` (PIN_OTHER) with the valid
GSTIN. Go to checkout with PRODUCT_A in the cart (don't place).
Expect: "Logged in as QA_EMAIL", the default address filled; switching to the office address
changes the fee to ZONE_OTHER and shows the GSTIN. Edit and remove the office address → gone.

**P4-01-005 · Order updates and offer preferences** (P2 · SF→CMS)
In the account turn WhatsApp order updates off, then on; offers by email on.
Expect: each saved (reload keeps it); CMS Customers → offers agreed to shows email.

**P4-01-006 · Session belongs to this store only** (P1 · SF)
While logged in on STORE, open `STORE2_URL/account`.
Expect: Demo Sanitary shows its own login page, not the QA shopper's account.

**P4-01-007 · Session cookie is protected** (P1 · SF)
Run `document.cookie` on STORE.
Expect: no session token readable (HTTP-only). Note the cookie names you can see.

**P4-01-008 · Log out of all devices** (P2 · SF)
Log out of all devices.
Expect: back to login; `/account` asks to log in; `/account/orders/ORDER_1` asks to log in.

### P4-02 · Wishlist

**P4-02-001 · Guest wishlist** (P1 · SF)
Logged out: heart PROD_NEW on its card, Save PRODUCT_A on its page. Open `/wishlist`.
Expect: both listed with today's price and stock; the header wishlist count = 2; "Log in to keep
your wishlist on all your devices".

**P4-02-002 · Merge on login** (P1 · SF)
Log in as QA_EMAIL (ask me for the code).
Expect: the wishlist still has both (merged into the account).

**P4-02-003 · Prices are live on the wishlist** (P1 · CMS→SF)
In CMS resume SCHEME_1 (if paused). Reload `/wishlist`.
Expect: PROD_NEW shows the scheme price and its real end date. Pause SCHEME_1 again → normal price.

**P4-02-004 · Move to cart, Remove and Undo** (P2 · SF)
Move PROD_NEW to cart; Remove PRODUCT_A then Undo; then Remove it.
Expect: PROD_NEW in the cart with the saved finish; Undo restores; final list empty; count 0.

**P4-02-005 · Phone** (P3 · SF)
At 390×844 repeat a heart on a card and view `/wishlist`.
Expect: works, no overflow, the heart is a ≥ 40 px target.

### P4-03 · Reviews

**P4-03-001 · Write a review on a delivered order** (P1 · SF)
Logged in, open ORDER_1 → Write a review (or the link from the review email: ask me). 4 stars,
title `QA_TAG review`, text `QA_TAG good hook, review test`. Submit (no photos).
Expect: thanks message; "held for approval" if the store holds reviews. Only delivered items are
offered; a second review of the same item is refused.

**P4-03-002 · Moderation in CMS** (P1 · SF→CMS)
CMS Marketing → Reviews → To approve.
Expect: the review with 4 stars, title, text, the shopper's display name, PROD_NEW, ORDER_1,
"Verified purchase".

**P4-03-003 · Approve with reply → on the store** (P1 · CMS→SF)
Approve with reply `QA_TAG thanks`.
Expect: PROD_NEW's page shows the review, "Verified purchase", the store's reply; average 4.0 and
count 1; the card in `CAT_NEW` shows the stars; the "Rating" filter on the listing includes it.

**P4-03-004 · Reject hides it** (P1 · CMS→SF)
In CMS change the review to Rejected (reason: "Not about the product").
Expect: gone from PROD_NEW's page; average and count gone; card stars gone.

**P4-03-005 · Personal details in a review** (P2 · SF→CMS)
On ORDER_3 (delivered in Phase 3) review PROD_NEW with text `QA_TAG call me on 9999999999`.
Expect: in CMS the reject reason "personal details" is preselected. Reject it.

### P4-04 · Enquiries (contact and quote)

**P4-04-001 · Contact form to the inbox** (P1 · SF→CMS)
`/contact`: name `QA_TAG Tester`, QA_EMAIL, QA_PHONE, message `QA_TAG contact enquiry`. Submit.
Expect: a thank-you with a reference (record `ENQ_1`). CMS Enquiries → New: the enquiry with the
same details; the top-bar bell count went up by 1.

**P4-04-002 · Quote request from a product** (P1 · SF→CMS)
On PRODUCT_A choose a finish, Ask for a quote, quantity 25, message `QA_TAG bulk quote`. Submit.
Expect: CMS shows type quote, PRODUCT_A with photo, the finish, quantity 25.

**P4-04-003 · Staff work the enquiry** (P2 · CMS)
Open ENQ_1: Assigned to yourself, Status In progress, internal note `QA_TAG note`; then Closed.
Expect: saved in place, the tabs' counts move; the note shows who and when. Nothing is sent to the
shopper unless you press Reply.

**P4-04-004 · Validation and phone width** (P2 · SF)
At 390×844 submit `/contact` empty, then with a bad email.
Expect: inline errors; nothing created.

**P4-04-005 · Scripts in a form are shown as text** (P1 · SF→CMS)
Submit `/contact` with name `QA_TAG <b>bold</b>` and message
`QA_TAG <img src=x onerror=alert('xss')> <script>alert(1)</script>`.
Expect: CMS shows the characters literally as text; no alert dialog, no bold, no broken layout,
no console errors. An alert or rendered HTML = **Fail (Critical, stored XSS)**. Close it.

**P4-04-006 · Rate limit** (P3 · SF)
Submit the contact form 6 times quickly with `QA_TAG rate N`.
Expect: after a few, a polite "too many requests, try later" (not a 500). Note after how many.
Close those enquiries in CMS.

### P4-05 · Offers sign-up, unsubscribe, abandoned cart

**P4-05-001 · Footer sign-up** (P2 · SF→CMS)
Logged out, footer "Get our offers first": QA_EMAIL_2, tick By email. Submit.
Expect: a confirmation; CMS Marketing → Offer messages settings show opted-in count +1 (or the
customer appears with offers agreed by email).

**P4-05-002 · Consent is never pre-ticked** (P1 · SF)
Check the footer sign-up, the `/offers` sign-up and the checkout consent boxes.
Expect: all unticked by default.

**P4-05-003 · Unsubscribe** (P2 · SF→CMS) [needs the terminal]
Ask me whether the `pnpm dev` terminal printed an offer or welcome email to QA_EMAIL_2; if yes,
ask me for its unsubscribe link (`/unsubscribe/<token>` on STORE_URL) and open it.
Expect: a confirmation for Home Orbit; CMS opted-in count −1. Otherwise Not Run (human). To have
an email to unsubscribe from, you may use Marketing → Offer messages → **Send test to me** on a
draft named `QA_TAG offer` (then delete the draft).

**P4-05-004 · Abandoned cart** (P3 · SF→CMS)
Logged out in a clean tab: add PRODUCT_A, go to checkout, type QA_EMAIL_2 and tick offers by email,
then leave without ordering. After the store's first-reminder delay (Marketing → Abandoned carts,
Reminders card; often 60 minutes) check CMS Abandoned carts, and ask me whether the terminal
printed the reminder with a `/cart/restore/<token>` link (open it in a clean tab: the same cart
comes back).
Expect: the cart listed with the masked contact, PRODUCT_A and its value, and a reminder sent (or
why not, e.g. outside the send window). If the wait is too long for this sitting, mark Not Run and
note the time.

### P4-06 · Affiliates (only if the feature is on)

**P4-06-001 · Apply** (P2 · SF→CMS)
Logged in as QA_EMAIL: `/affiliate` → apply with name `QA_TAG Tester`, where you share `QA test`,
a test PAN format `ABCDE1234F`, accept terms. Submit.
Expect: "application received"; CMS Marketing → Affiliates → Applications lists it.

**P4-06-002 · Approve and use the link** (P2 · CMS→SF)
Approve in CMS. On STORE `/affiliate/dashboard`: copy the link `/r/<CODE>`; open it in the same
tab.
Expect: lands on the store home; the dashboard's clicks go up by 1 (may take a minute).
Record the code as `AFF_CODE`.

**P4-06-003 · Open redirect blocked** (P1 · SF)
Don't open these in the tab. In STORE run, for each of `?to=https://example.com`,
`?to=//example.com` and `?to=/offers`:
`fetch('/r/AFF_CODE' + q, {redirect: 'manual'}).then(r => [r.type, r.status])` and also
`fetch('/r/AFF_CODE' + q).then(r => r.url)`.
Expect: the final `r.url` stays on `home-orbit.localhost:3000` for all three (home for the first
two, `/offers` for the third). Any final address on example.com = **Fail (High, open
redirect)**.

**P4-06-004 · Pause** (P3 · CMS)
Pause the QA affiliate in CMS.
Expect: Paused tab; the dashboard says so.

### P4-07 · Security and tenant isolation

**P4-07-001 · Another store can't show this store's product** (P1 · SF)
Open `STORE2_URL/products/PROD_NEW`, `STORE2_URL/products/PRODUCT_A` and
`STORE2_URL/c/<CAT_NEW path>`.
Expect: 404 on Demo Sanitary for all three (Home Orbit's products never show there).

**P4-07-002 · Search on another store** (P1 · SF)
On STORE2 search `QA_TAG` and `QA_TAG-HOOK-1`.
Expect: no results.

**P4-07-003 · Another shopper's order** (P1 · SF)
Log in as QA_EMAIL_2 (ask me for its code). Open `STORE_URL/account/orders/ORDER_1`.
Expect: 404 or "not found", never ORDER_1's details. Log out.

**P4-07-004 · Logged-out order and invoice addresses** (P1 · SF)
Logged out, open `/account/orders/ORDER_1` and the invoice link you saw in Phase 3 (if it had an
address of its own).
Expect: login asked; no invoice shown.

**P4-07-005 · Admin API needs a staff session** (P1 · SF)
Logged out of the CMS in a fresh tab [or using fetch with `credentials: 'omit'`]:
`fetch('http://localhost:3000/api/orders?limit=1', {credentials:'omit'}).then(r => r.status)` and the
same for `/api/customers`, `/api/enquiries` (if the browser blocks the cross-origin call, open
each address in a fresh tab while signed out of the CMS instead).
Expect: 401/403 or an empty result, never documents.

**P4-07-006 · CMS role limits** (P2 · CMS) [HUMAN sign-in]
Optional: if a Catalog editor test account exists (e.g. `editor@homeorbit.example` from the VC-28
suite), ask me to sign in with it in another profile.
Expect: Catalog and Media only; Sales, Payments and Staff not in the menu, and opening
`ADMIN_URL/collections/orders` directly is refused. Otherwise Not Run (human).

**P4-07-007 · Connector secrets never reach the browser** (P1 · CMS)
In CMS open Store → Payments and WhatsApp and SMS. Nothing is connected in this database, so
check the empty forms: the secret fields are password-type or write-only. If any keys are saved,
search the page source and network responses for their values (they should show only as "Saved ·
hidden").
Expect: no secret value anywhere in HTML, JSON or the console; key IDs may show masked.

**P4-07-008 · Store pages don't leak staff data** (P2 · SF)
On STORE home and PROD_NEW, search the HTML for `@` email addresses and for words like
`lastEditedBy`, `createdBy`, `password`, `token`.
Expect: only the store's public contact email(s); no staff names or emails, no tokens.

### P4-08 · Clean-up (do every step; put each result in the report)

**P4-08-001 · Scheme and coupon** (P1 · CMS→SF)
End SCHEME_1 now (End now). Pause COUPON_1 (delete it if the screen allows deleting an unused one;
it has uses, so pause).
Expect: PROD_NEW shows no offer; COUPON_1 refused in the cart.

**P4-08-002 · Open QA orders** (P1 · CMS)
Every QA order not Delivered, Cancelled or Refunded: cancel it with reason `QA_TAG test order`.
Expect: none left in To pack, Packed or Shipped with QA_TAG Tester. (Orders and invoices stay as
records; list them for accounts.)

**P4-08-003 · Product, category, page, menu, dealer, redirect, media** (P1 · CMS→SF)
Archive PROD_NEW; hide `CAT_NEW` (Show on store off) and delete it if empty and allowed; unpublish
and delete PAGE_NEW; remove any QA menu items; delete the QA dealer and the QA redirect; delete
`QA_TAG manual.pdf` and QA photos only if "where used" is empty.
Expect: each 404 on STORE; nothing QA in menus or footer.

**P4-08-003b · Store's own offers untouched** (P1 · CMS)
Expect: Diwali 2026 still Live, Winter launch still Scheduled, HOME200 still Active (this run
must not have changed them).

**P4-08-004 · Reviews, enquiries, affiliate, customers** (P2 · CMS)
Leave the rejected reviews (they're hidden). Close all QA enquiries. Reject or pause the QA
affiliate. Don't delete customer accounts (that's a privacy request flow; tell me if you think one
should be removed).

**P4-08-005 · Settings back to how they were** (P1 · CMS)
Compare every setting in Phase 2's "Settings changed and restored" list with the CMS now.
Expect: all original values; maintenance mode off; announcement bar as before.

**P4-08-006 · Store is clean** (P1 · SF)
On STORE: search `QA_TAG` and `qa-e2e`; open `/c`, `/offers`, `/dealers?near=PIN_HOME`,
`/downloads`; read `/sitemap.xml`.
Expect: no QA item anywhere. In CMS: Products search `QA_TAG` shows only Archived items.

**P4-08-007 · Final console and speed check** (P2 · SF)
Reload home, `/c/CATEGORY_A` and PRODUCT_A at Phone width once more.
Expect: no console errors, no 4xx/5xx, timings similar to Phase 1's P1-09-004.

---

## Run prompt for this phase

"Run Phase 4 of this script: every case in Part C, in order, using the values in Part A and
VALUES_IN from Phases 2 and 3. Follow Part B's rules; ask me for login codes and links. Do every
clean-up step. Report in the Part B format and list every record left behind on purpose (orders,
invoices, credit notes, rejected reviews, closed enquiries, customer accounts)."
