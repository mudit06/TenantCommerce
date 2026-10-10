# VC-14 Schemes and offers

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Vendor CMS |
| Purpose | Occasion templates, timeline, scheme editor, schedule, live pricing, end now. |
| Runs as | Store owner |
| Start at | `http://localhost:3000/admin/collections/schemes` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `cms-schemes`, `cms-scheme-edit` (docs/screens) |
| Depends on | VC-04 |
| Test cases | 8 (2 in the smoke run) |

## Before you start

- Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit); store selling: `pnpm demo:selling home-orbit` run
- Schemes feature on

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

### VC-14-001 · Start: Start from an occasion

| Field | Value |
|---|---|
| Module | VC-14 · Schemes and offers |
| Test case ID | VC-14-001 |
| Scenario and objective | An occasion opens a prefilled draft. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit); store selling: `pnpm demo:selling home-orbit` run |
| Test data | Occasion Diwali |
| Role | Store owner |
| Priority | High |
| Type | Functional |

**Steps**

1. Open Marketing → Schemes and offers
2. Press Diwali under Start from an occasion
3. Verify the expected result below before going on.

**Expected result:** The editor opens a draft "Diwali 2026" with its badge.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-14-002 · Editor: Dates validation

| Field | Value |
|---|---|
| Module | VC-14 · Schemes and offers |
| Test case ID | VC-14-002 |
| Scenario and objective | The end must be after the start. |
| Preconditions | Scheme draft |
| Test data | Ends before Starts |
| Role | Store owner |
| Priority | High |
| Type | Validation |

**Steps**

1. Set Ends earlier than Starts
2. Save
3. Verify the expected result below before going on.

**Expected result:** Refused with a message.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-14-003 · Editor: Percent off range

| Field | Value |
|---|---|
| Module | VC-14 · Schemes and offers |
| Test case ID | VC-14-003 |
| Scenario and objective | Percent off must be between 1 and 100. |
| Preconditions | Scheme draft |
| Test data | Percent off 0, then 150 |
| Role | Store owner |
| Priority | Medium |
| Type | Boundary |

**Steps**

1. Enter 0 and save
2. Enter 150 and save
3. Verify the expected result below before going on.

**Expected result:** Both refused.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-14-004 · Schedule: Go live

| Field | Value |
|---|---|
| Module | VC-14 · Schemes and offers |
| Test case ID | VC-14-004 |
| Scenario and objective | Scheduling a started scheme makes it live on the store. |
| Preconditions | Scheme draft |
| Test data | Starts a minute ago, ends next week, Percent off 10, max 1500, Whole store, announcement text |
| Role | Store owner |
| Priority | Critical |
| Type | Functional, Integration |

**Steps**

1. Fill the scheme
2. Save
3. Press Schedule
4. Open http://home-orbit.localhost:3000
5. Verify the expected result below before going on.

**Expected result:** Status Live; the top bar shows the announcement; cards show the badge, offer price, MRP struck through and "until <date>"; product page says "Offer ends".

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-14-005 · Schedule: Cart discount line

| Field | Value |
|---|---|
| Module | VC-14 · Schemes and offers |
| Test case ID | VC-14-005 |
| Scenario and objective | A live scheme shows as its own discount line. |
| Preconditions | Scheme live |
| Test data | Add an item to the cart |
| Role | Store owner |
| Priority | Critical |
| Type | Integration |

**Steps**

1. Add a covered product to the cart
2. Open the cart
3. Verify the expected result below before going on.

**Expected result:** "Diwali 2026 − ₹…" under Discounts; totals recomputed by the server.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-14-006 · Timeline: Overlap explained

| Field | Value |
|---|---|
| Module | VC-14 · Schemes and offers |
| Test case ID | VC-14-006 |
| Scenario and objective | The timeline shows overlapping schemes. |
| Preconditions | Two schemes with overlapping dates |
| Test data | — |
| Role | Store owner |
| Priority | Low |
| Type | UI/UX |

**Steps**

1. Open the Schemes list
2. Verify the expected result below before going on.

**Expected result:** The six-month timeline shows both bars and the first overlap explained.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-14-007 · End: End now

| Field | Value |
|---|---|
| Module | VC-14 · Schemes and offers |
| Test case ID | VC-14-007 |
| Scenario and objective | Ending a scheme restores prices at once. |
| Preconditions | Scheme live |
| Test data | — |
| Role | Store owner |
| Priority | High |
| Type | Integration |

**Steps**

1. Press End now in the editor
2. Reload http://home-orbit.localhost:3000 and /offers/diwali-2026
3. Verify the expected result below before going on.

**Expected result:** Prices go back, the announcement goes, and the offer page says the offer has ended.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-14-008 · Permissions: Order manager read-only

| Field | Value |
|---|---|
| Module | VC-14 · Schemes and offers |
| Test case ID | VC-14-008 |
| Scenario and objective | Order managers see schemes without buttons. |
| Preconditions | Signed in as Order manager |
| Test data | — |
| Role | Order manager |
| Priority | Medium |
| Type | Security/Permissions |

**Steps**

1. Open Schemes and offers
2. Verify the expected result below before going on.

**Expected result:** The list shows without create or edit actions.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
