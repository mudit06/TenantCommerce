# E2E-08 Platform support session audit

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | End-to-End |
| Purpose | A platform session inside a store is limited, visible and audited. |
| Runs as | Super admin, store owner |
| Start at | `http://localhost:3000/admin` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `sa-vendor` (docs/screens) |
| Depends on | SA-06 |
| Test cases | 2 (0 in the smoke run) |

## Before you start

- Super admin and owner signed in

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

### E2E-08-001 · Session: Audited manage session

| Field | Value |
|---|---|
| Module | E2E-08 · Platform support session audit |
| Test case ID | E2E-08-001 |
| Scenario and objective | Changes made by the platform inside a store are visible to the store and the platform. |
| Preconditions | Super admin and owner |
| Test data | Reason "Vendor asked us to set up the Diwali page" |
| Role | Super admin, Store owner |
| Priority | High |
| Type | Integration |

**Steps**

1. Super admin: Manage store with the reason
2. Edit About us; Save Draft
3. End session
4. Owner: open Pages
5. Super admin: Recent changes
6. Verify the expected result below before going on.

**Expected result:** Owner sees "by Platform Admin (platform team)"; Recent changes lists the session, reason and edit.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### E2E-08-002 · Session: Support view cannot change data

| Field | Value |
|---|---|
| Module | E2E-08 · Platform support session audit |
| Test case ID | E2E-08-002 |
| Scenario and objective | View as support never saves. |
| Preconditions | View as support session |
| Test data | — |
| Role | Super admin |
| Priority | High |
| Type | Security/Permissions |

**Steps**

1. Try to save a product and a setting
2. Verify the expected result below before going on.

**Expected result:** Nothing saves; no Save buttons or the save is refused.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
