# VC-20 Pages and page builder

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Vendor CMS |
| Purpose | Pages list, templates, duplicate, delete, block editor, preview, SEO, publish. |
| Runs as | Store owner |
| Start at | `http://localhost:3000/admin/collections/pages` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `cms-pages`, `cms-page-edit` (docs/screens) |
| Depends on | VC-09 |
| Test cases | 9 (2 in the smoke run) |

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

### VC-20-001 · List: Tabs and rows

| Field | Value |
|---|---|
| Module | VC-20 · Pages and page builder |
| Test case ID | VC-20-001 |
| Scenario and objective | Pages lists with status tabs and details. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | — |
| Role | Store owner |
| Priority | High |
| Type | UI/UX |

**Steps**

1. Open Content → Pages
2. Verify the expected result below before going on.

**Expected result:** Tabs All 7 · Published 2 · Drafts 5; About us (Default) and Home (Landing) published; policy pages drafts; template, status, who and when per row.

**Actual result:** Pages: All 7, Published 2, Unpublished changes 0, Drafts 5, Scheduled 0; search, Template and Changed by filters.

**Status:** Pass (Claude (Claude in Chrome), 2026-10-10)

**Execution notes / defect:** —

### VC-20-002 · List: Search and template filter

| Field | Value |
|---|---|
| Module | VC-20 · Pages and page builder |
| Test case ID | VC-20-002 |
| Scenario and objective | Search and template filter narrow the list. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | "ship"; Template Policy |
| Role | Store owner |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Type ship (or press / first)
2. Pick Template → Policy
3. Press Clear filters from an empty result
4. Verify the expected result below before going on.

**Expected result:** Only Shipping policy remains; filters combine; Clear filters restores.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-20-003 · Create: Choose a template

| Field | Value |
|---|---|
| Module | VC-20 · Pages and page builder |
| Test case ID | VC-20-003 |
| Scenario and objective | Create page offers templates. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Landing |
| Role | Store owner |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Press Create page
2. Pick Landing
3. Verify the expected result below before going on.

**Expected result:** The editor opens with Landing ticked; leaving without saving creates nothing.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-20-004 · Row actions: Duplicate and delete

| Field | Value |
|---|---|
| Module | VC-20 · Pages and page builder |
| Test case ID | VC-20-004 |
| Scenario and objective | Duplicate makes a draft copy; delete asks first. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | About us |
| Role | Store owner |
| Priority | Medium |
| Type | Functional |

**Steps**

1. ⋯ → Duplicate on About us
2. ⋯ → Delete on the copy
3. Confirm
4. Verify the expected result below before going on.

**Expected result:** "About us (copy)" opens as a draft; delete asks first and says what is deleted; then it is gone.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-20-005 · Builder: Block library

| Field | Value |
|---|---|
| Module | VC-20 · Pages and page builder |
| Test case ID | VC-20-005 |
| Scenario and objective | Add block shows the grouped library by feature. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Open Home |
| Role | Store owner |
| Priority | High |
| Type | UI/UX |

**Steps**

1. Press Add block
2. Verify the expected result below before going on.

**Expected result:** Groups Marketing, Commerce, Basic, Utility with pictures and one line each; Offer strip, Reviews, Scheme products, Coupon list, Offers sign-up appear only while their features are on.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-20-006 · Builder: Draft preview vs published

| Field | Value |
|---|---|
| Module | VC-20 · Pages and page builder |
| Test case ID | VC-20-006 |
| Scenario and objective | A draft change shows in preview but not on the store until published. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Hero heading "QA heading" |
| Role | Store owner |
| Priority | Critical |
| Type | Functional, Integration |

**Steps**

1. Open the preview (eye button)
2. Change the hero heading
3. Save Draft
4. Open http://home-orbit.localhost:3000
5. Publish
6. Reload http://home-orbit.localhost:3000
7. Change it back and publish
8. Verify the expected result below before going on.

**Expected result:** Preview updates on draft; the store keeps the old heading until Publish, then shows the new one.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-20-007 · SEO: Search preview and length

| Field | Value |
|---|---|
| Module | VC-20 · Pages and page builder |
| Test case ID | VC-20-007 |
| Scenario and objective | The SEO tab previews and warns on length. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Title of 80 characters |
| Role | Store owner |
| Priority | Low |
| Type | Validation |

**Steps**

1. Open the SEO tab
2. Type a long title
3. Verify the expected result below before going on.

**Expected result:** A Google preview shows; it says when the title or description is too long.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-20-008 · Publish: Publish a policy page

| Field | Value |
|---|---|
| Module | VC-20 · Pages and page builder |
| Test case ID | VC-20-008 |
| Scenario and objective | A published policy page opens on the store and in the footer. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Shipping policy, one line |
| Role | Store owner |
| Priority | High |
| Type | Integration |

**Steps**

1. Open the Shipping policy draft
2. Write a line
3. Publish
4. Open http://home-orbit.localhost:3000/pages/shipping
5. Verify the expected result below before going on.

**Expected result:** The page opens; the footer's Help column lists Shipping policy.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-20-009 · Permissions: Content editor edits pages

| Field | Value |
|---|---|
| Module | VC-20 · Pages and page builder |
| Test case ID | VC-20-009 |
| Scenario and objective | A content editor can edit pages but not products. |
| Preconditions | Signed in as Content editor |
| Test data | — |
| Role | Content editor |
| Priority | Medium |
| Type | Security/Permissions |

**Steps**

1. Edit and save a page
2. Open Products
3. Verify the expected result below before going on.

**Expected result:** Pages save; Products are read-only or hidden.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
