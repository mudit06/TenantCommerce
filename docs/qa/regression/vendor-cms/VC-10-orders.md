# VC-10 Orders and order detail

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Vendor CMS |
| Purpose | Order list, tabs, search, filters, pack, ship, deliver, invoices, refunds, cancel, CSV. |
| Runs as | Store owner |
| Start at | `http://localhost:3000/admin/collections/orders` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `cms-orders`, `cms-order` (docs/screens) |
| Depends on | VC-24, VC-25 |
| Test cases | 12 (3 in the smoke run) |

## Before you start

- Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit); store selling: `pnpm demo:selling home-orbit` run
- At least one storefront order (E2E-04)

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

### VC-10-001 · List: Tabs and columns

| Field | Value |
|---|---|
| Module | VC-10 · Orders and order detail |
| Test case ID | VC-10-001 |
| Scenario and objective | Orders list shows tabs and separate order, payment and delivery state. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit); store selling: `pnpm demo:selling home-orbit` run; an order from E2E-04 |
| Test data | — |
| Role | Store owner |
| Priority | Critical |
| Type | UI/UX |

**Steps**

1. Open Sales → Orders
2. Verify the expected result below before going on.

**Expected result:** Tabs All, To pack, Packed, Shipped, Out for delivery, Delivered, Awaiting payment, Cancelled, Returns with counts; the new order shows "COD, to collect" and "Not shipped".

**Actual result:** Tabs All 23, To pack 4, Packed 4, Shipped 3, Out for delivery 0, Delivered 12, Awaiting payment 0, Cancelled 0, Returns 0; search, Placed, Payment and State filters; Mark packed, Shipped from CSV, Download invoices.

**Status:** Pass (Claude (Claude in Chrome), 2026-10-10)

**Execution notes / defect:** —

### VC-10-002 · List: Search by number and phone

| Field | Value |
|---|---|
| Module | VC-10 · Orders and order detail |
| Test case ID | VC-10-002 |
| Scenario and objective | Search finds orders by number and phone. |
| Preconditions | An order exists |
| Test data | Order number; phone 98765 |
| Role | Store owner |
| Priority | High |
| Type | Functional |

**Steps**

1. Search the order number
2. Search 98765
3. Verify the expected result below before going on.

**Expected result:** The order is found both ways.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-10-003 · List: Filters

| Field | Value |
|---|---|
| Module | VC-10 · Orders and order detail |
| Test case ID | VC-10-003 |
| Scenario and objective | Placed, payment and state filters narrow the list. |
| Preconditions | Several orders |
| Test data | Payment = COD |
| Role | Store owner |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Pick each filter
2. Verify the expected result below before going on.

**Expected result:** Rows and counts follow the filters; clearing restores the list.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-10-004 · Detail: GST split by place of supply

| Field | Value |
|---|---|
| Module | VC-10 · Orders and order detail |
| Test case ID | VC-10-004 |
| Scenario and objective | An order within the store's state shows CGST and SGST. |
| Preconditions | Order to pincode 411045 (Maharashtra) from a Maharashtra GSTIN |
| Test data | — |
| Role | Store owner |
| Priority | High |
| Type | Functional |

**Steps**

1. Open the order
2. Verify the expected result below before going on.

**Expected result:** Items with CGST and SGST, the place of supply line, the customer ("first order"), address and payment.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-10-005 · Fulfilment: Mark as packed creates the invoice

| Field | Value |
|---|---|
| Module | VC-10 · Orders and order detail |
| Test case ID | VC-10-005 |
| Scenario and objective | Packing issues the GST invoice. |
| Preconditions | A confirmed order |
| Test data | — |
| Role | Store owner |
| Priority | Critical |
| Type | Functional |

**Steps**

1. Press Mark as packed and confirm
2. Read Invoice
3. Press Download invoice
4. Verify the expected result below before going on.

**Expected result:** The parcel shows Packed; Invoice lists INV/26-27/00001 (next number); the GST invoice opens.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-10-006 · Fulfilment: Ship, out for delivery, delivered

| Field | Value |
|---|---|
| Module | VC-10 · Orders and order detail |
| Test case ID | VC-10-006 |
| Scenario and objective | The parcel moves through shipping to delivered. |
| Preconditions | A packed order |
| Test data | Tracking number 12345, courier Delhivery |
| Role | Store owner |
| Priority | Critical |
| Type | Functional, Integration |

**Steps**

1. Type the tracking number
2. Press Save and tell the shopper it shipped
3. Press Out for delivery
4. Press Delivered
5. Verify the expected result below before going on.

**Expected result:** The order reads Completed, Paid, Delivered; the timeline ends with "₹… collected in cash on delivery"; messages are queued for each step.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-10-007 · Fulfilment: Steps cannot be skipped backwards

| Field | Value |
|---|---|
| Module | VC-10 · Orders and order detail |
| Test case ID | VC-10-007 |
| Scenario and objective | A delivered parcel cannot go back to packed. |
| Preconditions | A delivered order |
| Test data | — |
| Role | Store owner |
| Priority | Medium |
| Type | Negative |

**Steps**

1. Look for actions that move it back
2. Verify the expected result below before going on.

**Expected result:** No backwards actions; the state stays Delivered.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-10-008 · Refund: Partial refund

| Field | Value |
|---|---|
| Module | VC-10 · Orders and order detail |
| Test case ID | VC-10-008 |
| Scenario and objective | A partial refund records a credit note. |
| Preconditions | A delivered order |
| Test data | ₹100, reason, UPI reference |
| Role | Store owner |
| Priority | High |
| Type | Functional |

**Steps**

1. Press Refund
2. Enter ₹100, a reason and the reference
3. Confirm
4. Verify the expected result below before going on.

**Expected result:** Payment shows Partly refunded; the invoice card lists credit note CN/26-27/00001.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-10-009 · Refund: Refund over the amount

| Field | Value |
|---|---|
| Module | VC-10 · Orders and order detail |
| Test case ID | VC-10-009 |
| Scenario and objective | A refund larger than the amount paid is refused. |
| Preconditions | A delivered order of ₹X |
| Test data | Refund ₹X + 1 |
| Role | Store owner |
| Priority | High |
| Type | Boundary, Negative |

**Steps**

1. Try to refund more than paid
2. Verify the expected result below before going on.

**Expected result:** Refused with a message.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-10-010 · Cancel: Cancel order

| Field | Value |
|---|---|
| Module | VC-10 · Orders and order detail |
| Test case ID | VC-10-010 |
| Scenario and objective | Cancelling returns stock and needs a reason. |
| Preconditions | A new COD order |
| Test data | Reason "Customer asked" |
| Role | Store owner |
| Priority | High |
| Type | Functional, Validation |

**Steps**

1. Press Cancel order
2. Try without a reason, then with one
3. Verify the expected result below before going on.

**Expected result:** Without a reason it waits; with one the order reads Cancelled and stock goes back.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-10-011 · Bulk: Download invoices and shipped from CSV

| Field | Value |
|---|---|
| Module | VC-10 · Orders and order detail |
| Test case ID | VC-10-011 |
| Scenario and objective | Bulk invoice download and CSV shipping. |
| Preconditions | Two invoiced orders |
| Test data | CSV line "HOM-10003, Delhivery, 12345" |
| Role | Store owner |
| Priority | Medium |
| Type | Functional |

**Steps**

1. Tick two orders and Download invoices
2. Use Shipped from CSV with the line
3. Press Export CSV
4. Verify the expected result below before going on.

**Expected result:** Invoices print for invoiced orders only; the CSV marks the order shipped with courier and tracking; Export CSV downloads the list.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-10-012 · Permissions: Catalog editor has no orders

| Field | Value |
|---|---|
| Module | VC-10 · Orders and order detail |
| Test case ID | VC-10-012 |
| Scenario and objective | Orders are hidden from catalog editors; support sees no actions. |
| Preconditions | Signed in as Catalog editor; then as store Support |
| Test data | — |
| Role | Catalog editor, Store support |
| Priority | High |
| Type | Security/Permissions |

**Steps**

1. Look for Orders
2. Open http://localhost:3000/admin/collections/orders
3. Verify the expected result below before going on.

**Expected result:** Catalog editor: not in the menu and refused. Support: list visible without action buttons.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
