# VC-19 Reviews

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Vendor CMS |
| Purpose | To approve, approve with reply, reject with reason, settings. |
| Runs as | Store owner |
| Start at | `http://localhost:3000/admin/collections/reviews` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `cms-reviews` (docs/screens) |
| Depends on | VC-10 |
| Test cases | 5 (1 in the smoke run) |

## Before you start

- Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit); store selling: `pnpm demo:selling home-orbit` run
- Reviews feature on
- A review written on the store (E2E-06)

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

### VC-19-001 · Moderation: To approve

| Field | Value |
|---|---|
| Module | VC-19 · Reviews |
| Test case ID | VC-19-001 |
| Scenario and objective | A new review waits under To approve. |
| Preconditions | A review written on the store |
| Test data | — |
| Role | Store owner |
| Priority | High |
| Type | Integration |

**Steps**

1. Open Marketing → Reviews
2. Verify the expected result below before going on.

**Expected result:** Listed under To approve with "Verified purchase" and a low-rating note when 1–2 stars.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-19-002 · Moderation: Approve with reply

| Field | Value |
|---|---|
| Module | VC-19 · Reviews |
| Test case ID | VC-19-002 |
| Scenario and objective | Approving with a reply publishes it with the reply. |
| Preconditions | A review to approve |
| Test data | Reply "Thank you, we will send a new aerator" |
| Role | Store owner |
| Priority | Critical |
| Type | Integration |

**Steps**

1. Type the reply
2. Press Approve with reply
3. Open the product on the store
4. Verify the expected result below before going on.

**Expected result:** The product page shows the rating, bars and the review with the store's reply; cards show stars; the reply email prints in the terminal.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-19-003 · Moderation: Reject needs a reason

| Field | Value |
|---|---|
| Module | VC-19 · Reviews |
| Test case ID | VC-19-003 |
| Scenario and objective | Rejecting waits for a reason. |
| Preconditions | A review to approve |
| Test data | — |
| Role | Store owner |
| Priority | Medium |
| Type | Validation |

**Steps**

1. Press Reject with no reason
2. Verify the expected result below before going on.

**Expected result:** The button waits for a reason; with one it is rejected and never shown.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-19-004 · Settings: Publish straight away

| Field | Value |
|---|---|
| Module | VC-19 · Reviews |
| Test case ID | VC-19-004 |
| Scenario and objective | Unticking Hold publishes new reviews at once. |
| Preconditions | Reviews settings |
| Test data | Untick Hold new reviews for approval |
| Role | Store owner |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Untick it
2. Save settings
3. Write another review on the store
4. Verify the expected result below before going on.

**Expected result:** The next review is published at once.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-19-005 · Honesty: Store cannot edit a review

| Field | Value |
|---|---|
| Module | VC-19 · Reviews |
| Test case ID | VC-19-005 |
| Scenario and objective | The review text cannot be changed by the store. |
| Preconditions | A published review |
| Test data | — |
| Role | Store owner |
| Priority | High |
| Type | Security/Permissions |

**Steps**

1. Open the review
2. Try to change its text or stars
3. Verify the expected result below before going on.

**Expected result:** Text and stars are read-only; only the reply can be written.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
