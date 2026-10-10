# E2E-04 Order to cash (COD)

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | End-to-End |
| Purpose | A guest buys with COD; the store packs, ships and delivers; the platform sees the sale. |
| Runs as | Shopper, store owner, super admin |
| Start at | `http://home-orbit.localhost:3000` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `st-cart`, `st-checkout`, `cms-order`, `sa-dashboard` (docs/screens) |
| Depends on | VC-10, VC-24, VC-25 |
| Test cases | 7 (2 in the smoke run) |

## Before you start

- Store selling
- COD on with rules (VC-25)
- Shipping zones (VC-24)

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

### E2E-04-001 · Checkout: Guest COD order

| Field | Value |
|---|---|
| Module | E2E-04 · Order to cash (COD) |
| Test case ID | E2E-04-001 |
| Scenario and objective | A guest places a COD order. |
| Preconditions | Store selling; COD on; zones set |
| Test data | Rahul Kulkarni, 98765 43210, rahul.k@example.com, 411045, Flat 12 Shanti Kunj, Baner Road |
| Role | Shopper |
| Priority | Critical |
| Type | Integration |

**Steps**

1. Open http://home-orbit.localhost:3000/products/feather-stainless-steel-pull-handle-hoph-504
2. Check delivery for 411045
3. Add to cart
4. Cart → Checkout
5. Fill contact and address (state fills from the pincode)
6. Choose Cash on delivery
7. Place order
8. Verify the expected result below before going on.

**Expected result:** "Thank you, Rahul. Your order is placed." with the order number (HOM-…), amount to pay in cash, delivery date and items; the cart is empty again.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### E2E-04-002 · Checkout: Server recomputes totals

| Field | Value |
|---|---|
| Module | E2E-04 · Order to cash (COD) |
| Test case ID | E2E-04-002 |
| Scenario and objective | Totals cannot be changed from the browser. |
| Preconditions | An item in the cart |
| Test data | Change a price in the page with DevTools before placing |
| Role | Shopper |
| Priority | Critical |
| Type | Security/Permissions |

**Steps**

1. Edit the shown total in DevTools
2. Place the order
3. Verify the expected result below before going on.

**Expected result:** The order uses the server's price; the edited number has no effect.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### E2E-04-003 · Checkout: Confirmation page is private

| Field | Value |
|---|---|
| Module | E2E-04 · Order to cash (COD) |
| Test case ID | E2E-04-003 |
| Scenario and objective | Only the browser that placed the order sees the confirmation. |
| Preconditions | E2E-04-001 done |
| Test data | The confirmation address |
| Role | Shopper |
| Priority | High |
| Type | Security/Permissions |

**Steps**

1. Open the confirmation address in another browser
2. Verify the expected result below before going on.

**Expected result:** "We can't show this order here".

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### E2E-04-004 · Fulfilment: CMS sees, packs, ships, delivers

| Field | Value |
|---|---|
| Module | E2E-04 · Order to cash (COD) |
| Test case ID | E2E-04-004 |
| Scenario and objective | The order flows through the CMS and messages. |
| Preconditions | E2E-04-001 done |
| Test data | Tracking 12345 |
| Role | Store owner |
| Priority | Critical |
| Type | Integration |

**Steps**

1. Owner: Sales → Orders → open the order
2. Mark as packed
3. Save and tell the shopper it shipped
4. Out for delivery
5. Delivered
6. Read Messages to the shopper
7. Watch the terminal
8. Verify the expected result below before going on.

**Expected result:** Invoice issued at packing; order Completed, Paid, Delivered; messages queued then "Sent (dev log)" for each step.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### E2E-04-005 · Tracking: No-login tracking page

| Field | Value |
|---|---|
| Module | E2E-04 · Order to cash (COD) |
| Test case ID | E2E-04-005 |
| Scenario and objective | The tracking link shows progress without personal details. |
| Preconditions | Shipped order; link from the message |
| Test data | /t/<code> |
| Role | Shopper |
| Priority | High |
| Type | Security/Permissions |

**Steps**

1. Open the tracking link
2. Open a made-up code
3. Verify the expected result below before going on.

**Expected result:** Journey, courier and AWB, items and masked phone; no address or invoice. A made-up code: "We can't find this order".

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### E2E-04-006 · Platform: Sale reaches the platform dashboard

| Field | Value |
|---|---|
| Module | E2E-04 · Order to cash (COD) |
| Test case ID | E2E-04-006 |
| Scenario and objective | The super admin sees the order in figures. |
| Preconditions | E2E-04-001 done today |
| Test data | — |
| Role | Super admin |
| Priority | High |
| Type | Integration |

**Steps**

1. Super admin: open the dashboard
2. Open All vendors
3. Verify the expected result below before going on.

**Expected result:** Orders today counts it; GMV this month includes it once delivered/paid; Home Orbit's Orders in 30 days goes up.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### E2E-04-007 · Stock: Stock held and released

| Field | Value |
|---|---|
| Module | E2E-04 · Order to cash (COD) |
| Test case ID | E2E-04-007 |
| Scenario and objective | Stock is held at checkout and returned on cancel. |
| Preconditions | A variant with stock 2 |
| Test data | Order 2, then cancel |
| Role | Shopper, Store owner |
| Priority | High |
| Type | Boundary |

**Steps**

1. Order both pieces
2. Try to buy one more
3. Owner cancels the order
4. Try again
5. Verify the expected result below before going on.

**Expected result:** "Only 0 left"/Out of stock while held; buyable again after cancel.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
