# VC-29 Reports

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Vendor CMS |
| Purpose | Sales figures, daily sales, best sellers, offers, GST summary by HSN, exports. |
| Runs as | Store owner |
| Start at | `http://localhost:3000/admin/reports` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `cms-reports` (docs/screens) |
| Depends on | VC-10 |
| Test cases | 5 (0 in the smoke run) |

## Before you start

- Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit); store selling: `pnpm demo:selling home-orbit` run
- Delivered orders (VC-10)

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

### VC-29-001 · Figures: Month figures

| Field | Value |
|---|---|
| Module | VC-29 · Reports |
| Test case ID | VC-29-001 |
| Scenario and objective | Reports show the month's sales figures. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit); store selling: `pnpm demo:selling home-orbit` run; a delivered COD order |
| Test data | — |
| Role | Store owner |
| Priority | High |
| Type | Integration |

**Steps**

1. Open Insights → Reports
2. Verify the expected result below before going on.

**Expected result:** Gross sales, orders, average, refunds and paid online share; the day's bar in Daily sales; the product in Best sellers; schemes and coupons in Offers.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-29-002 · GST: GST summary by HSN

| Field | Value |
|---|---|
| Module | VC-29 · Reports |
| Test case ID | VC-29-002 |
| Scenario and objective | GST summary lists HSN and rate with tax split. |
| Preconditions | Delivered orders |
| Test data | — |
| Role | Store owner |
| Priority | High |
| Type | Functional |

**Steps**

1. Read GST summary by HSN
2. Verify the expected result below before going on.

**Expected result:** Each HSN and rate with taxable value and IGST or CGST and SGST; a credit note lowers its row.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-29-003 · Export: GSTR-1 and orders CSV

| Field | Value |
|---|---|
| Module | VC-29 · Reports |
| Test case ID | VC-29-003 |
| Scenario and objective | Exports download with two decimals. |
| Preconditions | Report open |
| Test data | — |
| Role | Store owner |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Press Export for GSTR-1 (CSV)
2. Press Export orders CSV
3. Verify the expected result below before going on.

**Expected result:** Two CSVs: the GST table with two decimals and the month's orders.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-29-004 · Filter: Month picker

| Field | Value |
|---|---|
| Module | VC-29 · Reports |
| Test case ID | VC-29-004 |
| Scenario and objective | Picking last month changes the figures. |
| Preconditions | Report open |
| Test data | Last month |
| Role | Store owner |
| Priority | Low |
| Type | Functional |

**Steps**

1. Pick last month
2. Verify the expected result below before going on.

**Expected result:** The figures change to that month.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-29-005 · Permissions: Who sees reports

| Field | Value |
|---|---|
| Module | VC-29 · Reports |
| Test case ID | VC-29-005 |
| Scenario and objective | Order managers see reports; content editors do not. |
| Preconditions | Signed in as Content editor |
| Test data | http://localhost:3000/admin/reports |
| Role | Content editor, Order manager |
| Priority | Medium |
| Type | Security/Permissions |

**Steps**

1. Open the address
2. Verify the expected result below before going on.

**Expected result:** Refused for the content editor; allowed for an order manager.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
