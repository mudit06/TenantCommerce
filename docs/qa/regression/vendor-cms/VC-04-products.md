# VC-04 Products and product editor

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Vendor CMS |
| Purpose | Product list with tabs, search, filters, bulk actions, export; the editor with specifications, variants, price and GST, publishing rules. |
| Runs as | Store owner |
| Start at | `http://localhost:3000/admin/collections/products` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `cms-products`, `cms-product-edit` (docs/screens) |
| Depends on | VC-05, VC-06 |
| Test cases | 18 (3 in the smoke run) |

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

### VC-04-001 · List: Header, tabs and columns

| Field | Value |
|---|---|
| Module | VC-04 · Products and product editor |
| Test case ID | VC-04-001 |
| Scenario and objective | The product list matches the wireframe. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | — |
| Role | Store owner |
| Priority | High |
| Type | UI/UX |

**Steps**

1. Open Catalog → Products
2. Verify the expected result below before going on.

**Expected result:** "110 products · 500 allowed on Starter", Import, Export, Add product; tabs All, Active, Draft, Archived with counts; rows with photo, model number, category, finishes, price or range, stock, status, updated.

**Actual result:** "110 products · 500 allowed on Starter", Import, Export, Add product, tabs All 110 / Active 110 / Draft 0 / Archived 0, Category filter with subcategories.

**Status:** Pass (Claude (Claude in Chrome), 2026-10-10)

**Execution notes / defect:** —

### VC-04-002 · List: Search by model number

| Field | Value |
|---|---|
| Module | VC-04 · Products and product editor |
| Test case ID | VC-04-002 |
| Scenario and objective | Search finds a product by model number. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | HOPH-504 |
| Role | Store owner |
| Priority | High |
| Type | Functional |

**Steps**

1. Type HOPH-504 in the search
2. Verify the expected result below before going on.

**Expected result:** One result: the Feather pull handle.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-04-003 · List: Search by exact SKU

| Field | Value |
|---|---|
| Module | VC-04 · Products and product editor |
| Test case ID | VC-04-003 |
| Scenario and objective | An exact variant SKU finds its product. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit); variants created (VC-04-012) |
| Test data | HOPH-504-8-INCH-ANTIQUE |
| Role | Store owner |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Search the SKU
2. Verify the expected result below before going on.

**Expected result:** The parent product is listed.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-04-004 · List: Category filter with subcategories

| Field | Value |
|---|---|
| Module | VC-04 · Products and product editor |
| Test case ID | VC-04-004 |
| Scenario and objective | Filtering by a parent category includes its children. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Category Door hardware |
| Role | Store owner |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Pick Category = Door hardware
2. Verify the expected result below before going on.

**Expected result:** 50 products from Aldrops, Pull handles, Glass door handles and Door stoppers.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-04-005 · List: Stock filter

| Field | Value |
|---|---|
| Module | VC-04 · Products and product editor |
| Test case ID | VC-04-005 |
| Scenario and objective | The stock filter shows low and out-of-stock products. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit); store selling: `pnpm demo:selling home-orbit` run |
| Test data | Stock = Out of stock |
| Role | Store owner |
| Priority | Low |
| Type | Functional |

**Steps**

1. Pick the stock filter
2. Verify the expected result below before going on.

**Expected result:** Only products whose variants are out of stock; an empty state when none.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-04-006 · Bulk: Publish and archive selected

| Field | Value |
|---|---|
| Module | VC-04 · Products and product editor |
| Test case ID | VC-04-006 |
| Scenario and objective | Bulk actions act on ticked rows and report failures. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Tick two products, one without a photo |
| Role | Store owner |
| Priority | High |
| Type | Functional, Negative |

**Steps**

1. Tick two rows
2. Press Archive
3. Then tick them and Publish
4. Verify the expected result below before going on.

**Expected result:** Archive moves both to Archived; Publish activates the one that can and lists the other with the reason (no photo).

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-04-007 · Bulk: Change category

| Field | Value |
|---|---|
| Module | VC-04 · Products and product editor |
| Test case ID | VC-04-007 |
| Scenario and objective | Bulk change category moves products. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Two products → Towel rings |
| Role | Store owner |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Tick two products
2. Press Change category
3. Pick Towel rings and confirm
4. Verify the expected result below before going on.

**Expected result:** Both now show Towel rings as their category.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-04-008 · Export: Export and export selected

| Field | Value |
|---|---|
| Module | VC-04 · Products and product editor |
| Test case ID | VC-04-008 |
| Scenario and objective | Export gives the import template's columns. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | — |
| Role | Store owner |
| Priority | Medium |
| Type | Functional, Integration |

**Steps**

1. Press Export
2. Tick two rows and press Export selected
3. Verify the expected result below before going on.

**Expected result:** CSVs in the template columns (with option.<axis> columns); the selected export has only those two; importing the file unchanged reports no changes.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-04-009 · Editor: Sections and side column

| Field | Value |
|---|---|
| Module | VC-04 · Products and product editor |
| Test case ID | VC-04-009 |
| Scenario and objective | The editor has the wireframe's sections. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Open HOPH-504 |
| Role | Store owner |
| Priority | Medium |
| Type | UI/UX |

**Steps**

1. Open the product
2. Verify the expected result below before going on.

**Expected result:** Basics, Photos and videos, Specifications, Finishes prices and stock, Price and GST, Documents, Spare parts and related products, Search engines; side: Status, How shoppers buy, Legal details, weight and box size, Featured, Offers and reviews.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-04-010 · Editor: GST preview

| Field | Value |
|---|---|
| Module | VC-04 · Products and product editor |
| Test case ID | VC-04-010 |
| Scenario and objective | The GST split preview follows the price. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Price ₹1,849, GST 18% |
| Role | Store owner |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Enter the price
2. Read the line under Price and GST
3. Verify the expected result below before going on.

**Expected result:** "For ₹1,849.00 the taxable value is ₹1,566.95 and GST is ₹282.05" (prices include GST).

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-04-011 · Editor: Finish offered reaches the store

| Field | Value |
|---|---|
| Module | VC-04 · Products and product editor |
| Test case ID | VC-04-011 |
| Scenario and objective | Unticking a finish removes it from the store. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | HOPH-504: untick Black matt |
| Role | Store owner |
| Priority | High |
| Type | Integration |

**Steps**

1. Untick Black matt under Specifications
2. Save
3. Open the product on http://home-orbit.localhost:3000
4. Tick it again and Save
5. Verify the expected result below before going on.

**Expected result:** Black matt is gone from the finish choices, then back.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-04-012 · Variants: Create variants

| Field | Value |
|---|---|
| Module | VC-04 · Products and product editor |
| Test case ID | VC-04-012 |
| Scenario and objective | Variants are created for every combination once. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | HOPH-504 with 3 sizes and 5 finishes |
| Role | Store owner |
| Priority | High |
| Type | Functional |

**Steps**

1. Press Create variants for every combination
2. Press it again
3. Verify the expected result below before going on.

**Expected result:** "15 variants created" with codes like HOPH-504-8-INCH-ANTIQUE; the second press says "Every combination already has a variant".

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-04-013 · Rules: Active needs a photo

| Field | Value |
|---|---|
| Module | VC-04 · Products and product editor |
| Test case ID | VC-04-013 |
| Scenario and objective | A product cannot be active without a photo. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Test handle, TEST-1, Aldrops, Active, no photo |
| Role | Store owner |
| Priority | Critical |
| Type | Validation |

**Steps**

1. Add product with these values
2. Save
3. Verify the expected result below before going on.

**Expected result:** Refused with "Add at least one photo before making the product active" (and a label details note); saving as Draft works.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-04-014 · Rules: Online selling needs price and HSN

| Field | Value |
|---|---|
| Module | VC-04 · Products and product editor |
| Test case ID | VC-04-014 |
| Scenario and objective | Buy online needs a selling price and HSN. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | How shoppers buy = Buy online, no price |
| Role | Store owner |
| Priority | High |
| Type | Validation |

**Steps**

1. Set Buy online without a price
2. Make it Active and Save
3. Verify the expected result below before going on.

**Expected result:** "Products sold online need a selling price and an HSN code"; back to "Request a quote only" saves.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-04-015 · Rules: Duplicate model number

| Field | Value |
|---|---|
| Module | VC-04 · Products and product editor |
| Test case ID | VC-04-015 |
| Scenario and objective | A model number used by another product is refused. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Model number HOPH-504 on a new product |
| Role | Store owner |
| Priority | High |
| Type | Validation |

**Steps**

1. Create a product with model number HOPH-504
2. Save
3. Verify the expected result below before going on.

**Expected result:** Refused as already used in this store.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** Requires confirmation that model numbers are unique per store.

### VC-04-016 · Rules: Plan product limit

| Field | Value |
|---|---|
| Module | VC-04 · Products and product editor |
| Test case ID | VC-04-016 |
| Scenario and objective | Products beyond the plan limit are refused. |
| Preconditions | A store at its plan's product limit (lower a test plan's limit) |
| Test data | One more product |
| Role | Store owner |
| Priority | Medium |
| Type | Boundary |

**Steps**

1. Try to add a product past the limit
2. Verify the expected result below before going on.

**Expected result:** Refused with the plan limit message; the list header shows the limit.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** Use a test plan with a small limit on a throw-away store.

### VC-04-017 · Persistence: Edit and reload

| Field | Value |
|---|---|
| Module | VC-04 · Products and product editor |
| Test case ID | VC-04-017 |
| Scenario and objective | Edits persist after reload and appear on the store. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Short description "QA edit" |
| Role | Store owner |
| Priority | High |
| Type | Data persistence, Integration |

**Steps**

1. Change the short description of an active product
2. Save
3. Reload the editor
4. Open it on the store
5. Verify the expected result below before going on.

**Expected result:** The new text shows in both places.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-04-018 · Versions: Restore a version

| Field | Value |
|---|---|
| Module | VC-04 · Products and product editor |
| Test case ID | VC-04-018 |
| Scenario and objective | An earlier version can be restored. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Product edited twice |
| Role | Store owner |
| Priority | Low |
| Type | Functional |

**Steps**

1. Open the Versions tab
2. Restore the earlier version
3. Verify the expected result below before going on.

**Expected result:** The product returns to the earlier values.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
