# QA: regression scripts, manual test workbook and execution guide

Everything a tester (or Claude in Chrome) needs to regression-test the **super admin** (platform
panel) and the **vendor CMS**, plus the cross-portal workflows that run through the storefront.
Last built 10 October 2026 against branch `claude/adoring-cori-we1zlg`.

| Deliverable | Where |
|---|---|
| A. Regression scripts, one per module | `regression/super-admin/` (15), `regression/vendor-cms/` (29), `regression/e2e/` (18) |
| B. Manual test workbook (Excel) | `TenantEcom-test-cases.xlsx`: Test Summary, Vendor CMS, Super Admin, End-to-End Workflows, Defect Log, Test Data & Preconditions |
| C. Inventory, coverage matrix, this guide | `coverage.md` and this file |
| Source of all three | `tools/` (case files, results, generator) |

**349 test cases in 62 modules:** 105 super admin, 197 vendor CMS, 47 end-to-end. 63 are marked
**Smoke run** (the critical path to run after every change). Each case has the same ID in its
script, the workbook and the coverage matrix: `SA-05-008` is case 8 of module SA-05 (Vendor
overview), in `regression/super-admin/SA-05-vendor-overview.md` and on the Super Admin tab.

## 1. Application inventory

**Super admin** (`/admin` as a platform account): sign-in with two-step, platform dashboard, All
vendors, New vendor, vendor overview with store status, store sessions (Manage store, View as
support), and the vendor tabs Features, Connectors, Domains, Billing and Staff; Plans,
Subscriptions, Team and access, Staff users.

**Vendor CMS** (`/admin` as store staff, or the super admin in a store session): dashboard and
navigation; Catalog (Products and the product editor, Variants, Categories, Attribute sets, Brands,
Documents, Import and export, Media); Sales (Orders and order detail, Returns, Customers and
privacy requests, Enquiries); Marketing (Schemes and offers, Coupons, Offer messages, Abandoned
carts, Affiliates, Reviews); Content (Pages and page builder, Navigation, Banners, Redirects); Store
(Dealers, Shipping, Payments, WhatsApp and SMS, Order updates, Settings, Staff and roles);
Insights (Reports).

**Roles.** Platform: Super admin, Support (read-only everywhere). Store: Owner, Manager, Catalog
editor, Order manager, Content editor, Support. What each reaches is tested in SA-15, VC-28 and
the permission cases of each module (Type = Security/Permissions).

`coverage.md` has the full module list with the screens each covers, case counts by type
(functional, negative, validation, boundary, integration, permissions, persistence, UI), the smoke
count, links to the scripts and the dependencies between modules.

**Phase 2 screens are not tested** (service requests, trade accounts, warranty). Nor are things
marked "later" in `docs/progress.md`: SMS, custom domains with SSL, automatic billing, the audit log
viewer.

## 2. Environment and test accounts

Run everything against the **QA database** (`tenantecom_qa`), never your working data:

1. Docker Desktop running with the Mongo container (`docker compose -f docker/docker-compose.yml up -d mongo`).
2. In Claude Code start the **`app-qa`** launch entry, or in a terminal:
   `DATABASE_URI="mongodb://localhost:27017/tenantecom_qa?replicaSet=rs0&directConnection=true" pnpm dev:fresh`.
   `dev:fresh` empties Next.js's data cache so pages don't show the other database's stores.
3. Fresh QA data (when needed): with that `DATABASE_URI` set, `pnpm seed`, `pnpm seed:home-orbit`,
   `pnpm demo:selling home-orbit`, `pnpm demo:orders home-orbit`.
4. Admin: http://localhost:3000/admin. Store: http://home-orbit.localhost:3000. Emails, WhatsApp
   messages and login codes are printed in the `pnpm dev` terminal, never sent.

| Account | Login | Notes |
|---|---|---|
| Super admin | `admin@tenantecom.local` | Password: `SEED_SUPER_ADMIN_PASSWORD` in `.env`. Two-step required: set it up with your own authenticator app on first sign-in |
| Home Orbit owner | `owner@homeorbit.example` | Set a password from the invite link: All vendors → Home Orbit → Staff → Resend invite prints it in the terminal |
| Demo Sanitary / Demo Clothing owners | `owner@demo-sanitary.example`, `owner@demo-clothing.example` | Isolation (E2E-11) and the lockout case (SA-01) |
| Store staff | `editor@`, `orders@`, `content@`, `manager@homeorbit.example` | Invited during VC-28. Starter allows 3 staff |
| Shopper | `rahul.k@example.com`, 98765 43210 | Guest checkout, then a code login |

The **Test Data & Preconditions** tab lists the rest (pincodes, GSTINs, products, coupons, reset
steps, run order). Passwords never go in the workbook.

## 3. Running the regression scripts with Claude in Chrome

1. Start the QA app (above). Open Chrome with the Claude extension, signed out of the admin.
2. Paste this prompt into Claude in Chrome, naming the script(s) to run:

   > Run the regression script `docs/qa/regression/super-admin/SA-03-all-vendors.md` against
   > http://localhost:3000. Use only the test accounts in docs/qa/README.md. For each test case
   > follow the steps, check the expected result on screen before going on, and report per Test
   > Case ID: Status (Pass, Fail, Blocked, Not Applicable) and Actual result in one line. On a
   > failure note the screen, what you saw and the steps to reproduce. Don't send anything outside
   > localhost.

3. Paste the report into the workbook (or the shared Google Sheet), matching on Test Case ID, and
   add failures to the Defect Log.
4. Order: SA-01 first (sign-in), then the module you changed, then its dependents (coverage.md
   "Dependencies"), then the E2E workflows that cross it. After any change run the **Smoke run**
   cases (filter Smoke Run = Yes).

**What we learned driving the app with the extension (10 October 2026):**

- Wait for a visible condition, not a fixed delay. On this machine the first load of a screen
  compiles for up to a minute and the tab can briefly stop responding. Retry a read once before
  calling it a failure.
- **Text typed before the page has finished loading is lost.** Wait until the Sign in button is
  active (it enables once both fields hold text) before typing.
- On some fields (the vendor list search, the Manage store reason) the extension's *type* action
  doesn't reach React. Use *form input* or individual key presses instead. The app itself works:
  key presses and real typing filter the list.
- An admin address opened by the extension counts as a cross-site navigation, so Payload asks for
  sign-in first. Since DEF-001 was fixed, the page then continues to the address asked for. If it
  shows the sign-in page, wait a few seconds.
- The two-step code: type the six digits; it submits by itself. A paste simulated by the
  extension doesn't insert text, so paste is a human check.

## 4. Using the manual test workbook

- One row per test case on the **Vendor CMS**, **Super Admin** and **End-to-End Workflows** tabs.
  Columns: Test Case ID, Portal, Module, Submodule, Functionality, Scenario, Preconditions, Test
  Data, numbered Steps, Expected Result, Actual Result, Status, Priority, Test Type, Executed By,
  Execution Date, Defect ID, Remarks, plus Role, Smoke Run and the Regression Script file.
- **Status**, **Priority**, **Test Type**, **Portal** and **Smoke Run** are drop-downs. Status is
  coloured (Pass green, Fail red, Blocked amber, Not Run grey, Not Applicable blue). Critical
  priorities are bold red. The header row is frozen and every column filters.
- **Test Summary** recalculates from the Status cells: totals per portal, executed (Pass + Fail),
  passed, failed, blocked, not run, pass %, critical and smoke counts, and a per-module table.
- **Defect Log**: Defect ID, linked test case, portal, module, description, severity, steps,
  expected, actual, status (Open, In progress, Fixed, Retest, Closed, Won't fix), reporter, date,
  remarks.
- **Google Sheets**: File → Import → Upload the `.xlsx` (Replace spreadsheet). Drop-downs,
  colours and formulas come across. Share the sheet's link in the Claude Code session and Claude
  can read the results and raise or fix the bugs.
- **Changing cases**: edit `tools/cases_sa.py`, `tools/cases_vc.py` or `tools/cases_e2e.py`, then
  run `python docs/qa/tools/build_qa.py` (Python 3.10+, `pip install openpyxl`). That rebuilds the
  scripts, `coverage.md` and the workbook. Results recorded by Claude are in `tools/results.json`.
  Results typed into a copy of the workbook stay in that copy.

## 5. Execution so far (10 October 2026)

Claude ran **38 cases**: 31 in Claude in Chrome against the QA database and 7 storefront workflow
cases in the in-app browser while building them. **All 38 passed.** Two defects were found, fixed
and retested in the same run:

| Defect | Case | What was wrong | Fix |
|---|---|---|---|
| DEF-001 (High) | SA-03-001 | Opening an admin link from outside the admin (email, chat, extension) bounced a signed-in person to sign-in, and sign-in then went to the dashboard instead of the page | A signed-in visitor of the sign-in page now goes on to the requested `/admin` address (only admin paths; unit tested) |
| DEF-002 (Medium) | SA-05-005 | Plan usage "Orders this month" was always 0, so the 90% limit warning for orders could never show | Counted from the orders on the vendor overview, the store's plan card and the dashboard warnings |

The other **311 cases are Not Run**. Most need a human or more setup: inviting and signing in as
store staff, real authenticator codes, Razorpay test keys, orders moved through delivery,
waiting for timed jobs (reminders, review emails, commission hold).

## 6. Known gaps, assumptions and unverified areas

- **Requires confirmation** (marked in Remarks): whether a duplicate owner email on New vendor
  re-uses the account (SA-04-009), model numbers unique per store (VC-04-015), and whether
  deleting a media file in use is blocked or only warned (VC-09-005).
- **Product question raised by testing**: the plan's monthly order limit is shown and warned
  about, but never enforced at checkout. Decide whether shoppers' orders should ever be refused.
- **Not testable locally**: real WhatsApp delivery and Meta template approval, Razorpay live
  payments and webhooks from Razorpay's servers, Shiprocket booking, custom domains with SSL,
  production-only behaviour (service worker, "coming soon" for draft stores). These cases say
  what they need.
- **Timed jobs**: abandoned cart reminders (1 hour), review emails (05:00), commission hold
  days, quiet hours (21:00 to 09:00), store session expiry (2 hours). Run them when convenient or
  with a changed clock.
- **Data dependencies**: many vendor CMS cases need `pnpm demo:selling home-orbit` (sample prices,
  COD, zones). Home Orbit's real prices, business details, policies and keys are not in yet.
- **Machine**: during the run the PC had about 0.3 GB of 15.6 GB memory free (Chrome, VS Code,
  Claude apps). The dev server and the browser stalled several times. Close other apps before
  long runs.
- `admin-phase1-chrome-qa.md` is the earlier 4 October script, kept for history; this suite
  replaces it.
