# E2E-11 Tenant isolation

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | End-to-End |
| Purpose | One store never sees another store's data, logins or carts. |
| Runs as | Two store owners, shoppers |
| Start at | `http://localhost:3000/admin` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `cms-products` (docs/screens) |
| Depends on | SA-15 |
| Test cases | 3 (1 in the smoke run) |

## Before you start

- Home Orbit and Demo Sanitary owners signed in (separate browsers)

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

### E2E-11-001 · Isolation: Another store's records are invisible

| Field | Value |
|---|---|
| Module | E2E-11 · Tenant isolation |
| Test case ID | E2E-11-001 |
| Scenario and objective | Demo Sanitary's owner cannot see Home Orbit data. |
| Preconditions | Both owners signed in |
| Test data | A Home Orbit product address |
| Role | Store owners |
| Priority | Critical |
| Type | Security/Permissions |

**Steps**

1. Demo Sanitary owner: open Products, Categories, Media, Enquiries, Orders
2. Paste a Home Orbit product's admin address
3. Verify the expected result below before going on.

**Expected result:** All lists show only Demo Sanitary's records; the pasted address says it could not be found or no access.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### E2E-11-002 · Isolation: Shopper logins are per store

| Field | Value |
|---|---|
| Module | E2E-11 · Tenant isolation |
| Test case ID | E2E-11-002 |
| Scenario and objective | A shopper account on one store does not sign in on another. |
| Preconditions | Shopper account on Home Orbit |
| Test data | Same email on demo-sanitary.localhost |
| Role | Shopper |
| Priority | High |
| Type | Security/Permissions |

**Steps**

1. Sign in on Home Orbit
2. Open http://demo-sanitary.localhost:3000/account
3. Verify the expected result below before going on.

**Expected result:** Not signed in on Demo Sanitary; the same email there is a separate account.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### E2E-11-003 · Isolation: API reads are scoped

| Field | Value |
|---|---|
| Module | E2E-11 · Tenant isolation |
| Test case ID | E2E-11-003 |
| Scenario and objective | The REST API never returns another store's records. |
| Preconditions | Signed in as Demo Sanitary owner |
| Test data | /api/products?limit=5 |
| Role | Store owner |
| Priority | Critical |
| Type | Security/Permissions |

**Steps**

1. Open /api/products?limit=5 in the browser
2. Verify the expected result below before going on.

**Expected result:** Only Demo Sanitary's products (or none); never Home Orbit's.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
