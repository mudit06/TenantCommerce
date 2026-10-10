# VC-17 Abandoned carts

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Vendor CMS |
| Purpose | Left carts, reminders with consent, settings, restore links. |
| Runs as | Store owner |
| Start at | `http://localhost:3000/admin/collections/carts` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `cms-abandoned` (docs/screens) |
| Depends on | VC-16 |
| Test cases | 4 (0 in the smoke run) |

## Before you start

- Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit); store selling: `pnpm demo:selling home-orbit` run
- Abandoned cart feature on

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

### VC-17-001 · Reminders: First reminder

| Field | Value |
|---|---|
| Module | VC-17 · Abandoned carts |
| Test case ID | VC-17-001 |
| Scenario and objective | A left cart with consent gets a reminder. |
| Preconditions | Cart left with offers ticked at checkout, after the First reminder delay |
| Test data | — |
| Role | Store owner |
| Priority | High |
| Type | Integration |

**Steps**

1. Wait the delay (1 hour by default) plus 5 minutes
2. Open Marketing → Abandoned carts
3. Verify the expected result below before going on.

**Expected result:** The cart shows "1st sent · email"; the reminder prints in the terminal (inside the send window).

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-17-002 · Reminders: No consent, no reminder

| Field | Value |
|---|---|
| Module | VC-17 · Abandoned carts |
| Test case ID | VC-17-002 |
| Scenario and objective | A cart without consent is not reminded. |
| Preconditions | Cart left without ticking offers |
| Test data | — |
| Role | Store owner |
| Priority | High |
| Type | Security/Permissions |

**Steps**

1. Open Abandoned carts after the delay
2. Verify the expected result below before going on.

**Expected result:** "Not reminded: no offer consent".

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-17-003 · Restore: Return to your cart

| Field | Value |
|---|---|
| Module | VC-17 · Abandoned carts |
| Test case ID | VC-17-003 |
| Scenario and objective | The reminder link restores the cart anywhere. |
| Preconditions | A reminder email |
| Test data | — |
| Role | Shopper |
| Priority | Medium |
| Type | Integration |

**Steps**

1. Open Return to your cart in another browser
2. Verify the expected result below before going on.

**Expected result:** The same cart opens with prices worked out again.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-17-004 · Settings: Second reminder with coupon

| Field | Value |
|---|---|
| Module | VC-17 · Abandoned carts |
| Test case ID | VC-17-004 |
| Scenario and objective | The second reminder can carry a coupon. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit); store selling: `pnpm demo:selling home-orbit` run |
| Test data | Tick Send a second reminder; coupon HOME200 |
| Role | Store owner |
| Priority | Low |
| Type | Functional |

**Steps**

1. On Reminders tick the second reminder, pick the coupon
2. Save reminders
3. Verify the expected result below before going on.

**Expected result:** Saved; the second reminder carries HOME200.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
