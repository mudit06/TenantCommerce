# VC-12 Customers and privacy requests

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Vendor CMS |
| Purpose | Shopper accounts, search, export; privacy requests (export, delete). |
| Runs as | Store owner |
| Start at | `http://localhost:3000/admin/collections/customers` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `cms-customers` (docs/screens) |
| Depends on | VC-10 |
| Test cases | 5 (0 in the smoke run) |

## Before you start

- Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit); store selling: `pnpm demo:selling home-orbit` run
- A shopper account (E2E-04)

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

### VC-12-001 · List: Customer list

| Field | Value |
|---|---|
| Module | VC-12 · Customers and privacy requests |
| Test case ID | VC-12-001 |
| Scenario and objective | Customers lists shopper accounts with masked phone. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit); store selling: `pnpm demo:selling home-orbit` run; a shopper account |
| Test data | — |
| Role | Store owner |
| Priority | High |
| Type | UI/UX |

**Steps**

1. Open Sales → Customers
2. Verify the expected result below before going on.

**Expected result:** Rows with name, email, masked phone, orders link, spent, last order, roles, offers and joined date.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-12-002 · List: Search and export

| Field | Value |
|---|---|
| Module | VC-12 · Customers and privacy requests |
| Test case ID | VC-12-002 |
| Scenario and objective | Search by name, email or phone; export CSV. |
| Preconditions | A shopper account |
| Test data | Shopper email |
| Role | Store owner |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Search the email
2. Press Export CSV
3. Verify the expected result below before going on.

**Expected result:** The account is found; a CSV downloads.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-12-003 · Privacy: Data export request

| Field | Value |
|---|---|
| Module | VC-12 · Customers and privacy requests |
| Test case ID | VC-12-003 |
| Scenario and objective | A data export request is due in 30 days and downloads JSON. |
| Preconditions | A shopper account |
| Test data | Type Data export |
| Role | Store owner |
| Priority | High |
| Type | Functional |

**Steps**

1. Press Privacy requests → Record a request
2. Pick Data export and the shopper's email
3. Press Download data
4. Verify the expected result below before going on.

**Expected result:** Shown as Due in 30 days; a JSON file with account, addresses, orders and preferences.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-12-004 · Privacy: Delete account request

| Field | Value |
|---|---|
| Module | VC-12 · Customers and privacy requests |
| Test case ID | VC-12-004 |
| Scenario and objective | Deleting an account keeps its orders. |
| Preconditions | A throw-away shopper account |
| Test data | Type Delete account |
| Role | Store owner |
| Priority | High |
| Type | Functional, Data persistence |

**Steps**

1. Record a Delete account request
2. Start
3. Delete account and confirm
4. Verify the expected result below before going on.

**Expected result:** The account is gone from Customers; its orders stay under Orders.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-12-005 · Permissions: No privacy actions for order manager

| Field | Value |
|---|---|
| Module | VC-12 · Customers and privacy requests |
| Test case ID | VC-12-005 |
| Scenario and objective | Order managers see customers without request buttons. |
| Preconditions | Signed in as Order manager |
| Test data | — |
| Role | Order manager |
| Priority | Medium |
| Type | Security/Permissions |

**Steps**

1. Open Customers
2. Verify the expected result below before going on.

**Expected result:** The list shows without Record a request or delete actions.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
