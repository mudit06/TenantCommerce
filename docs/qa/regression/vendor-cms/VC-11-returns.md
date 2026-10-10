# VC-11 Returns

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Vendor CMS |
| Purpose | Return requests: approve with pickup note, reject with reason, receive, refund. |
| Runs as | Store owner |
| Start at | `http://localhost:3000/admin/collections/orders → Returns` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `cms-order` (docs/screens) |
| Depends on | VC-10 |
| Test cases | 4 (0 in the smoke run) |

## Before you start

- Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit); store selling: `pnpm demo:selling home-orbit` run
- A delivered order with a shopper account

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

### VC-11-001 · Returns: Return appears in the tab

| Field | Value |
|---|---|
| Module | VC-11 · Returns |
| Test case ID | VC-11-001 |
| Scenario and objective | A shopper's return request lists under Returns. |
| Preconditions | A delivered order with a return requested (E2E-14) |
| Test data | — |
| Role | Store owner |
| Priority | High |
| Type | Integration |

**Steps**

1. Open Orders → Returns tab
2. Open the order
3. Verify the expected result below before going on.

**Expected result:** The order is listed; the Returns card shows items, reason, note and photo.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-11-002 · Returns: Approve with pickup note

| Field | Value |
|---|---|
| Module | VC-11 · Returns |
| Test case ID | VC-11-002 |
| Scenario and objective | Approving shows the pickup note to the shopper. |
| Preconditions | A requested return |
| Test data | Pickup note "Courier will collect on Monday" |
| Role | Store owner |
| Priority | High |
| Type | Functional, Integration |

**Steps**

1. Press Approve with the note
2. Verify the expected result below before going on.

**Expected result:** Status Approved; the shopper's order page shows the note; a "Return approved" email is queued.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-11-003 · Returns: Receive and refund

| Field | Value |
|---|---|
| Module | VC-11 · Returns |
| Test case ID | VC-11-003 |
| Scenario and objective | Receiving then refunding completes the return. |
| Preconditions | An approved return |
| Test data | Refund the item amount |
| Role | Store owner |
| Priority | High |
| Type | Functional |

**Steps**

1. Press Mark received
2. Press Refund with the amount
3. Verify the expected result below before going on.

**Expected result:** The return reads Refunded; a credit note is added.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-11-004 · Returns: Reject needs a reason

| Field | Value |
|---|---|
| Module | VC-11 · Returns |
| Test case ID | VC-11-004 |
| Scenario and objective | Rejecting needs a reason shown to the shopper. |
| Preconditions | A requested return |
| Test data | Reason "Item used" |
| Role | Store owner |
| Priority | Medium |
| Type | Validation |

**Steps**

1. Press Reject without a reason
2. Then with the reason
3. Verify the expected result below before going on.

**Expected result:** Without a reason it is refused; with it the shopper sees why.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
