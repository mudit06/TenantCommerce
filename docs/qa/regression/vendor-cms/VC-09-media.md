# VC-09 Media library

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Vendor CMS |
| Purpose | Grid, tabs, search, storage meter, alt text, where used, replace, delete. |
| Runs as | Store owner |
| Start at | `http://localhost:3000/admin/collections/media` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `cms-media` (docs/screens) |
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

### VC-09-001 · Library: Grid and tabs

| Field | Value |
|---|---|
| Module | VC-09 · Media library |
| Test case ID | VC-09-001 |
| Scenario and objective | The media library shows a grid with tabs and storage. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | — |
| Role | Store owner |
| Priority | Medium |
| Type | UI/UX |

**Steps**

1. Open Catalog → Media
2. Verify the expected result below before going on.

**Expected result:** Tabs All, Images, Documents, Videos; search; storage meter against the plan; a grid of files.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-09-002 · Detail: Where used and alt text

| Field | Value |
|---|---|
| Module | VC-09 · Media library |
| Test case ID | VC-09-002 |
| Scenario and objective | Selecting a file shows its details and where it is used. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | A product photo |
| Role | Store owner |
| Priority | Medium |
| Type | Data persistence |

**Steps**

1. Click a photo
2. Edit Alt text and Save in place
3. Reload
4. Verify the expected result below before going on.

**Expected result:** Preview, alt text, type and size, sizes made, used by products/categories; the new alt text stays after reload.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-09-003 · Upload: Alt text required

| Field | Value |
|---|---|
| Module | VC-09 · Media library |
| Test case ID | VC-09-003 |
| Scenario and objective | An image cannot be saved without alt text. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | A JPG, no alt text |
| Role | Store owner |
| Priority | High |
| Type | Validation |

**Steps**

1. Upload the image without alt text
2. Save
3. Verify the expected result below before going on.

**Expected result:** Refused; with alt text it saves and the storage meter goes up.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-09-004 · Upload: Unsupported file

| Field | Value |
|---|---|
| Module | VC-09 · Media library |
| Test case ID | VC-09-004 |
| Scenario and objective | Files that are not images, PDFs or allowed types are refused. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | An .exe or .zip |
| Role | Store owner |
| Priority | Medium |
| Type | Negative |

**Steps**

1. Try to upload it
2. Verify the expected result below before going on.

**Expected result:** Refused with the allowed types.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-09-005 · Delete: Delete a file in use

| Field | Value |
|---|---|
| Module | VC-09 · Media library |
| Test case ID | VC-09-005 |
| Scenario and objective | Deleting warns when a file is used. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | A photo used by a product |
| Role | Store owner |
| Priority | Medium |
| Type | Negative |

**Steps**

1. Select it
2. Press Delete
3. Verify the expected result below before going on.

**Expected result:** A warning lists where it is used before confirming.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** Requires confirmation of whether deleting in-use files is blocked or only warned.

### VC-09-006 · Search: Search media

| Field | Value |
|---|---|
| Module | VC-09 · Media library |
| Test case ID | VC-09-006 |
| Scenario and objective | Search filters by name or alt text. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | "towel" |
| Role | Store owner |
| Priority | Low |
| Type | Functional |

**Steps**

1. Type towel
2. Verify the expected result below before going on.

**Expected result:** Only matching files remain.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
