# VC-22 Banners and redirects

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Vendor CMS |
| Purpose | Banners with placement and schedule; redirects added by hand and on slug change. |
| Runs as | Store owner |
| Start at | `http://localhost:3000/admin/collections/banners` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `cms-banners`, `cms-redirects` (docs/screens) |
| Depends on | VC-09 |
| Test cases | 5 (0 in the smoke run) |

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

### VC-22-001 · Banners: Create a banner

| Field | Value |
|---|---|
| Module | VC-22 · Banners and redirects |
| Test case ID | VC-22-001 |
| Scenario and objective | A banner needs a title, placement and image. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Title "QA banner", Home page hero, an image, Show on store |
| Role | Store owner |
| Priority | Medium |
| Type | Validation |

**Steps**

1. Open Content → Banners
2. Create New with these values
3. Save
4. Try again with no image
5. Verify the expected result below before going on.

**Expected result:** Saves with all values; without the desktop image it is refused.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-22-002 · Banners: Schedule

| Field | Value |
|---|---|
| Module | VC-22 · Banners and redirects |
| Test case ID | VC-22-002 |
| Scenario and objective | A banner shows only between its dates. |
| Preconditions | A banner |
| Test data | Starts tomorrow |
| Role | Store owner |
| Priority | Low |
| Type | Functional |

**Steps**

1. Set Starts to tomorrow
2. Save
3. Check where it is placed on the store
4. Verify the expected result below before going on.

**Expected result:** Not shown today; shown from tomorrow.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-22-003 · Redirects: Slug change makes a redirect

| Field | Value |
|---|---|
| Module | VC-22 · Banners and redirects |
| Test case ID | VC-22-003 |
| Scenario and objective | Changing a product slug redirects the old address. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | A live product's slug |
| Role | Store owner |
| Priority | High |
| Type | Integration |

**Steps**

1. Change the slug and save
2. Open /products/<old-slug> on the store
3. Open Content → Redirects
4. Verify the expected result below before going on.

**Expected result:** The old address goes to the new one; Redirects lists it as Address changed.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-22-004 · Redirects: Manual redirect

| Field | Value |
|---|---|
| Module | VC-22 · Banners and redirects |
| Test case ID | VC-22-004 |
| Scenario and objective | A redirect added by hand works. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | /old-site/catalogue.html → /c/door-hardware |
| Role | Store owner |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Add the redirect
2. Open the old address on the store
3. Verify the expected result below before going on.

**Expected result:** It lands on the category; an address with no page and no redirect shows the 404 page.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-22-005 · Redirects: Duplicate old address

| Field | Value |
|---|---|
| Module | VC-22 · Banners and redirects |
| Test case ID | VC-22-005 |
| Scenario and objective | Two redirects from the same address are refused. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Same Old address again |
| Role | Store owner |
| Priority | Low |
| Type | Validation |

**Steps**

1. Add a second redirect from the same address
2. Verify the expected result below before going on.

**Expected result:** Refused as already used.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
