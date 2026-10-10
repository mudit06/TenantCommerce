# SA-02 Platform dashboard

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Super Admin |
| Purpose | Live stores, MRR, past due, orders today, GMV, sales chart, needs attention, top stores, recently onboarded. |
| Runs as | Super admin |
| Start at | `http://localhost:3000/admin` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `sa-dashboard` (docs/screens) |
| Depends on | SA-01 |
| Test cases | 8 (2 in the smoke run) |

## Before you start

- Signed in as super admin
- Optional: `pnpm demo:selling home-orbit` and `pnpm demo:orders home-orbit` for sales figures

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

### SA-02-001 · Figures: Tiles

| Field | Value |
|---|---|
| Module | SA-02 · Platform dashboard |
| Test case ID | SA-02-001 |
| Scenario and objective | The five figures show as the wireframe. |
| Preconditions | Signed in as super admin |
| Test data | Seeded QA data |
| Role | Super admin |
| Priority | High |
| Type | UI/UX |

**Steps**

1. Open http://localhost:3000/admin
2. Read the figure tiles
3. Verify the expected result below before going on.

**Expected result:** Live stores, MRR (before GST), Past due, Orders today (all stores) and GMV this month are shown with numbers.

**Actual result:** Live stores 2 (1 paying, 1 on trial), MRR ₹6,999 before GST, Past due 0, Orders today 1, GMV October ₹25,273.

**Status:** Pass (Claude (Claude in Chrome), 2026-10-10)

**Execution notes / defect:** —

### SA-02-002 · Figures: Live stores count

| Field | Value |
|---|---|
| Module | SA-02 · Platform dashboard |
| Test case ID | SA-02-002 |
| Scenario and objective | Live stores counts active stores only. |
| Preconditions | Two active stores and Home Orbit as a draft |
| Test data | — |
| Role | Super admin |
| Priority | High |
| Type | Integration |

**Steps**

1. Read Live stores
2. Compare with All vendors → Active tab count
3. Verify the expected result below before going on.

**Expected result:** Live stores equals the Active count (2 on a fresh seed; 3 after Home Orbit goes live).

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-02-003 · Sales: Sales across all stores

| Field | Value |
|---|---|
| Module | SA-02 · Platform dashboard |
| Test case ID | SA-02-003 |
| Scenario and objective | The chart has one bar per day of the month and reflects orders. |
| Preconditions | Demo orders created for Home Orbit |
| Test data | `pnpm demo:orders home-orbit` |
| Role | Super admin |
| Priority | Medium |
| Type | Integration |

**Steps**

1. Read the Sales across all stores chart
2. Hover or compare bars with Top stores
3. Verify the expected result below before going on.

**Expected result:** Bars appear on days with sold orders; days without orders are empty; the month total matches GMV this month.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-02-004 · Lists: Top stores this month

| Field | Value |
|---|---|
| Module | SA-02 · Platform dashboard |
| Test case ID | SA-02-004 |
| Scenario and objective | Stores with orders are ranked by GMV. |
| Preconditions | Demo orders exist |
| Test data | — |
| Role | Super admin |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Read Top stores this month
2. Verify the expected result below before going on.

**Expected result:** Each row shows vendor, industry, orders, GMV and the change against last month to the same day; Home Orbit is listed.

**Actual result:** Top stores: Home Orbit, Door and furniture hardware, Home decor, 8 orders, ₹25,273, New.

**Status:** Pass (Claude (Claude in Chrome), 2026-10-10)

**Execution notes / defect:** —

### SA-02-005 · Lists: Needs attention

| Field | Value |
|---|---|
| Module | SA-02 · Platform dashboard |
| Test case ID | SA-02-005 |
| Scenario and objective | Stores needing action are listed with the reason. |
| Preconditions | Fresh seed |
| Test data | — |
| Role | Super admin |
| Priority | High |
| Type | Functional |

**Steps**

1. Read Needs attention
2. Verify the expected result below before going on.

**Expected result:** Home Orbit "Store is still a draft" and the owners who have not accepted their invite are listed; each row opens the vendor.

**Actual result:** Home Orbit "Store is still a draft" and three owners who have not accepted their invite.

**Status:** Pass (Claude (Claude in Chrome), 2026-10-10)

**Execution notes / defect:** —

### SA-02-006 · Lists: Recently onboarded with Resend invite

| Field | Value |
|---|---|
| Module | SA-02 · Platform dashboard |
| Test case ID | SA-02-006 |
| Scenario and objective | Recently created stores show with status; Resend invite sends a new link. |
| Preconditions | Fresh seed |
| Test data | — |
| Role | Super admin |
| Priority | Medium |
| Type | Integration |

**Steps**

1. Read Recently onboarded
2. Press Resend invite on a store whose owner has not accepted
3. Watch the `pnpm dev` terminal
4. Verify the expected result below before going on.

**Expected result:** Home Orbit (Draft), Demo Clothing and Demo Sanitary (Active) show; Resend invite prints a [dev-log email] with a set-password link.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-02-007 · Navigation: Platform menu

| Field | Value |
|---|---|
| Module | SA-02 · Platform dashboard |
| Test case ID | SA-02-007 |
| Scenario and objective | The left menu has only platform sections. |
| Preconditions | Signed in as super admin, no store session |
| Test data | — |
| Role | Super admin |
| Priority | High |
| Type | UI/UX, Security/Permissions |

**Steps**

1. Read the left menu
2. Verify the expected result below before going on.

**Expected result:** Dashboard; Vendors (All vendors, New vendor); Billing (Plans, Subscriptions); Platform (Team and access, Staff users). No store sections such as Products or Orders.

**Actual result:** Menu: Dashboard, All vendors, New vendor, Plans, Subscriptions, Team and access, Staff users; no store sections.

**Status:** Pass (Claude (Claude in Chrome), 2026-10-10)

**Execution notes / defect:** —

### SA-02-008 · Gate: Two-step gate

| Field | Value |
|---|---|
| Module | SA-02 · Platform dashboard |
| Test case ID | SA-02-008 |
| Scenario and objective | A platform account without two-step sees the setup in place of the menu. |
| Preconditions | A Support teammate who has not set up two-step |
| Test data | — |
| Role | Super admin |
| Priority | High |
| Type | Security/Permissions |

**Steps**

1. Sign in as that teammate
2. Try to open All vendors from the address bar
3. Verify the expected result below before going on.

**Expected result:** The panel shows only "Set up two-step sign-in"; no vendor data is shown until it is done.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
