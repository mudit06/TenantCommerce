# E2E-12 Enquiry from store to inbox

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | End-to-End |
| Purpose | A quote request reaches the inbox, dashboard and bell, and is worked to closed. |
| Runs as | Shopper and store owner |
| Start at | `http://home-orbit.localhost:3000` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `st-contact`, `cms-enquiries` (docs/screens) |
| Depends on | VC-13 |
| Test cases | 2 (1 in the smoke run) |

## Before you start

- Enquiries feature on

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

### E2E-12-001 · Enquiry: Quote to inbox to closed

| Field | Value |
|---|---|
| Module | E2E-12 · Enquiry from store to inbox |
| Test case ID | E2E-12-001 |
| Scenario and objective | A product quote request reaches the inbox and is worked. |
| Preconditions | Enquiries on |
| Test data | Name, 10-digit mobile, city, quantity 50, consent ticked; options picked |
| Role | Shopper, Store owner |
| Priority | Critical |
| Type | Integration |

**Steps**

1. Store: product page → Request a bulk quote with the data
2. Owner: dashboard figures and bell
3. Inbox: open it, assign, Contacted, note, Won
4. Verify the expected result below before going on.

**Expected result:** Store says thanks with ENQ-n; dashboard and bell count it; the inbox shows the options; it moves New → In progress → Closed.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### E2E-12-002 · Enquiry: Validation and spam limit

| Field | Value |
|---|---|
| Module | E2E-12 · Enquiry from store to inbox |
| Test case ID | E2E-12-002 |
| Scenario and objective | The quote form validates and limits repeats. |
| Preconditions | — |
| Test data | Empty form; then 6 sends in 10 minutes |
| Role | Shopper |
| Priority | High |
| Type | Validation, Boundary |

**Steps**

1. Send the form empty
2. Send a valid form 6 times quickly
3. Verify the expected result below before going on.

**Expected result:** Errors under Name and consent and "Add a mobile number or an email…"; the 6th send is refused with the wait message.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
