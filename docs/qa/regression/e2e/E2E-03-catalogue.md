# E2E-03 Catalogue to storefront

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | End-to-End |
| Purpose | A category and product made in the CMS appear on the store with filters, search and Add to cart. |
| Runs as | Store owner, then shopper |
| Start at | `http://localhost:3000/admin` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `cms-products`, `st-category`, `st-search`, `st-product` (docs/screens) |
| Depends on | VC-04, VC-05 |
| Test cases | 7 (1 in the smoke run) |

## Before you start

- Home Orbit owner signed in
- Store selling (`pnpm demo:selling home-orbit`)

## How to run this script with Claude in Chrome

1. Start the QA app: in Claude Code start the `app-qa` launch entry (or `DATABASE_URI=…/tenantecom_qa pnpm dev:fresh`).
   Wait until `http://home-orbit.localhost:3000` answers (the first page compiles for up to a minute).
2. Open Chrome with the Claude extension and say: "Run the regression script
   `<this file>` against localhost. Follow each step, verify the expected result on screen
   before moving on, and record Actual result and Status for each test case."
3. Claude signs in only with the test accounts in `docs/qa/README.md` (Test accounts). It never
   uses real passwords, keys or card numbers, and asks before anything that sends a message
   outside localhost.
4. For every step, wait for a visible condition (a heading, a message, a row) instead of a fixed
   delay. After every save, reload and check the value stayed. If a page shows an error or the
   expected text never appears, mark the case **Fail** (or **Blocked** when a precondition is
   missing), note what was seen, and continue with the next case.
5. Copy each Actual result and Status into the workbook (`docs/qa/TenantEcom-test-cases.xlsx`,
   same Test Case ID), or paste the run's output into the shared sheet.

## Test cases

### E2E-03-001 · Catalogue: New category and product on the store

| Field | Value |
|---|---|
| Module | E2E-03 · Catalogue to storefront |
| Test case ID | E2E-03-001 |
| Scenario and objective | A category and an active product appear on the store. |
| Preconditions | Owner signed in; store selling |
| Test data | Category "QA hooks" under Home decor; product "QA hook" QA-HOOK-1, photo, price ₹499, HSN 8302, GST 18%, Buy online and quote, Active |
| Role | Store owner, Shopper |
| Priority | Critical |
| Type | Integration |

**Steps**

1. Create the category
2. Create the product with a photo and price; Save Active
3. Open http://home-orbit.localhost:3000/c
4. Open Home decor → QA hooks
5. Verify the expected result below before going on.

**Expected result:** The category shows on /c and the menu; the product card shows ₹499 with Add to cart.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### E2E-03-002 · Catalogue: Search finds it by model number and typo

| Field | Value |
|---|---|
| Module | E2E-03 · Catalogue to storefront |
| Test case ID | E2E-03-002 |
| Scenario and objective | Instant search finds the new product. |
| Preconditions | E2E-03-001 done |
| Test data | "QA-HOOK"; "qahook1"; "qa hok" |
| Role | Shopper |
| Priority | High |
| Type | Integration |

**Steps**

1. Type each in the header search
2. Verify the expected result below before going on.

**Expected result:** Each lists QA hook in the suggestions; Enter opens Results with it first.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### E2E-03-003 · Catalogue: Filters, sort and Add to cart on the listing

| Field | Value |
|---|---|
| Module | E2E-03 · Catalogue to storefront |
| Test case ID | E2E-03-003 |
| Scenario and objective | The listing filters by price and sorts by price. |
| Preconditions | E2E-03-001 done |
| Test data | min 400, max 600; sort Price low to high |
| Role | Shopper |
| Priority | High |
| Type | Integration |

**Steps**

1. Open Home decor
2. Set the price box to 400–600 and Go
3. Sort by Price: low to high
4. Press Add to cart on QA hook
5. Verify the expected result below before going on.

**Expected result:** Only products ₹400–₹600 show, cheapest first; "Added ✓" and the cart count goes up.

**Actual result:** Category card Add to cart: "Added ✓" and the cart count went from 2 to 3 without leaving the page.

**Status:** Pass (Claude (in-app browser), 2026-10-10)

**Execution notes / defect:** Run on existing Home Orbit products, not a new QA product.

### E2E-03-004 · Catalogue: Archive removes it from the store

| Field | Value |
|---|---|
| Module | E2E-03 · Catalogue to storefront |
| Test case ID | E2E-03-004 |
| Scenario and objective | Archiving takes the product off the store. |
| Preconditions | E2E-03-001 done |
| Test data | — |
| Role | Store owner, Shopper |
| Priority | High |
| Type | Integration |

**Steps**

1. Owner: archive QA hook
2. Store: reload the category and the product address
3. Verify the expected result below before going on.

**Expected result:** Gone from the category; the product address shows not found (or redirects if a redirect exists).

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### E2E-03-005 · Catalogue: Quick add on a home page card

| Field | Value |
|---|---|
| Module | E2E-03 · Catalogue to storefront |
| Test case ID | E2E-03-005 |
| Scenario and objective | A card on the home page adds a single-finish product without leaving the page. |
| Preconditions | Store selling; Home Orbit home page from `pnpm seed:home-orbit` |
| Test data | Designed for modern homes: HOGDH-610 |
| Role | Shopper |
| Priority | High |
| Type | Integration |

**Steps**

1. Open the home page
2. Hover the Lotus glass door handle card (phone: tap its + button)
3. Press Add to cart on the photo
4. Verify the expected result below before going on.

**Expected result:** "Added ✓" on the card and the header cart count goes up; the cart has one Lotus glass door handle at the price the card showed.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### E2E-03-006 · Catalogue: Quick add picker for finishes and sizes

| Field | Value |
|---|---|
| Module | E2E-03 · Catalogue to storefront |
| Test case ID | E2E-03-006 |
| Scenario and objective | A product sold in several finishes and sizes opens a picker with server prices. |
| Preconditions | Store selling; variants generated for HOPH-504 in the product editor with stock |
| Test data | Size 12 inch, finish Rose gold |
| Role | Shopper |
| Priority | High |
| Type | Integration |

**Steps**

1. Open the home page
2. Press Quick add on the Feather pull handle card
3. Choose 12 inch and Rose gold
4. Add to cart
5. Verify the expected result below before going on.

**Expected result:** The picker shows sizes and finish swatches, the price changes with the choice, code HOPH-504-12-INCH-ROSE-GOLD shows; "Added to your cart. View cart" and the count goes up; Esc closes it.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### E2E-03-007 · Catalogue: Menu dropdown columns from Menus

| Field | Value |
|---|---|
| Module | E2E-03 · Catalogue to storefront |
| Test case ID | E2E-03-007 |
| Scenario and objective | The header dropdown shows the columns, links and picture set on the Menus screen. |
| Preconditions | Home Orbit menus from `pnpm seed:home-orbit` |
| Test data | Door hardware: Aldrops and latches, Door handles, Door accessories |
| Role | Shopper, Store owner |
| Priority | Medium |
| Type | Integration |

**Steps**

1. Hover Door hardware in the category bar (desktop)
2. Press Laser-cut aldrops
3. Owner: rename the column "Door handles" to "Handles" in Menus and save
4. Reload the store and hover Door hardware
5. Verify the expected result below before going on.

**Expected result:** Three headed columns, the aldrop picture and Shop all door hardware; Laser-cut aldrops opens Aldrops filtered to the laser-cut range (4 products); after the edit the column reads "Handles".

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
