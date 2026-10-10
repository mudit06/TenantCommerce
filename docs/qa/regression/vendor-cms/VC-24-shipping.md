# VC-24 Shipping zones and Shiprocket

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Vendor CMS |
| Purpose | Zones table, pincode test, add, edit, delete zones, validation; Shiprocket card. |
| Runs as | Store owner |
| Start at | `http://localhost:3000/admin/shipping` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `cms-shipping` (docs/screens) |
| Depends on | — |
| Test cases | 6 (1 in the smoke run) |

## Before you start

- Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit); store selling: `pnpm demo:selling home-orbit` run

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

### VC-24-001 · Zones: Zones table

| Field | Value |
|---|---|
| Module | VC-24 · Shipping zones and Shiprocket |
| Test case ID | VC-24-001 |
| Scenario and objective | The zones table shows fees, COD and days. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit); store selling: `pnpm demo:selling home-orbit` run |
| Test data | — |
| Role | Store owner |
| Priority | High |
| Type | UI/UX |

**Steps**

1. Open Store → Shipping
2. Verify the expected result below before going on.

**Expected result:** Home state (1 state, Flat ₹99, free above ₹999, COD allowed, 2 to 3 days) and Rest of India (35 states, Flat ₹149).

**Actual result:** Home state 1 state Flat ₹99 free above ₹999 COD Allowed 2 to 3 days; Rest of India 35 states Flat ₹149 free above ₹1,999 3 to 6 days.

**Status:** Pass (Claude (Claude in Chrome), 2026-10-10)

**Execution notes / defect:** —

### VC-24-002 · Test: Test a pincode

| Field | Value |
|---|---|
| Module | VC-24 · Shipping zones and Shiprocket |
| Test case ID | VC-24-002 |
| Scenario and objective | The pincode test answers from the zones. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit); store selling: `pnpm demo:selling home-orbit` run |
| Test data | 411045; 110001; 12345 |
| Role | Store owner |
| Priority | High |
| Type | Functional, Validation |

**Steps**

1. Test 411045
2. Test 110001
3. Test 12345
4. Verify the expected result below before going on.

**Expected result:** 411045: Home state · Maharashtra, ₹99, free above ₹999, COD allowed, 2 to 3 days, "From your zones". 110001: Rest of India. 12345: "Enter a 6-digit pincode".

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-24-003 · Zones: Add a weight-based zone

| Field | Value |
|---|---|
| Module | VC-24 · Shipping zones and Shiprocket |
| Test case ID | VC-24-003 |
| Scenario and objective | A pincode zone with weight pricing saves and applies. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit); store selling: `pnpm demo:selling home-orbit` run |
| Test data | Remote areas, pincodes 744101, 1941; Weight; ₹299 up to 2 kg; ₹40/kg; 7–10 days; COD off |
| Role | Store owner |
| Priority | High |
| Type | Functional, Integration |

**Steps**

1. Press Add zone with these values
2. Test 744101
3. At checkout use 744101
4. Verify the expected result below before going on.

**Expected result:** Table shows "2 pincodes", "₹299 up to 2 kg, then ₹40 per kg", COD Not allowed; checkout offers no COD for 744101.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-24-004 · Zones: Validation

| Field | Value |
|---|---|
| Module | VC-24 · Shipping zones and Shiprocket |
| Test case ID | VC-24-004 |
| Scenario and objective | Empty coverage and reversed days are refused. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit); store selling: `pnpm demo:selling home-orbit` run |
| Test data | No states or pincodes; days 6 to 2 |
| Role | Store owner |
| Priority | High |
| Type | Validation |

**Steps**

1. Add a zone with no coverage
2. Add one with days 6 to 2
3. Verify the expected result below before going on.

**Expected result:** "Pick at least one state or pincode"; "The first number of days must not be more than the second".

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-24-005 · Zones: Delete zone

| Field | Value |
|---|---|
| Module | VC-24 · Shipping zones and Shiprocket |
| Test case ID | VC-24-005 |
| Scenario and objective | A zone can be deleted after confirmation. |
| Preconditions | Remote areas exists |
| Test data | — |
| Role | Store owner |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Pick Remote areas
2. Delete zone → Yes, delete
3. Verify the expected result below before going on.

**Expected result:** It is gone; 744101 is no longer deliverable (or falls back to another zone).

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-24-006 · Permissions: Order manager has no shipping

| Field | Value |
|---|---|
| Module | VC-24 · Shipping zones and Shiprocket |
| Test case ID | VC-24-006 |
| Scenario and objective | Order managers cannot open shipping. |
| Preconditions | Signed in as Order manager |
| Test data | http://localhost:3000/admin/shipping |
| Role | Order manager |
| Priority | Medium |
| Type | Security/Permissions |

**Steps**

1. Open the address
2. Verify the expected result below before going on.

**Expected result:** Says only owners and managers see it; not in the menu.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
