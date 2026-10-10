# SA-11 Vendor staff

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Super Admin |
| Purpose | Staff meter, invite, resend invite, change roles, reset two-step, remove; a store keeps one owner. |
| Runs as | Super admin |
| Start at | `http://localhost:3000/admin/collections/tenants/<id> → Staff` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `sa-vendor-staff` (docs/screens) |
| Depends on | SA-05 |
| Test cases | 8 (1 in the smoke run) |

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

### SA-11-001 · Staff: List

| Field | Value |
|---|---|
| Module | SA-11 · Vendor staff |
| Test case ID | SA-11-001 |
| Scenario and objective | Staff shows the meter, invite and the table. |
| Preconditions | On Home Orbit → Staff |
| Test data | — |
| Role | Super admin |
| Priority | High |
| Type | UI/UX |

**Steps**

1. Read the tab
2. Verify the expected result below before going on.

**Expected result:** Staff meter, + Invite staff, and rows with name, email, roles, Two-step On/Off and last sign-in; the owner owner@homeorbit.example with invite pending.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-11-002 · Staff: Resend invite

| Field | Value |
|---|---|
| Module | SA-11 · Vendor staff |
| Test case ID | SA-11-002 |
| Scenario and objective | Resend invite prints a new link. |
| Preconditions | Owner invite pending |
| Test data | — |
| Role | Super admin |
| Priority | High |
| Type | Integration |

**Steps**

1. Press Resend invite on the owner
2. Watch the `pnpm dev` terminal
3. Verify the expected result below before going on.

**Expected result:** A [dev-log email] to owner@homeorbit.example with a fresh set-password link.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-11-003 · Staff: Invite staff

| Field | Value |
|---|---|
| Module | SA-11 · Vendor staff |
| Test case ID | SA-11-003 |
| Scenario and objective | Inviting a staff member with a role. |
| Preconditions | On Staff |
| Test data | manager@homeorbit.example, role Manager |
| Role | Super admin |
| Priority | High |
| Type | Functional |

**Steps**

1. Press + Invite staff
2. Fill email, name and role
3. Send
4. Verify the expected result below before going on.

**Expected result:** The person is listed with Manager and invite pending; the invite email prints in the terminal.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-11-004 · Staff: Staff limit

| Field | Value |
|---|---|
| Module | SA-11 · Vendor staff |
| Test case ID | SA-11-004 |
| Scenario and objective | The plan's staff limit is enforced. |
| Preconditions | Starter allows 3 staff |
| Test data | Invite until the limit is passed |
| Role | Super admin |
| Priority | Medium |
| Type | Boundary |

**Steps**

1. Invite staff until 3 exist
2. Try a 4th
3. Verify the expected result below before going on.

**Expected result:** The 4th invite is refused with the plan limit message.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-11-005 · Staff: Change roles

| Field | Value |
|---|---|
| Module | SA-11 · Vendor staff |
| Test case ID | SA-11-005 |
| Scenario and objective | Changing a staff member's roles saves. |
| Preconditions | A staff member exists |
| Test data | Add Content editor |
| Role | Super admin |
| Priority | Medium |
| Type | Data persistence |

**Steps**

1. Press Change roles
2. Tick Content editor
3. Save
4. Reload
5. Verify the expected result below before going on.

**Expected result:** The new role shows after reload.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-11-006 · Staff: Reset two-step

| Field | Value |
|---|---|
| Module | SA-11 · Vendor staff |
| Test case ID | SA-11-006 |
| Scenario and objective | Resetting a staff member's two-step makes them set it up again. |
| Preconditions | A staff member with two-step On |
| Test data | — |
| Role | Super admin |
| Priority | High |
| Type | Security/Permissions |

**Steps**

1. Press Reset two-step and confirm
2. Sign in as that person
3. Verify the expected result below before going on.

**Expected result:** Two-step reads Off; the reset is audited; the person signs in without a code and can set it up again.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-11-007 · Staff: Last owner protected

| Field | Value |
|---|---|
| Module | SA-11 · Vendor staff |
| Test case ID | SA-11-007 |
| Scenario and objective | The store's last owner cannot be removed. |
| Preconditions | Only one owner |
| Test data | — |
| Role | Super admin |
| Priority | High |
| Type | Negative |

**Steps**

1. Press Remove on the owner
2. Verify the expected result below before going on.

**Expected result:** "The store needs at least one owner. Make someone else owner first."

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-11-008 · Staff: Remove staff

| Field | Value |
|---|---|
| Module | SA-11 · Vendor staff |
| Test case ID | SA-11-008 |
| Scenario and objective | Removing a staff member ends their access. |
| Preconditions | A non-owner staff member signed in elsewhere |
| Test data | — |
| Role | Super admin |
| Priority | High |
| Type | Security/Permissions |

**Steps**

1. Press Remove and confirm
2. Reload that person's CMS
3. Verify the expected result below before going on.

**Expected result:** They lose access to Home Orbit at once.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
