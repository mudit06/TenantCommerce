# VC-26 WhatsApp and SMS

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Vendor CMS |
| Purpose | WhatsApp keys, webhook, message templates; SMS later. |
| Runs as | Store owner |
| Start at | `http://localhost:3000/admin/messaging` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `cms-messaging` (docs/screens) |
| Depends on | — |
| Test cases | 4 (0 in the smoke run) |

## Before you start

- Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) (owner only)

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

### VC-26-001 · WhatsApp: Form and webhook

| Field | Value |
|---|---|
| Module | VC-26 · WhatsApp and SMS |
| Test case ID | VC-26-001 |
| Scenario and objective | The WhatsApp form and Meta webhook details show. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | — |
| Role | Store owner |
| Priority | Medium |
| Type | UI/UX |

**Steps**

1. Open Store → WhatsApp and SMS
2. Verify the expected result below before going on.

**Expected result:** Phone number ID, business account ID, access token, app secret; webhook address and verify token; SMS "comes later"; email sent by the platform.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-26-002 · Templates: Message templates

| Field | Value |
|---|---|
| Module | VC-26 · WhatsApp and SMS |
| Test case ID | VC-26-002 |
| Scenario and objective | Templates are listed with approval state. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | — |
| Role | Store owner |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Read Message templates
2. Verify the expected result below before going on.

**Expected result:** 14 templates in the store's name, "0 of 14 approved"; Submit to Meta needs WhatsApp connected.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-26-003 · WhatsApp: Secrets hidden

| Field | Value |
|---|---|
| Module | VC-26 · WhatsApp and SMS |
| Test case ID | VC-26-003 |
| Scenario and objective | Saved WhatsApp secrets are hidden. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Any token and app secret |
| Role | Store owner |
| Priority | High |
| Type | Security/Permissions |

**Steps**

1. Save
2. Reload
3. Verify the expected result below before going on.

**Expected result:** Secrets read "Saved · hidden"; never shown again.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-26-004 · Permissions: Owner only

| Field | Value |
|---|---|
| Module | VC-26 · WhatsApp and SMS |
| Test case ID | VC-26-004 |
| Scenario and objective | Only the owner sees WhatsApp keys. |
| Preconditions | Signed in as Manager |
| Test data | http://localhost:3000/admin/messaging |
| Role | Store manager |
| Priority | High |
| Type | Security/Permissions |

**Steps**

1. Open the address
2. Verify the expected result below before going on.

**Expected result:** Refused; not in the menu.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
