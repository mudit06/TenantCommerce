# SA-14 Team and access, Staff users

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Super Admin |
| Purpose | Platform team list with two-step and last sign-in, invite teammate, reset two-step, security card; Staff users list. |
| Runs as | Super admin |
| Start at | `http://localhost:3000/admin/team` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `sa-team` (docs/screens) |
| Depends on | SA-01 |
| Test cases | 5 (1 in the smoke run) |

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

### SA-14-001 · Team: List and security

| Field | Value |
|---|---|
| Module | SA-14 · Team and access, Staff users |
| Test case ID | SA-14-001 |
| Scenario and objective | Team and access lists the platform team and security rules. |
| Preconditions | Signed in as super admin |
| Test data | — |
| Role | Super admin |
| Priority | High |
| Type | UI/UX |

**Steps**

1. Open Platform → Team and access
2. Verify the expected result below before going on.

**Expected result:** You as Super admin with Two-step On and last sign-in; Security says two-step Required, 8-hour session, lockout and password length.

**Actual result:** Platform Admin, Super admin, Two-step On, last sign-in Today 11:13; Security: two-step Required, 8 hours, 5 tries 15 min, 10+ characters.

**Status:** Pass (Claude (Claude in Chrome), 2026-10-10)

**Execution notes / defect:** Reset two-step is also offered on your own row; consider hiding it there.

### SA-14-002 · Team: Invite teammate

| Field | Value |
|---|---|
| Module | SA-14 · Team and access, Staff users |
| Test case ID | SA-14-002 |
| Scenario and objective | Inviting a Support teammate sends an invite. |
| Preconditions | On Team and access |
| Test data | support.qa@tenantecom.local, Support |
| Role | Super admin |
| Priority | High |
| Type | Functional |

**Steps**

1. Invite the teammate as Support
2. Watch the terminal
3. Verify the expected result below before going on.

**Expected result:** Listed as Support, invite pending; the invite email prints in the terminal.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-14-003 · Team: Invalid email

| Field | Value |
|---|---|
| Module | SA-14 · Team and access, Staff users |
| Test case ID | SA-14-003 |
| Scenario and objective | An invalid email is refused. |
| Preconditions | On Team and access |
| Test data | Email "not-an-email" |
| Role | Super admin |
| Priority | Medium |
| Type | Validation |

**Steps**

1. Invite with the invalid email
2. Verify the expected result below before going on.

**Expected result:** Refused with an email format message.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-14-004 · Team: Reset two-step (super admin only)

| Field | Value |
|---|---|
| Module | SA-14 · Team and access, Staff users |
| Test case ID | SA-14-004 |
| Scenario and objective | A super admin resets a teammate's two-step. |
| Preconditions | A teammate with two-step On |
| Test data | — |
| Role | Super admin |
| Priority | High |
| Type | Security/Permissions |

**Steps**

1. Press Reset two-step on the teammate and confirm
2. Verify the expected result below before going on.

**Expected result:** Two-step Off; the teammate must set it up again at the next sign-in; the reset is audited.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-14-005 · Staff users: Staff users list

| Field | Value |
|---|---|
| Module | SA-14 · Team and access, Staff users |
| Test case ID | SA-14-005 |
| Scenario and objective | Staff users lists every admin user. |
| Preconditions | Signed in as super admin |
| Test data | — |
| Role | Super admin |
| Priority | Medium |
| Type | Security/Permissions |

**Steps**

1. Open Platform → Staff users
2. Verify the expected result below before going on.

**Expected result:** A list of users with email and roles; secrets such as two-step keys never show.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
