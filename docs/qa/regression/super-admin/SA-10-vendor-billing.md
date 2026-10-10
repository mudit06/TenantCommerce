# SA-10 Vendor billing

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Super Admin |
| Purpose | Plan and price with GST, starting offer, record payment, change plan, pause, resume, cancel, history. |
| Runs as | Super admin |
| Start at | `http://localhost:3000/admin/collections/tenants/<id> → Billing` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `sa-vendor-billing` (docs/screens) |
| Depends on | SA-05 |
| Test cases | 6 (1 in the smoke run) |

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

### SA-10-001 · Billing: Plan and offer

| Field | Value |
|---|---|
| Module | SA-10 · Vendor billing |
| Test case ID | SA-10-001 |
| Scenario and objective | Billing shows the plan, price and starting offer. |
| Preconditions | On Home Orbit → Billing |
| Test data | — |
| Role | Super admin |
| Priority | High |
| Type | UI/UX |

**Steps**

1. Read the tab
2. Verify the expected result below before going on.

**Expected result:** Starter at ₹3,499 + GST, the ₹9,999 starting offer, and the cards Record payment, Change plan, Pause or cancel.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-10-002 · Billing: Record payment

| Field | Value |
|---|---|
| Module | SA-10 · Vendor billing |
| Test case ID | SA-10-002 |
| Scenario and objective | Recording a payment moves the paid period and adds history. |
| Preconditions | On Billing |
| Test data | Amount ₹9,999, method and reference |
| Role | Super admin |
| Priority | Critical |
| Type | Functional, Data persistence |

**Steps**

1. Press Record payment
2. Enter ₹9,999 with a reference
3. Save
4. Reload
5. Verify the expected result below before going on.

**Expected result:** The paid period moves ahead (first payment covers the offer's 3 months) and the payment shows in History after reload.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-10-003 · Billing: Invalid amount

| Field | Value |
|---|---|
| Module | SA-10 · Vendor billing |
| Test case ID | SA-10-003 |
| Scenario and objective | A zero or negative payment is refused. |
| Preconditions | On Billing |
| Test data | Amount 0, then -100 |
| Role | Super admin |
| Priority | High |
| Type | Validation, Boundary |

**Steps**

1. Record payment with 0
2. Then with -100
3. Verify the expected result below before going on.

**Expected result:** Both refused with a message; nothing is added to History.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-10-004 · Billing: Change plan

| Field | Value |
|---|---|
| Module | SA-10 · Vendor billing |
| Test case ID | SA-10-004 |
| Scenario and objective | Changing the plan updates limits. |
| Preconditions | On Billing |
| Test data | Plan Enterprise |
| Role | Super admin |
| Priority | High |
| Type | Integration |

**Steps**

1. Press Change plan, pick Enterprise, confirm
2. Open Overview → Plan usage
3. Verify the expected result below before going on.

**Expected result:** The plan reads Enterprise; product limit 10,000; the vendor list shows the new plan.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-10-005 · Billing: Pause and resume

| Field | Value |
|---|---|
| Module | SA-10 · Vendor billing |
| Test case ID | SA-10-005 |
| Scenario and objective | Pausing and resuming the subscription changes its status. |
| Preconditions | On Billing |
| Test data | Reason "QA pause" |
| Role | Super admin |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Press Pause with a reason
2. Read the status
3. Press Resume
4. Verify the expected result below before going on.

**Expected result:** Status shows Paused then Active; History records both.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-10-006 · Billing: Cancel

| Field | Value |
|---|---|
| Module | SA-10 · Vendor billing |
| Test case ID | SA-10-006 |
| Scenario and objective | Cancelling the subscription asks for confirmation. |
| Preconditions | A throw-away store (Test Locks) |
| Test data | Reason "QA cancel" |
| Role | Super admin |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Press Cancel subscription
2. Confirm with a reason
3. Verify the expected result below before going on.

**Expected result:** Status Cancelled with the end date; Subscriptions lists it under Cancelled.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** Do not cancel Home Orbit.
