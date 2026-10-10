# E2E-17 Shopper account and wishlist across devices

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | End-to-End |
| Purpose | Guest orders join the account; the wishlist follows sign-in; sessions are per store. |
| Runs as | Shopper |
| Start at | `http://home-orbit.localhost:3000` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `st-login`, `st-account`, `st-wishlist` (docs/screens) |
| Depends on | VC-12 |
| Test cases | 3 (0 in the smoke run) |

## Before you start

- Store selling
- Wishlist feature on

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

### E2E-17-001 · Account: Guest orders join the account

| Field | Value |
|---|---|
| Module | E2E-17 · Shopper account and wishlist across devices |
| Test case ID | E2E-17-001 |
| Scenario and objective | Logging in with the checkout email shows earlier guest orders. |
| Preconditions | A guest COD order with rahul.k@example.com |
| Test data | Code from the terminal |
| Role | Shopper |
| Priority | High |
| Type | Integration |

**Steps**

1. Open http://home-orbit.localhost:3000/account → Send code to the email
2. Type the code from the terminal
3. Read Your orders
4. Verify the expected result below before going on.

**Expected result:** My account "Hi Rahul" lists the guest order with Track order and Invoice.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### E2E-17-002 · Wishlist: Wishlist follows sign-in

| Field | Value |
|---|---|
| Module | E2E-17 · Shopper account and wishlist across devices |
| Test case ID | E2E-17-002 |
| Scenario and objective | A guest wishlist merges into the account and shows on another browser. |
| Preconditions | Wishlist on |
| Test data | — |
| Role | Shopper |
| Priority | Medium |
| Type | Data persistence |

**Steps**

1. As a guest tap the heart on two cards
2. Log in
3. Open /wishlist in another browser signed in
4. Verify the expected result below before going on.

**Expected result:** Both products in the wishlist on both browsers; the header heart shows 2.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### E2E-17-003 · Account: Log out of all devices

| Field | Value |
|---|---|
| Module | E2E-17 · Shopper account and wishlist across devices |
| Test case ID | E2E-17-003 |
| Scenario and objective | Logging out everywhere ends other sessions. |
| Preconditions | Signed in on two browsers |
| Test data | — |
| Role | Shopper |
| Priority | Medium |
| Type | Security/Permissions |

**Steps**

1. Press Log out of all devices on one
2. Open a page on the other
3. Verify the expected result below before going on.

**Expected result:** The other browser is signed out on its next page.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
