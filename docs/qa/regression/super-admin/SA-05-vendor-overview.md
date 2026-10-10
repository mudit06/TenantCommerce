# SA-05 Vendor overview and store status

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Super Admin |
| Purpose | Business details (read-only with Edit), plan usage, store health, internal notes, recent changes; Go live, Suspend, Resume, Archive. |
| Runs as | Super admin |
| Start at | `http://localhost:3000/admin/collections/tenants/<id>` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `sa-vendor` (docs/screens) |
| Depends on | SA-03 |
| Test cases | 12 (2 in the smoke run) |

## Before you start

- Signed in as super admin
- Home Orbit exists

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

### SA-05-001 · Header: Status and actions

| Field | Value |
|---|---|
| Module | SA-05 · Vendor overview and store status |
| Test case ID | SA-05-001 |
| Scenario and objective | The header shows the store's state and actions. |
| Preconditions | Home Orbit as a draft |
| Test data | — |
| Role | Super admin |
| Priority | High |
| Type | UI/UX |

**Steps**

1. Open All vendors → Home Orbit
2. Verify the expected result below before going on.

**Expected result:** Logo or initials, "Store draft", "Starter plan", home-orbit.localhost, View store and Go live.

**Actual result:** Store draft, Starter plan, home-orbit.localhost, View store, Go live, Manage store, View as support.

**Status:** Pass (Claude (Claude in Chrome), 2026-10-10)

**Execution notes / defect:** —

### SA-05-002 · Business details: Read-only then Edit

| Field | Value |
|---|---|
| Module | SA-05 · Vendor overview and store status |
| Test case ID | SA-05-002 |
| Scenario and objective | Business details are read-only until Edit is pressed. |
| Preconditions | On the overview |
| Test data | — |
| Role | Super admin |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Read Business details
2. Press Edit
3. Verify the expected result below before going on.

**Expected result:** Values show as text first; Edit opens the form with the same values.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-05-003 · Business details: GSTIN fills PAN and state

| Field | Value |
|---|---|
| Module | SA-05 · Vendor overview and store status |
| Test case ID | SA-05-003 |
| Scenario and objective | Changing the GSTIN updates PAN and state. |
| Preconditions | Business details in edit mode |
| Test data | GSTIN 27AAPFU0939F1ZV |
| Role | Super admin |
| Priority | High |
| Type | Functional, Data persistence |

**Steps**

1. Type the GSTIN
2. Save
3. Verify the expected result below before going on.

**Expected result:** PAN and State (Maharashtra 27) fill in; Save succeeds and the read-only view shows them after a reload.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-05-004 · Business details: Invalid GSTIN

| Field | Value |
|---|---|
| Module | SA-05 · Vendor overview and store status |
| Test case ID | SA-05-004 |
| Scenario and objective | An invalid GSTIN is not saved. |
| Preconditions | Edit mode |
| Test data | GSTIN 27AAPFU0939F1ZX |
| Role | Super admin |
| Priority | High |
| Type | Validation |

**Steps**

1. Type the GSTIN
2. Save
3. Verify the expected result below before going on.

**Expected result:** The checksum error shows and nothing is saved.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-05-005 · Plan usage: Usage figures

| Field | Value |
|---|---|
| Module | SA-05 · Vendor overview and store status |
| Test case ID | SA-05-005 |
| Scenario and objective | Plan usage shows products and staff against the plan. |
| Preconditions | On the overview |
| Test data | — |
| Role | Super admin |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Read Plan usage
2. Verify the expected result below before going on.

**Expected result:** Products 110 / 500 and Staff users 1 / 3 (fresh seed).

**Actual result:** Products 110 / 500, Staff users 1 / 3, Storage 0 GB / 5 GB, Orders this month 18 / 1,000 (after the DEF-002 fix).

**Status:** Pass (Claude (Claude in Chrome), 2026-10-10)

**Execution notes / defect:** DEF-002 (fixed and retested)

### SA-05-006 · Store health: Health card

| Field | Value |
|---|---|
| Module | SA-05 · Vendor overview and store status |
| Test case ID | SA-05-006 |
| Scenario and objective | Store health summarises the store's state. |
| Preconditions | On the overview |
| Test data | — |
| Role | Super admin |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Read Store health
2. Verify the expected result below before going on.

**Expected result:** Last order, Razorpay state (and webhook), any failing connector, the primary domain and the storefront design (vendors/home-orbit).

**Actual result:** Store health: last order Today 00:13, Razorpay Not connected, primary domain home-orbit.localhost, design vendors/home-orbit.

**Status:** Pass (Claude (Claude in Chrome), 2026-10-10)

**Execution notes / defect:** —

### SA-05-007 · Notes: Internal notes and recent changes

| Field | Value |
|---|---|
| Module | SA-05 · Vendor overview and store status |
| Test case ID | SA-05-007 |
| Scenario and objective | An internal note saves and the change is recorded. |
| Preconditions | On the overview |
| Test data | Note "QA check 1" |
| Role | Super admin |
| Priority | High |
| Type | Data persistence |

**Steps**

1. Add a line under Internal notes
2. Save
3. Reload
4. Read Recent changes
5. Verify the expected result below before going on.

**Expected result:** The note is still there after reload; Recent changes lists the edit with who and when.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-05-008 · Status: Go live

| Field | Value |
|---|---|
| Module | SA-05 · Vendor overview and store status |
| Test case ID | SA-05-008 |
| Scenario and objective | Go live makes the store active and indexable. |
| Preconditions | Home Orbit as a draft |
| Test data | — |
| Role | Super admin |
| Priority | Critical |
| Type | Functional, Integration |

**Steps**

1. Press Go live and confirm
2. Reload http://home-orbit.localhost:3000
3. Open http://home-orbit.localhost:3000/robots.txt
4. Verify the expected result below before going on.

**Expected result:** Status Active; the preview bar is gone; robots.txt allows search engines and names the sitemap; Live stores on the dashboard goes up by 1.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-05-009 · Status: Suspend needs a reason

| Field | Value |
|---|---|
| Module | SA-05 · Vendor overview and store status |
| Test case ID | SA-05-009 |
| Scenario and objective | Suspend is refused without a reason. |
| Preconditions | Home Orbit active |
| Test data | Empty reason |
| Role | Super admin |
| Priority | High |
| Type | Validation |

**Steps**

1. Press Suspend store
2. Leave the reason empty and confirm
3. Verify the expected result below before going on.

**Expected result:** The reason is required; the store stays active.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-05-010 · Status: Suspend

| Field | Value |
|---|---|
| Module | SA-05 · Vendor overview and store status |
| Test case ID | SA-05-010 |
| Scenario and objective | Suspending closes the store to shoppers. |
| Preconditions | Home Orbit active |
| Test data | Reason "QA suspend test" |
| Role | Super admin |
| Priority | Critical |
| Type | Functional, Integration |

**Steps**

1. Press Suspend store
2. Type the reason and confirm
3. Reload http://home-orbit.localhost:3000 in a private window
4. Verify the expected result below before going on.

**Expected result:** "Store unavailable" on the store; /robots.txt says Disallow: /; the overview shows Suspended.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-05-011 · Status: Resume

| Field | Value |
|---|---|
| Module | SA-05 · Vendor overview and store status |
| Test case ID | SA-05-011 |
| Scenario and objective | Resume reopens a suspended store at once. |
| Preconditions | Home Orbit suspended |
| Test data | — |
| Role | Super admin |
| Priority | Critical |
| Type | Functional |

**Steps**

1. Press Resume store
2. Reload http://home-orbit.localhost:3000
3. Verify the expected result below before going on.

**Expected result:** The store is back immediately; Recent changes lists Go live, Suspend and Resume with reasons.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-05-012 · Status: Archive

| Field | Value |
|---|---|
| Module | SA-05 · Vendor overview and store status |
| Test case ID | SA-05-012 |
| Scenario and objective | Archiving hides the store and keeps its data. |
| Preconditions | A throw-away store (Test Locks from SA-04) |
| Test data | Reason "QA archive" |
| Role | Super admin |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Archive Test Locks with a reason
2. Open http://test-locks.localhost:3000
3. Look for it under All vendors → Archived
4. Verify the expected result below before going on.

**Expected result:** The store address shows not found; the vendor is listed as Archived with its data.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** Do not archive Home Orbit.
