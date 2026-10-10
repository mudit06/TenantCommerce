# SA-09 Vendor domains

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Super Admin |
| Purpose | The store's subdomain, primary flag and redirect flag. |
| Runs as | Super admin |
| Start at | `http://localhost:3000/admin/collections/tenants/<id> → Domains` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `sa-vendor-domains` (docs/screens) |
| Depends on | SA-05 |
| Test cases | 2 (0 in the smoke run) |

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

### SA-09-001 · Domains: Primary domain

| Field | Value |
|---|---|
| Module | SA-09 · Vendor domains |
| Test case ID | SA-09-001 |
| Scenario and objective | The store's address is listed as primary. |
| Preconditions | On Home Orbit → Domains |
| Test data | — |
| Role | Super admin |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Read the tab
2. Verify the expected result below before going on.

**Expected result:** home-orbit.localhost is listed as primary.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-09-002 · Domains: Unknown host

| Field | Value |
|---|---|
| Module | SA-09 · Vendor domains |
| Test case ID | SA-09-002 |
| Scenario and objective | An address that belongs to no store never shows a store. |
| Preconditions | — |
| Test data | http://unknown-store.localhost:3000 |
| Role | Super admin |
| Priority | High |
| Type | Security/Permissions |

**Steps**

1. Open the address
2. Verify the expected result below before going on.

**Expected result:** A plain 404; no store content.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
