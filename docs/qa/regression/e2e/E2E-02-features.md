# E2E-02 Feature switches across portals

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | End-to-End |
| Purpose | A feature switched in the platform changes the CMS menu and the store, checked on the server. |
| Runs as | Super admin and store owner |
| Start at | `http://localhost:3000/admin` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `sa-vendor-features` (docs/screens) |
| Depends on | SA-07 |
| Test cases | 2 (1 in the smoke run) |

## Before you start

- Super admin and Home Orbit owner signed in (two windows)

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

### E2E-02-001 · Features: Reviews off everywhere

| Field | Value |
|---|---|
| Module | E2E-02 · Feature switches across portals |
| Test case ID | E2E-02-001 |
| Scenario and objective | Switching Reviews off removes it from the CMS, the store and the server. |
| Preconditions | Reviews on; a published review exists |
| Test data | — |
| Role | Super admin, Store owner, Shopper |
| Priority | Critical |
| Type | Integration |

**Steps**

1. Super admin: Home Orbit → Features → Reviews off
2. Owner: reload the CMS; look for Marketing → Reviews
3. Store: open the reviewed product
4. Try the /review/<token> link from a review email
5. Verify the expected result below before going on.

**Expected result:** Reviews is gone from the menu; the product page shows no ratings; the review link is refused. Switching it on restores all.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### E2E-02-002 · Features: Dealer locator off

| Field | Value |
|---|---|
| Module | E2E-02 · Feature switches across portals |
| Test case ID | E2E-02-002 |
| Scenario and objective | Switching the dealer locator off hides the page, block, menu and links. |
| Preconditions | Dealer locator on |
| Test data | — |
| Role | Super admin, Shopper |
| Priority | High |
| Type | Integration |

**Steps**

1. Super admin: Dealer locator off
2. Open http://home-orbit.localhost:3000/dealers
3. Read the home page and footer
4. On a phone read the bottom bar
5. Verify the expected result below before going on.

**Expected result:** /dealers is not found; the dealer finder block and Find a dealer links are gone; the bottom bar shows Search in place of Dealers.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
