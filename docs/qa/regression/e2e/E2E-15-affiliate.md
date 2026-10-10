# E2E-15 Affiliate referral to commission

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | End-to-End |
| Purpose | A referral is tracked to a commission without exposing the shopper. |
| Runs as | Affiliate, shopper, store owner |
| Start at | `http://home-orbit.localhost:3000` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `st-affiliate`, `cms-affiliates` (docs/screens) |
| Depends on | VC-18 |
| Test cases | 1 (0 in the smoke run) |

## Before you start

- Enterprise plan with Affiliate program on

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

### E2E-15-001 · Affiliate: Referral to approved commission

| Field | Value |
|---|---|
| Module | E2E-15 · Affiliate referral to commission |
| Test case ID | E2E-15-001 |
| Scenario and objective | An affiliate link credits the order without exposing the shopper. |
| Preconditions | Approved affiliate |
| Test data | /r/<CODE>?to=/products/<slug> |
| Role | Affiliate, Shopper, Store owner |
| Priority | Medium |
| Type | Integration |

**Steps**

1. Open the link in another browser; place a COD order
2. Affiliate: /affiliate/dashboard
3. Owner: deliver the order; wait the hold days or run the job
4. Verify the expected result below before going on.

**Expected result:** Dashboard shows the order "Pending: not delivered yet" without shopper details; after delivery and hold it becomes approved; cancelling reverses it.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
