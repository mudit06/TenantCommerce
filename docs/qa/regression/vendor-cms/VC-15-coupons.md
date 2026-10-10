# VC-15 Coupons

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Vendor CMS |
| Purpose | Coupon codes, rules, visibility, bulk codes. |
| Runs as | Store owner |
| Start at | `http://localhost:3000/admin/collections/coupons` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `cms-coupons` (docs/screens) |
| Depends on | VC-14 |
| Test cases | 7 (1 in the smoke run) |

## Before you start

- Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit); store selling: `pnpm demo:selling home-orbit` run
- Coupons feature on

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

### VC-15-001 · Create: New coupon

| Field | Value |
|---|---|
| Module | VC-15 · Coupons |
| Test case ID | VC-15-001 |
| Scenario and objective | A coupon saves with its rule. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit); store selling: `pnpm demo:selling home-orbit` run |
| Test data | HOME200, Amount off 200, Minimum order 1000, show at the cart and Offers page |
| Role | Store owner |
| Priority | High |
| Type | Functional |

**Steps**

1. Open Marketing → Coupons → + New coupon
2. Fill and Save
3. Verify the expected result below before going on.

**Expected result:** Listed as active and public.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-15-002 · Create: Duplicate code

| Field | Value |
|---|---|
| Module | VC-15 · Coupons |
| Test case ID | VC-15-002 |
| Scenario and objective | A code already used in the store is refused. |
| Preconditions | HOME200 exists |
| Test data | HOME200 again |
| Role | Store owner |
| Priority | High |
| Type | Validation |

**Steps**

1. Create another coupon HOME200
2. Verify the expected result below before going on.

**Expected result:** Refused as already used.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-15-003 · Cart: Invalid code in the cart

| Field | Value |
|---|---|
| Module | VC-15 · Coupons |
| Test case ID | VC-15-003 |
| Scenario and objective | An unknown code is refused with a reason. |
| Preconditions | Items in the cart |
| Test data | Code "nope" |
| Role | Shopper |
| Priority | High |
| Type | Negative |

**Steps**

1. Type nope in the cart coupon box
2. Apply
3. Verify the expected result below before going on.

**Expected result:** "This code isn't valid in this store."

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-15-004 · Cart: Minimum order

| Field | Value |
|---|---|
| Module | VC-15 · Coupons |
| Test case ID | VC-15-004 |
| Scenario and objective | Below the minimum the cart says how much more. |
| Preconditions | Cart below ₹1,000 |
| Test data | HOME200 |
| Role | Shopper |
| Priority | Critical |
| Type | Boundary, Integration |

**Steps**

1. Read the HOME200 card in the cart
2. Add items past ₹1,000
3. Apply
4. Verify the expected result below before going on.

**Expected result:** "Add ₹… more" until the cart passes ₹1,000; then it applies and the total drops by ₹200.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-15-005 · Cart: Scheme and coupon together

| Field | Value |
|---|---|
| Module | VC-15 · Coupons |
| Test case ID | VC-15-005 |
| Scenario and objective | When a scheme does not combine with coupons, the cart says which it kept. |
| Preconditions | Diwali live (not with coupons) |
| Test data | HOME200 |
| Role | Shopper |
| Priority | High |
| Type | Integration |

**Steps**

1. Apply HOME200 with the scheme live
2. Verify the expected result below before going on.

**Expected result:** The cart keeps the better offer and says why.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-15-006 · Bulk: Make bulk codes

| Field | Value |
|---|---|
| Module | VC-15 · Coupons |
| Test case ID | VC-15-006 |
| Scenario and objective | Bulk codes are created from a coupon. |
| Preconditions | HOME200 exists |
| Test data | Prefix WED, 5 codes |
| Role | Store owner |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Press Make bulk codes
2. Prefix WED, 5, based on HOME200
3. Verify the expected result below before going on.

**Expected result:** A CSV downloads (or arrives by email) and the list shows one "WED-••••••" row with "0 / 5".

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-15-007 · Usage: Usage limit

| Field | Value |
|---|---|
| Module | VC-15 · Coupons |
| Test case ID | VC-15-007 |
| Scenario and objective | A coupon past its usage limit stops working. |
| Preconditions | A coupon with usage limit 1, used once |
| Test data | — |
| Role | Store owner |
| Priority | Medium |
| Type | Boundary |

**Steps**

1. Apply it in a new cart
2. Verify the expected result below before going on.

**Expected result:** Refused as used up.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
