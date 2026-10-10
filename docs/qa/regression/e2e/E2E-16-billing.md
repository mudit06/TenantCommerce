# E2E-16 Billing to subscriptions

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | End-to-End |
| Purpose | Payments recorded on a vendor change subscriptions and the dashboard money figures. |
| Runs as | Super admin |
| Start at | `http://localhost:3000/admin` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `sa-vendor-billing`, `sa-subscriptions` (docs/screens) |
| Depends on | SA-10, SA-13 |
| Test cases | 1 (0 in the smoke run) |

## Before you start

- Super admin signed in

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

### E2E-16-001 · Billing: Payment updates subscriptions and MRR

| Field | Value |
|---|---|
| Module | E2E-16 · Billing to subscriptions |
| Test case ID | E2E-16-001 |
| Scenario and objective | Recording a vendor payment changes the platform money views. |
| Preconditions | A trial or past-due vendor |
| Test data | ₹9,999 |
| Role | Super admin |
| Priority | High |
| Type | Integration |

**Steps**

1. Super admin: note Subscriptions and dashboard figures
2. Record a payment on the vendor's Billing
3. Reload Subscriptions and the dashboard
4. Verify the expected result below before going on.

**Expected result:** The subscription is Active with the new period; Past due and MRR change accordingly.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
