# VC-08 Import and export

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Vendor CMS |
| Purpose | CSV import of products, stock and prices, dealers with a full check first; templates; error report; export. |
| Runs as | Store owner |
| Start at | `http://localhost:3000/admin/import` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `cms-import` (docs/screens) |
| Depends on | VC-04 |
| Test cases | 7 (0 in the smoke run) |

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

### VC-08-001 · Templates: Download template

| Field | Value |
|---|---|
| Module | VC-08 · Import and export |
| Test case ID | VC-08-001 |
| Scenario and objective | Templates download for each import kind. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | — |
| Role | Store owner |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Open Catalog → Import and export
2. Download the Products template
3. Verify the expected result below before going on.

**Expected result:** A CSV with the template columns downloads.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-08-002 · Check: Bad rows found before import

| Field | Value |
|---|---|
| Module | VC-08 · Import and export |
| Test case ID | VC-08-002 |
| Scenario and objective | The check lists bad rows and changes nothing. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Template with a price "4,250/-" on one row |
| Role | Store owner |
| Priority | High |
| Type | Validation |

**Steps**

1. Upload the file
2. Verify the expected result below before going on.

**Expected result:** Figures and the bad row with "Price must be a number in rupees"; Products are unchanged so far.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-08-003 · Check: Error report

| Field | Value |
|---|---|
| Module | VC-08 · Import and export |
| Test case ID | VC-08-003 |
| Scenario and objective | The error report downloads. |
| Preconditions | A checked file with errors |
| Test data | — |
| Role | Store owner |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Press Download error report
2. Verify the expected result below before going on.

**Expected result:** A CSV of the bad rows with reasons.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-08-004 · Import: Import ready rows

| Field | Value |
|---|---|
| Module | VC-08 · Import and export |
| Test case ID | VC-08-004 |
| Scenario and objective | Ready rows import in the background. |
| Preconditions | A checked file |
| Test data | Two new rows with two finishes; one price change |
| Role | Store owner |
| Priority | High |
| Type | Functional, Integration |

**Steps**

1. Press Import N ready rows
2. Wait about a minute
3. Read Recent imports and the terminal
4. Verify the expected result below before going on.

**Expected result:** Status Imported; an email printed in the terminal; the new product is a draft with both finishes; the existing SKU has its new price.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-08-005 · Import: Wrong file

| Field | Value |
|---|---|
| Module | VC-08 · Import and export |
| Test case ID | VC-08-005 |
| Scenario and objective | A non-CSV or wrong columns file is refused. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | A .xlsx or a CSV with other headers |
| Role | Store owner |
| Priority | Medium |
| Type | Negative |

**Steps**

1. Upload the file
2. Verify the expected result below before going on.

**Expected result:** Refused with a clear message about the format or missing columns.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-08-006 · Import: Stock and prices only

| Field | Value |
|---|---|
| Module | VC-08 · Import and export |
| Test case ID | VC-08-006 |
| Scenario and objective | The stock and prices import updates existing SKUs. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit); variants exist |
| Test data | sku,price,mrp,stock_qty for 2 SKUs; 1 unknown SKU |
| Role | Store owner |
| Priority | Medium |
| Type | Functional, Negative |

**Steps**

1. Choose Stock and prices only
2. Upload and import
3. Verify the expected result below before going on.

**Expected result:** Known SKUs update; the unknown SKU is listed as an error.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-08-007 · Permissions: Who can import

| Field | Value |
|---|---|
| Module | VC-08 · Import and export |
| Test case ID | VC-08-007 |
| Scenario and objective | Only owners, managers and catalog editors import. |
| Preconditions | Signed in as Order manager |
| Test data | — |
| Role | Order manager |
| Priority | Medium |
| Type | Security/Permissions |

**Steps**

1. Look for Import and export in the menu
2. Open http://localhost:3000/admin/import
3. Verify the expected result below before going on.

**Expected result:** Not in the menu; the page refuses access.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
