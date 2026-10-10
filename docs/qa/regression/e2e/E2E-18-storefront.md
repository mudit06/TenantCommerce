# E2E-18 Storefront chrome and search (shop experience)

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | End-to-End |
| Purpose | Header, phone bottom navigation, footer, instant search and listing tools behave as the wireframes. |
| Runs as | Shopper |
| Start at | `http://home-orbit.localhost:3000` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `st-home`, `st-search`, `st-category`, `st-filters` (docs/screens) |
| Depends on | VC-03, VC-21 |
| Test cases | 6 (3 in the smoke run) |

## Before you start

- Store selling
- A desktop window and a phone-size window

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

### E2E-18-001 · Header: Desktop header icons and menu

| Field | Value |
|---|---|
| Module | E2E-18 · Storefront chrome and search (shop experience) |
| Test case ID | E2E-18-001 |
| Scenario and objective | The desktop header has the menu, search and icons and never overflows. |
| Preconditions | Store selling; wishlist on |
| Test data | Widths 1280 and 1024 |
| Role | Shopper |
| Priority | High |
| Type | UI/UX |

**Steps**

1. Open http://home-orbit.localhost:3000 at 1280 px
2. Read the header
3. Narrow to 1024 px
4. Verify the expected result below before going on.

**Expected result:** Menu items on one line, search box, account, wishlist with count and cart with count; at 1024 the search becomes an icon and nothing overlaps.

**Actual result:** At 1280 px: menu on one line, search box, account, wishlist and cart icons; at 1024 px the search became an icon and the menu no longer overlapped.

**Status:** Pass (Claude (in-app browser), 2026-10-10)

**Execution notes / defect:** Found and fixed in the same session (search box covered "About us" at 1024 px).

### E2E-18-002 · Phone: Bottom navigation

| Field | Value |
|---|---|
| Module | E2E-18 · Storefront chrome and search (shop experience) |
| Test case ID | E2E-18-002 |
| Scenario and objective | The phone bottom bar shows the right tabs and hides on pages with their own bar. |
| Preconditions | Phone size (375 px) |
| Test data | — |
| Role | Shopper |
| Priority | High |
| Type | UI/UX |

**Steps**

1. Read the bottom bar on the home page
2. Tap Shop
3. Open a product, the cart and checkout
4. Verify the expected result below before going on.

**Expected result:** Home, Shop, Dealers, Account, Cart; Shop opens /c with all categories; on product, cart and checkout the page's sticky button replaces the bar.

**Actual result:** Phone: bottom bar Home, Shop, Dealers, Account, Cart; Shop opened /c; on a product page the sticky "₹1,049 Add to cart" bar replaced it.

**Status:** Pass (Claude (in-app browser), 2026-10-10)

**Execution notes / defect:** —

### E2E-18-003 · Footer: Footer columns and legal line

| Field | Value |
|---|---|
| Module | E2E-18 · Storefront chrome and search (shop experience) |
| Test case ID | E2E-18-003 |
| Scenario and objective | The footer matches the wireframe and the store's features. |
| Preconditions | Store selling; contact and grievance officer saved (VC-03) |
| Test data | — |
| Role | Shopper |
| Priority | High |
| Type | UI/UX |

**Steps**

1. Scroll to the footer
2. Verify the expected result below before going on.

**Expected result:** Logo, contact, Get our offers first; Shop with Offers; Help with Track order, published policies, Contact us; Company with Find a dealer and Downloads; legal name, GSTIN, grievance officer and ways to pay.

**Actual result:** Footer: Get our offers first, Shop (with Offers), Help (Track order, Contact us), Company (About us, Contact us, Find a dealer, Downloads), legal line with name and GSTIN, COD chip.

**Status:** Pass (Claude (in-app browser), 2026-10-10)

**Execution notes / defect:** QA data has placeholder business details and no grievance officer or published policies, so those lines were not shown.

### E2E-18-004 · Search: Instant search with typos and recent searches

| Field | Value |
|---|---|
| Module | E2E-18 · Storefront chrome and search (shop experience) |
| Test case ID | E2E-18-004 |
| Scenario and objective | Suggestions rank model numbers first and forgive typos. |
| Preconditions | Store with Home Orbit's catalogue |
| Test data | "610"; "hogdh610"; "glas handel" |
| Role | Shopper |
| Priority | High |
| Type | Functional |

**Steps**

1. Type each in the header search
2. Use arrow keys and Enter
3. Clear the box and focus it
4. Verify the expected result below before going on.

**Expected result:** HOGDH-610 first for the first two; glass door handles for the typo; Enter opens the choice; Recent searches list earlier terms.

**Actual result:** "610" and "hogdh610" → HOGDH-610 first; "key" → key hangers and the Key hangers category; "glas handel" → glass door handles (after the swapped-letter fix).

**Status:** Pass (Claude (in-app browser), 2026-10-10)

**Execution notes / defect:** Arrow keys and Recent searches were not exercised.

### E2E-18-005 · Listing: Filter sheet on phones

| Field | Value |
|---|---|
| Module | E2E-18 · Storefront chrome and search (shop experience) |
| Test case ID | E2E-18-005 |
| Scenario and objective | The phone filter sheet works and reports the count. |
| Preconditions | Phone size; store selling |
| Test data | Price 500–1000 |
| Role | Shopper |
| Priority | Medium |
| Type | UI/UX |

**Steps**

1. Open a category
2. Tap Filter
3. Enter the price and Go
4. Tap Show N products
5. Verify the expected result below before going on.

**Expected result:** A sheet over a dimmed page with Close and Clear; the count matches the list; Filter (1) after closing.

**Actual result:** Filter sheet opened over the page with Close, Price, Clear and "Show 50 products"; price 500–1000 gave 21 products, Price low to high cheapest first.

**Status:** Pass (Claude (in-app browser), 2026-10-10)

**Execution notes / defect:** —

### E2E-18-006 · Cart: Move to wishlist and Complete the look

| Field | Value |
|---|---|
| Module | E2E-18 · Storefront chrome and search (shop experience) |
| Test case ID | E2E-18-006 |
| Scenario and objective | Cart extras work. |
| Preconditions | Two items in the cart; wishlist on |
| Test data | — |
| Role | Shopper |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Press Move to wishlist on one line
2. Read Complete the look
3. Add one suggestion
4. Verify the expected result below before going on.

**Expected result:** The line leaves the cart and the heart count goes up; suggestions come from the same categories and Add to cart adds one.

**Actual result:** Move to wishlist removed the door stopper from the cart and the heart read "1 saved"; Complete the look listed 4 products with Add to cart.

**Status:** Pass (Claude (in-app browser), 2026-10-10)

**Execution notes / defect:** —
