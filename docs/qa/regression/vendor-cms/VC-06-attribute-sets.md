# VC-06 Attribute sets

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Vendor CMS |
| Purpose | Sets with fields, filter and finish options, swatches, validation. |
| Runs as | Store owner |
| Start at | `http://localhost:3000/admin/collections/attribute-sets` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `cms-attributes` (docs/screens) |
| Depends on | — |
| Test cases | 6 (0 in the smoke run) |

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

### VC-06-001 · Layout: Sets and table

| Field | Value |
|---|---|
| Module | VC-06 · Attribute sets |
| Test case ID | VC-06-001 |
| Scenario and objective | Attribute sets show the sets list and the field table. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Open Aldrops |
| Role | Store owner |
| Priority | Medium |
| Type | UI/UX |

**Steps**

1. Open Catalog → Attribute sets
2. Open Aldrops
3. Verify the expected result below before going on.

**Expected result:** Sets on the left with "N fields · M categories"; a table of fields with Filter, Finish option, Compare and Required ticks; Options for Finish with swatches.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-06-002 · Editor: Live table

| Field | Value |
|---|---|
| Module | VC-06 · Attribute sets |
| Test case ID | VC-06-002 |
| Scenario and objective | The table follows edits before saving. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Rename a field label |
| Role | Store owner |
| Priority | Low |
| Type | UI/UX |

**Steps**

1. Change a field label below the table
2. Verify the expected result below before going on.

**Expected result:** The table shows the new label as you type.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-06-003 · Validation: Unique codes

| Field | Value |
|---|---|
| Module | VC-06 · Attribute sets |
| Test case ID | VC-06-003 |
| Scenario and objective | Two fields cannot share a code. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Two fields with code "finish" |
| Role | Store owner |
| Priority | High |
| Type | Validation |

**Steps**

1. Add a field with an existing code
2. Save
3. Verify the expected result below before going on.

**Expected result:** Refused naming the duplicate code.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-06-004 · Validation: Options required

| Field | Value |
|---|---|
| Module | VC-06 · Attribute sets |
| Test case ID | VC-06-004 |
| Scenario and objective | Select fields need options. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | A select field with no options |
| Role | Store owner |
| Priority | Medium |
| Type | Validation |

**Steps**

1. Add a select field without options
2. Save
3. Verify the expected result below before going on.

**Expected result:** Refused with a message about missing options.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-06-005 · Validation: At most 3 variant options

| Field | Value |
|---|---|
| Module | VC-06 · Attribute sets |
| Test case ID | VC-06-005 |
| Scenario and objective | No more than 3 fields can be finish/variant options. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Tick Finish option on a 4th field |
| Role | Store owner |
| Priority | Medium |
| Type | Boundary |

**Steps**

1. Tick a 4th variant option
2. Save
3. Verify the expected result below before going on.

**Expected result:** Refused: at most 3 variant options.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-06-006 · Integration: Filters on the store

| Field | Value |
|---|---|
| Module | VC-06 · Attribute sets |
| Test case ID | VC-06-006 |
| Scenario and objective | Filterable fields become category filters. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Tick Filter on Finish |
| Role | Store owner |
| Priority | High |
| Type | Integration |

**Steps**

1. Tick Filter
2. Save
3. Open the category on http://home-orbit.localhost:3000
4. Verify the expected result below before going on.

**Expected result:** A Finish filter with counts appears on the category page.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
