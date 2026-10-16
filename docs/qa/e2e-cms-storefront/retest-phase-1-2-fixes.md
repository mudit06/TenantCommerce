# Retest · fixes from the Phase 1 and Phase 2 runs (Claude in Chrome)

**What this does:** checks every defect reported by the Phase 1 (15 Oct) and Phase 2 runs of the
CMS ↔ storefront suite against the fixed code, then runs a short regression sweep so nothing that
passed before broke. One conversation, about 60 minutes. It reuses the QA records Phase 2 made
(`QA-E2E-1015 …`) and makes a few new ones that start with **QA_TAG** below.

**Before you start (the human):**

1. Code: the `TenantCommerce` checkout on branch `claude/adoring-cori-we1zlg`, at or after the
   commit "Settings and Menus open in a store session…". Stop any other `pnpm dev` or `pnpm start`.
2. Start the QA app with the **development server**, not a production build (Phase 1 ran on a
   build: that is why it saw `https://` and `s-maxage=60`):

   ```bash
   DATABASE_URI="mongodb://localhost:27017/tenantecom_qa?replicaSet=rs0&directConnection=true" pnpm dev:fresh
   ```

3. Wait until http://home-orbit.localhost:3000 answers. Don't reseed: the expected values below
   come from the database as Phase 2 left it.
4. Paste this whole file into a new Claude in Chrome conversation, then send the run prompt at the
   end.

---

## Part A. Test values

```
ADMIN_URL    = http://localhost:3000/admin
STORE_URL    = http://home-orbit.localhost:3000          # Home Orbit, live
STORE2_URL   = http://demo-sanitary.localhost:3000       # another store (isolation)
OWNER_LOGIN  = owner@homeorbit.example                   # the human signs in; no password in this file
QA_TAG       = QA-E2E-1016                               # every NEW record this run makes starts with it
QA_TAG_OLD   = QA-E2E-1015                               # Phase 2's records, reused (don't rename them)
HOME_ORBIT_ID   = 6ac9509cf6f03ebf7e5b49bc               # Home Orbit's store id (cookie checks)
DEMO_CLOTHING_ID= 6ac9507d2d58ac1fb369ffbe               # first store in the platform's list
PIN_HOME     = 411045
PIN_OTHER    = 110001
PIN_BAD      = 12345
PRODUCT_A    = feather-stainless-steel-pull-handle-hoph-504   # HOPH-504, 15 variants ₹2,049–₹2,749, MRP ₹2,459, live Diwali scheme 10% off
PRODUCT_B    = square-base-oval-stainless-steel-towel-ring   # STR-001-A, ₹2,249, no variants, no scheme
CATEGORY_A   = /c/door-hardware/pull-handles
PROD_NEW     = qa-e2e-robe-hook-v2                       # QA-E2E-1015 Robe Hook, model QA-E2E-1015-HOOK-1
                                                         # product price ₹1,499, MRP ₹1,999, Buy online
                                                         # variants: Chrome ₹1,299 stock 10 · Matte black ₹1,699 stock 0
CAT_NEW      = /c/bathroom-accessories/qa-e2e-1015-robe-and-towel-hooks
PAGE_NEW     = /pages/qa-e2e-test-page                   # published
REDIRECT_OLD = /qa-e2e-old-address                       # → /pages/qa-e2e-test-page
DEALER_OLD   = QA-E2E-1015 Dealer                        # hidden, pincode 411045
PDF          = /api/media/file/hoph-504-installation-guide.pdf
```

## Part B. Rules for Claude in Chrome

You are a QA tester re-checking fixes in a multi-tenant e-commerce app on the tester's own computer
(local QA database, `pnpm dev`). Work with two tabs: **"CMS"** on ADMIN_URL and **"STORE"** on
STORE_URL.

1. **Stay local.** Only open `http://localhost:3000` and `http://*.localhost:3000`. For wa.me,
   Google Maps and other outside links, **read the address, don't open it**.
2. **Test data.** Create or change only records whose name, code or title starts with QA_TAG or
   QA_TAG_OLD, plus the store settings a case names. Write a setting's **old value** before
   changing it and put it back in the same case. Never bulk-change other records.
3. **Sign-in comes from me.** When a case needs the CMS, ask me to sign in in tab "CMS" and wait
   for "done". Some cases need a **platform admin "Manage store" session** for Home Orbit; ask me
   for that by name. Never type a password yourself unless I paste one for this local account.
4. **Permission.** For this run you may fill and submit forms, save, publish and delete QA_TAG
   and QA_TAG_OLD records on localhost, send one quote request, and set the `payload-tenant`
   cookie from the console where a case says so. Anything else: ask.
5. **Waiting.** This is a development server: **the first visit to a page compiles it and can
   take up to 60 seconds**. Wait for a visible condition (a heading, a field, a message), not a
   fixed delay. Retry once before calling something a failure.
6. **Cache timing.** After a CMS **Save** or **Publish**, reload STORE once and record what you
   see on that **first reload**. If it's not there, reload at 30 s, 60 s and 120 s and record when
   it appeared. Only after 60 s = **Fail (High, stale cache)**.
7. **Every page you open:** no red console errors (ignore Next.js dev overlay and HMR lines), no
   4xx/5xx in network except where a case expects one, no horizontal scroll
   (`document.documentElement.scrollWidth <= window.innerWidth`), no broken images
   (`[...document.images].filter(i => i.complete && i.naturalWidth === 0).length === 0`).
8. **Phone width.** "Phone" = 390×844. If resizing the window doesn't take, open the page in a
   same-origin iframe of that size (`<iframe src=… width=390 height=844>` injected on a STORE
   page) and test inside it. Key presses must reach the iframe's document.
9. **[HUMAN]** steps need something you can't do (an OS setting, a file upload, a drag you can't
   perform). Ask me or mark them **Not Run (human)**.
10. **Status per case:** Pass, Fail, Blocked (say which precondition), Not Applicable (say why),
    Not Run (human). On a Fail write the URL, what you did, expected, what you saw (exact text),
    any console or network error, and severity (Critical, High, Medium, Low).
11. **Don't guess.** If the screen differs from a case because of how the store is set up, say
    what you see; Pass only if the behaviour is right.

**Stop the run at once** and send the report so far if the app is down (3 pages in a row fail
after the 60-second wait and one retry), if you changed something that doesn't start with QA_TAG
or QA_TAG_OLD, or if you can't put a store setting back.

**Checkpoint** after each group (R1, R2, …): `Checkpoint R<n>: N pass, N fail, N blocked`.

### Report to send back (exactly this format, in one message)

```
# Retest Phase 1–2 fixes · <date> <time>
Store: <STORE_URL> · Admin: <ADMIN_URL> · QA_TAG: <tag>
Signed in as: <roles used> · Viewports used: <list>

## Summary
Total N · Pass N · Fail N · Blocked N · Not Applicable N · Not Run (human) N

## Results
| ID | Fixes | Status | Actual (one line; timings for cache checks) |
|---|---|---|---|

## Defects
### F<n> · <title> · <severity> · <case ID>
- URL:
- Steps:
- Expected:
- Actual (exact text, console or network error):

## Settings changed and restored
<setting: old → test value → restored? yes/no>

## Records created
<list, each starting with QA_TAG>

## Notes
```

---

## Part C. Test cases

### R1 · Storefront without signing in

**R1-01 · Admin isn't served on the store's domain** (fixes P1 D1)
Open `STORE_URL/admin` in a new tab.
Expect: you end up on `http://localhost:3000/admin…` (redirect, 307). No sign-in form is ever
shown on `home-orbit.localhost`.

**R1-02 · Installation PDF downloads** (fixes P1 D2)
Fetch `STORE_URL` + PDF (`fetch(url).then(r => [r.status, r.headers.get('content-type')])`). Then
open PRODUCT_A's "Downloads" link and `/downloads`'s Download link (read their `href`, fetch them).
Expect: 200 and `application/pdf` for all three; they are the same file.

**R1-03 · Sitemap and robots.txt** (fixes P1 D10, P2 L1)
Open `/sitemap.xml` and `/robots.txt`.
Expect: every `<loc>` starts with `http://home-orbit.localhost:3000/` (not https); the sitemap
lists `/pages/about-us`, `/pages/privacy` and PAGE_NEW, and no draft pages (`/pages/shipping`,
`/pages/terms`…); it still lists PROD_NEW and CAT_NEW; robots' `Sitemap:` line is the http
address. The sitemap's `Cache-Control` is `public, max-age=0, must-revalidate`.

**R1-04 · Search suggestion prices match the product page** (fixes P1 D7)
In the header search type `HOPH-504`, then `QA-E2E-1015-HOOK-1`.
Expect: HOPH-504's suggestion shows **From ₹1,844.10**, the same as PRODUCT_A's page price; the
robe hook shows **From ₹1,299**. Record the suggestion response time.

**R1-05 · Cards show the lowest finish price** (fixes P2 D1, P2 L6)
Open CAT_NEW, CATEGORY_A, `/c/bathroom-accessories` and the home page.
Expect:
- The robe hook's card: **From ₹1,299**, MRP ₹1,999 struck through, **35% off**, "2 options", no
  offer badge.
- PRODUCT_A's card: **From ₹1,844.10**, MRP ₹2,459 struck through, 25% off, "Diwali offer"
  badge, "15 options" (same price as before, now with "From").
- PRODUCT_B's card (no variants): **₹2,249 with no "From"**.
- Price sort low→high on `/c/bathroom-accessories` places the robe hook by ₹1,299 (the cards
  before it cost ₹1,299 or less, the ones after ₹1,299 or more), not by ₹1,499.
- The price filter 1,200–1,350 on `/c/bathroom-accessories` includes the robe hook; 1,450–1,550
  doesn't.

**R1-06 · JSON-LD price** (fixes P2 D1)
On PROD_NEW and PRODUCT_A read `script[type="application/ld+json"]`.
Expect: PROD_NEW `offers.price` = `"1299.00"`, PRODUCT_A `"1844.10"` (unchanged), `InStock`, INR,
one `<h1>` on each.

**R1-07 · WhatsApp and quote carry the chosen finish** (fixes P1 D6)
On PRODUCT_A pick Size **10 inch** and Finish **Rose gold**.
Expect:
- The "Ask on WhatsApp" link's `text=` reads `…about Feather stainless steel pull handle HOPH-504
  (HOPH-504), Size: 10 inch, Finish: Rose gold. http://home-orbit.localhost:3000/products/…`.
  Change the finish to Black matt: the link follows.
- The "Request a bulk quote" form shows **"For Size: 10 inch, Finish: Black matt"** and its hidden
  `options` input holds `Options: Size: 10 inch, Finish: Black matt`.
- The consent checkbox is **not** ticked when the page loads (`checked === false`).
- Submit the quote once: name `QA_TAG Quote`, phone 9876543210, quantity 25, tick consent. Then in
  CMS → Enquiries open it: the enquiry shows the product and model number, and its message starts
  with **Options: Size: 10 inch, Finish: Black matt**.

**R1-08 · Phone menu closes** (fixes P1 D8)
At Phone width on the home page open the menu (☰).
Expect: a **Close** button at the top of the panel closes it. Open it again and press **Escape**:
it closes and the focus is back on the menu button. Open it, tap "Door hardware" → a link inside →
the new page loads with the menu **closed**. In the menu's search box, type `hoph` so suggestions
show, press Escape once (suggestions close, menu stays), press Escape again (menu closes).
On CATEGORY_A at Phone width open **Filter**, press Escape → the sheet closes. Open **Sort**,
press Escape → it closes. At 1440×900 nothing changes (no Close button in the desktop header).

**R1-09 · Invalid pincode** (fixes P1 D9)
On PRODUCT_A check PIN_OTHER (Delhi, ₹149), then change the box to PIN_BAD.
Expect: the Delhi answer disappears as soon as you type; **Check stays enabled** with 5 digits;
pressing it shows "Enter a 6-digit pincode." PIN_HOME then shows free delivery and COD.

**R1-10 · Empty listing message** (fixes P2 L2)
Open `CAT_NEW?finish=gold` (or tick a filter value no product has).
Expect: "No products match these filters. Clear filters", and Clear filters works. (The empty
category case is in R3-04.)

### R2 · CMS as the store owner

Ask me to sign in to tab "CMS" as OWNER_LOGIN.

**R2-01 · Settings open directly and from the menu** (fixes P1 D11, P2 S1)
Open `ADMIN_URL/collections/site-settings` directly. Then reload it 3 times. Then click
Store → Settings in the side menu.
Expect: each time the URL settles on `…/collections/site-settings/<id>` within 60 s and the form
shows Home Orbit's settings (store name "Home Orbit", contact phone +91 98765 00000). The URL
doesn't keep changing (watch it for 10 s), the page isn't blank.

**R2-02 · Menus open directly and from the menu** (fixes P2 S2)
Same as R2-01 for `ADMIN_URL/collections/navigation` and Content → Menus.
Expect: the Menus editor with Home Orbit's header and footer items.

**R2-03 · Announcement bar round trip** (was Blocked: P2-01-001)
In Settings write down the announcement bar's values. Tick Show, text `QA_TAG notice`, link
`/offers`, Save.
Expect on STORE on the **first reload**: the bar with that text and link on home, CATEGORY_A,
PRODUCT_A and `/cart`. Change to `QA_TAG notice 2`, Save → first reload shows it. **Restore the
old values**, Save → the store is as before.

**R2-04 · Contact phone round trip** (was Blocked: P2-01-002)
Change Contact → phone to `+91 98765 43210`, Save.
Expect: top line, footer and `/contact` all show it on the first reload. **Restore
+91 98765 00000**, Save, check all three again.

**R2-05 · Footer and header menu items** (was Blocked: P2-04-006, P2-04-007)
In Menus add a footer link `QA_TAG link` → PAGE_NEW, Save → it shows in the footer on every page
(first reload) and opens PAGE_NEW. Add a header item `QA_TAG Menu` with one dropdown column linking
to CAT_NEW and PROD_NEW, Save → desktop dropdown and Phone menu both show it; note any wrap at
1024 px. **Remove both**, Save → gone in both.

**R2-06 · A variant price change reaches every place on the first reload** (fixes P2 D1, checks P2 C1)
Open PROD_NEW in the editor → Finishes → Chrome: price ₹1,299 → **₹1,199**. Save and note the time.
Expect on the **first reload** of each: PROD_NEW page ₹1,199 (40% off ₹1,999), the card in CAT_NEW
"From ₹1,199", the search suggestion "From ₹1,199", JSON-LD `"1199.00"`, the card's Quick add /
Add to cart price. Record the reload number and seconds for each. **Restore ₹1,299**, Save, check
the card again.

**R2-07 · A page edit reaches the store on the first reload** (checks P2 C1)
Edit PAGE_NEW's rich text to `QA_TAG body v3`, Publish. Reload STORE PAGE_NEW once.
Expect: v3 on the first reload. Response headers: write down `cache-control`. Put the previous text
back and Publish.

**R2-08 · Redirect loops are refused** (fixes P2 L4)
Content → Redirects → Create: from `/pages/qa-e2e-test-page` to REDIRECT_OLD. Save.
Expect: refused with "/qa-e2e-old-address already redirects back to /pages/qa-e2e-test-page, so
shoppers would go round in a circle…". Then try from `/qa-e2e-1016-same` to `/qa-e2e-1016-same`:
refused, "The new address must be different from the old one". Then create from
`/qa-e2e-1016-old` to PAGE_NEW: saved; `STORE_URL/qa-e2e-1016-old` lands on PAGE_NEW. Delete it.
REDIRECT_OLD still lands on PAGE_NEW.

**R2-09 · Dealer "Fill from the pincode"** (fixes P2 L3)
Open DEALER_OLD. Click **Fill from the pincode** (pincode 411045).
Expect: a green message "Pin placed at the pincode…" and the pin on Baner, Pune. Change the
pincode to `12345` and click again → "Enter a 6-digit pincode first". **Don't save** (leave the
page without saving, or put 411045 back and discard).

**R2-10 · Live preview tablet size** (fixes P2 L8)
Open PAGE_NEW in the page editor → live preview → Tablet.
Expect: the preview frame is **768** px wide (1024 high); Phone 390, Desktop 1440. The preview is
on the store's domain with a token.

### R3 · CMS as platform admin in a "Manage store" session

Ask me to sign out of the owner account and sign in as platform admin, then start **Manage store**
for Home Orbit (the run before used this session and saw the blank screens).

**R3-01 · Settings and Menus open in the session** (fixes P1 D11, P2 S1, S2)
Repeat R2-01 and R2-02.
Expect: Home Orbit's settings and menus (not Demo Clothing's or Demo Sanitary's), no loop, no blank
page. In the console `document.cookie` contains `payload-tenant=` + HOME_ORBIT_ID.

**R3-02 · A stale store cookie can't break it** (fixes P2 S1, S2)
In the CMS console run
`document.cookie = 'payload-tenant=' + 'DEMO_CLOTHING_ID' + '; Path=/'` (use the value from
Part A), then open `ADMIN_URL/collections/site-settings` directly. Then do the same and open
`ADMIN_URL/collections/navigation`.
Expect: Home Orbit's settings and menus open as in R3-01, no loop. Within a few seconds
`document.cookie` shows `payload-tenant=` + HOME_ORBIT_ID again. Then delete the cookie
(`document.cookie = 'payload-tenant=; Path=/; Max-Age=0'`), open Settings again → same result.

**R3-03 · Products, Pages and the dashboard still work in the session** (regression)
Open the dashboard, Products, Pages, Schemes, Dealers.
Expect: they render as before; Products shows Active 110 + the QA products; the banner "You are
managing Home Orbit as platform admin" shows on every page.

**R3-04 · Empty category message** (fixes P2 L2)
Catalog → Categories: create `QA_TAG Empty hooks` under Bathroom accessories, Show on store on,
Save. Open it on STORE.
Expect: status 200 and "**No products here yet.** See all categories" (no "match these
filters"); the link opens `/c`. Then untick Show on store, Save (leave it hidden).

**R3-05 · End the session** (regression)
End the Manage store session from the banner.
Expect: back in the platform panel; `payload-tenant` cookie cleared; the platform's Vendors list
works.

### R4 · Regression sweep (storefront)

**R4-01 · Buying still works** (regression)
PRODUCT_A: pick 8 inch Antique, qty 1, Add to cart → "Added to your cart", cart count +1; `/cart`
shows ₹1,844.10 with MRP ₹2,459. Remove the line. PROD_NEW: Matte black shows ₹1,699 and Out of
stock with Add to cart disabled; Chrome ₹1,299 buyable. The card "Add to cart"/"Choose options" on
CAT_NEW opens the picker; Escape closes it; cart count unchanged.

**R4-02 · Layout at phone and desktop** (regression)
At 390×844 and 1440×900 open home, CATEGORY_A, PRODUCT_A, PROD_NEW, `/search?q=hook`, PAGE_NEW.
Expect: no horizontal scroll, no broken images, no console errors; the sticky Add to cart bar on
phones; the "From" prices fit on the cards at 390 without wrapping into the button.

**R4-03 · Other store untouched** (regression)
Open STORE2_URL home and a product.
Expect: its own look and products, no Home Orbit content; its sitemap uses
`http://demo-sanitary.localhost:3000/`.

**R4-04 · Store data still to fill in (not code)** (P1 D3, D4, D5)
Read CMS Settings → Legal and Policies (don't change them).
Expect / record only: grievance officer empty, legal name "(legal name to be confirmed)", four
policies in draft, label address "Registered address to be confirmed". These are the store's
content, not app defects: mark **Not Applicable (store data)** and list what's missing.

**R4-05 · Phase 2 human steps** (P2-03-010, P2-03-012)
[HUMAN] Ask me to: swap PROD_NEW's two photos by dragging, Save; and upload a small PDF named
`QA_TAG manual.pdf` as a document with "Show on the Downloads page". Then check the card and gallery
lead with the new first photo, and the PDF is listed on PROD_NEW and `/downloads` and downloads
with 200. Swap the photos back. If I say skip: Not Run (human).

---

## Run prompt

"Run this retest: every case in Part C, in order, using the values in Part A. Follow Part B's
rules. Restore every setting and price in the case that changed it. Ask me when you need a sign-in
or a human step. Report in the Part B format."
