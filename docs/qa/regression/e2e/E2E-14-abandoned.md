# E2E-14 Offer consent, abandoned cart and unsubscribe

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | End-to-End |
| Purpose | Consent at checkout drives reminders and offers; unsubscribe stops them but not order updates. |
| Runs as | Shopper and store owner |
| Start at | `http://home-orbit.localhost:3000` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `st-checkout`, `cms-abandoned` (docs/screens) |
| Depends on | VC-16, VC-17 |
| Test cases | 1 (0 in the smoke run) |

## Before you start

- Offer messages and abandoned cart features on

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

### E2E-14-001 · Consent: Consent drives reminders; unsubscribe stops offers only

| Field | Value |
|---|---|
| Module | E2E-14 · Offer consent, abandoned cart and unsubscribe |
| Test case ID | E2E-14-001 |
| Scenario and objective | Offer consent at checkout and unsubscribe behave as promised. |
| Preconditions | Offer messages and abandoned cart on |
| Test data | Tick "Offers and new launches · By email" |
| Role | Shopper, Store owner |
| Priority | High |
| Type | Integration |

**Steps**

1. Shopper: checkout, tick offers by email, leave
2. After the delay: reminder in the terminal; Return to your cart restores it
3. Open Unsubscribe and confirm
4. Owner: send an offer message
5. Place and ship an order for the same email
6. Verify the expected result below before going on.

**Expected result:** Reminder sent with consent; after unsubscribe no offer message is sent to that email, but order updates still are.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
