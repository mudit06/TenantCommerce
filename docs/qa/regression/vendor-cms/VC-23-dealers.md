# VC-23 Dealers

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Vendor CMS |
| Purpose | Dealer list with Shown switch and map, dealer form with pin and pincode fill. |
| Runs as | Store owner |
| Start at | `http://localhost:3000/admin/collections/dealers` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `cms-dealers` (docs/screens) |
| Depends on | — |
| Test cases | 4 (0 in the smoke run) |

## Before you start

- Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit)
- Dealer locator feature on

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

### VC-23-001 · List: List and map

| Field | Value |
|---|---|
| Module | VC-23 · Dealers |
| Test case ID | VC-23-001 |
| Scenario and objective | Dealers show with a Shown switch beside a map. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit); dealers exist |
| Test data | — |
| Role | Store owner |
| Priority | High |
| Type | UI/UX |

**Steps**

1. Open Store → Dealers
2. Click a dealer
3. Verify the expected result below before going on.

**Expected result:** Rows with name (phone partly hidden), type, city, pincode and Shown; the pin turns red and the address and position show under the map.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-23-002 · Create: Add dealer with pincode fill

| Field | Value |
|---|---|
| Module | VC-23 · Dealers |
| Test case ID | VC-23-002 |
| Scenario and objective | A new dealer can be placed from its pincode. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Name, city Pune, pincode 411045, phone |
| Role | Store owner |
| Priority | High |
| Type | Functional |

**Steps**

1. Press Add dealer
2. Fill the fields
3. Press Fill from the pincode
4. Drag the pin
5. Save
6. Verify the expected result below before going on.

**Expected result:** The pin lands near the pincode (or the store's other dealers there); the dragged position is saved; the dashboard Dealers step turns Done.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-23-003 · Create: Required fields and pincode format

| Field | Value |
|---|---|
| Module | VC-23 · Dealers |
| Test case ID | VC-23-003 |
| Scenario and objective | Name and a 6-digit pincode are required. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Pincode 12345 |
| Role | Store owner |
| Priority | Medium |
| Type | Validation |

**Steps**

1. Save with an empty name and a 5-digit pincode
2. Verify the expected result below before going on.

**Expected result:** Both refused with messages.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-23-004 · Shown: Hide a dealer

| Field | Value |
|---|---|
| Module | VC-23 · Dealers |
| Test case ID | VC-23-004 |
| Scenario and objective | Shown off removes the dealer from the map and the store. |
| Preconditions | A shown dealer |
| Test data | — |
| Role | Store owner |
| Priority | High |
| Type | Integration |

**Steps**

1. Switch Shown off
2. Open http://home-orbit.localhost:3000/dealers
3. Verify the expected result below before going on.

**Expected result:** The dealer leaves the map and the store's dealer locator.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
