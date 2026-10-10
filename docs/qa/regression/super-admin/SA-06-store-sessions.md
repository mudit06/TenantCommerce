# SA-06 Store sessions (Manage store, View as support)

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Super Admin |
| Purpose | Time-boxed, audited sessions inside a vendor's CMS with a reason; read-only support view. |
| Runs as | Super admin |
| Start at | `http://localhost:3000/admin/collections/tenants/<id>` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `sa-vendor` (docs/screens) |
| Depends on | SA-05 |
| Test cases | 8 (3 in the smoke run) |

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

### SA-06-001 · Isolation: Store screens need a session

| Field | Value |
|---|---|
| Module | SA-06 · Store sessions (Manage store, View as support) |
| Test case ID | SA-06-001 |
| Scenario and objective | Without a store session the platform panel cannot open store records. |
| Preconditions | Super admin, no store session |
| Test data | Address http://localhost:3000/admin/collections/pages |
| Role | Super admin |
| Priority | Critical |
| Type | Security/Permissions |

**Steps**

1. Type the address
2. Verify the expected result below before going on.

**Expected result:** "Nothing found" (or equivalent); no store pages are listed.

**Actual result:** /admin/collections/pages without a store session: "Nothing found … Back to Dashboard".

**Status:** Pass (Claude (Claude in Chrome), 2026-10-10)

**Execution notes / defect:** —

### SA-06-002 · Manage store: Reason required

| Field | Value |
|---|---|
| Module | SA-06 · Store sessions (Manage store, View as support) |
| Test case ID | SA-06-002 |
| Scenario and objective | Manage store needs a real reason. |
| Preconditions | On Home Orbit overview |
| Test data | Reason empty, then "abc" |
| Role | Super admin |
| Priority | High |
| Type | Validation |

**Steps**

1. Press Manage store
2. Try to open with an empty reason, then with "abc"
3. Verify the expected result below before going on.

**Expected result:** Both are refused; the box explains the 2-hour session.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-06-003 · Manage store: Open the store CMS

| Field | Value |
|---|---|
| Module | SA-06 · Store sessions (Manage store, View as support) |
| Test case ID | SA-06-003 |
| Scenario and objective | A session opens the vendor's CMS with a banner. |
| Preconditions | On Home Orbit overview |
| Test data | Reason "Vendor asked us to set up the Diwali page" |
| Role | Super admin |
| Priority | Critical |
| Type | Functional |

**Steps**

1. Press Manage store
2. Type the reason and open
3. Verify the expected result below before going on.

**Expected result:** A bar on every page: "You are managing Home Orbit as platform admin" with the reason and end time; the menu is Home Orbit's (Catalog, Sales, Marketing, Content, Store, Insights); platform sections are gone.

**Actual result:** Bar "You are managing Home Orbit as platform admin (Platform Admin)" with the reason and "ends 13:29"; menu became Home Orbit's (Catalog, Sales, Marketing, Content, Store, Insights).

**Status:** Pass (Claude (Claude in Chrome), 2026-10-10)

**Execution notes / defect:** The extension's type action did not reach the reason box; it was filled with form input.

### SA-06-004 · Manage store: Platform screens hidden in session

| Field | Value |
|---|---|
| Module | SA-06 · Store sessions (Manage store, View as support) |
| Test case ID | SA-06-004 |
| Scenario and objective | Platform collections are not reachable during a store session. |
| Preconditions | In a Manage store session |
| Test data | Address http://localhost:3000/admin/collections/plans |
| Role | Super admin |
| Priority | High |
| Type | Security/Permissions |

**Steps**

1. Type the address
2. Verify the expected result below before going on.

**Expected result:** "Nothing found"; plans are not shown.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-06-005 · Audit: Changes are attributed

| Field | Value |
|---|---|
| Module | SA-06 · Store sessions (Manage store, View as support) |
| Test case ID | SA-06-005 |
| Scenario and objective | Edits in a session are recorded with the reason. |
| Preconditions | In a Manage store session |
| Test data | Change a word on About us; Save Draft |
| Role | Super admin |
| Priority | High |
| Type | Integration, Security/Permissions |

**Steps**

1. Edit the About us page and save a draft
2. End session
3. Open Home Orbit overview → Recent changes
4. Verify the expected result below before going on.

**Expected result:** Pages list shows "by Platform Admin (platform team)"; Recent changes lists the session and the edit with the reason.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-06-006 · End: End session

| Field | Value |
|---|---|
| Module | SA-06 · Store sessions (Manage store, View as support) |
| Test case ID | SA-06-006 |
| Scenario and objective | End session returns to the platform panel. |
| Preconditions | In a Manage store session |
| Test data | — |
| Role | Super admin |
| Priority | High |
| Type | Functional |

**Steps**

1. Press End session in the bar
2. Verify the expected result below before going on.

**Expected result:** The platform dashboard shows and the store menu is gone.

**Actual result:** End session returned to the platform dashboard with the platform menu.

**Status:** Pass (Claude (Claude in Chrome), 2026-10-10)

**Execution notes / defect:** —

### SA-06-007 · View as support: Read-only session

| Field | Value |
|---|---|
| Module | SA-06 · Store sessions (Manage store, View as support) |
| Test case ID | SA-06-007 |
| Scenario and objective | View as support shows the store without saving. |
| Preconditions | On Home Orbit overview |
| Test data | Reason "Support ticket 42" |
| Role | Super admin |
| Priority | High |
| Type | Security/Permissions |

**Steps**

1. Press View as support with a reason
2. Open a product
3. Try to change and save
4. Verify the expected result below before going on.

**Expected result:** Screens open read-only; there is no Save (or saving is refused).

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-06-008 · Timeout: Session ends by itself

| Field | Value |
|---|---|
| Module | SA-06 · Store sessions (Manage store, View as support) |
| Test case ID | SA-06-008 |
| Scenario and objective | A store session ends at its end time. |
| Preconditions | A Manage store session |
| Test data | Wait past the end time (2 hours) or use a test clock |
| Role | Super admin |
| Priority | Low |
| Type | Security/Permissions |

**Steps**

1. Leave the session open past the end time
2. Open any store screen
3. Verify the expected result below before going on.

**Expected result:** The session has ended and you are back in the platform panel.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** Long wait; run when convenient.
