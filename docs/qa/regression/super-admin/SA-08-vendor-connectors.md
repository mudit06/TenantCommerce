# SA-08 Vendor connectors

Regression script, generated from `docs/qa/tools` (edit the case files there, then run `python docs/qa/tools/build_qa.py`).

| | |
|---|---|
| Portal | Super Admin |
| Purpose | Allowed switch per provider, connection state, masked keys, last test and webhook, failing banner, COD rules. |
| Runs as | Super admin |
| Start at | `http://localhost:3000/admin/collections/tenants/<id> → Connectors` |
| Environment | Local QA: admin `http://localhost:3000/admin`, store `http://home-orbit.localhost:3000`, database `tenantecom_qa` |
| Spec | `sa-vendor-connectors` (docs/screens) |
| Depends on | SA-05 |
| Test cases | 4 (1 in the smoke run) |

## Before you start

- Signed in as super admin

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

### SA-08-001 · Connectors: Layout

| Field | Value |
|---|---|
| Module | SA-08 · Vendor connectors |
| Test case ID | SA-08-001 |
| Scenario and objective | Connectors are grouped with an Allowed switch per provider. |
| Preconditions | On Home Orbit → Connectors |
| Test data | — |
| Role | Super admin |
| Priority | High |
| Type | UI/UX |

**Steps**

1. Read the tab
2. Verify the expected result below before going on.

**Expected result:** Payments (Razorpay), Shipping (manual, Shiprocket), Order updates (WhatsApp, SMS "Comes later", email); each provider has Allowed; unconnected ones say "Not connected by the vendor yet".

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-08-002 · Connectors: Disallow a provider

| Field | Value |
|---|---|
| Module | SA-08 · Vendor connectors |
| Test case ID | SA-08-002 |
| Scenario and objective | Switching Allowed off blocks the provider for the store. |
| Preconditions | Razorpay allowed |
| Test data | — |
| Role | Super admin |
| Priority | High |
| Type | Integration, Security/Permissions |

**Steps**

1. Switch Razorpay Allowed off
2. Read the message
3. As the owner open Store → Payments
4. Verify the expected result below before going on.

**Expected result:** "Razorpay switched off for this store"; the owner cannot connect or use Razorpay; switching it back on restores it.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-08-003 · Connectors: Secrets never shown

| Field | Value |
|---|---|
| Module | SA-08 · Vendor connectors |
| Test case ID | SA-08-003 |
| Scenario and objective | Connected providers show masked keys only. |
| Preconditions | Owner saved Razorpay test keys (VC-25) |
| Test data | — |
| Role | Super admin |
| Priority | Critical |
| Type | Security/Permissions |

**Steps**

1. Read the Razorpay row
2. Verify the expected result below before going on.

**Expected result:** "Connected by", mode, masked key ID and "Encrypted, never shown" per secret; no secret value appears anywhere on the page or in its network responses.

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —

### SA-08-004 · Connectors: COD rules shown

| Field | Value |
|---|---|
| Module | SA-08 · Vendor connectors |
| Test case ID | SA-08-004 |
| Scenario and objective | The vendor's COD rules appear on the tab. |
| Preconditions | Owner saved COD rules ₹499–₹25,000, fee ₹49 (VC-25) |
| Test data | — |
| Role | Super admin |
| Priority | Medium |
| Type | Integration |

**Steps**

1. Read the COD line
2. Verify the expected result below before going on.

**Expected result:** "Vendor rules: orders ₹499.00 to ₹25,000.00, ₹49.00 fee".

**Actual result:** _(fill in when run)_

**Status:** Not Run

**Execution notes / defect:** —
