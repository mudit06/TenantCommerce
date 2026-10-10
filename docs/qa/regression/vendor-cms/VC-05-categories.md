# VC-05 Categories

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Vendor CMS |
| Purpose | Category tree with drag and drop, nesting up to 3 levels, category form. |
| Runs as | Store owner |
| Start at | `http://localhost:3000/admin/collections/categories` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `cms-categories` (docs/screens) |
| Depends on | VC-06 |
| Test cases | 9 (1 in the smoke run) |

## Before you start

- Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit)

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

### VC-05-001 · Tree: Tree with counts

| Field | Value |
|---|---|
| Module | VC-05 · Categories |
| Test case ID | VC-05-001 |
| Scenario and objective | Categories show as a tree with product counts. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | — |
| Role | Store owner |
| Priority | High |
| Type | UI/UX |

**Steps**

1. Open Catalog → Categories
2. Verify the expected result below before going on.

**Expected result:** Door hardware 50 with its four subcategories, Home decor, Bathroom accessories and children, with counts.

**Actual result:** 13 categories; tree with counts (Door hardware 50, Aldrops 18, Pull handles 8, Glass door handles 12, …).

**Status:** Pass (Claude (Claude in Chrome), 2026-10-10)

**Execution notes / defect:** —

### VC-05-002 · Tree: Drag to reorder

| Field | Value |
|---|---|
| Module | VC-05 · Categories |
| Test case ID | VC-05-002 |
| Scenario and objective | Dragging reorders and the order is kept. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Towel racks above Towel rings |
| Role | Store owner |
| Priority | High |
| Type | Data persistence, Integration |

**Steps**

1. Drag Towel racks above Towel rings
2. Reload
3. Open the store menu on http://home-orbit.localhost:3000
4. Verify the expected result below before going on.

**Expected result:** The new order stays after reload and is the order of menus and tiles.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-05-003 · Tree: Nest by dropping

| Field | Value |
|---|---|
| Module | VC-05 · Categories |
| Test case ID | VC-05-003 |
| Scenario and objective | Dropping onto a category nests it; more than 3 levels is refused. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | A test category |
| Role | Store owner |
| Priority | Medium |
| Type | Boundary |

**Steps**

1. Drop Test category onto Aldrops (level 3)
2. Try to drop another category onto Test category (level 4)
3. Verify the expected result below before going on.

**Expected result:** The first works; the 4th level is refused with a message.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-05-004 · Tree: Keyboard moves

| Field | Value |
|---|---|
| Module | VC-05 · Categories |
| Test case ID | VC-05-004 |
| Scenario and objective | Alt + arrow keys move a category. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | — |
| Role | Store owner |
| Priority | Low |
| Type | Accessibility |

**Steps**

1. Focus a category name
2. Press Alt + Up
3. Reload
4. Verify the expected result below before going on.

**Expected result:** It moves up one place and stays there.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-05-005 · Form: Slug from name

| Field | Value |
|---|---|
| Module | VC-05 · Categories |
| Test case ID | VC-05-005 |
| Scenario and objective | The slug fills from the name. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Name "Test category" |
| Role | Store owner |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Create a category with only the name
2. Save
3. Verify the expected result below before going on.

**Expected result:** Slug test-category; it shows in the tree.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-05-006 · Form: Name required

| Field | Value |
|---|---|
| Module | VC-05 · Categories |
| Test case ID | VC-05-006 |
| Scenario and objective | A category needs a name. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Empty name |
| Role | Store owner |
| Priority | Medium |
| Type | Validation |

**Steps**

1. Create a category with no name
2. Save
3. Verify the expected result below before going on.

**Expected result:** Refused with a required field message.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-05-007 · Form: No loops

| Field | Value |
|---|---|
| Module | VC-05 · Categories |
| Test case ID | VC-05-007 |
| Scenario and objective | A category cannot be its own parent or descendant's child. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Door hardware parent = Aldrops |
| Role | Store owner |
| Priority | Medium |
| Type | Negative |

**Steps**

1. Set Door hardware's parent to Aldrops
2. Save
3. Verify the expected result below before going on.

**Expected result:** Refused (would create a loop).

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-05-008 · Form: View on store

| Field | Value |
|---|---|
| Module | VC-05 · Categories |
| Test case ID | VC-05-008 |
| Scenario and objective | View on store opens the category page. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Aldrops |
| Role | Store owner |
| Priority | Low |
| Type | Integration |

**Steps**

1. Open Aldrops
2. Press View on store
3. Verify the expected result below before going on.

**Expected result:** http://home-orbit.localhost:3000/c/door-hardware/aldrops opens.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-05-009 · Form: Hide from store

| Field | Value |
|---|---|
| Module | VC-05 · Categories |
| Test case ID | VC-05-009 |
| Scenario and objective | Unticking Show on store hides the category. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Test category with a product |
| Role | Store owner |
| Priority | Medium |
| Type | Integration |

**Steps**

1. Untick Show on store
2. Save
3. Open its store address
4. Verify the expected result below before going on.

**Expected result:** The category is gone from menus and its address shows not found.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
