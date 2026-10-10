# SA-07 Vendor features

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Super Admin |
| Purpose | Per-store feature switches capped by the plan, dependencies, Phase 2 rows locked, settings. |
| Runs as | Super admin |
| Start at | `http://localhost:3000/admin/collections/tenants/<id> → Features` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `sa-vendor-features` (docs/screens) |
| Depends on | SA-05 |
| Test cases | 6 (2 in the smoke run) |

## Before you start

- Signed in as super admin
- Home Orbit on the Starter plan

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

### SA-07-001 · Features: Switches and locks

| Field | Value |
|---|---|
| Module | SA-07 · Vendor features |
| Test case ID | SA-07-001 |
| Scenario and objective | Each feature has a switch; ones outside the plan or Phase 2 are locked. |
| Preconditions | Home Orbit on Starter |
| Test data | — |
| Role | Super admin |
| Priority | High |
| Type | UI/UX |

**Steps**

1. Open Home Orbit → Features
2. Verify the expected result below before going on.

**Expected result:** A row per feature with a switch; rows outside Starter and Phase 2 rows are locked with the reason.

**Actual result:** Features tab: Starter plan, preset applied, Always on list, MVP and Growth tables with In plan and On columns.

**Status:** Pass (Claude (Claude in Chrome), 2026-10-10)

**Execution notes / defect:** —

### SA-07-002 · Features: Switch off reaches the store

| Field | Value |
|---|---|
| Module | SA-07 · Vendor features |
| Test case ID | SA-07-002 |
| Scenario and objective | Switching a feature off removes it from the store at once. |
| Preconditions | Enquiries inbox on |
| Test data | Feature Enquiries inbox |
| Role | Super admin |
| Priority | Critical |
| Type | Integration |

**Steps**

1. Switch Enquiries inbox off
2. Read the message
3. Open http://home-orbit.localhost:3000/products/feather-stainless-steel-pull-handle-hoph-504
4. Verify the expected result below before going on.

**Expected result:** "Saved. The live store has the change now." The product page has no Request a quote form.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-07-003 · Features: Switch back on

| Field | Value |
|---|---|
| Module | SA-07 · Vendor features |
| Test case ID | SA-07-003 |
| Scenario and objective | Switching it on brings the feature back. |
| Preconditions | Enquiries inbox off |
| Test data | — |
| Role | Super admin |
| Priority | High |
| Type | Integration, Data persistence |

**Steps**

1. Switch Enquiries inbox on
2. Reload the product page
3. Verify the expected result below before going on.

**Expected result:** The quote form is back.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-07-004 · Features: Server check

| Field | Value |
|---|---|
| Module | SA-07 · Vendor features |
| Test case ID | SA-07-004 |
| Scenario and objective | A switched-off feature is refused on the server, not only hidden. |
| Preconditions | Enquiries off |
| Test data | Send an enquiry from an open page that still shows the old form |
| Role | Super admin |
| Priority | High |
| Type | Security/Permissions |

**Steps**

1. Open a product page with the form
2. Switch Enquiries off in another tab
3. Submit the form on the first tab
4. Verify the expected result below before going on.

**Expected result:** The submission is refused; no enquiry is created.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-07-005 · Features: Dependencies

| Field | Value |
|---|---|
| Module | SA-07 · Vendor features |
| Test case ID | SA-07-005 |
| Scenario and objective | Switching on a feature that needs another asks first. |
| Preconditions | A feature with a dependency (for example WhatsApp offers needs Offer messages) |
| Test data | — |
| Role | Super admin |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Switch on the dependent feature while its requirement is off
2. Verify the expected result below before going on.

**Expected result:** A prompt names the feature it needs; confirming switches both on, cancelling changes nothing.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-07-006 · Features: Menu follows features

| Field | Value |
|---|---|
| Module | SA-07 · Vendor features |
| Test case ID | SA-07-006 |
| Scenario and objective | The vendor CMS menu follows the features. |
| Preconditions | Owner signed in (another window) |
| Test data | Switch Reviews off |
| Role | Super admin |
| Priority | High |
| Type | Integration |

**Steps**

1. Switch Reviews off
2. Reload the owner's CMS
3. Verify the expected result below before going on.

**Expected result:** Marketing → Reviews is gone from the owner's menu; switching it on brings it back.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
