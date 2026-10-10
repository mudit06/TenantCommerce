# VC-27 Order updates

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Vendor CMS |
| Purpose | Steps with email and WhatsApp switches, preview, send test, delays, alerts. |
| Runs as | Store owner |
| Start at | `http://localhost:3000/admin/notifications` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `cms-notifications` (docs/screens) |
| Depends on | VC-26 |
| Test cases | 5 (0 in the smoke run) |

## Before you start

- Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit)

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

### VC-27-001 · Channels: Channel states

| Field | Value |
|---|---|
| Module | VC-27 · Order updates |
| Test case ID | VC-27-001 |
| Scenario and objective | Order updates shows each channel and the steps. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | — |
| Role | Store owner |
| Priority | High |
| Type | UI/UX |

**Steps**

1. Open Store → Order updates
2. Verify the expected result below before going on.

**Expected result:** WhatsApp "Not connected", SMS "Comes later", Email "Ready"; a row per step with Email and WhatsApp switches.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-27-002 · Preview: Preview and send test

| Field | Value |
|---|---|
| Module | VC-27 · Order updates |
| Test case ID | VC-27-002 |
| Scenario and objective | Previews use a sample order; the test prints in the terminal. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Your email |
| Role | Store owner |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Pick "Shipped · WhatsApp", then "Order confirmed (COD) · Email"
2. Type your email and Send test to my email
3. Verify the expected result below before going on.

**Expected result:** The text uses a sample order with the store's name; the email prints in the terminal.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-27-003 · Settings: Save switches and delays

| Field | Value |
|---|---|
| Module | VC-27 · Order updates |
| Test case ID | VC-27-003 |
| Scenario and objective | Switches, delay and alert email persist. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Packed email on; delay 5; alert email |
| Role | Store owner |
| Priority | High |
| Type | Data persistence |

**Steps**

1. Change them
2. Save
3. Reload
4. Verify the expected result below before going on.

**Expected result:** The changes stay after reload.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-27-004 · Permissions: Order manager read-only

| Field | Value |
|---|---|
| Module | VC-27 · Order updates |
| Test case ID | VC-27-004 |
| Scenario and objective | Order managers see the screen without Save. |
| Preconditions | Signed in as Order manager |
| Test data | — |
| Role | Order manager |
| Priority | Medium |
| Type | Security/Permissions |

**Steps**

1. Open Order updates
2. Verify the expected result below before going on.

**Expected result:** Switches greyed and no Save.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-27-005 · Quiet hours: Night messages wait

| Field | Value |
|---|---|
| Module | VC-27 · Order updates |
| Test case ID | VC-27-005 |
| Scenario and objective | Messages after 21:00 wait until 09:00 (except out for delivery and failed). |
| Preconditions | An order changed after 21:00 |
| Test data | — |
| Role | Store owner |
| Priority | Low |
| Type | Boundary |

**Steps**

1. Mark an order packed after 21:00
2. Read Messages to the shopper
3. Verify the expected result below before going on.

**Expected result:** The message shows "Goes out at 09:00".

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
