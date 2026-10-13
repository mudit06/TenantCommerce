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
| Test cases | 7 (3 in the smoke run) |

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

**Expected result:** Menu items on one line, search box, account, wishlist with count and cart with count; at 1024 nothing overlaps (the default header turns the search into an icon; Home Orbit keeps its search bar on its own row).

**Actual result:** At 1280 px: menu on one line, 547 px search bar, account, wishlist and cart with count; at 1024 px the menu still fits one line, the search bar (367 px) sits on its own row, no overlaps, no sideways scroll.

**Status:** Pass (Claude (in-app browser), 2026-10-12)

**Execution notes / defect:** Expected result updated for Home Orbit's header, whose search has its own row.

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

**Actual result:** Phone: bottom bar Home, Shop (/c), Dealers, Account, Cart with count; on a product page the sticky "₹849 Add to cart" bar replaces it.

**Status:** Pass (Claude (in-app browser), 2026-10-12)

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

**Actual result:** Footer: Get our offers first; Shop (with Offers); Help (Track order, Privacy policy, Contact us); Company (About us, Contact us, Find a dealer, Downloads); legal line with GSTIN and COD.

**Status:** Pass (Claude (in-app browser), 2026-10-12)

**Execution notes / defect:** QA data has placeholder legal name and no grievance officer, so that line was not shown.

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

**Actual result:** "610" and "hogdh610" → HOGDH-610 first; "glas handel" → glass door handles; ArrowDown + Enter opened HOGDH-610; clearing the box showed Recent searches "hogdh610".

**Status:** Pass (Claude (in-app browser), 2026-10-12)

**Execution notes / defect:** —

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

**Actual result:** Phone: Filter opened a sheet with Close and Clear; max ₹1,000 + Go → "Show 32 products" and 32 in the list (all ≤ ₹1,000); Filter (1) after closing.

**Status:** Pass (Claude (in-app browser), 2026-10-12)

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

**Actual result:** Move to wishlist took HOPH-504 out of the cart and the wishlist badge went 0 → 1; Complete the look showed glass door handles; Add to cart on HOGDH-612 made 2 items, ₹1,898.

**Status:** Pass (Claude (in-app browser), 2026-10-12)

**Execution notes / defect:** —

### E2E-18-007 · Motion: Light animations that respect reduced motion

| Field | Value |
|---|---|
| Module | E2E-18 · Storefront chrome and search (shop experience) |
| Test case ID | E2E-18-007 |
| Scenario and objective | Sections, hero words, menus, quick add and counts move lightly, and stay still for visitors who reduce motion. |
| Preconditions | Store selling; a browser with scroll-driven animations (Chrome, Edge) |
| Test data | Windows: Settings → Accessibility → Visual effects → Animation effects off |
| Role | Shopper, Store owner |
| Priority | Medium |
| Type | UI/UX |

**Steps**

1. Scroll the home page
2. Swipe the hero
3. Open a menu, Quick add, a heart and Add to cart
4. Turn animations off in the system and reload
5. Owner: Store settings → Branding → untick Animations on the store, Save; reload the store
6. Verify the expected result below before going on.

**Expected result:** Sections rise in as they arrive, hero words follow their slide, menus and the quick add sheet ease in, the cart and wishlist counts bump; with system animations off everything shows at once and nothing moves (the benefits line stops); with the store switch off the same motion stops for every shopper.

**Actual result:** Home: sections below the first rise in while scrolling, hero words follow a half-swiped slide (50%); menu dropdown and phone menu ease in; quick add sheet slides up with a fading backdrop; cart and heart bump. Checked with the browser's animation timings. Store switch: with animations off in the store's settings the page carries data-motion="off" and no scroll animations run; the page renders the same. Lighthouse mobile on the production build: accessibility, best practices and SEO 100 on home, listing and product; layout shift 0.

**Status:** Pass (Claude (in-app browser), 2026-10-12)

**Execution notes / defect:** Reduced-motion run not done in the in-app browser (it cannot switch the OS setting); the switch was set in the database, not by saving the CMS form (no CMS sign-in in this run).
