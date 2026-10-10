# E2E-01 Vendor onboarding to first store preview

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | End-to-End |
| Purpose | A store created by the platform reaches its owner and its own address. |
| Runs as | Super admin, then the new owner |
| Start at | `http://localhost:3000/admin` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `sa-vendor-new`, `cms-dashboard` (docs/screens) |
| Depends on | SA-04, VC-01 |
| Test cases | 3 (1 in the smoke run) |

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

### E2E-01-001 · Onboarding: Create, invite, set password, preview

| Field | Value |
|---|---|
| Module | E2E-01 · Vendor onboarding to first store preview |
| Test case ID | E2E-01-001 |
| Scenario and objective | A vendor created by the super admin is usable end to end by its owner. |
| Preconditions | Super admin signed in; slug e2e-store unused |
| Test data | E2E Store / E2E Store Pvt Ltd / Hardware / 29AABCT1234F1ZM / e2e-store / Starter / e2e.owner@example.com |
| Role | Super admin, Store owner |
| Priority | Critical |
| Type | Integration |

**Steps**

1. Super admin: New vendor with the data, invite ticked → Create vendor
2. Copy the set-password link from the `pnpm dev` terminal
3. Private window: open the link, set password "E2eStore@2026"
4. Verify the owner lands on the E2E Store dashboard with the launch checklist
5. Open http://e2e-store.localhost:3000
6. Verify the expected result below before going on.

**Expected result:** Store draft in All vendors; owner signed in to their own store only; the store opens in the default design with a preview banner.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### E2E-01-002 · Onboarding: Owner cannot reach the platform

| Field | Value |
|---|---|
| Module | E2E-01 · Vendor onboarding to first store preview |
| Test case ID | E2E-01-002 |
| Scenario and objective | The new owner sees only their store. |
| Preconditions | E2E-01-001 done |
| Test data | — |
| Role | Store owner |
| Priority | Critical |
| Type | Security/Permissions |

**Steps**

1. As the new owner open /admin/collections/tenants
2. Read the menu
3. Verify the expected result below before going on.

**Expected result:** "Nothing found"; no Vendors, Billing or Platform in the menu.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### E2E-01-003 · Onboarding: Dashboard counts follow

| Field | Value |
|---|---|
| Module | E2E-01 · Vendor onboarding to first store preview |
| Test case ID | E2E-01-003 |
| Scenario and objective | The platform dashboard and lists include the new store. |
| Preconditions | E2E-01-001 done |
| Test data | — |
| Role | Super admin |
| Priority | High |
| Type | Integration |

**Steps**

1. Super admin: open the dashboard and All vendors
2. Verify the expected result below before going on.

**Expected result:** Recently onboarded lists E2E Store (Draft); Needs attention lists it as a draft; All vendors counts it.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
