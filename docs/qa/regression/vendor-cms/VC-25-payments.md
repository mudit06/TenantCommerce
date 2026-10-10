# VC-25 Payments (Razorpay and COD)

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Vendor CMS |
| Purpose | Razorpay keys (encrypted), test connection, webhook; cash on delivery rules. |
| Runs as | Store owner |
| Start at | `http://localhost:3000/admin/payments` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `cms-payments` (docs/screens) |
| Depends on | — |
| Test cases | 7 (1 in the smoke run) |

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

### VC-25-001 · Razorpay: Not connected state

| Field | Value |
|---|---|
| Module | VC-25 · Payments (Razorpay and COD) |
| Test case ID | VC-25-001 |
| Scenario and objective | Payments shows the Razorpay form when not connected. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | — |
| Role | Store owner |
| Priority | High |
| Type | UI/UX |

**Steps**

1. Open Store → Payments
2. Verify the expected result below before going on.

**Expected result:** "Not connected", Mode Test/Live, Key ID, Key secret, Webhook secret, the webhook address with Copy and the events to tick.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-25-002 · Razorpay: Key ID format

| Field | Value |
|---|---|
| Module | VC-25 · Payments (Razorpay and COD) |
| Test case ID | VC-25-002 |
| Scenario and objective | A key ID must start with rzp_test_ or rzp_live_. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Key ID "abc" |
| Role | Store owner |
| Priority | High |
| Type | Validation |

**Steps**

1. Type abc
2. Save
3. Verify the expected result below before going on.

**Expected result:** "A Razorpay key ID starts with rzp_test_ or rzp_live_".

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-25-003 · Razorpay: Secrets saved hidden

| Field | Value |
|---|---|
| Module | VC-25 · Payments (Razorpay and COD) |
| Test case ID | VC-25-003 |
| Scenario and objective | Saved secrets never come back to the browser. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | rzp_test_AbCdEfGh1234, any secrets |
| Role | Store owner |
| Priority | Critical |
| Type | Security/Permissions |

**Steps**

1. Save the keys
2. Reload
3. Check the page and its network responses for the secret
4. Verify the expected result below before going on.

**Expected result:** "Razorpay saved"; secrets read "Saved · hidden" with Replace; the store shows a Test mode note; the secret values appear nowhere.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-25-004 · Razorpay: Test connection

| Field | Value |
|---|---|
| Module | VC-25 · Payments (Razorpay and COD) |
| Test case ID | VC-25-004 |
| Scenario and objective | Made-up keys are refused by Razorpay. |
| Preconditions | Made-up keys saved |
| Test data | — |
| Role | Store owner |
| Priority | High |
| Type | Integration |

**Steps**

1. Press Test connection
2. Verify the expected result below before going on.

**Expected result:** The pill says "Keys refused" with the reason; real test keys say "Razorpay accepted the test keys".

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-25-005 · COD: Cash on delivery rules

| Field | Value |
|---|---|
| Module | VC-25 · Payments (Razorpay and COD) |
| Test case ID | VC-25-005 |
| Scenario and objective | COD rules save and apply at checkout. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit); cod feature on |
| Test data | On, min ₹499, max ₹25,000, fee ₹49 |
| Role | Store owner |
| Priority | Critical |
| Type | Boundary, Integration |

**Steps**

1. Switch COD on with the values
2. Save
3. Check a cart of ₹300 and one of ₹600 at checkout
4. Verify the expected result below before going on.

**Expected result:** Saved; COD is not offered for ₹300, offered for ₹600 with the ₹49 fee.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-25-006 · COD: Min above max

| Field | Value |
|---|---|
| Module | VC-25 · Payments (Razorpay and COD) |
| Test case ID | VC-25-006 |
| Scenario and objective | A minimum above the maximum is refused. |
| Preconditions | Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit) |
| Test data | Min ₹30,000, max ₹25,000 |
| Role | Store owner |
| Priority | Medium |
| Type | Validation |

**Steps**

1. Save
2. Verify the expected result below before going on.

**Expected result:** Refused with a message.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-25-007 · Permissions: Owner only

| Field | Value |
|---|---|
| Module | VC-25 · Payments (Razorpay and COD) |
| Test case ID | VC-25-007 |
| Scenario and objective | Managers and editors never see keys. |
| Preconditions | Signed in as Manager |
| Test data | http://localhost:3000/admin/payments |
| Role | Store manager |
| Priority | Critical |
| Type | Security/Permissions |

**Steps**

1. Look for Payments
2. Open the address
3. Verify the expected result below before going on.

**Expected result:** Not in the menu; the page says only the owner sees keys.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
