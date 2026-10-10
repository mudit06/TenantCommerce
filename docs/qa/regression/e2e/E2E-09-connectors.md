# E2E-09 Connector allowance to checkout

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | End-to-End |
| Purpose | A provider blocked by the platform cannot be used by the store or at checkout. |
| Runs as | Super admin, owner, shopper |
| Start at | `http://localhost:3000/admin` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `sa-vendor-connectors`, `cms-payments`, `st-checkout` (docs/screens) |
| Depends on | SA-08, VC-25 |
| Test cases | 2 (0 in the smoke run) |

## Before you start

- Super admin and owner signed in

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

### E2E-09-001 · Connectors: Razorpay blocked by the platform

| Field | Value |
|---|---|
| Module | E2E-09 · Connector allowance to checkout |
| Test case ID | E2E-09-001 |
| Scenario and objective | A disallowed provider is unusable for the store. |
| Preconditions | Razorpay keys saved by the owner |
| Test data | — |
| Role | Super admin, Store owner, Shopper |
| Priority | High |
| Type | Integration |

**Steps**

1. Super admin: Connectors → Razorpay Allowed off
2. Owner: open Payments
3. Shopper: open checkout
4. Verify the expected result below before going on.

**Expected result:** Payments says Razorpay is not allowed; checkout offers no Pay online (COD only if on); switching it back restores.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### E2E-09-002 · Connectors: COD rules at checkout

| Field | Value |
|---|---|
| Module | E2E-09 · Connector allowance to checkout |
| Test case ID | E2E-09-002 |
| Scenario and objective | COD rules from Payments apply at checkout and show to the platform. |
| Preconditions | COD ₹499–₹25,000, fee ₹49 |
| Test data | Carts ₹300 and ₹600 |
| Role | Shopper, Super admin |
| Priority | High |
| Type | Boundary |

**Steps**

1. Shopper: checkout with ₹300 then ₹600
2. Super admin: Connectors tab
3. Verify the expected result below before going on.

**Expected result:** ₹300 has no COD; ₹600 offers COD with ₹49; the platform shows the vendor's rules.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
