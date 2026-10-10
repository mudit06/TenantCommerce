# VC-18 Affiliates

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Vendor CMS |
| Purpose | Applications, approve, reject, rates, personal coupon, payouts. |
| Runs as | Store owner |
| Start at | `http://localhost:3000/admin/collections/affiliates` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `cms-affiliates` (docs/screens) |
| Depends on | VC-15 |
| Test cases | 5 (0 in the smoke run) |

## Before you start

- Signed in as Home Orbit's owner (or super admin with Manage store on Home Orbit); store selling: `pnpm demo:selling home-orbit` run
- Plan Enterprise and Affiliate program on (SA-07, SA-10)

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

### VC-18-001 · Applications: Approve

| Field | Value |
|---|---|
| Module | VC-18 · Affiliates |
| Test case ID | VC-18-001 |
| Scenario and objective | Approving an application sends the welcome email. |
| Preconditions | An application from /affiliate |
| Test data | — |
| Role | Store owner |
| Priority | High |
| Type | Functional |

**Steps**

1. Open Marketing → Affiliates → Applications
2. Press Approve
3. Verify the expected result below before going on.

**Expected result:** The affiliate is active; the welcome email with the link prints in the terminal.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-18-002 · Applications: Reject needs a reason

| Field | Value |
|---|---|
| Module | VC-18 · Affiliates |
| Test case ID | VC-18-002 |
| Scenario and objective | Rejecting asks for a reason. |
| Preconditions | An application |
| Test data | Reason "Audience does not match" |
| Role | Store owner |
| Priority | Medium |
| Type | Validation |

**Steps**

1. Press Reject
2. Confirm without, then with a reason
3. Verify the expected result below before going on.

**Expected result:** The reason is required; the applicant sees the outcome.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-18-003 · Commission: Referral order earns pending commission

| Field | Value |
|---|---|
| Module | VC-18 · Affiliates |
| Test case ID | VC-18-003 |
| Scenario and objective | An order through the link is credited. |
| Preconditions | An approved affiliate with code |
| Test data | /r/<CODE>?to=/products/<slug>, COD order with another email |
| Role | Store owner |
| Priority | High |
| Type | Integration |

**Steps**

1. Open the referral link in another browser
2. Place a COD order
3. Verify the expected result below before going on.

**Expected result:** The affiliate's row shows 1 order and the commission pending (rate on the order before GST and delivery); own orders never earn.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-18-004 · Rates: Change rate

| Field | Value |
|---|---|
| Module | VC-18 · Affiliates |
| Test case ID | VC-18-004 |
| Scenario and objective | Rates and a category rate save. |
| Preconditions | An approved affiliate |
| Test data | Rate 7%; category rate 10% for Key hangers |
| Role | Store owner |
| Priority | Low |
| Type | Functional |

**Steps**

1. Press Change rate, set both
2. Save
3. Verify the expected result below before going on.

**Expected result:** Saved and shown on the affiliate.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### VC-18-005 · Payouts: Record payout (owner only)

| Field | Value |
|---|---|
| Module | VC-18 · Affiliates |
| Test case ID | VC-18-005 |
| Scenario and objective | Payouts need approved commission above the minimum. |
| Preconditions | Approved commission above the minimum |
| Test data | UTR reference |
| Role | Store owner |
| Priority | Medium |
| Type | Functional, Security/Permissions |

**Steps**

1. Press Record payout
2. Check UPI, TDS and net
3. Mark paid and email statement
4. Verify the expected result below before going on.

**Expected result:** The payout is recorded with gross, TDS, net and UTR; a manager does not see Record payout.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
