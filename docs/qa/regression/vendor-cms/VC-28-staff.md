# VC-28 Staff and roles

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Vendor CMS |
| Purpose | Invite staff with roles, change roles, remove, what each role can reach. |
| Runs as | Store owner |
| Start at | `http://localhost:3000/admin/staff` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `cms-staff` (docs/screens) |
| Depends on | VC-01 |
| Test cases | 7 (2 in the smoke run) |

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

### VC-28-001 · Invite: Role required

| Field | Value |
|---|---|
| Module | VC-28 · Staff and roles |
| Test case ID | VC-28-001 |
| Scenario and objective | An invite needs at least one role. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | editor@homeorbit.example, Cat Editor, no role |
| Role | Store owner |
| Priority | High |
| Type | Validation |

**Steps**

1. Open Store → Staff and roles
2. Fill email and name without a role
3. Verify the expected result below before going on.

**Expected result:** Send invite stays grey until a role is ticked.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-28-002 · Invite: Invite catalog editor

| Field | Value |
|---|---|
| Module | VC-28 · Staff and roles |
| Test case ID | VC-28-002 |
| Scenario and objective | The invite email prints with a link. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | editor@homeorbit.example, Catalog editor |
| Role | Store owner |
| Priority | Critical |
| Type | Functional |

**Steps**

1. Tick Catalog editor
2. Send invite
3. Verify the expected result below before going on.

**Expected result:** "Invite emailed to editor@homeorbit.example" and the email with a link in the terminal.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-28-003 · Access: Catalog editor menu

| Field | Value |
|---|---|
| Module | VC-28 · Staff and roles |
| Test case ID | VC-28-003 |
| Scenario and objective | The catalog editor sees only their areas. |
| Preconditions | Editor set a password from the link (third window) |
| Test data | — |
| Role | Catalog editor |
| Priority | Critical |
| Type | Security/Permissions |

**Steps**

1. Sign in as the editor
2. Read the menu
3. Open http://localhost:3000/admin/collections/enquiries and http://localhost:3000/admin/staff
4. Verify the expected result below before going on.

**Expected result:** Catalog, Content and Store settings; no Sales or Marketing; enquiries "Nothing found"; staff "Only the store owner manages staff."

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-28-004 · Roles: Change roles

| Field | Value |
|---|---|
| Module | VC-28 · Staff and roles |
| Test case ID | VC-28-004 |
| Scenario and objective | The owner adds a role. |
| Preconditions | Editor exists |
| Test data | Add Content editor |
| Role | Store owner |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Press Change roles
2. Tick Content editor
3. Save
4. Verify the expected result below before going on.

**Expected result:** The editor now has both roles; their menu follows on reload.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-28-005 · Remove: Remove staff

| Field | Value |
|---|---|
| Module | VC-28 · Staff and roles |
| Test case ID | VC-28-005 |
| Scenario and objective | Removing a staff member ends access at once. |
| Preconditions | Editor signed in elsewhere |
| Test data | — |
| Role | Store owner |
| Priority | High |
| Type | Security/Permissions |

**Steps**

1. Press Remove on the editor and confirm
2. Reload the editor's window
3. Verify the expected result below before going on.

**Expected result:** They lose access to Home Orbit at once.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-28-006 · Remove: Last owner protected

| Field | Value |
|---|---|
| Module | VC-28 · Staff and roles |
| Test case ID | VC-28-006 |
| Scenario and objective | The owner cannot remove themselves as last owner. |
| Preconditions | Only one owner |
| Test data | — |
| Role | Store owner |
| Priority | High |
| Type | Negative |

**Steps**

1. Press Remove on your own row
2. Verify the expected result below before going on.

**Expected result:** "The store needs at least one owner. Make someone else owner first."

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-28-007 · Access: Staff page owner only

| Field | Value |
|---|---|
| Module | VC-28 · Staff and roles |
| Test case ID | VC-28-007 |
| Scenario and objective | Only owners manage staff. |
| Preconditions | Signed in as Manager |
| Test data | http://localhost:3000/admin/staff |
| Role | Store manager |
| Priority | High |
| Type | Security/Permissions |

**Steps**

1. Open the address
2. Verify the expected result below before going on.

**Expected result:** "Only the store owner manages staff."

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
