# VC-21 Navigation (menus)

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Vendor CMS |
| Purpose | Header menu outline, footer columns, phone menu, link targets. |
| Runs as | Store owner |
| Start at | `http://localhost:3000/admin/collections/navigation` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `cms-navigation` (docs/screens) |
| Depends on | VC-05, VC-20 |
| Test cases | 4 (0 in the smoke run) |

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

### VC-21-001 · Header menu: Outline follows the editor

| Field | Value |
|---|---|
| Module | VC-21 · Navigation (menus) |
| Test case ID | VC-21-001 |
| Scenario and objective | The header menu outline mirrors edits. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Rename "About us" to "Our story" |
| Role | Store owner |
| Priority | Medium |
| Type | Integration |

**Steps**

1. Open Content → Navigation
2. Rename the item below
3. Read the outline
4. Verify the expected result below before going on.

**Expected result:** The outline follows as you type; after Save the store menu shows the new name.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-21-002 · Footer: Footer columns

| Field | Value |
|---|---|
| Module | VC-21 · Navigation (menus) |
| Test case ID | VC-21-002 |
| Scenario and objective | Footer columns show on the store. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Add a link "Warranty" to /pages/warranty in Company |
| Role | Store owner |
| Priority | Medium |
| Type | Integration |

**Steps**

1. Edit the footer column
2. Save
3. Reload http://home-orbit.localhost:3000
4. Verify the expected result below before going on.

**Expected result:** The footer shows the link; feature links (Find a dealer, Downloads) are still listed.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-21-003 · Links: Link to a page, category, product or URL

| Field | Value |
|---|---|
| Module | VC-21 · Navigation (menus) |
| Test case ID | VC-21-003 |
| Scenario and objective | Each link type points to the right place. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | One link of each type |
| Role | Store owner |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Add one link of each type
2. Save
3. Click each on the store
4. Verify the expected result below before going on.

**Expected result:** Each opens the chosen page, category, product or address.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-21-004 · Limits: Dropdown up to 4 columns

| Field | Value |
|---|---|
| Module | VC-21 · Navigation (menus) |
| Test case ID | VC-21-004 |
| Scenario and objective | A dropdown allows at most four columns. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | A 5th column |
| Role | Store owner |
| Priority | Low |
| Type | Boundary |

**Steps**

1. Add a 5th column to a dropdown
2. Verify the expected result below before going on.

**Expected result:** Refused or the add button disappears at 4.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
