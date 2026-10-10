# VC-07 Brands, Documents and Variants

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Vendor CMS |
| Purpose | Supporting catalogue records: brands, product documents (PDF), variants list. |
| Runs as | Store owner |
| Start at | `http://localhost:3000/admin/collections/brands` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `cms-products` (docs/screens) |
| Depends on | VC-04 |
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

### VC-07-001 · Brands: Create brand

| Field | Value |
|---|---|
| Module | VC-07 · Brands, Documents and Variants |
| Test case ID | VC-07-001 |
| Scenario and objective | A brand saves with a name. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Brand "Home Orbit Premium" |
| Role | Store owner |
| Priority | Low |
| Type | Functional |

**Steps**

1. Open Catalog → Brands
2. Create New
3. Type the name, Save
4. Verify the expected result below before going on.

**Expected result:** The brand is listed; an empty name is refused.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-07-002 · Brands: Duplicate brand

| Field | Value |
|---|---|
| Module | VC-07 · Brands, Documents and Variants |
| Test case ID | VC-07-002 |
| Scenario and objective | Two brands with the same slug are refused. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Same name again |
| Role | Store owner |
| Priority | Low |
| Type | Validation |

**Steps**

1. Create a brand with the same name
2. Verify the expected result below before going on.

**Expected result:** Refused as already used.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-07-003 · Documents: Add a PDF

| Field | Value |
|---|---|
| Module | VC-07 · Brands, Documents and Variants |
| Test case ID | VC-07-003 |
| Scenario and objective | A product document with a PDF saves and links to a product. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Title "Aldrop spec sheet", type Spec sheet, a small PDF, Show on the Downloads page |
| Role | Store owner |
| Priority | Medium |
| Type | Integration |

**Steps**

1. Open Catalog → Documents
2. Create New with the PDF
3. Link it on product HOAL-101 (Documents section)
4. Save
5. Verify the expected result below before going on.

**Expected result:** The document is listed; http://home-orbit.localhost:3000/downloads lists it; the product page shows it under Downloads.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-07-004 · Documents: PDF only

| Field | Value |
|---|---|
| Module | VC-07 · Brands, Documents and Variants |
| Test case ID | VC-07-004 |
| Scenario and objective | Non-PDF files are refused as documents. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | A .jpg file |
| Role | Store owner |
| Priority | Low |
| Type | Validation |

**Steps**

1. Try to attach a JPG as the PDF
2. Verify the expected result below before going on.

**Expected result:** Refused (PDF required).

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-07-005 · Variants: Variants list

| Field | Value |
|---|---|
| Module | VC-07 · Brands, Documents and Variants |
| Test case ID | VC-07-005 |
| Scenario and objective | The Variants list shows SKUs with stock and status. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit); variants created |
| Test data | — |
| Role | Store owner |
| Priority | Low |
| Type | Functional |

**Steps**

1. Open Catalog → Variants
2. Verify the expected result below before going on.

**Expected result:** Columns SKU, title, product, stock, status; search by SKU works.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-07-006 · Variants: Stock edit reaches store

| Field | Value |
|---|---|
| Module | VC-07 · Brands, Documents and Variants |
| Test case ID | VC-07-006 |
| Scenario and objective | Changing a variant's stock changes the store. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit); store selling: `pnpm demo:selling home-orbit` run; variants exist |
| Test data | Stock 0 on one variant |
| Role | Store owner |
| Priority | High |
| Type | Integration |

**Steps**

1. Set In stock = 0 on a variant
2. Save
3. Open the product on the store and pick that finish
4. Verify the expected result below before going on.

**Expected result:** The store says Out of stock for that finish and cannot add it to the cart.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
