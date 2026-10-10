# VC-03 Store settings

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Vendor CMS |
| Purpose | Branding, contact, grievance officer, GST and invoices, checkout and returns, announcement bar, policies, SEO, store status. |
| Runs as | Store owner |
| Start at | `http://localhost:3000/admin/collections/site-settings` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `cms-settings` (docs/screens) |
| Depends on | VC-01 |
| Test cases | 9 (1 in the smoke run) |

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

### VC-03-001 · Layout: Section links

| Field | Value |
|---|---|
| Module | VC-03 · Store settings |
| Test case ID | VC-03-001 |
| Scenario and objective | Settings is one page with links to each section. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | — |
| Role | Store owner |
| Priority | Medium |
| Type | UI/UX |

**Steps**

1. Open Store → Settings
2. Press Contact in the links at the top
3. Verify the expected result below before going on.

**Expected result:** Sections Branding, Contact, Grievance officer and labels, GST and invoices, Checkout and returns, Announcement bar, Policies, Search and analytics, Store status; the page scrolls to Contact.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-03-002 · Contact: Save contact and WhatsApp

| Field | Value |
|---|---|
| Module | VC-03 · Store settings |
| Test case ID | VC-03-002 |
| Scenario and objective | Contact details save and reach the store. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Phone +91 98765 43210; WhatsApp 98765 43210; email care@homeorbit.example |
| Role | Store owner |
| Priority | Critical |
| Type | Functional, Integration |

**Steps**

1. Fill the Contact section
2. Save
3. Reload a product page on http://home-orbit.localhost:3000
4. Hover Ask on WhatsApp
5. Verify the expected result below before going on.

**Expected result:** "Updated successfully."; Ask on WhatsApp appears and links to https://wa.me/919876543210?text=… (91 added); /contact shows the phone and email; the footer shows them.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-03-003 · Contact: Invalid email

| Field | Value |
|---|---|
| Module | VC-03 · Store settings |
| Test case ID | VC-03-003 |
| Scenario and objective | An invalid contact email is refused. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Email "care@" |
| Role | Store owner |
| Priority | Medium |
| Type | Validation |

**Steps**

1. Type the email
2. Save
3. Verify the expected result below before going on.

**Expected result:** Refused with an email format message.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-03-004 · Grievance officer: Shown on the store

| Field | Value |
|---|---|
| Module | VC-03 · Store settings |
| Test case ID | VC-03-004 |
| Scenario and objective | The grievance officer shows on contact and footer. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Name Priya Shah, Director, grievance@homeorbit.example, phone |
| Role | Store owner |
| Priority | High |
| Type | Integration |

**Steps**

1. Fill Grievance officer and labels
2. Save
3. Open http://home-orbit.localhost:3000/contact and the footer
4. Verify the expected result below before going on.

**Expected result:** Both show the grievance officer's name, designation and contact.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-03-005 · GST: GSTIN read-only

| Field | Value |
|---|---|
| Module | VC-03 · Store settings |
| Test case ID | VC-03-005 |
| Scenario and objective | The store's GSTIN cannot be edited here. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | — |
| Role | Store owner |
| Priority | Medium |
| Type | Security/Permissions |

**Steps**

1. Open GST and invoices
2. Verify the expected result below before going on.

**Expected result:** GSTIN shows read-only (changed only by the platform).

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-03-006 · Returns: Return window

| Field | Value |
|---|---|
| Module | VC-03 · Store settings |
| Test case ID | VC-03-006 |
| Scenario and objective | The return window shows on product pages. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit); store selling: `pnpm demo:selling home-orbit` run |
| Test data | Return window 10 days |
| Role | Store owner |
| Priority | Medium |
| Type | Integration, Boundary |

**Steps**

1. Set Return window to 10
2. Save
3. Open a product on http://home-orbit.localhost:3000
4. Verify the expected result below before going on.

**Expected result:** "10-day returns" in the promises line; 0 and 91 are refused (0 to 90 allowed).

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-03-007 · Announcement bar: Store announcement

| Field | Value |
|---|---|
| Module | VC-03 · Store settings |
| Test case ID | VC-03-007 |
| Scenario and objective | The announcement bar text shows on the store when on. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Text "Free delivery above ₹999", enabled |
| Role | Store owner |
| Priority | Medium |
| Type | Integration |

**Steps**

1. Fill and enable Announcement bar
2. Save
3. Reload http://home-orbit.localhost:3000
4. Verify the expected result below before going on.

**Expected result:** The text shows at the top of every store page (unless a live scheme's announcement replaces it).

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-03-008 · Store status: Maintenance mode

| Field | Value |
|---|---|
| Module | VC-03 · Store settings |
| Test case ID | VC-03-008 |
| Scenario and objective | Maintenance mode closes the store and warns staff. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Tick Maintenance mode |
| Role | Store owner |
| Priority | High |
| Type | Integration |

**Steps**

1. Tick Maintenance mode
2. Save
3. Open http://home-orbit.localhost:3000
4. Untick and Save
5. Verify the expected result below before going on.

**Expected result:** A yellow "Maintenance mode is on" bar on every CMS page and in Needs your attention; the store shows "Home Orbit will be back soon"; unticking reopens it.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-03-009 · Permissions: Read-only for catalog editor

| Field | Value |
|---|---|
| Module | VC-03 · Store settings |
| Test case ID | VC-03-009 |
| Scenario and objective | A catalog editor sees settings read-only. |
| Preconditions | Signed in as Catalog editor |
| Test data | — |
| Role | Catalog editor |
| Priority | High |
| Type | Security/Permissions |

**Steps**

1. Open Store → Settings
2. Verify the expected result below before going on.

**Expected result:** No Save button; fields cannot be changed.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
