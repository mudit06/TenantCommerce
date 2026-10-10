# VC-02 Store dashboard and navigation

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Vendor CMS |
| Purpose | Greeting, launch checklist, figures, charts, lists, quick actions, menu, top bar search. |
| Runs as | Store owner |
| Start at | `http://localhost:3000/admin` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `cms-dashboard` (docs/screens) |
| Depends on | VC-01 |
| Test cases | 11 (2 in the smoke run) |

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

### VC-02-001 · Header: Greeting and actions

| Field | Value |
|---|---|
| Module | VC-02 · Store dashboard and navigation |
| Test case ID | VC-02-001 |
| Scenario and objective | The dashboard header matches the wireframe. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | — |
| Role | Store owner |
| Priority | High |
| Type | UI/UX |

**Steps**

1. Open http://localhost:3000/admin
2. Verify the expected result below before going on.

**Expected result:** "Good morning/afternoon/evening", today's date and Home Orbit, Import CSV (or View store) and Add product; "Your store isn't live yet" while a draft.

**Actual result:** "Good morning, Platform", Sat 10 Oct · Home Orbit, Import CSV, Add product, "Your store isn't live yet…"; figures Orders today 1, To ship 8, New enquiries 1.

**Status:** Pass (Claude (Claude in Chrome), 2026-10-10)

**Execution notes / defect:** Run as super admin with Manage store.

### VC-02-002 · Menu: Groups and plan meter

| Field | Value |
|---|---|
| Module | VC-02 · Store dashboard and navigation |
| Test case ID | VC-02-002 |
| Scenario and objective | The menu has the store groups and the plan usage. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | — |
| Role | Store owner |
| Priority | High |
| Type | UI/UX, Security/Permissions |

**Steps**

1. Read the left menu
2. Verify the expected result below before going on.

**Expected result:** Dashboard, Catalog, Sales, Marketing, Content, Store, Insights; Products 110 / 500 and the plan at the foot; no Vendors or Plans.

**Actual result:** Menu: Dashboard; Catalog; Sales; Marketing; Content; Store; Insights; Products 110 / 500 Starter plan; no Vendors or Plans.

**Status:** Pass (Claude (Claude in Chrome), 2026-10-10)

**Execution notes / defect:** —

### VC-02-003 · Menu: Collapse persists

| Field | Value |
|---|---|
| Module | VC-02 · Store dashboard and navigation |
| Test case ID | VC-02-003 |
| Scenario and objective | The collapsed menu stays collapsed after reload. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | — |
| Role | Store owner |
| Priority | Low |
| Type | Data persistence, UI/UX |

**Steps**

1. Press the collapse button at the bottom of the menu
2. Reload
3. Verify the expected result below before going on.

**Expected result:** The menu shows icons only (names on hover) and stays collapsed after reload.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-02-004 · Top bar: Search with Ctrl K

| Field | Value |
|---|---|
| Module | VC-02 · Store dashboard and navigation |
| Test case ID | VC-02-004 |
| Scenario and objective | The top bar search jumps to products and other records. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Search "soap" |
| Role | Store owner |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Press Ctrl K
2. Type soap
3. Press Enter
4. Verify the expected result below before going on.

**Expected result:** Products opens filtered to soap dishes; arrow keys could pick Enquiries or Pages instead.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-02-005 · Top bar: Enquiry bell

| Field | Value |
|---|---|
| Module | VC-02 · Store dashboard and navigation |
| Test case ID | VC-02-005 |
| Scenario and objective | The bell counts new enquiries. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit); new enquiries exist |
| Test data | — |
| Role | Store owner |
| Priority | Medium |
| Type | Integration |

**Steps**

1. Read the bell number
2. Compare with Enquiries → New
3. Verify the expected result below before going on.

**Expected result:** The numbers match; the bell opens the inbox.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-02-006 · Checklist: Launch checklist

| Field | Value |
|---|---|
| Module | VC-02 · Store dashboard and navigation |
| Test case ID | VC-02-006 |
| Scenario and objective | The checklist shows the wireframe steps with Open links. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | — |
| Role | Store owner |
| Priority | High |
| Type | Functional |

**Steps**

1. Read the Launch checklist
2. Press Open on a step to do
3. Verify the expected result below before going on.

**Expected result:** Store name and logo, GST details, Razorpay connected, Shipping zones, catalogue and content steps; each open step has Open that goes to the right screen.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-02-007 · Checklist: Step ticks when done

| Field | Value |
|---|---|
| Module | VC-02 · Store dashboard and navigation |
| Test case ID | VC-02-007 |
| Scenario and objective | Completing a step ticks it. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Save contact details (VC-03) |
| Role | Store owner |
| Priority | Medium |
| Type | Integration |

**Steps**

1. Note the checklist count
2. Complete a step
3. Reload the dashboard
4. Verify the expected result below before going on.

**Expected result:** That step is ticked and the count goes up.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-02-008 · Figures: Figures and charts

| Field | Value |
|---|---|
| Module | VC-02 · Store dashboard and navigation |
| Test case ID | VC-02-008 |
| Scenario and objective | Figures and charts use real orders. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit); store selling: `pnpm demo:selling home-orbit` run; `pnpm demo:orders home-orbit` |
| Test data | — |
| Role | Store owner |
| Priority | High |
| Type | Integration |

**Steps**

1. Read Orders today, Sales today, To ship, New enquiries, Low stock
2. Read Sales, last 14 days and Orders to ship
3. Verify the expected result below before going on.

**Expected result:** Figures show numbers; each figure opens its list; the chart has bars; Orders to ship lists waiting orders with Paid or COD.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-02-009 · Lists: Needs attention, quick actions, activity

| Field | Value |
|---|---|
| Module | VC-02 · Store dashboard and navigation |
| Test case ID | VC-02-009 |
| Scenario and objective | The lower cards show the store's state. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | — |
| Role | Store owner |
| Priority | Medium |
| Type | UI/UX |

**Steps**

1. Read Needs your attention, Quick actions, Recent activity, Coming up and the plan card
2. Verify the expected result below before going on.

**Expected result:** Policy pages still drafts are listed; Quick actions has Add product, Create page, Landing page, Upload media, Add category, Log an enquiry, Add dealer, Invite staff, Store settings; Recent activity shows who and when.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-02-010 · Roles: Dashboard follows role

| Field | Value |
|---|---|
| Module | VC-02 · Store dashboard and navigation |
| Test case ID | VC-02-010 |
| Scenario and objective | A catalog editor's dashboard hides what they cannot use. |
| Preconditions | Signed in as a Catalog editor (VC-28) |
| Test data | — |
| Role | Catalog editor |
| Priority | High |
| Type | Security/Permissions |

**Steps**

1. Open the dashboard
2. Verify the expected result below before going on.

**Expected result:** No launch checklist, no enquiry cards and only the quick actions they can use.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-02-011 · Responsive: Narrow screen

| Field | Value |
|---|---|
| Module | VC-02 · Store dashboard and navigation |
| Test case ID | VC-02-011 |
| Scenario and objective | Below 1024 px the menu opens from a button. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Window 800 px wide |
| Role | Store owner |
| Priority | Low |
| Type | UI/UX |

**Steps**

1. Narrow the window
2. Press ☰
3. Verify the expected result below before going on.

**Expected result:** The menu opens over the page and closes again; nothing runs off the screen.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
