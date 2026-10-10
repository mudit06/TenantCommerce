# SA-03 All vendors

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Super Admin |
| Purpose | The vendor list with status tabs, search, filters, plan usage, orders in 30 days and CSV export. |
| Runs as | Super admin |
| Start at | `http://localhost:3000/admin/collections/tenants` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `sa-vendors` (docs/screens) |
| Depends on | SA-01 |
| Test cases | 9 (3 in the smoke run) |

## Before you start

- Signed in as super admin
- Stores Home Orbit (draft), Demo Sanitary and Demo Clothing (active) from the seed

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

### SA-03-001 · List: Columns and tabs

| Field | Value |
|---|---|
| Module | SA-03 · All vendors |
| Test case ID | SA-03-001 |
| Scenario and objective | The list shows each vendor with the wireframe's columns and tab counts. |
| Preconditions | Signed in as super admin; fresh seed |
| Test data | — |
| Role | Super admin |
| Priority | High |
| Type | UI/UX |

**Steps**

1. Open Vendors → All vendors
2. Verify the expected result below before going on.

**Expected result:** Columns Vendor (with primary domain), Industry, Plan, Store, Subscription, Products (bar against the plan), Orders in 30 days, Created. Tabs All 3, Active 2, Draft 1.

**Actual result:** "3 stores · 2 live", tabs All 3, Active 2, Draft 1, Suspended 0, Archived 0; columns as the wireframe.

**Status:** Pass (Claude (Claude in Chrome), 2026-10-10)

**Execution notes / defect:** DEF-001 (fixed and retested)

### SA-03-002 · Search: By name

| Field | Value |
|---|---|
| Module | SA-03 · All vendors |
| Test case ID | SA-03-002 |
| Scenario and objective | Search narrows the list and the tab counts follow. |
| Preconditions | On All vendors |
| Test data | Search "orbit" |
| Role | Super admin |
| Priority | High |
| Type | Functional |

**Steps**

1. Type orbit in the search box
2. Read the rows and tab counts
3. Verify the expected result below before going on.

**Expected result:** Only Home Orbit stays; the tabs count 1 under All and Draft.

**Actual result:** "orbit" left only Home Orbit; tabs became All 1, Active 0, Draft 1; ?q=orbit in the address.

**Status:** Pass (Claude (Claude in Chrome), 2026-10-10)

**Execution notes / defect:** The extension's type action did not reach this search box; key presses and input events did. A human should type it once.

### SA-03-003 · Search: By slug, GSTIN or domain

| Field | Value |
|---|---|
| Module | SA-03 · All vendors |
| Test case ID | SA-03-003 |
| Scenario and objective | Search also matches slug, GSTIN and domain. |
| Preconditions | On All vendors |
| Test data | Search "demo-sanitary"; then part of a GSTIN; then "localhost" |
| Role | Super admin |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Search each value in turn
2. Verify the expected result below before going on.

**Expected result:** The slug finds Demo Sanitary; a GSTIN fragment finds its store; "localhost" matches stores by their domain.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-03-004 · Search: No match

| Field | Value |
|---|---|
| Module | SA-03 · All vendors |
| Test case ID | SA-03-004 |
| Scenario and objective | A search with no match shows an empty state. |
| Preconditions | On All vendors |
| Test data | Search "zzzz-no-store" |
| Role | Super admin |
| Priority | Low |
| Type | Negative |

**Steps**

1. Type the value
2. Verify the expected result below before going on.

**Expected result:** No rows and an empty-list message; clearing the search brings all vendors back.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-03-005 · Filters: Plan, Industry, Subscription

| Field | Value |
|---|---|
| Module | SA-03 · All vendors |
| Test case ID | SA-03-005 |
| Scenario and objective | Each filter narrows the list and is kept in the address. |
| Preconditions | On All vendors |
| Test data | Plan = Starter; Industry = Hardware; Subscription = Trial |
| Role | Super admin |
| Priority | Medium |
| Type | Functional, Data persistence |

**Steps**

1. Pick each filter in turn
2. Copy the address into a new tab
3. Verify the expected result below before going on.

**Expected result:** Rows and tab counts follow each filter; the new tab opens with the same filters applied.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-03-006 · Tabs: Status tabs

| Field | Value |
|---|---|
| Module | SA-03 · All vendors |
| Test case ID | SA-03-006 |
| Scenario and objective | Each status tab shows only stores in that state. |
| Preconditions | On All vendors |
| Test data | — |
| Role | Super admin |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Click Draft
2. Click Active
3. Verify the expected result below before going on.

**Expected result:** Draft lists only Home Orbit (fresh seed); Active lists Demo Sanitary and Demo Clothing.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-03-007 · Plan usage: Usage bar

| Field | Value |
|---|---|
| Module | SA-03 · All vendors |
| Test case ID | SA-03-007 |
| Scenario and objective | Products used against the plan show a bar and a warning at 90%. |
| Preconditions | Home Orbit on Starter (500 products) with 110 products |
| Test data | — |
| Role | Super admin |
| Priority | Low |
| Type | UI/UX |

**Steps**

1. Read Home Orbit's Products column
2. Verify the expected result below before going on.

**Expected result:** "110 / 500" with a bar about a fifth full; a store at 90% or more would show "N% used".

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-03-008 · Export: Export CSV

| Field | Value |
|---|---|
| Module | SA-03 · All vendors |
| Test case ID | SA-03-008 |
| Scenario and objective | Export downloads the list as filtered. |
| Preconditions | On All vendors with the Draft tab |
| Test data | — |
| Role | Super admin |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Press Export CSV
2. Open the file
3. Verify the expected result below before going on.

**Expected result:** A CSV downloads with one row per vendor shown (only Home Orbit for the Draft tab) and the list's columns.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-03-009 · Navigation: Open a vendor

| Field | Value |
|---|---|
| Module | SA-03 · All vendors |
| Test case ID | SA-03-009 |
| Scenario and objective | A row opens the vendor overview. |
| Preconditions | On All vendors |
| Test data | — |
| Role | Super admin |
| Priority | High |
| Type | Functional |

**Steps**

1. Click Home Orbit
2. Verify the expected result below before going on.

**Expected result:** The vendor overview opens with the tabs Overview, Features, Connectors, Domains, Billing, Staff.

**Actual result:** Home Orbit opened with Features, Connectors, Domains, Billing, Staff tabs.

**Status:** Pass (Claude (Claude in Chrome), 2026-10-10)

**Execution notes / defect:** —
