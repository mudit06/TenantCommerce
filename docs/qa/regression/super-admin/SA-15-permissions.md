# SA-15 Platform permissions and isolation

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Super Admin |
| Purpose | What super admins, support staff and store staff can reach in the platform panel. |
| Runs as | Super admin and Support |
| Start at | `http://localhost:3000/admin` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `sa-team` (docs/screens) |
| Depends on | SA-14 |
| Test cases | 4 (1 in the smoke run) |

## Before you start

- A super admin and a Support teammate (SA-14)
- A store owner login

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

### SA-15-001 · Support role: Support cannot onboard

| Field | Value |
|---|---|
| Module | SA-15 · Platform permissions and isolation |
| Test case ID | SA-15-001 |
| Scenario and objective | A Support teammate has no New vendor and cannot create stores. |
| Preconditions | Signed in as Support (two-step set up) |
| Test data | — |
| Role | Super admin |
| Priority | High |
| Type | Security/Permissions |

**Steps**

1. Read the menu
2. Open http://localhost:3000/admin/new-vendor
3. Verify the expected result below before going on.

**Expected result:** New vendor is not in the menu and the page refuses access.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-15-002 · Support role: Support cannot reset two-step

| Field | Value |
|---|---|
| Module | SA-15 · Platform permissions and isolation |
| Test case ID | SA-15-002 |
| Scenario and objective | Only super admins reset two-step. |
| Preconditions | Signed in as Support |
| Test data | — |
| Role | Super admin |
| Priority | High |
| Type | Security/Permissions |

**Steps**

1. Open Team and access
2. Verify the expected result below before going on.

**Expected result:** No Reset two-step action (or it is refused).

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-15-003 · Store staff: Store staff never see the platform

| Field | Value |
|---|---|
| Module | SA-15 · Platform permissions and isolation |
| Test case ID | SA-15-003 |
| Scenario and objective | A store owner cannot open platform screens. |
| Preconditions | Signed in as a store owner |
| Test data | http://localhost:3000/admin/collections/tenants, http://localhost:3000/admin/collections/plans |
| Role | Super admin |
| Priority | Critical |
| Type | Security/Permissions |

**Steps**

1. Open each address
2. Verify the expected result below before going on.

**Expected result:** "Nothing found" or no access for both; the menu has no Vendors, Billing or Platform.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-15-004 · API: Platform endpoints need a platform login

| Field | Value |
|---|---|
| Module | SA-15 · Platform permissions and isolation |
| Test case ID | SA-15-004 |
| Scenario and objective | Platform exports refuse store staff and guests. |
| Preconditions | Signed out, then signed in as a store owner |
| Test data | http://localhost:3000/api/admin/v1/platform/vendors/export |
| Role | Super admin |
| Priority | High |
| Type | Security/Permissions |

**Steps**

1. Open the address signed out
2. Open it as a store owner
3. Verify the expected result below before going on.

**Expected result:** Refused both times (401 or 403); no CSV is returned.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
