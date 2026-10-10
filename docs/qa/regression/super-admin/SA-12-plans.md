# SA-12 Plans

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Super Admin |
| Purpose | Plan cards, features and connectors matrices, create and edit plans. |
| Runs as | Super admin |
| Start at | `http://localhost:3000/admin/collections/plans` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `sa-plans` (docs/screens) |
| Depends on | SA-01 |
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

### SA-12-001 · Plans: Plan cards

| Field | Value |
|---|---|
| Module | SA-12 · Plans |
| Test case ID | SA-12-001 |
| Scenario and objective | One card per plan with prices and limits. |
| Preconditions | Signed in as super admin |
| Test data | — |
| Role | Super admin |
| Priority | High |
| Type | UI/UX |

**Steps**

1. Open Billing → Plans
2. Verify the expected result below before going on.

**Expected result:** Starter ₹3,499 / month with the starting offer ₹9,999 for 3 months, 500 products, 3 staff, 5 GB, 1,000 orders a month, vendors on it; Enterprise ₹6,999 / month, 10,000 products.

**Actual result:** Starter ₹3,499/month plus GST, starting offer ₹9,999 for 3 months, 500 products, 3 staff, 5 GB, 1,000 orders; Enterprise ₹6,999, 10,000 products, 30 staff, 100 GB, no order limit.

**Status:** Pass (Claude (Claude in Chrome), 2026-10-10)

**Execution notes / defect:** —

### SA-12-002 · Plans: Matrices

| Field | Value |
|---|---|
| Module | SA-12 · Plans |
| Test case ID | SA-12-002 |
| Scenario and objective | Features and connectors allowed per plan. |
| Preconditions | On Plans |
| Test data | — |
| Role | Super admin |
| Priority | Medium |
| Type | UI/UX |

**Steps**

1. Read Features allowed and Connectors allowed
2. Verify the expected result below before going on.

**Expected result:** A row per feature or group with a tick per plan; Phase 2 rows marked P2.

**Actual result:** Features allowed table with Phase and a column per plan.

**Status:** Pass (Claude (Claude in Chrome), 2026-10-10)

**Execution notes / defect:** Ticks are icons; read from the page structure.

### SA-12-003 · Plans: Edit plan, no change

| Field | Value |
|---|---|
| Module | SA-12 · Plans |
| Test case ID | SA-12-003 |
| Scenario and objective | Saving a plan without changes works. |
| Preconditions | On Plans |
| Test data | — |
| Role | Super admin |
| Priority | Medium |
| Type | Regression |

**Steps**

1. Press Edit plan on Starter
2. Press Save
3. Verify the expected result below before going on.

**Expected result:** Saves without errors.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-12-004 · Plans: Edit price

| Field | Value |
|---|---|
| Module | SA-12 · Plans |
| Test case ID | SA-12-004 |
| Scenario and objective | A price change saves in paise and shows in rupees. |
| Preconditions | Editing Starter |
| Test data | Monthly price ₹3,599 |
| Role | Super admin |
| Priority | Medium |
| Type | Data persistence |

**Steps**

1. Change the monthly price
2. Save
3. Reload Plans
4. Change it back to ₹3,499
5. Verify the expected result below before going on.

**Expected result:** The card shows ₹3,599 after reload; MRR on the dashboard reflects it; restored afterwards.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-12-005 · Plans: Invalid limits

| Field | Value |
|---|---|
| Module | SA-12 · Plans |
| Test case ID | SA-12-005 |
| Scenario and objective | Negative or non-numeric limits are refused. |
| Preconditions | Editing a plan |
| Test data | Products limit -5 |
| Role | Super admin |
| Priority | Medium |
| Type | Validation |

**Steps**

1. Type -5 in the product limit
2. Save
3. Verify the expected result below before going on.

**Expected result:** Refused with a validation message.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-12-006 · Plans: Create plan

| Field | Value |
|---|---|
| Module | SA-12 · Plans |
| Test case ID | SA-12-006 |
| Scenario and objective | A new plan can be created and shows on the page. |
| Preconditions | On Plans |
| Test data | Name "QA plan", code qa, ₹999/month, 50 products |
| Role | Super admin |
| Priority | Low |
| Type | Functional |

**Steps**

1. Create a new plan with these values
2. Save
3. Open Plans
4. Verify the expected result below before going on.

**Expected result:** A QA plan card shows with its price and limits; set it inactive afterwards (listed apart).

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
