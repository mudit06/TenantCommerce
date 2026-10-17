# Retest · fixes from the retest and the Phase 3 and Phase 4 runs (Claude in Chrome)

**What this does:** checks the fixes made after the 17 Oct runs (the Phase 1–2 retest, Phase 3
"selling and orders", Phase 4 "accounts, security, clean-up") that need a CMS sign-in or a shopper
login, then a short regression sweep. The guest-storefront fixes already passed in Claude Code's
built-in browser (see the note in R2). One conversation, about 35 minutes. It brings the Phase 2 QA product back for the run, makes a
few records starting with **QA_TAG**, and puts everything back at the end.

**Before you start (the human):**

1. Code: the `TenantCommerce` checkout on branch `claude/adoring-cori-we1zlg` with the uncommitted
   fixes in it (`src/storefront/shop/reach.ts` exists). The dev server reloads them; a restart is
   only needed if it was started before those files changed and shows old behaviour.
2. The QA app runs with the **development server** on the QA database:

   ```bash
   DATABASE_URI="mongodb://localhost:27017/tenantecom_qa?replicaSet=rs0&directConnection=true" pnpm dev:fresh
   ```

3. Sign in to the CMS yourself in the Chrome window (platform admin, then **Manage store** on
   Home Orbit with any reason). Keep the terminal running `pnpm dev` visible: shopper login
   codes are printed there (`[dev-log email]`), and Claude will ask you for them.
4. Paste this whole file into a new Claude in Chrome conversation, then send the run prompt at the
   end.

---

## Part A. Test values

```
ADMIN_URL       = http://localhost:3000/admin
STORE_URL       = http://home-orbit.localhost:3000
QA_TAG          = QA-E2E-1017                          # every NEW record this run makes starts with it
HOME_ORBIT_ID   = 6ac9509cf6f03ebf7e5b49bc             # Home Orbit's store id
DEMO_CLOTHING_ID= 6ac9507d2d58ac1fb369ffbe             # another store (the stale-cookie test)
SHOPPER         = rahul.k@example.com                  # store login by email code (ask the human for it)
PIN_HOME        = 411045                               # Maharashtra: ₹99 delivery, free above ₹999
PIN_OTHER       = 110001                               # Delhi: ₹149 delivery, free above ₹1,999
PIN_BAD         = 12345
PROD_NEW        = qa-e2e-robe-hook-v2                  # "QA-E2E-1015 Robe Hook", now ARCHIVED (R0 brings it back)
                                                       # product price ₹1,499 · Chrome ₹1,299 stock 8 · Matte black ₹1,699 stock 0
CAT_NEW         = QA-E2E-1015 Robe and towel hooks     # now hidden (R0 shows it)
PRODUCT_CHEAP   = double-soap-dish-shelf               # ₹249, under the ₹299 cash-on-delivery minimum
PRODUCT_A       = feather-stainless-steel-pull-handle-hoph-504   # HOPH-504, many finishes
SCHEME_UPCOMING = Winter launch                        # scheduled, starts 24 Oct
COD             = on · minimum ₹299 · fee ₹49 · Razorpay NOT connected (cash on delivery is the only payment)
```

## Part B. Rules for Claude in Chrome

You are a QA tester re-checking fixes in a multi-tenant e-commerce app on the tester's own computer
(local QA database, `pnpm dev`). Use two tabs: **"CMS"** on ADMIN_URL and **"STORE"** on STORE_URL.

1. **Stay local.** Only open `http://localhost:3000` and `http://*.localhost:3000`.
2. **Never type passwords, two-step codes or login codes you invented.** The human signs in to the
   CMS. For the store login code, stop and ask the human: "Please read me the login code for
   SHOPPER from the terminal."
3. **Don't place orders** in this run. Checkout checks stop before "Place order" unless a case says
   to press it (only with an empty form, which places nothing).
4. **Put back what you change** (listed per case, and again in R9). Never delete records you
   didn't create.
5. The dev server compiles pages on first visit (up to 30 s). Wait and reload once before calling
   something a failure. Storefront pages can lag a CMS change by up to 60 s: reload at +10 s, +30 s
   and +60 s before failing a freshness check.
6. Run JavaScript only to read the page (cookies, `fetch` for status codes, element text), never to
   click or fill instead of the real controls, unless a case says so.
7. Status values: **Pass**, **Fail**, **Blocked** (a step before it failed), **Not Run (human)**.
   For every Fail give the URL, steps, expected, actual and any console error.
8. If a confirmation dialog in the CMS stops responding, ask the human to close it.

---

## Part C. Cases

### R0 · Set up (CMS, Manage store session on Home Orbit)

**R0-01 Bring the QA product back for this run.**
1. Products → open PROD_NEW (search "QA-E2E-1015 Robe"). Set Status to **Active**, Save.
2. Categories → open CAT_NEW, tick "Show on store", Save.
3. STORE: open `/products/qa-e2e-robe-hook-v2`.
- Expected: the page loads (200) with Chrome ₹1,299 and Matte black out of stock.
- Restore in R9: archive the product, hide the category.

### R1 · CMS fixes

**R1-01 Menus: "Add Column" no longer crashes (retest F2, R2-05).**
1. CMS → Menus. In the header menu, add an item labelled `QA-E2E-1017 Menu`, then inside it click
   **Add Column** twice, and in the first column click "Add Link".
2. Watch the "Header menu" outline card above the editor.
- Expected: no "This page couldn't load", no console `TypeError … map is not a function`. The outline
  shows `QA-E2E-1017 Menu` with "Dropdown, 2 columns".
3. Leave without saving (reload, accept "leave without saving"). Confirm the item isn't on the store.

**R1-02 Attribute sets: a new set opens cleanly (same fix).**
1. Catalog → Attribute sets → Create new.
- Expected: the page renders the empty table ("New attribute set") with no error. Click "Add
  Attribute" once and see a row appear in the table. Leave without saving.

**R1-03 Store cookie follows the session (retest F3, R3-02).**
1. In the CMS tab run: `document.cookie = 'payload-tenant=DEMO_CLOTHING_ID; path=/'` (with the
   real id from Part A).
2. Open Settings (store settings), wait for it to load, then reload once.
3. Read `document.cookie`.
- Expected: `payload-tenant` equals HOME_ORBIT_ID, and Settings shows Home Orbit's values (phone
  +91 98765 00000).
4. Delete the cookie (`document.cookie = 'payload-tenant=; path=/; max-age=0'`), open Menus, wait,
   read the cookie again.
- Expected: HOME_ORBIT_ID again (never Demo Clothing's).
5. Open Redirects → Create new.
- Expected: no "Assigned Tenant" dialog listing several stores; the new redirect is for Home Orbit.
  Leave without saving.

**R1-04 Settings explain the announcement bar (retest F1, R2-03).**
1. Settings → Announcement bar section.
- Expected: a hint says a live offer's own announcement shows instead while the offer runs. (The
  store's top line showing the Diwali text while Diwali is live is correct, not a defect.)

**R1-05 Scheme preview uses the finish price (Phase 3 D1, P3-03-006).**
1. Schemes → new scheme from any occasion. Name `QA-E2E-1017 Scheme`, 10% off, covers products:
   PROD_NEW only. Don't make it live. Open the Preview panel.
- Expected: the card shows **₹1,169.10** (10% off the Chrome finish's ₹1,299), not ₹1,349.10.
2. Leave it as a draft (R9 deletes it, or ends it if delete isn't offered).

**R1-06 Pincode tester: invalid pincode (Phase 3 D6, P3-01-001).**
1. Shipping → "Test a pincode": check PIN_OTHER, see the Delhi result.
2. Replace it with PIN_BAD (5 digits) and press Check.
- Expected: the Check button is enabled; the error "Enter a 6-digit pincode that doesn't start with
  0." shows and the Delhi result is gone. Typing in the box also clears an old result.

### R2 · Cart and checkout (STORE, guest first)

**R2-01 "Items (n)" counts only items that can be bought (Phase 3 D8, P3-02-008).**
1. STORE: empty the cart. Add PROD_NEW Chrome ×1 and PRODUCT_A (any finish) ×1. Open `/cart`.
2. CMS: set PROD_NEW's Chrome variant stock to 0, Save. STORE: reload `/cart` (+10 s, +30 s, +60 s).
- Expected: the robe hook line says out of stock; the price details read **Items (1)**, not (2).
3. CMS: set Chrome stock back to **8**, Save. STORE: remove the robe hook line.

**Already passed, skip:** R2-02 (Add to cart always answers, including the "couldn't reach the
store" message when the request fails), R2-03 (cash on delivery only: "Place order" disabled and
the honest message; ₹498 cart offers COD at "Place order · ₹547.00"), R2-04 (one name message),
R2-05 (unknown tracking code 404) and R2-06 ("Winter launch" named under Coming up) were run in
Claude Code's built-in browser on 17 Oct and passed. Report them as "Pass (built-in browser)".

### R3 · Signed-in shopper (STORE)

**R3-01 Sign in.** Log in as SHOPPER (ask the human for the code). Expected: "Hi Rahul".

**R3-02 Saved address picker and city (Phase 4 D1, P4-01-004; Phase 3 D2, P3-04-003).**
1. Account → Addresses: add `QA-E2E-1017 Home` (default), line 1 `1 QA Lane`, city Pune, PIN_HOME,
   Maharashtra; and `QA-E2E-1017 Office`, line 1 `2 QA Road`, city New Delhi, PIN_OTHER, Delhi,
   with GSTIN `07AAPFU0939F1ZX` and business name `QA-E2E-1017 Traders`.
2. Add PRODUCT_A to the cart and open `/checkout`.
- Expected: a **Deliver to** list shows both addresses, the default first with "(default)"; the
  Home address is filled in.
3. Choose the Office address.
- Expected: Pincode 110001, City New Delhi, State Delhi, the GSTIN box ticked with the GSTIN and
  business name, and the delivery fee changes to Delhi's (₹149 or free above ₹1,999).
4. Choose Home again, then type PIN_OTHER into Pincode yourself.
- Expected: State becomes Delhi and **City is cleared** (it was Pune, filled for the other pincode).
  In this QA database the pincode directory is empty, so the city is not filled in automatically:
  an empty City here is a Pass. Type a city, change the pincode again: your typed city stays.
- Don't place the order.

**R3-03 Wishlist item saved without a finish (Phase 4 D2, P4-02-004).**
1. On the category page of PROD_NEW (or search "QA-E2E-1015 Robe"), heart the product from its
   card (if the heart opens "Choose options", close it without choosing; if it saves, fine).
   Also heart PRODUCT_A from its product page after choosing a finish.
2. Open `/wishlist`.
- Expected: an item saved without a finish shows "Finish or size not chosen yet" and a **Choose a
  finish** button that opens the product page, not "Move to cart". The item saved with a finish
  shows its finish and "Move to cart", which adds it to the cart.
3. Remove both from the wishlist.

### R4 · Regression sweep (quick, Pass/Fail each)

1. Home, a category page, PRODUCT_A, `/search?q=handle`: load with no console errors and no
   horizontal scroll at the current width.
2. Cart: quantity + and − update totals; coupon box: a wrong code shows "This code isn't valid in
   this store."
3. Checkout as guest (log out first): PIN_HOME fills State Maharashtra, delivery ₹99 below ₹999.
4. CMS: Dashboard, Products, Orders, Settings and Menus open inside the Manage store session.

### R9 · Put everything back

- Delete the `QA-E2E-1017 Scheme` (or end it).
- Account: remove both `QA-E2E-1017` addresses; empty the wishlist and the cart; log out.
- PROD_NEW: Chrome stock **8**, Status **Archived**. CAT_NEW: untick "Show on store".
- Menus and attribute sets: confirm nothing `QA-E2E-1017` was saved.
- CMS cookie: leave as the app set it.

---

## Part D. Report format

```
# Retest Phase 3–4 fixes · <date time IST>
Store: … · Admin: … · QA_TAG: QA-E2E-1017 · Signed in as: … · Viewport: …

## Summary
Total · Pass · Fail · Blocked · Not Run (human)

## Results
| ID | Fix | Status | Actual |

## Defects
### <ID> · <title> · <severity>
URL · Steps · Expected · Actual · Console

## Put back
<each item in R9: done yes/no>
```

## Run prompt

> Run Part C of this file in order (R0, R1, R2-01, R3, R4, R9; skip the cases marked already passed) following Part B, using the values in Part A. Ask me
> when you need the store login code or when the CMS asks to sign in. Send the report in the
> Part D format at the end.
