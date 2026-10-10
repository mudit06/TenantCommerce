# VC-13 Enquiries inbox

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Vendor CMS |
| Purpose | Inbox tabs, filters, search, the open enquiry, reply, assign, status, notes, log a phone enquiry. |
| Runs as | Store owner |
| Start at | `http://localhost:3000/admin/collections/enquiries` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `cms-enquiries` (docs/screens) |
| Depends on | — |
| Test cases | 8 (1 in the smoke run) |

## Before you start

- Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit)
- Enquiries feature on
- At least one enquiry from the store

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

### VC-13-001 · Inbox: Tabs, filter and cards

| Field | Value |
|---|---|
| Module | VC-13 · Enquiries inbox |
| Test case ID | VC-13-001 |
| Scenario and objective | The inbox shows tabs, filter, search and the open enquiry. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit); enquiries from the store |
| Test data | — |
| Role | Store owner |
| Priority | High |
| Type | UI/UX |

**Steps**

1. Open Sales → Enquiries
2. Verify the expected result below before going on.

**Expected result:** Tabs New, In progress, Closed with counts, a Type filter, search, cards on the left and the newest open on the right.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-13-002 · Detail: Product enquiry details

| Field | Value |
|---|---|
| Module | VC-13 · Enquiries inbox |
| Test case ID | VC-13-002 |
| Scenario and objective | A product enquiry shows the product and chosen options. |
| Preconditions | A quote request sent from a product page with options |
| Test data | — |
| Role | Store owner |
| Priority | High |
| Type | Integration |

**Steps**

1. Click the product enquiry
2. Verify the expected result below before going on.

**Expected result:** Name, company, phone, email, city, when; the product with photo, model number and quantity; the message with "Options: …".

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-13-003 · Reply: Reply on WhatsApp and email

| Field | Value |
|---|---|
| Module | VC-13 · Enquiries inbox |
| Test case ID | VC-13-003 |
| Scenario and objective | Reply buttons open WhatsApp or email. |
| Preconditions | An enquiry with phone and email |
| Test data | — |
| Role | Store owner |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Press Reply on WhatsApp
2. Look for Reply by email
3. Verify the expected result below before going on.

**Expected result:** WhatsApp opens to the shopper's number with a greeting naming the enquiry; Reply by email shows when an email exists; Create formal quote is marked P2.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-13-004 · Workflow: Assign, status and notes

| Field | Value |
|---|---|
| Module | VC-13 · Enquiries inbox |
| Test case ID | VC-13-004 |
| Scenario and objective | Assignment, status and notes save at once. |
| Preconditions | An enquiry under New |
| Test data | Assign to yourself; status Contacted; note "Called back" |
| Role | Store owner |
| Priority | High |
| Type | Functional, Data persistence |

**Steps**

1. Assign it to yourself
2. Set Status to Contacted
3. Add the note with Add note
4. Reload
5. Verify the expected result below before going on.

**Expected result:** Each saves at once; the note lists with your name; the enquiry moves to In progress.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-13-005 · Workflow: Close as won

| Field | Value |
|---|---|
| Module | VC-13 · Enquiries inbox |
| Test case ID | VC-13-005 |
| Scenario and objective | Won moves the enquiry to Closed. |
| Preconditions | An enquiry in progress |
| Test data | Status Won |
| Role | Store owner |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Set Status to Won
2. Verify the expected result below before going on.

**Expected result:** The enquiry moves to Closed.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-13-006 · Log: Log a phone enquiry

| Field | Value |
|---|---|
| Module | VC-13 · Enquiries inbox |
| Test case ID | VC-13-006 |
| Scenario and objective | Staff can log an enquiry by hand. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Name, phone, message |
| Role | Store owner |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Press Log an enquiry
2. Fill and save
3. Verify the expected result below before going on.

**Expected result:** It gets the next ENQ number and shows under New.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-13-007 · Log: Contact required

| Field | Value |
|---|---|
| Module | VC-13 · Enquiries inbox |
| Test case ID | VC-13-007 |
| Scenario and objective | A logged enquiry needs a phone or email. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Name only |
| Role | Store owner |
| Priority | Medium |
| Type | Validation |

**Steps**

1. Log an enquiry with only a name
2. Verify the expected result below before going on.

**Expected result:** Refused asking for a phone or email.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-13-008 · Permissions: Catalog editor has no enquiries

| Field | Value |
|---|---|
| Module | VC-13 · Enquiries inbox |
| Test case ID | VC-13-008 |
| Scenario and objective | Catalog editors cannot open enquiries. |
| Preconditions | Signed in as Catalog editor |
| Test data | http://localhost:3000/admin/collections/enquiries |
| Role | Catalog editor |
| Priority | High |
| Type | Security/Permissions |

**Steps**

1. Open the address
2. Verify the expected result below before going on.

**Expected result:** "Nothing found"; no Sales group in the menu.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
