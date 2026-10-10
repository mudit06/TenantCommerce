# SA-04 New vendor (onboarding)

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Super Admin |
| Purpose | Five-section onboarding: business with GSTIN check, store slug, plan and trial, starting features, owner invite. |
| Runs as | Super admin |
| Start at | `http://localhost:3000/admin/new-vendor` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `sa-vendor-new` (docs/screens) |
| Depends on | SA-01 |
| Test cases | 9 (2 in the smoke run) |

## Before you start

- Signed in as super admin
- A unique slug not used before (reset the QA database to reuse one)

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

### SA-04-001 · Form: Layout

| Field | Value |
|---|---|
| Module | SA-04 · New vendor (onboarding) |
| Test case ID | SA-04-001 |
| Scenario and objective | The onboarding page has five sections and a summary. |
| Preconditions | Signed in as super admin |
| Test data | — |
| Role | Super admin |
| Priority | Medium |
| Type | UI/UX |

**Steps**

1. Open Vendors → New vendor
2. Verify the expected result below before going on.

**Expected result:** Sections 1 Business, 2 Store, 3 Plan and trial, 4 Starting features, 5 Owner login, and a "Will be created" summary on the right.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-04-002 · Business: GSTIN checksum

| Field | Value |
|---|---|
| Module | SA-04 · New vendor (onboarding) |
| Test case ID | SA-04-002 |
| Scenario and objective | A GSTIN with a wrong last character is refused. |
| Preconditions | On New vendor |
| Test data | GSTIN 29AABCT1234F1ZN |
| Role | Super admin |
| Priority | High |
| Type | Validation |

**Steps**

1. Type the GSTIN
2. Verify the expected result below before going on.

**Expected result:** "The last character does not match. Check for a typing mistake" shows under the field.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-04-003 · Business: GSTIN fills PAN and state

| Field | Value |
|---|---|
| Module | SA-04 · New vendor (onboarding) |
| Test case ID | SA-04-003 |
| Scenario and objective | A valid GSTIN fills PAN and state. |
| Preconditions | On New vendor |
| Test data | GSTIN 29AABCT1234F1ZM |
| Role | Super admin |
| Priority | High |
| Type | Functional |

**Steps**

1. Type the GSTIN
2. Verify the expected result below before going on.

**Expected result:** PAN AABCT1234F and State Karnataka (29) fill in by themselves.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-04-004 · Business: Required fields

| Field | Value |
|---|---|
| Module | SA-04 · New vendor (onboarding) |
| Test case ID | SA-04-004 |
| Scenario and objective | The vendor is not created with required fields empty. |
| Preconditions | On New vendor |
| Test data | All fields empty |
| Role | Super admin |
| Priority | High |
| Type | Validation |

**Steps**

1. Press Create vendor
2. Verify the expected result below before going on.

**Expected result:** Errors on Store name, Legal name, Industry, slug, plan and the owner's name and email; nothing is created.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-04-005 · Store: Slug and address

| Field | Value |
|---|---|
| Module | SA-04 · New vendor (onboarding) |
| Test case ID | SA-04-005 |
| Scenario and objective | The slug becomes the store address; a used slug is refused. |
| Preconditions | On New vendor |
| Test data | Slug test-locks; then home-orbit |
| Role | Super admin |
| Priority | High |
| Type | Validation |

**Steps**

1. Type test-locks
2. Read the summary
3. Change the slug to home-orbit and try to create
4. Verify the expected result below before going on.

**Expected result:** The summary shows test-locks.localhost; "home-orbit" is refused as already used.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-04-006 · Plan: Plan and trial

| Field | Value |
|---|---|
| Module | SA-04 · New vendor (onboarding) |
| Test case ID | SA-04-006 |
| Scenario and objective | Choosing a plan shows its starting offer and the trial. |
| Preconditions | On New vendor |
| Test data | Starter; trial 14 days |
| Role | Super admin |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Pick Starter
2. Set the trial to 14 days
3. Verify the expected result below before going on.

**Expected result:** "Starts at ₹9,999 for 3 months" shows and the summary lists the trial end date.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-04-007 · Features: Preset within the plan

| Field | Value |
|---|---|
| Module | SA-04 · New vendor (onboarding) |
| Test case ID | SA-04-007 |
| Scenario and objective | Starting features come from the industry preset, capped by the plan. |
| Preconditions | Industry Locks, plan Starter |
| Test data | — |
| Role | Super admin |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Read section 4
2. Verify the expected result below before going on.

**Expected result:** Features from the preset are switched on; features outside Starter are locked.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-04-008 · Create: Create vendor with invite

| Field | Value |
|---|---|
| Module | SA-04 · New vendor (onboarding) |
| Test case ID | SA-04-008 |
| Scenario and objective | Creating the vendor makes a draft store and emails the owner. |
| Preconditions | Valid form |
| Test data | Test Locks / Test Locks Pvt Ltd / Locks / 29AABCT1234F1ZM / test-locks / Starter / Test Owner, owner@testlocks.example, "Email the invite now" ticked |
| Role | Super admin |
| Priority | Critical |
| Type | Functional, Integration |

**Steps**

1. Fill the form
2. Press Create vendor
3. Watch the `pnpm dev` terminal
4. Open http://test-locks.localhost:3000
5. Verify the expected result below before going on.

**Expected result:** You land on the new vendor overview as Store draft; the terminal prints "You're invited to manage Test Locks" with a link; the store opens with a preview banner in the default design and no products.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** Creates a throw-away store; reset the QA database afterwards if needed.

### SA-04-009 · Create: Duplicate owner email

| Field | Value |
|---|---|
| Module | SA-04 · New vendor (onboarding) |
| Test case ID | SA-04-009 |
| Scenario and objective | An owner email that already has an account is handled. |
| Preconditions | Valid form |
| Test data | Owner email owner@homeorbit.example |
| Role | Super admin |
| Priority | Medium |
| Type | Negative |

**Steps**

1. Fill the form with an existing owner email
2. Create
3. Verify the expected result below before going on.

**Expected result:** Either the existing user is added as owner of the new store or a clear message explains; no duplicate account is made.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** Requires confirmation of the intended behaviour.
