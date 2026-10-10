# E2E-07 Store status across portals

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | End-to-End |
| Purpose | Go live, suspend and resume change what shoppers and search engines see. |
| Runs as | Super admin, shopper |
| Start at | `http://localhost:3000/admin` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `sa-vendor`, `st-offline` (docs/screens) |
| Depends on | SA-05 |
| Test cases | 2 (1 in the smoke run) |

## Before you start

- Super admin signed in

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

### E2E-07-001 · Status: Go live, suspend, resume

| Field | Value |
|---|---|
| Module | E2E-07 · Store status across portals |
| Test case ID | E2E-07-001 |
| Scenario and objective | Store status reaches shoppers and search engines. |
| Preconditions | Home Orbit draft |
| Test data | Reasons for suspend |
| Role | Super admin, Shopper |
| Priority | Critical |
| Type | Integration |

**Steps**

1. Super admin: Go live
2. Store: reload; open /robots.txt and /sitemap.xml
3. Super admin: Suspend with a reason
4. Store: reload in a private window
5. Super admin: Resume
6. Verify the expected result below before going on.

**Expected result:** Live: no preview bar, robots allows, sitemap lists home, 13 categories and 110 products. Suspended: "Store unavailable", robots Disallow, sitemap gone. Resumed: back at once. Recent changes lists all with reasons.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### E2E-07-002 · Status: Suspended store refuses orders

| Field | Value |
|---|---|
| Module | E2E-07 · Store status across portals |
| Test case ID | E2E-07-002 |
| Scenario and objective | A suspended store cannot take orders even from an open checkout. |
| Preconditions | Checkout open in a tab |
| Test data | — |
| Role | Shopper, Super admin |
| Priority | High |
| Type | Security/Permissions |

**Steps**

1. Open checkout with an item
2. Super admin suspends the store
3. Place the order
4. Verify the expected result below before going on.

**Expected result:** The order is refused; no order is created.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
