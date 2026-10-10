# SA-01 Sign in and two-step verification

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Super Admin |
| Purpose | Platform staff sign in with email, password and an authenticator code; lockout and sessions. |
| Runs as | Super admin |
| Start at | `http://localhost:3000/admin/login` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `sa-login` (docs/screens) |
| Depends on | — |
| Test cases | 14 (6 in the smoke run) |

## Before you start

- QA database running (`app-qa`)
- Super admin account admin@tenantecom.local with its password (from .env)
- An authenticator app (or the QA key) for the super admin

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

### SA-01-001 · Sign in: Page layout

| Field | Value |
|---|---|
| Module | SA-01 · Sign in and two-step verification |
| Test case ID | SA-01-001 |
| Scenario and objective | The sign-in page shows the platform form with its fields and options. |
| Preconditions | Signed out |
| Test data | — |
| Role | Super admin |
| Priority | Medium |
| Type | UI/UX |

**Steps**

1. Open http://localhost:3000/admin
2. Verify you are sent to the sign-in page
3. Verify the expected result below before going on.

**Expected result:** Email and Password fields, a Show control on the password, a "Keep me signed in on this device" box and a Sign in button.

**Actual result:** Email, Password with Show, Forgot password?, Keep me signed in on this device and Sign in shown.

**Status:** Pass (Claude (Claude in Chrome), 2026-10-10)

**Execution notes / defect:** —

### SA-01-002 · Sign in: Wrong password

| Field | Value |
|---|---|
| Module | SA-01 · Sign in and two-step verification |
| Test case ID | SA-01-002 |
| Scenario and objective | A wrong password is refused with a message that does not say which part was wrong. |
| Preconditions | Signed out |
| Test data | Email admin@tenantecom.local; password "wrong-password-1" |
| Role | Super admin |
| Priority | Critical |
| Type | Negative |

**Steps**

1. Type the email and the wrong password
2. Press Sign in
3. Verify the expected result below before going on.

**Expected result:** The message "The email or password provided is incorrect." shows; you stay on the sign-in page.

**Actual result:** "The email or password provided is incorrect." shown; stayed on sign-in.

**Status:** Pass (Claude (Claude in Chrome), 2026-10-10)

**Execution notes / defect:** First try froze while the page was still loading; typing before hydration is lost (see guide).

### SA-01-003 · Sign in: Unknown email

| Field | Value |
|---|---|
| Module | SA-01 · Sign in and two-step verification |
| Test case ID | SA-01-003 |
| Scenario and objective | An email with no account gets the same message as a wrong password. |
| Preconditions | Signed out |
| Test data | Email nobody@tenantecom.local; any password |
| Role | Super admin |
| Priority | High |
| Type | Security/Permissions |

**Steps**

1. Type the unknown email and a password
2. Press Sign in
3. Verify the expected result below before going on.

**Expected result:** The same "The email or password provided is incorrect." message; nothing tells that the account does not exist.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-01-004 · Sign in: Required fields

| Field | Value |
|---|---|
| Module | SA-01 · Sign in and two-step verification |
| Test case ID | SA-01-004 |
| Scenario and objective | Empty fields are caught before sending. |
| Preconditions | Signed out |
| Test data | Both fields empty |
| Role | Super admin |
| Priority | Medium |
| Type | Validation |

**Steps**

1. Leave Email and Password empty
2. Press Sign in
3. Verify the expected result below before going on.

**Expected result:** The form asks for the email and the password; no request signs you in.

**Actual result:** Browser asked to fill out the email field; nothing was sent.

**Status:** Pass (Claude (Claude in Chrome), 2026-10-10)

**Execution notes / defect:** —

### SA-01-005 · Two-step: Step 2 asked

| Field | Value |
|---|---|
| Module | SA-01 · Sign in and two-step verification |
| Test case ID | SA-01-005 |
| Scenario and objective | After the right password a platform account is asked for its authenticator code. |
| Preconditions | Signed out; super admin has two-step set up |
| Test data | Right email and password |
| Role | Super admin |
| Priority | Critical |
| Type | Security/Permissions |

**Steps**

1. Type the right email and password
2. Press Sign in
3. Verify the next screen
4. Verify the expected result below before going on.

**Expected result:** "Step 2 of 2, Two-step verification" with six code boxes; the dashboard is not shown yet.

**Actual result:** "Step 2 of 2, Two-step verification" with six boxes, Verify and continue, Use a different account and the lost-phone note.

**Status:** Pass (Claude (Claude in Chrome), 2026-10-10)

**Execution notes / defect:** —

### SA-01-006 · Two-step: Wrong code

| Field | Value |
|---|---|
| Module | SA-01 · Sign in and two-step verification |
| Test case ID | SA-01-006 |
| Scenario and objective | A wrong 6-digit code is refused. |
| Preconditions | On Step 2 of 2 |
| Test data | Code 000000 (not the app's current code) |
| Role | Super admin |
| Priority | Critical |
| Type | Negative |

**Steps**

1. Type 000000 in the six boxes
2. Submit
3. Verify the expected result below before going on.

**Expected result:** The message "That code didn't work" (or similar) shows; you stay on step 2.

**Actual result:** "That code didn't work. Check the time on your phone and try the newest code."; boxes cleared.

**Status:** Pass (Claude (Claude in Chrome), 2026-10-10)

**Execution notes / defect:** —

### SA-01-007 · Two-step: Right code, paste

| Field | Value |
|---|---|
| Module | SA-01 · Sign in and two-step verification |
| Test case ID | SA-01-007 |
| Scenario and objective | The authenticator code signs you in; pasting all six digits into the first box fills them all. |
| Preconditions | On Step 2 of 2 |
| Test data | The current code from the authenticator app |
| Role | Super admin |
| Priority | Critical |
| Type | Functional |

**Steps**

1. Copy the 6-digit code
2. Paste it into the first box
3. Verify all six boxes are filled
4. Submit if it does not submit by itself
5. Verify the expected result below before going on.

**Expected result:** You land on the platform dashboard, "Good morning/afternoon/evening, Platform".

**Actual result:** Typing the authenticator code submitted at the sixth digit and opened "Good morning, Platform".

**Status:** Pass (Claude (Claude in Chrome), 2026-10-10)

**Execution notes / defect:** Paste into the first box is handled in code (CodeBoxes onPaste); a synthetic paste from the extension does not insert text, so paste needs a human check.

### SA-01-008 · Two-step: First-time setup

| Field | Value |
|---|---|
| Module | SA-01 · Sign in and two-step verification |
| Test case ID | SA-01-008 |
| Scenario and objective | A platform account without two-step sees only the setup until it is done. |
| Preconditions | A new Support teammate (SA-14) signed in for the first time |
| Test data | Their email and password; an authenticator app |
| Role | Super admin |
| Priority | Critical |
| Type | Security/Permissions |

**Steps**

1. Sign in as the new teammate
2. Verify the panel is covered by "Set up two-step sign-in"
3. Press it, scan the QR code (or type the setup key)
4. Type the app's 6-digit code and confirm
5. Verify the dashboard shows
6. Verify the expected result below before going on.

**Expected result:** Until the code is confirmed, no platform screen is usable; after it, the dashboard shows and Team and access lists Two-step On.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-01-009 · Two-step: Setup with a wrong code

| Field | Value |
|---|---|
| Module | SA-01 · Sign in and two-step verification |
| Test case ID | SA-01-009 |
| Scenario and objective | Two-step setup is not saved with a wrong confirmation code. |
| Preconditions | On the setup screen |
| Test data | Code 123456 that the app did not show |
| Role | Super admin |
| Priority | High |
| Type | Negative |

**Steps**

1. Type a wrong code on the setup screen
2. Confirm
3. Verify the expected result below before going on.

**Expected result:** An error says the code did not match; two-step stays off and the setup screen stays.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-01-010 · Sessions: Keep me signed in

| Field | Value |
|---|---|
| Module | SA-01 · Sign in and two-step verification |
| Test case ID | SA-01-010 |
| Scenario and objective | Without the tick the session ends with the browser; with it, it survives a restart (8 hours at most). |
| Preconditions | Signed out |
| Test data | Right credentials and code |
| Role | Super admin |
| Priority | Medium |
| Type | Data persistence |

**Steps**

1. Sign in without ticking "Keep me signed in on this device"
2. Close every browser window and reopen the admin
3. Verify you must sign in again
4. Sign in again with the box ticked
5. Close and reopen the browser
6. Verify you are still signed in
7. Verify the expected result below before going on.

**Expected result:** Unticked: signed out after the browser closes. Ticked: still signed in after reopening.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-01-011 · Sessions: Sign out

| Field | Value |
|---|---|
| Module | SA-01 · Sign in and two-step verification |
| Test case ID | SA-01-011 |
| Scenario and objective | Signing out ends the session. |
| Preconditions | Signed in |
| Test data | — |
| Role | Super admin |
| Priority | High |
| Type | Security/Permissions |

**Steps**

1. Open the account menu and sign out
2. Open http://localhost:3000/admin
3. Verify the expected result below before going on.

**Expected result:** The sign-in page shows; the browser back button does not reopen admin data.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-01-012 · Lockout: Five wrong passwords

| Field | Value |
|---|---|
| Module | SA-01 · Sign in and two-step verification |
| Test case ID | SA-01-012 |
| Scenario and objective | Five wrong passwords lock the account for 15 minutes. |
| Preconditions | Use a store owner that does not matter (owner@demo-clothing.example), private window |
| Test data | Wrong password 6 times |
| Role | Tester (any) |
| Priority | High |
| Type | Security/Permissions, Boundary |

**Steps**

1. Sign in with a wrong password 5 times; read the message each time
2. Try a 6th time
3. Verify the expected result below before going on.

**Expected result:** Tries 1–5: "The email or password provided is incorrect." The 6th: "This user is locked due to having too many failed login attempts." It lifts after 15 minutes.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-01-013 · Lockout: Wrong codes

| Field | Value |
|---|---|
| Module | SA-01 · Sign in and two-step verification |
| Test case ID | SA-01-013 |
| Scenario and objective | Repeated wrong two-step codes lock sign-in like wrong passwords. |
| Preconditions | On Step 2 of 2 for a test platform account (not your only super admin) |
| Test data | 5 wrong codes |
| Role | Super admin |
| Priority | Medium |
| Type | Security/Permissions, Boundary |

**Steps**

1. Type a wrong code 5 times
2. Then type the right code
3. Verify the expected result below before going on.

**Expected result:** After 5 wrong codes the account is locked for 15 minutes and even the right code is refused until then.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** Use a throw-away Support account so you are not locked out.

### SA-01-014 · Password reset: Forgot password

| Field | Value |
|---|---|
| Module | SA-01 · Sign in and two-step verification |
| Test case ID | SA-01-014 |
| Scenario and objective | The reset link sets a new password; a too-short one is refused. |
| Preconditions | Signed out; a test account |
| Test data | New password "short1" then a 10+ character one |
| Role | Super admin |
| Priority | High |
| Type | Validation |

**Steps**

1. Use Forgot password with the account's email
2. Open the link printed in the `pnpm dev` terminal ([dev-log email])
3. Try "short1"
4. Then a 10-character or longer password
5. Verify the expected result below before going on.

**Expected result:** Short passwords are refused (10 characters at least); a valid one saves and the account signs in with it (still asking for the code when two-step is on).

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
