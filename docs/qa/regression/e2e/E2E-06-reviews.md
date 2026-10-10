# E2E-06 Review lifecycle

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | End-to-End |
| Purpose | Only a delivered buyer can review; the store approves; the store shows it. |
| Runs as | Shopper and store owner |
| Start at | `http://home-orbit.localhost:3000` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `st-review`, `cms-reviews` (docs/screens) |
| Depends on | VC-19, VC-10 |
| Test cases | 2 (1 in the smoke run) |

## Before you start

- A delivered order for a shopper with an account

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

### E2E-06-001 · Reviews: Delivered buyer writes, store approves, store shows

| Field | Value |
|---|---|
| Module | E2E-06 · Review lifecycle |
| Test case ID | E2E-06-001 |
| Scenario and objective | The full review cycle. |
| Preconditions | A delivered order for shopper rahul.k@example.com with an account |
| Test data | 2 stars, title, text, a photo |
| Role | Shopper, Store owner |
| Priority | Critical |
| Type | Integration |

**Steps**

1. Shopper: My account → Write a review on the delivered order
2. Owner: Marketing → Reviews → Approve with reply
3. Store: open the product and a category
4. Verify the expected result below before going on.

**Expected result:** Product page shows the review with "Verified purchase" and the reply; cards show stars; the home page Reviews block shows it if 4+ stars only.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### E2E-06-002 · Reviews: Non-buyers cannot review

| Field | Value |
|---|---|
| Module | E2E-06 · Review lifecycle |
| Test case ID | E2E-06-002 |
| Scenario and objective | Only delivered items can be reviewed. |
| Preconditions | A shopper with no delivered order |
| Test data | — |
| Role | Shopper |
| Priority | High |
| Type | Security/Permissions |

**Steps**

1. Look for Write a review in My account
2. Open a review link for another order
3. Verify the expected result below before going on.

**Expected result:** No Write a review; foreign or expired links are refused.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
