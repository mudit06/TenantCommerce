# E2E-05 Schemes and coupons to checkout

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | End-to-End |
| Purpose | A scheme and a coupon change prices on the store and are applied once by the server. |
| Runs as | Store owner, then shopper |
| Start at | `http://localhost:3000/admin` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `cms-schemes`, `st-offers`, `st-cart` (docs/screens) |
| Depends on | VC-14, VC-15 |
| Test cases | 3 (1 in the smoke run) |

## Before you start

- Store selling
- Schemes and coupons features on

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

### E2E-05-001 · Scheme: Live scheme prices everywhere

| Field | Value |
|---|---|
| Module | E2E-05 · Schemes and coupons to checkout |
| Test case ID | E2E-05-001 |
| Scenario and objective | A live scheme shows the same price on card, product, cart and order. |
| Preconditions | Store selling |
| Test data | Diwali 2026, 10% off, max ₹1,500, whole store, live now |
| Role | Store owner, Shopper |
| Priority | Critical |
| Type | Integration |

**Steps**

1. Owner: create and schedule the scheme
2. Store: read a card, the product page, the cart, then place a COD order
3. Verify the expected result below before going on.

**Expected result:** The same offer price on card and product page; the cart shows the scheme line; the order's discount equals the cart's.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### E2E-05-002 · Coupon: Coupon on product page and cart

| Field | Value |
|---|---|
| Module | E2E-05 · Schemes and coupons to checkout |
| Test case ID | E2E-05-002 |
| Scenario and objective | A public coupon shows as an offer and applies once. |
| Preconditions | Coupons on |
| Test data | HOME200, ₹200 off above ₹1,000, public |
| Role | Store owner, Shopper |
| Priority | High |
| Type | Integration |

**Steps**

1. Owner: create HOME200
2. Store: open a product it covers
3. Read Offers for you
4. Copy the code; apply it in a ₹1,000+ cart
5. Verify the expected result below before going on.

**Expected result:** Offers for you lists HOME200 with Copy; the cart applies ₹200 once; a second code replaces the first (one coupon per order).

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### E2E-05-003 · Scheme: Upcoming scheme shown honestly

| Field | Value |
|---|---|
| Module | E2E-05 · Schemes and coupons to checkout |
| Test case ID | E2E-05-003 |
| Scenario and objective | A scheduled scheme shows its real start date. |
| Preconditions | A scheme starting next week with Show before start |
| Test data | — |
| Role | Shopper |
| Priority | Medium |
| Type | Integration |

**Steps**

1. Store: open a covered product
2. Open /offers
3. Verify the expected result below before going on.

**Expected result:** Offers for you says "from <real start date>"; /offers lists it as coming up; prices are not changed yet.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
