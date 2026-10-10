# E2E-10 Staff roles and two-step reset

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | End-to-End |
| Purpose | Roles limit what staff reach; a lost phone is handled by the platform. |
| Runs as | Owner, staff, super admin |
| Start at | `http://localhost:3000/admin` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `cms-staff`, `sa-vendor-staff` (docs/screens) |
| Depends on | VC-28, SA-11 |
| Test cases | 2 (1 in the smoke run) |

## Before you start

- Owner signed in

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

### E2E-10-001 · Roles: Order manager limits

| Field | Value |
|---|---|
| Module | E2E-10 · Staff roles and two-step reset |
| Test case ID | E2E-10-001 |
| Scenario and objective | An order manager handles orders but not keys, staff or catalogue writes. |
| Preconditions | Owner invites orders@homeorbit.example as Order manager |
| Test data | — |
| Role | Store owner, Order manager |
| Priority | Critical |
| Type | Security/Permissions |

**Steps**

1. Accept the invite in another browser
2. Pack an order
3. Open /admin/payments, /admin/staff
4. Edit a product
5. Verify the expected result below before going on.

**Expected result:** Orders work; payments and staff refused; product editing refused or read-only.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### E2E-10-002 · Two-step: Platform resets a staff member's two-step

| Field | Value |
|---|---|
| Module | E2E-10 · Staff roles and two-step reset |
| Test case ID | E2E-10-002 |
| Scenario and objective | A vendor staff member who lost their phone is reset by the super admin. |
| Preconditions | Staff member with two-step On |
| Test data | — |
| Role | Super admin, Store staff |
| Priority | High |
| Type | Security/Permissions |

**Steps**

1. Super admin: Home Orbit → Staff → Reset two-step
2. Staff member signs in
3. Verify the expected result below before going on.

**Expected result:** They sign in with the password only and can set two-step again; the reset is in the audit log.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
