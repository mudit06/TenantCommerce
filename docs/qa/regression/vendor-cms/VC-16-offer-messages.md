# VC-16 Offer messages

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Vendor CMS |
| Purpose | Offer emails to opted-in shoppers: audience, test, schedule, send window, results. |
| Runs as | Store owner |
| Start at | `http://localhost:3000/admin/collections/offer-campaigns` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `cms-campaigns` (docs/screens) |
| Depends on | VC-14 |
| Test cases | 4 (0 in the smoke run) |

## Before you start

- Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit); store selling: `pnpm demo:selling home-orbit` run
- Offer messages feature on
- A shopper who agreed to offers by email

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

### VC-16-001 · Create: New message from a scheme

| Field | Value |
|---|---|
| Module | VC-16 · Offer messages |
| Test case ID | VC-16-001 |
| Scenario and objective | Picking a scheme fills the message. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit); store selling: `pnpm demo:selling home-orbit` run; a scheme exists |
| Test data | — |
| Role | Store owner |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Open Marketing → Offer messages → + New message
2. Pick the scheme
3. Verify the expected result below before going on.

**Expected result:** Subject, headline and link fill in; Everyone who agreed to offers and Email selected; a line says how many get it.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-16-002 · Test: Send test to me

| Field | Value |
|---|---|
| Module | VC-16 · Offer messages |
| Test case ID | VC-16-002 |
| Scenario and objective | A test email is sent to the staff member. |
| Preconditions | A message draft |
| Test data | — |
| Role | Store owner |
| Priority | Medium |
| Type | Integration |

**Steps**

1. Press Send test to me
2. Wait a minute, watch the terminal
3. Verify the expected result below before going on.

**Expected result:** The email is printed in the `pnpm dev` terminal.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-16-003 · Schedule: Send window

| Field | Value |
|---|---|
| Module | VC-16 · Offer messages |
| Test case ID | VC-16-003 |
| Scenario and objective | Scheduling outside 10:00–20:00 moves into the window. |
| Preconditions | A message draft |
| Test data | Schedule for 22:00 |
| Role | Store owner |
| Priority | Medium |
| Type | Boundary |

**Steps**

1. Schedule for 22:00
2. Verify the expected result below before going on.

**Expected result:** The time moves to the next 10:00; at send time each opted-in shopper gets one email with an unsubscribe link.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-16-004 · Consent: Only opted-in shoppers

| Field | Value |
|---|---|
| Module | VC-16 · Offer messages |
| Test case ID | VC-16-004 |
| Scenario and objective | Shoppers without consent never get offers. |
| Preconditions | Two shoppers: one opted in, one not |
| Test data | — |
| Role | Store owner |
| Priority | Critical |
| Type | Security/Permissions |

**Steps**

1. Send a message to Everyone who agreed
2. Read the terminal
3. Verify the expected result below before going on.

**Expected result:** Only the opted-in shopper gets it.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
