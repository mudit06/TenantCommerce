# SA-13 Subscriptions

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Super Admin |
| Purpose | MRR, on trial, past due, renewing in 7 days, status tabs, record payment, CSV export. |
| Runs as | Super admin |
| Start at | `http://localhost:3000/admin/collections/subscriptions` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `sa-subscriptions` (docs/screens) |
| Depends on | SA-10 |
| Test cases | 4 (1 in the smoke run) |

## Before you start

- Signed in as super admin

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

### SA-13-001 · Subscriptions: Figures and tabs

| Field | Value |
|---|---|
| Module | SA-13 · Subscriptions |
| Test case ID | SA-13-001 |
| Scenario and objective | Subscriptions shows the money figures and status tabs. |
| Preconditions | Signed in as super admin |
| Test data | — |
| Role | Super admin |
| Priority | High |
| Type | UI/UX |

**Steps**

1. Open Billing → Subscriptions
2. Verify the expected result below before going on.

**Expected result:** MRR, On trial, Past due and Renewing in 7 days; tabs by status with counts; a row per vendor with plan, billing, period end, next amount incl. GST and last payment.

**Actual result:** MRR ₹6,999, On trial 2, Past due 0, Renewing in 7 days 0; tabs All 3, Trialing 2, Active 1; amounts incl. GST ₹11,798.82 (₹9,999 offer) and ₹8,258.82.

**Status:** Pass (Claude (Claude in Chrome), 2026-10-10)

**Execution notes / defect:** —

### SA-13-002 · Subscriptions: Record payment on past due

| Field | Value |
|---|---|
| Module | SA-13 · Subscriptions |
| Test case ID | SA-13-002 |
| Scenario and objective | A past-due row offers Record payment. |
| Preconditions | A past-due subscription (period end in the past) |
| Test data | — |
| Role | Super admin |
| Priority | Medium |
| Type | Integration |

**Steps**

1. Open the Past due tab
2. Press Record payment on a row
3. Verify the expected result below before going on.

**Expected result:** The vendor's Billing card opens ready to record the payment.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-13-003 · Subscriptions: Export CSV

| Field | Value |
|---|---|
| Module | SA-13 · Subscriptions |
| Test case ID | SA-13-003 |
| Scenario and objective | Export downloads the tab shown. |
| Preconditions | On Subscriptions |
| Test data | — |
| Role | Super admin |
| Priority | Low |
| Type | Functional |

**Steps**

1. Pick a tab
2. Press Export CSV
3. Verify the expected result below before going on.

**Expected result:** A CSV with the rows of that tab.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-13-004 · Subscriptions: MRR follows payments

| Field | Value |
|---|---|
| Module | SA-13 · Subscriptions |
| Test case ID | SA-13-004 |
| Scenario and objective | Recording a payment updates the figures. |
| Preconditions | A trial or past-due subscription |
| Test data | Record a payment (SA-10) |
| Role | Super admin |
| Priority | Medium |
| Type | Integration |

**Steps**

1. Note MRR and Past due
2. Record a payment on Billing
3. Reload Subscriptions
4. Verify the expected result below before going on.

**Expected result:** The subscription moves to Active and the figures change accordingly.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
