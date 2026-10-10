# VC-01 Sign in, first password and session

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Vendor CMS |
| Purpose | Store staff set a password from the invite, sign in (optional two-step), lockout. |
| Runs as | Store owner |
| Start at | `http://localhost:3000/admin/login` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `cms-staff` (docs/screens) |
| Depends on | SA-11 |
| Test cases | 7 (1 in the smoke run) |

## Before you start

- Home Orbit owner invite link (Resend invite on SA-11 prints it in the `pnpm dev` terminal)

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

### VC-01-001 · First password: Short password refused

| Field | Value |
|---|---|
| Module | VC-01 · Sign in, first password and session |
| Test case ID | VC-01-001 |
| Scenario and objective | The set-password page refuses passwords under 10 characters. |
| Preconditions | Owner invite link open (private window) |
| Test data | Password "Short12" |
| Role | Store owner |
| Priority | High |
| Type | Validation, Boundary |

**Steps**

1. Type the short password in New Password and Confirm Password
2. Save
3. Verify the expected result below before going on.

**Expected result:** Refused with the minimum length message; the account stays without a password.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-01-002 · First password: Mismatch

| Field | Value |
|---|---|
| Module | VC-01 · Sign in, first password and session |
| Test case ID | VC-01-002 |
| Scenario and objective | New and confirm password must match. |
| Preconditions | Invite link open |
| Test data | "HomeOrbit@2026" and "HomeOrbit@2027" |
| Role | Store owner |
| Priority | Medium |
| Type | Validation |

**Steps**

1. Type two different passwords
2. Save
3. Verify the expected result below before going on.

**Expected result:** Refused with a "passwords do not match" message.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-01-003 · First password: Set password and land on dashboard

| Field | Value |
|---|---|
| Module | VC-01 · Sign in, first password and session |
| Test case ID | VC-01-003 |
| Scenario and objective | A valid password signs the owner in. |
| Preconditions | Invite link open |
| Test data | Password "HomeOrbit@2026" |
| Role | Store owner |
| Priority | Critical |
| Type | Functional |

**Steps**

1. Type it twice
2. Save
3. Verify the expected result below before going on.

**Expected result:** Signed in at the store dashboard: greeting, today's date, Home Orbit, View store and Add product.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-01-004 · First password: Link works once

| Field | Value |
|---|---|
| Module | VC-01 · Sign in, first password and session |
| Test case ID | VC-01-004 |
| Scenario and objective | An invite link cannot be reused. |
| Preconditions | Password already set with the link |
| Test data | Same link |
| Role | Store owner |
| Priority | High |
| Type | Security/Permissions |

**Steps**

1. Open the same invite link again
2. Verify the expected result below before going on.

**Expected result:** The link is refused as used or expired.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-01-005 · Sign in: Owner signs in without a code

| Field | Value |
|---|---|
| Module | VC-01 · Sign in, first password and session |
| Test case ID | VC-01-005 |
| Scenario and objective | Two-step is optional for store staff. |
| Preconditions | Owner has not set up two-step |
| Test data | Owner email and password |
| Role | Store owner |
| Priority | High |
| Type | Functional |

**Steps**

1. Sign out
2. Sign in with email and password
3. Verify the expected result below before going on.

**Expected result:** The dashboard opens without a code step.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-01-006 · Sign in: Optional two-step

| Field | Value |
|---|---|
| Module | VC-01 · Sign in, first password and session |
| Test case ID | VC-01-006 |
| Scenario and objective | A store owner can turn on two-step and is then asked for the code. |
| Preconditions | Owner signed in |
| Test data | An authenticator app |
| Role | Store owner |
| Priority | Medium |
| Type | Security/Permissions |

**Steps**

1. Open your account (top bar name)
2. Set up two-step sign-in with the app
3. Sign out and in
4. Verify the expected result below before going on.

**Expected result:** Step 2 of 2 asks for the code; turning it off again is possible for store staff.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-01-007 · Sign in: Wrong password

| Field | Value |
|---|---|
| Module | VC-01 · Sign in, first password and session |
| Test case ID | VC-01-007 |
| Scenario and objective | A wrong password is refused. |
| Preconditions | Signed out |
| Test data | Wrong password |
| Role | Store owner |
| Priority | High |
| Type | Negative |

**Steps**

1. Sign in with the wrong password
2. Verify the expected result below before going on.

**Expected result:** "The email or password provided is incorrect."

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
