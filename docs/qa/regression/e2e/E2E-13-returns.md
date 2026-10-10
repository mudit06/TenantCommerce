# E2E-13 Returns and refunds

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | End-to-End |
| Purpose | A delivered order is returned, received and refunded with a credit note in reports. |
| Runs as | Shopper and store owner |
| Start at | `http://home-orbit.localhost:3000` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `st-order`, `cms-order`, `cms-reports` (docs/screens) |
| Depends on | VC-11, VC-29 |
| Test cases | 1 (0 in the smoke run) |

## Before you start

- A delivered order for a shopper account

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

### E2E-13-001 · Returns: Request, approve, receive, refund

| Field | Value |
|---|---|
| Module | E2E-13 · Returns and refunds |
| Test case ID | E2E-13-001 |
| Scenario and objective | A return runs from the shopper to a refund and the report. |
| Preconditions | A delivered order for a shopper account |
| Test data | Reason, note, a photo |
| Role | Shopper, Store owner |
| Priority | High |
| Type | Integration |

**Steps**

1. Shopper: order page → Request return
2. Owner: Orders → Returns → Approve with pickup note
3. Mark received; Refund
4. Insights → Reports
5. Verify the expected result below before going on.

**Expected result:** Shopper sees each state; the return reads Refunded; a credit note lowers the GST summary row.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
