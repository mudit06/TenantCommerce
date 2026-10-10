"""Super admin (platform panel) modules and test cases. Labels follow the built screens
(docs/screens/super-admin.md, docs/manual-testing.md section 1)."""

from qa_model import ADMIN, STORE, Case, Module

SA = 'Super admin'

MODULES = [
    Module('SA-01', 'Super Admin', 'Sign in and two-step verification', 'sign-in', f'{ADMIN}/login',
           SA, 'Platform staff sign in with email, password and an authenticator code; lockout and sessions.',
           ['QA database running (`app-qa`)', 'Super admin account admin@tenantecom.local with its password (from .env)',
            'An authenticator app (or the QA key) for the super admin'], [], ['sa-login']),
    Module('SA-02', 'Super Admin', 'Platform dashboard', 'dashboard', ADMIN, SA,
           'Live stores, MRR, past due, orders today, GMV, sales chart, needs attention, top stores, recently onboarded.',
           ['Signed in as super admin', 'Optional: `pnpm demo:selling home-orbit` and `pnpm demo:orders home-orbit` for sales figures'],
           ['SA-01'], ['sa-dashboard']),
    Module('SA-03', 'Super Admin', 'All vendors', 'all-vendors', f'{ADMIN}/collections/tenants', SA,
           'The vendor list with status tabs, search, filters, plan usage, orders in 30 days and CSV export.',
           ['Signed in as super admin', 'Stores Home Orbit (draft), Demo Sanitary and Demo Clothing (active) from the seed'],
           ['SA-01'], ['sa-vendors']),
    Module('SA-04', 'Super Admin', 'New vendor (onboarding)', 'new-vendor', f'{ADMIN}/new-vendor', SA,
           'Five-section onboarding: business with GSTIN check, store slug, plan and trial, starting features, owner invite.',
           ['Signed in as super admin', 'A unique slug not used before (reset the QA database to reuse one)'],
           ['SA-01'], ['sa-vendor-new']),
    Module('SA-05', 'Super Admin', 'Vendor overview and store status', 'vendor-overview', f'{ADMIN}/collections/tenants/<id>', SA,
           'Business details (read-only with Edit), plan usage, store health, internal notes, recent changes; Go live, Suspend, Resume, Archive.',
           ['Signed in as super admin', 'Home Orbit exists'], ['SA-03'], ['sa-vendor']),
    Module('SA-06', 'Super Admin', 'Store sessions (Manage store, View as support)', 'store-sessions', f'{ADMIN}/collections/tenants/<id>', SA,
           'Time-boxed, audited sessions inside a vendor\'s CMS with a reason; read-only support view.',
           ['Signed in as super admin', 'Home Orbit exists'], ['SA-05'], ['sa-vendor']),
    Module('SA-07', 'Super Admin', 'Vendor features', 'vendor-features', f'{ADMIN}/collections/tenants/<id> → Features', SA,
           'Per-store feature switches capped by the plan, dependencies, Phase 2 rows locked, settings.',
           ['Signed in as super admin', 'Home Orbit on the Starter plan'], ['SA-05'], ['sa-vendor-features']),
    Module('SA-08', 'Super Admin', 'Vendor connectors', 'vendor-connectors', f'{ADMIN}/collections/tenants/<id> → Connectors', SA,
           'Allowed switch per provider, connection state, masked keys, last test and webhook, failing banner, COD rules.',
           ['Signed in as super admin'], ['SA-05'], ['sa-vendor-connectors']),
    Module('SA-09', 'Super Admin', 'Vendor domains', 'vendor-domains', f'{ADMIN}/collections/tenants/<id> → Domains', SA,
           'The store\'s subdomain, primary flag and redirect flag.', ['Signed in as super admin'], ['SA-05'], ['sa-vendor-domains']),
    Module('SA-10', 'Super Admin', 'Vendor billing', 'vendor-billing', f'{ADMIN}/collections/tenants/<id> → Billing', SA,
           'Plan and price with GST, starting offer, record payment, change plan, pause, resume, cancel, history.',
           ['Signed in as super admin'], ['SA-05'], ['sa-vendor-billing']),
    Module('SA-11', 'Super Admin', 'Vendor staff', 'vendor-staff', f'{ADMIN}/collections/tenants/<id> → Staff', SA,
           'Staff meter, invite, resend invite, change roles, reset two-step, remove; a store keeps one owner.',
           ['Signed in as super admin'], ['SA-05'], ['sa-vendor-staff']),
    Module('SA-12', 'Super Admin', 'Plans', 'plans', f'{ADMIN}/collections/plans', SA,
           'Plan cards, features and connectors matrices, create and edit plans.', ['Signed in as super admin'], ['SA-01'], ['sa-plans']),
    Module('SA-13', 'Super Admin', 'Subscriptions', 'subscriptions', f'{ADMIN}/collections/subscriptions', SA,
           'MRR, on trial, past due, renewing in 7 days, status tabs, record payment, CSV export.',
           ['Signed in as super admin'], ['SA-10'], ['sa-subscriptions']),
    Module('SA-14', 'Super Admin', 'Team and access, Staff users', 'team', f'{ADMIN}/team', SA,
           'Platform team list with two-step and last sign-in, invite teammate, reset two-step, security card; Staff users list.',
           ['Signed in as super admin'], ['SA-01'], ['sa-team']),
    Module('SA-15', 'Super Admin', 'Platform permissions and isolation', 'permissions', ADMIN, 'Super admin and Support',
           'What super admins, support staff and store staff can reach in the platform panel.',
           ['A super admin and a Support teammate (SA-14)', 'A store owner login'], ['SA-14'], ['sa-team']),
]

CASES: list[Case] = []


def tc(module, sub, func, scenario, pre, data, steps, expected, priority='High', type='Functional',
       role=SA, notes='', smoke=False):
    n = sum(1 for c in CASES if c.module == module) + 1
    CASES.append(Case(f'{module}-{n:03d}', module, sub, func, scenario, pre, data, steps, expected,
                      priority, type, role, notes, smoke))


# ---------------------------------------------------------------- SA-01 Sign in
tc('SA-01', 'Sign in', 'Page layout', 'The sign-in page shows the platform form with its fields and options.',
   'Signed out', '—',
   [f'Open {ADMIN}', 'Verify you are sent to the sign-in page'],
   'Email and Password fields, a Show control on the password, a "Keep me signed in on this device" box and a Sign in button.',
   'Medium', 'UI/UX', smoke=True)
tc('SA-01', 'Sign in', 'Wrong password', 'A wrong password is refused with a message that does not say which part was wrong.',
   'Signed out', 'Email admin@tenantecom.local; password "wrong-password-1"',
   ['Type the email and the wrong password', 'Press Sign in'],
   'The message "The email or password provided is incorrect." shows; you stay on the sign-in page.',
   'Critical', 'Negative', smoke=True)
tc('SA-01', 'Sign in', 'Unknown email', 'An email with no account gets the same message as a wrong password.',
   'Signed out', 'Email nobody@tenantecom.local; any password',
   ['Type the unknown email and a password', 'Press Sign in'],
   'The same "The email or password provided is incorrect." message; nothing tells that the account does not exist.',
   'High', 'Security/Permissions')
tc('SA-01', 'Sign in', 'Required fields', 'Empty fields are caught before sending.',
   'Signed out', 'Both fields empty',
   ['Leave Email and Password empty', 'Press Sign in'],
   'The form asks for the email and the password; no request signs you in.',
   'Medium', 'Validation')
tc('SA-01', 'Two-step', 'Step 2 asked', 'After the right password a platform account is asked for its authenticator code.',
   'Signed out; super admin has two-step set up', 'Right email and password',
   ['Type the right email and password', 'Press Sign in', 'Verify the next screen'],
   '"Step 2 of 2, Two-step verification" with six code boxes; the dashboard is not shown yet.',
   'Critical', 'Security/Permissions', smoke=True)
tc('SA-01', 'Two-step', 'Wrong code', 'A wrong 6-digit code is refused.',
   'On Step 2 of 2', 'Code 000000 (not the app\'s current code)',
   ['Type 000000 in the six boxes', 'Submit'],
   'The message "That code didn\'t work" (or similar) shows; you stay on step 2.',
   'Critical', 'Negative', smoke=True)
tc('SA-01', 'Two-step', 'Right code, paste', 'The authenticator code signs you in; pasting all six digits into the first box fills them all.',
   'On Step 2 of 2', 'The current code from the authenticator app',
   ['Copy the 6-digit code', 'Paste it into the first box', 'Verify all six boxes are filled', 'Submit if it does not submit by itself'],
   'You land on the platform dashboard, "Good morning/afternoon/evening, Platform".',
   'Critical', 'Functional', smoke=True)
tc('SA-01', 'Two-step', 'First-time setup', 'A platform account without two-step sees only the setup until it is done.',
   'A new Support teammate (SA-14) signed in for the first time', 'Their email and password; an authenticator app',
   ['Sign in as the new teammate', 'Verify the panel is covered by "Set up two-step sign-in"', 'Press it, scan the QR code (or type the setup key)',
    'Type the app\'s 6-digit code and confirm', 'Verify the dashboard shows'],
   'Until the code is confirmed, no platform screen is usable; after it, the dashboard shows and Team and access lists Two-step On.',
   'Critical', 'Security/Permissions')
tc('SA-01', 'Two-step', 'Setup with a wrong code', 'Two-step setup is not saved with a wrong confirmation code.',
   'On the setup screen', 'Code 123456 that the app did not show',
   ['Type a wrong code on the setup screen', 'Confirm'],
   'An error says the code did not match; two-step stays off and the setup screen stays.',
   'High', 'Negative')
tc('SA-01', 'Sessions', 'Keep me signed in', 'Without the tick the session ends with the browser; with it, it survives a restart (8 hours at most).',
   'Signed out', 'Right credentials and code',
   ['Sign in without ticking "Keep me signed in on this device"', 'Close every browser window and reopen the admin', 'Verify you must sign in again',
    'Sign in again with the box ticked', 'Close and reopen the browser', 'Verify you are still signed in'],
   'Unticked: signed out after the browser closes. Ticked: still signed in after reopening.',
   'Medium', 'Data persistence')
tc('SA-01', 'Sessions', 'Sign out', 'Signing out ends the session.',
   'Signed in', '—',
   ['Open the account menu and sign out', f'Open {ADMIN}'],
   'The sign-in page shows; the browser back button does not reopen admin data.',
   'High', 'Security/Permissions', smoke=True)
tc('SA-01', 'Lockout', 'Five wrong passwords', 'Five wrong passwords lock the account for 15 minutes.',
   'Use a store owner that does not matter (owner@demo-clothing.example), private window', 'Wrong password 6 times',
   ['Sign in with a wrong password 5 times; read the message each time', 'Try a 6th time'],
   'Tries 1–5: "The email or password provided is incorrect." The 6th: "This user is locked due to having too many failed login attempts." It lifts after 15 minutes.',
   'High', 'Security/Permissions, Boundary', role='Tester (any)')
tc('SA-01', 'Lockout', 'Wrong codes', 'Repeated wrong two-step codes lock sign-in like wrong passwords.',
   'On Step 2 of 2 for a test platform account (not your only super admin)', '5 wrong codes',
   ['Type a wrong code 5 times', 'Then type the right code'],
   'After 5 wrong codes the account is locked for 15 minutes and even the right code is refused until then.',
   'Medium', 'Security/Permissions, Boundary', notes='Use a throw-away Support account so you are not locked out.')
tc('SA-01', 'Password reset', 'Forgot password', 'The reset link sets a new password; a too-short one is refused.',
   'Signed out; a test account', 'New password "short1" then a 10+ character one',
   ['Use Forgot password with the account\'s email', 'Open the link printed in the `pnpm dev` terminal ([dev-log email])',
    'Try "short1"', 'Then a 10-character or longer password'],
   'Short passwords are refused (10 characters at least); a valid one saves and the account signs in with it (still asking for the code when two-step is on).',
   'High', 'Validation')

# ---------------------------------------------------------------- SA-02 Dashboard
tc('SA-02', 'Figures', 'Tiles', 'The five figures show as the wireframe.',
   'Signed in as super admin', 'Seeded QA data',
   [f'Open {ADMIN}', 'Read the figure tiles'],
   'Live stores, MRR (before GST), Past due, Orders today (all stores) and GMV this month are shown with numbers.',
   'High', 'UI/UX', smoke=True)
tc('SA-02', 'Figures', 'Live stores count', 'Live stores counts active stores only.',
   'Two active stores and Home Orbit as a draft', '—',
   ['Read Live stores', 'Compare with All vendors → Active tab count'],
   'Live stores equals the Active count (2 on a fresh seed; 3 after Home Orbit goes live).',
   'High', 'Integration')
tc('SA-02', 'Sales', 'Sales across all stores', 'The chart has one bar per day of the month and reflects orders.',
   'Demo orders created for Home Orbit', '`pnpm demo:orders home-orbit`',
   ['Read the Sales across all stores chart', 'Hover or compare bars with Top stores'],
   'Bars appear on days with sold orders; days without orders are empty; the month total matches GMV this month.',
   'Medium', 'Integration')
tc('SA-02', 'Lists', 'Top stores this month', 'Stores with orders are ranked by GMV.',
   'Demo orders exist', '—',
   ['Read Top stores this month'],
   'Each row shows vendor, industry, orders, GMV and the change against last month to the same day; Home Orbit is listed.',
   'Medium', 'Functional')
tc('SA-02', 'Lists', 'Needs attention', 'Stores needing action are listed with the reason.',
   'Fresh seed', '—',
   ['Read Needs attention'],
   'Home Orbit "Store is still a draft" and the owners who have not accepted their invite are listed; each row opens the vendor.',
   'High', 'Functional')
tc('SA-02', 'Lists', 'Recently onboarded with Resend invite', 'Recently created stores show with status; Resend invite sends a new link.',
   'Fresh seed', '—',
   ['Read Recently onboarded', 'Press Resend invite on a store whose owner has not accepted', 'Watch the `pnpm dev` terminal'],
   'Home Orbit (Draft), Demo Clothing and Demo Sanitary (Active) show; Resend invite prints a [dev-log email] with a set-password link.',
   'Medium', 'Integration')
tc('SA-02', 'Navigation', 'Platform menu', 'The left menu has only platform sections.',
   'Signed in as super admin, no store session', '—',
   ['Read the left menu'],
   'Dashboard; Vendors (All vendors, New vendor); Billing (Plans, Subscriptions); Platform (Team and access, Staff users). No store sections such as Products or Orders.',
   'High', 'UI/UX, Security/Permissions', smoke=True)
tc('SA-02', 'Gate', 'Two-step gate', 'A platform account without two-step sees the setup in place of the menu.',
   'A Support teammate who has not set up two-step', '—',
   ['Sign in as that teammate', 'Try to open All vendors from the address bar'],
   'The panel shows only "Set up two-step sign-in"; no vendor data is shown until it is done.',
   'High', 'Security/Permissions')

# ---------------------------------------------------------------- SA-03 All vendors
tc('SA-03', 'List', 'Columns and tabs', 'The list shows each vendor with the wireframe\'s columns and tab counts.',
   'Signed in as super admin; fresh seed', '—',
   ['Open Vendors → All vendors'],
   'Columns Vendor (with primary domain), Industry, Plan, Store, Subscription, Products (bar against the plan), Orders in 30 days, Created. Tabs All 3, Active 2, Draft 1.',
   'High', 'UI/UX', smoke=True)
tc('SA-03', 'Search', 'By name', 'Search narrows the list and the tab counts follow.',
   'On All vendors', 'Search "orbit"',
   ['Type orbit in the search box', 'Read the rows and tab counts'],
   'Only Home Orbit stays; the tabs count 1 under All and Draft.',
   'High', 'Functional', smoke=True)
tc('SA-03', 'Search', 'By slug, GSTIN or domain', 'Search also matches slug, GSTIN and domain.',
   'On All vendors', 'Search "demo-sanitary"; then part of a GSTIN; then "localhost"',
   ['Search each value in turn'],
   'The slug finds Demo Sanitary; a GSTIN fragment finds its store; "localhost" matches stores by their domain.',
   'Medium', 'Functional')
tc('SA-03', 'Search', 'No match', 'A search with no match shows an empty state.',
   'On All vendors', 'Search "zzzz-no-store"',
   ['Type the value'],
   'No rows and an empty-list message; clearing the search brings all vendors back.',
   'Low', 'Negative')
tc('SA-03', 'Filters', 'Plan, Industry, Subscription', 'Each filter narrows the list and is kept in the address.',
   'On All vendors', 'Plan = Starter; Industry = Hardware; Subscription = Trial',
   ['Pick each filter in turn', 'Copy the address into a new tab'],
   'Rows and tab counts follow each filter; the new tab opens with the same filters applied.',
   'Medium', 'Functional, Data persistence')
tc('SA-03', 'Tabs', 'Status tabs', 'Each status tab shows only stores in that state.',
   'On All vendors', '—',
   ['Click Draft', 'Click Active'],
   'Draft lists only Home Orbit (fresh seed); Active lists Demo Sanitary and Demo Clothing.',
   'Medium', 'Functional')
tc('SA-03', 'Plan usage', 'Usage bar', 'Products used against the plan show a bar and a warning at 90%.',
   'Home Orbit on Starter (500 products) with 110 products', '—',
   ['Read Home Orbit\'s Products column'],
   '"110 / 500" with a bar about a fifth full; a store at 90% or more would show "N% used".',
   'Low', 'UI/UX')
tc('SA-03', 'Export', 'Export CSV', 'Export downloads the list as filtered.',
   'On All vendors with the Draft tab', '—',
   ['Press Export CSV', 'Open the file'],
   'A CSV downloads with one row per vendor shown (only Home Orbit for the Draft tab) and the list\'s columns.',
   'Medium', 'Functional')
tc('SA-03', 'Navigation', 'Open a vendor', 'A row opens the vendor overview.',
   'On All vendors', '—',
   ['Click Home Orbit'],
   'The vendor overview opens with the tabs Overview, Features, Connectors, Domains, Billing, Staff.',
   'High', 'Functional', smoke=True)

# ---------------------------------------------------------------- SA-04 New vendor
tc('SA-04', 'Form', 'Layout', 'The onboarding page has five sections and a summary.',
   'Signed in as super admin', '—',
   ['Open Vendors → New vendor'],
   'Sections 1 Business, 2 Store, 3 Plan and trial, 4 Starting features, 5 Owner login, and a "Will be created" summary on the right.',
   'Medium', 'UI/UX')
tc('SA-04', 'Business', 'GSTIN checksum', 'A GSTIN with a wrong last character is refused.',
   'On New vendor', 'GSTIN 29AABCT1234F1ZN',
   ['Type the GSTIN'],
   '"The last character does not match. Check for a typing mistake" shows under the field.',
   'High', 'Validation', smoke=True)
tc('SA-04', 'Business', 'GSTIN fills PAN and state', 'A valid GSTIN fills PAN and state.',
   'On New vendor', 'GSTIN 29AABCT1234F1ZM',
   ['Type the GSTIN'],
   'PAN AABCT1234F and State Karnataka (29) fill in by themselves.',
   'High', 'Functional')
tc('SA-04', 'Business', 'Required fields', 'The vendor is not created with required fields empty.',
   'On New vendor', 'All fields empty',
   ['Press Create vendor'],
   'Errors on Store name, Legal name, Industry, slug, plan and the owner\'s name and email; nothing is created.',
   'High', 'Validation')
tc('SA-04', 'Store', 'Slug and address', 'The slug becomes the store address; a used slug is refused.',
   'On New vendor', 'Slug test-locks; then home-orbit',
   ['Type test-locks', 'Read the summary', 'Change the slug to home-orbit and try to create'],
   'The summary shows test-locks.localhost; "home-orbit" is refused as already used.',
   'High', 'Validation')
tc('SA-04', 'Plan', 'Plan and trial', 'Choosing a plan shows its starting offer and the trial.',
   'On New vendor', 'Starter; trial 14 days',
   ['Pick Starter', 'Set the trial to 14 days'],
   '"Starts at ₹9,999 for 3 months" shows and the summary lists the trial end date.',
   'Medium', 'Functional')
tc('SA-04', 'Features', 'Preset within the plan', 'Starting features come from the industry preset, capped by the plan.',
   'Industry Locks, plan Starter', '—',
   ['Read section 4'],
   'Features from the preset are switched on; features outside Starter are locked.',
   'Medium', 'Functional')
tc('SA-04', 'Create', 'Create vendor with invite', 'Creating the vendor makes a draft store and emails the owner.',
   'Valid form', 'Test Locks / Test Locks Pvt Ltd / Locks / 29AABCT1234F1ZM / test-locks / Starter / Test Owner, owner@testlocks.example, "Email the invite now" ticked',
   ['Fill the form', 'Press Create vendor', 'Watch the `pnpm dev` terminal', f'Open http://test-locks.localhost:3000'],
   'You land on the new vendor overview as Store draft; the terminal prints "You\'re invited to manage Test Locks" with a link; the store opens with a preview banner in the default design and no products.',
   'Critical', 'Functional, Integration', smoke=True,
   notes='Creates a throw-away store; reset the QA database afterwards if needed.')
tc('SA-04', 'Create', 'Duplicate owner email', 'An owner email that already has an account is handled.',
   'Valid form', 'Owner email owner@homeorbit.example',
   ['Fill the form with an existing owner email', 'Create'],
   'Either the existing user is added as owner of the new store or a clear message explains; no duplicate account is made.',
   'Medium', 'Negative', notes='Requires confirmation of the intended behaviour.')

# ---------------------------------------------------------------- SA-05 Vendor overview
tc('SA-05', 'Header', 'Status and actions', 'The header shows the store\'s state and actions.',
   'Home Orbit as a draft', '—',
   ['Open All vendors → Home Orbit'],
   'Logo or initials, "Store draft", "Starter plan", home-orbit.localhost, View store and Go live.',
   'High', 'UI/UX', smoke=True)
tc('SA-05', 'Business details', 'Read-only then Edit', 'Business details are read-only until Edit is pressed.',
   'On the overview', '—',
   ['Read Business details', 'Press Edit'],
   'Values show as text first; Edit opens the form with the same values.',
   'Medium', 'Functional')
tc('SA-05', 'Business details', 'GSTIN fills PAN and state', 'Changing the GSTIN updates PAN and state.',
   'Business details in edit mode', 'GSTIN 27AAPFU0939F1ZV',
   ['Type the GSTIN', 'Save'],
   'PAN and State (Maharashtra 27) fill in; Save succeeds and the read-only view shows them after a reload.',
   'High', 'Functional, Data persistence')
tc('SA-05', 'Business details', 'Invalid GSTIN', 'An invalid GSTIN is not saved.',
   'Edit mode', 'GSTIN 27AAPFU0939F1ZX',
   ['Type the GSTIN', 'Save'],
   'The checksum error shows and nothing is saved.',
   'High', 'Validation')
tc('SA-05', 'Plan usage', 'Usage figures', 'Plan usage shows products and staff against the plan.',
   'On the overview', '—',
   ['Read Plan usage'],
   'Products 110 / 500 and Staff users 1 / 3 (fresh seed).',
   'Medium', 'Functional')
tc('SA-05', 'Store health', 'Health card', 'Store health summarises the store\'s state.',
   'On the overview', '—',
   ['Read Store health'],
   'Last order, Razorpay state (and webhook), any failing connector, the primary domain and the storefront design (vendors/home-orbit).',
   'Medium', 'Functional')
tc('SA-05', 'Notes', 'Internal notes and recent changes', 'An internal note saves and the change is recorded.',
   'On the overview', 'Note "QA check 1"',
   ['Add a line under Internal notes', 'Save', 'Reload', 'Read Recent changes'],
   'The note is still there after reload; Recent changes lists the edit with who and when.',
   'High', 'Data persistence')
tc('SA-05', 'Status', 'Go live', 'Go live makes the store active and indexable.',
   'Home Orbit as a draft', '—',
   ['Press Go live and confirm', f'Reload {STORE}', f'Open {STORE}/robots.txt'],
   'Status Active; the preview bar is gone; robots.txt allows search engines and names the sitemap; Live stores on the dashboard goes up by 1.',
   'Critical', 'Functional, Integration', smoke=True)
tc('SA-05', 'Status', 'Suspend needs a reason', 'Suspend is refused without a reason.',
   'Home Orbit active', 'Empty reason',
   ['Press Suspend store', 'Leave the reason empty and confirm'],
   'The reason is required; the store stays active.',
   'High', 'Validation')
tc('SA-05', 'Status', 'Suspend', 'Suspending closes the store to shoppers.',
   'Home Orbit active', 'Reason "QA suspend test"',
   ['Press Suspend store', 'Type the reason and confirm', f'Reload {STORE} in a private window'],
   '"Store unavailable" on the store; /robots.txt says Disallow: /; the overview shows Suspended.',
   'Critical', 'Functional, Integration')
tc('SA-05', 'Status', 'Resume', 'Resume reopens a suspended store at once.',
   'Home Orbit suspended', '—',
   ['Press Resume store', f'Reload {STORE}'],
   'The store is back immediately; Recent changes lists Go live, Suspend and Resume with reasons.',
   'Critical', 'Functional')
tc('SA-05', 'Status', 'Archive', 'Archiving hides the store and keeps its data.',
   'A throw-away store (Test Locks from SA-04)', 'Reason "QA archive"',
   ['Archive Test Locks with a reason', 'Open http://test-locks.localhost:3000', 'Look for it under All vendors → Archived'],
   'The store address shows not found; the vendor is listed as Archived with its data.',
   'Medium', 'Functional', notes='Do not archive Home Orbit.')

# ---------------------------------------------------------------- SA-06 Store sessions
tc('SA-06', 'Isolation', 'Store screens need a session', 'Without a store session the platform panel cannot open store records.',
   'Super admin, no store session', f'Address {ADMIN}/collections/pages',
   ['Type the address'],
   '"Nothing found" (or equivalent); no store pages are listed.',
   'Critical', 'Security/Permissions', smoke=True)
tc('SA-06', 'Manage store', 'Reason required', 'Manage store needs a real reason.',
   'On Home Orbit overview', 'Reason empty, then "abc"',
   ['Press Manage store', 'Try to open with an empty reason, then with "abc"'],
   'Both are refused; the box explains the 2-hour session.',
   'High', 'Validation')
tc('SA-06', 'Manage store', 'Open the store CMS', 'A session opens the vendor\'s CMS with a banner.',
   'On Home Orbit overview', 'Reason "Vendor asked us to set up the Diwali page"',
   ['Press Manage store', 'Type the reason and open'],
   'A bar on every page: "You are managing Home Orbit as platform admin" with the reason and end time; the menu is Home Orbit\'s (Catalog, Sales, Marketing, Content, Store, Insights); platform sections are gone.',
   'Critical', 'Functional', smoke=True)
tc('SA-06', 'Manage store', 'Platform screens hidden in session', 'Platform collections are not reachable during a store session.',
   'In a Manage store session', f'Address {ADMIN}/collections/plans',
   ['Type the address'],
   '"Nothing found"; plans are not shown.',
   'High', 'Security/Permissions')
tc('SA-06', 'Audit', 'Changes are attributed', 'Edits in a session are recorded with the reason.',
   'In a Manage store session', 'Change a word on About us; Save Draft',
   ['Edit the About us page and save a draft', 'End session', 'Open Home Orbit overview → Recent changes'],
   'Pages list shows "by Platform Admin (platform team)"; Recent changes lists the session and the edit with the reason.',
   'High', 'Integration, Security/Permissions')
tc('SA-06', 'End', 'End session', 'End session returns to the platform panel.',
   'In a Manage store session', '—',
   ['Press End session in the bar'],
   'The platform dashboard shows and the store menu is gone.',
   'High', 'Functional', smoke=True)
tc('SA-06', 'View as support', 'Read-only session', 'View as support shows the store without saving.',
   'On Home Orbit overview', 'Reason "Support ticket 42"',
   ['Press View as support with a reason', 'Open a product', 'Try to change and save'],
   'Screens open read-only; there is no Save (or saving is refused).',
   'High', 'Security/Permissions')
tc('SA-06', 'Timeout', 'Session ends by itself', 'A store session ends at its end time.',
   'A Manage store session', 'Wait past the end time (2 hours) or use a test clock',
   ['Leave the session open past the end time', 'Open any store screen'],
   'The session has ended and you are back in the platform panel.',
   'Low', 'Security/Permissions', notes='Long wait; run when convenient.')

# ---------------------------------------------------------------- SA-07 Features
tc('SA-07', 'Features', 'Switches and locks', 'Each feature has a switch; ones outside the plan or Phase 2 are locked.',
   'Home Orbit on Starter', '—',
   ['Open Home Orbit → Features'],
   'A row per feature with a switch; rows outside Starter and Phase 2 rows are locked with the reason.',
   'High', 'UI/UX', smoke=True)
tc('SA-07', 'Features', 'Switch off reaches the store', 'Switching a feature off removes it from the store at once.',
   'Enquiries inbox on', 'Feature Enquiries inbox',
   ['Switch Enquiries inbox off', 'Read the message', f'Open {STORE}/products/feather-stainless-steel-pull-handle-hoph-504'],
   '"Saved. The live store has the change now." The product page has no Request a quote form.',
   'Critical', 'Integration', smoke=True)
tc('SA-07', 'Features', 'Switch back on', 'Switching it on brings the feature back.',
   'Enquiries inbox off', '—',
   ['Switch Enquiries inbox on', 'Reload the product page'],
   'The quote form is back.',
   'High', 'Integration, Data persistence')
tc('SA-07', 'Features', 'Server check', 'A switched-off feature is refused on the server, not only hidden.',
   'Enquiries off', 'Send an enquiry from an open page that still shows the old form',
   ['Open a product page with the form', 'Switch Enquiries off in another tab', 'Submit the form on the first tab'],
   'The submission is refused; no enquiry is created.',
   'High', 'Security/Permissions')
tc('SA-07', 'Features', 'Dependencies', 'Switching on a feature that needs another asks first.',
   'A feature with a dependency (for example WhatsApp offers needs Offer messages)', '—',
   ['Switch on the dependent feature while its requirement is off'],
   'A prompt names the feature it needs; confirming switches both on, cancelling changes nothing.',
   'Medium', 'Functional')
tc('SA-07', 'Features', 'Menu follows features', 'The vendor CMS menu follows the features.',
   'Owner signed in (another window)', 'Switch Reviews off',
   ['Switch Reviews off', 'Reload the owner\'s CMS'],
   'Marketing → Reviews is gone from the owner\'s menu; switching it on brings it back.',
   'High', 'Integration')

# ---------------------------------------------------------------- SA-08 Connectors
tc('SA-08', 'Connectors', 'Layout', 'Connectors are grouped with an Allowed switch per provider.',
   'On Home Orbit → Connectors', '—',
   ['Read the tab'],
   'Payments (Razorpay), Shipping (manual, Shiprocket), Order updates (WhatsApp, SMS "Comes later", email); each provider has Allowed; unconnected ones say "Not connected by the vendor yet".',
   'High', 'UI/UX')
tc('SA-08', 'Connectors', 'Disallow a provider', 'Switching Allowed off blocks the provider for the store.',
   'Razorpay allowed', '—',
   ['Switch Razorpay Allowed off', 'Read the message', 'As the owner open Store → Payments'],
   '"Razorpay switched off for this store"; the owner cannot connect or use Razorpay; switching it back on restores it.',
   'High', 'Integration, Security/Permissions')
tc('SA-08', 'Connectors', 'Secrets never shown', 'Connected providers show masked keys only.',
   'Owner saved Razorpay test keys (VC-25)', '—',
   ['Read the Razorpay row'],
   '"Connected by", mode, masked key ID and "Encrypted, never shown" per secret; no secret value appears anywhere on the page or in its network responses.',
   'Critical', 'Security/Permissions', smoke=True)
tc('SA-08', 'Connectors', 'COD rules shown', 'The vendor\'s COD rules appear on the tab.',
   'Owner saved COD rules ₹499–₹25,000, fee ₹49 (VC-25)', '—',
   ['Read the COD line'],
   '"Vendor rules: orders ₹499.00 to ₹25,000.00, ₹49.00 fee".',
   'Medium', 'Integration')

# ---------------------------------------------------------------- SA-09 Domains
tc('SA-09', 'Domains', 'Primary domain', 'The store\'s address is listed as primary.',
   'On Home Orbit → Domains', '—',
   ['Read the tab'],
   'home-orbit.localhost is listed as primary.',
   'Medium', 'Functional')
tc('SA-09', 'Domains', 'Unknown host', 'An address that belongs to no store never shows a store.',
   '—', 'http://unknown-store.localhost:3000',
   ['Open the address'],
   'A plain 404; no store content.',
   'High', 'Security/Permissions')

# ---------------------------------------------------------------- SA-10 Billing
tc('SA-10', 'Billing', 'Plan and offer', 'Billing shows the plan, price and starting offer.',
   'On Home Orbit → Billing', '—',
   ['Read the tab'],
   'Starter at ₹3,499 + GST, the ₹9,999 starting offer, and the cards Record payment, Change plan, Pause or cancel.',
   'High', 'UI/UX')
tc('SA-10', 'Billing', 'Record payment', 'Recording a payment moves the paid period and adds history.',
   'On Billing', 'Amount ₹9,999, method and reference',
   ['Press Record payment', 'Enter ₹9,999 with a reference', 'Save', 'Reload'],
   'The paid period moves ahead (first payment covers the offer\'s 3 months) and the payment shows in History after reload.',
   'Critical', 'Functional, Data persistence', smoke=True)
tc('SA-10', 'Billing', 'Invalid amount', 'A zero or negative payment is refused.',
   'On Billing', 'Amount 0, then -100',
   ['Record payment with 0', 'Then with -100'],
   'Both refused with a message; nothing is added to History.',
   'High', 'Validation, Boundary')
tc('SA-10', 'Billing', 'Change plan', 'Changing the plan updates limits.',
   'On Billing', 'Plan Enterprise',
   ['Press Change plan, pick Enterprise, confirm', 'Open Overview → Plan usage'],
   'The plan reads Enterprise; product limit 10,000; the vendor list shows the new plan.',
   'High', 'Integration')
tc('SA-10', 'Billing', 'Pause and resume', 'Pausing and resuming the subscription changes its status.',
   'On Billing', 'Reason "QA pause"',
   ['Press Pause with a reason', 'Read the status', 'Press Resume'],
   'Status shows Paused then Active; History records both.',
   'Medium', 'Functional')
tc('SA-10', 'Billing', 'Cancel', 'Cancelling the subscription asks for confirmation.',
   'A throw-away store (Test Locks)', 'Reason "QA cancel"',
   ['Press Cancel subscription', 'Confirm with a reason'],
   'Status Cancelled with the end date; Subscriptions lists it under Cancelled.',
   'Medium', 'Functional', notes='Do not cancel Home Orbit.')

# ---------------------------------------------------------------- SA-11 Vendor staff
tc('SA-11', 'Staff', 'List', 'Staff shows the meter, invite and the table.',
   'On Home Orbit → Staff', '—',
   ['Read the tab'],
   'Staff meter, + Invite staff, and rows with name, email, roles, Two-step On/Off and last sign-in; the owner owner@homeorbit.example with invite pending.',
   'High', 'UI/UX')
tc('SA-11', 'Staff', 'Resend invite', 'Resend invite prints a new link.',
   'Owner invite pending', '—',
   ['Press Resend invite on the owner', 'Watch the `pnpm dev` terminal'],
   'A [dev-log email] to owner@homeorbit.example with a fresh set-password link.',
   'High', 'Integration', smoke=True)
tc('SA-11', 'Staff', 'Invite staff', 'Inviting a staff member with a role.',
   'On Staff', 'manager@homeorbit.example, role Manager',
   ['Press + Invite staff', 'Fill email, name and role', 'Send'],
   'The person is listed with Manager and invite pending; the invite email prints in the terminal.',
   'High', 'Functional')
tc('SA-11', 'Staff', 'Staff limit', 'The plan\'s staff limit is enforced.',
   'Starter allows 3 staff', 'Invite until the limit is passed',
   ['Invite staff until 3 exist', 'Try a 4th'],
   'The 4th invite is refused with the plan limit message.',
   'Medium', 'Boundary')
tc('SA-11', 'Staff', 'Change roles', 'Changing a staff member\'s roles saves.',
   'A staff member exists', 'Add Content editor',
   ['Press Change roles', 'Tick Content editor', 'Save', 'Reload'],
   'The new role shows after reload.',
   'Medium', 'Data persistence')
tc('SA-11', 'Staff', 'Reset two-step', 'Resetting a staff member\'s two-step makes them set it up again.',
   'A staff member with two-step On', '—',
   ['Press Reset two-step and confirm', 'Sign in as that person'],
   'Two-step reads Off; the reset is audited; the person signs in without a code and can set it up again.',
   'High', 'Security/Permissions')
tc('SA-11', 'Staff', 'Last owner protected', 'The store\'s last owner cannot be removed.',
   'Only one owner', '—',
   ['Press Remove on the owner'],
   '"The store needs at least one owner. Make someone else owner first."',
   'High', 'Negative')
tc('SA-11', 'Staff', 'Remove staff', 'Removing a staff member ends their access.',
   'A non-owner staff member signed in elsewhere', '—',
   ['Press Remove and confirm', 'Reload that person\'s CMS'],
   'They lose access to Home Orbit at once.',
   'High', 'Security/Permissions')

# ---------------------------------------------------------------- SA-12 Plans
tc('SA-12', 'Plans', 'Plan cards', 'One card per plan with prices and limits.',
   'Signed in as super admin', '—',
   ['Open Billing → Plans'],
   'Starter ₹3,499 / month with the starting offer ₹9,999 for 3 months, 500 products, 3 staff, 5 GB, 1,000 orders a month, vendors on it; Enterprise ₹6,999 / month, 10,000 products.',
   'High', 'UI/UX', smoke=True)
tc('SA-12', 'Plans', 'Matrices', 'Features and connectors allowed per plan.',
   'On Plans', '—',
   ['Read Features allowed and Connectors allowed'],
   'A row per feature or group with a tick per plan; Phase 2 rows marked P2.',
   'Medium', 'UI/UX')
tc('SA-12', 'Plans', 'Edit plan, no change', 'Saving a plan without changes works.',
   'On Plans', '—',
   ['Press Edit plan on Starter', 'Press Save'],
   'Saves without errors.',
   'Medium', 'Regression')
tc('SA-12', 'Plans', 'Edit price', 'A price change saves in paise and shows in rupees.',
   'Editing Starter', 'Monthly price ₹3,599',
   ['Change the monthly price', 'Save', 'Reload Plans', 'Change it back to ₹3,499'],
   'The card shows ₹3,599 after reload; MRR on the dashboard reflects it; restored afterwards.',
   'Medium', 'Data persistence')
tc('SA-12', 'Plans', 'Invalid limits', 'Negative or non-numeric limits are refused.',
   'Editing a plan', 'Products limit -5',
   ['Type -5 in the product limit', 'Save'],
   'Refused with a validation message.',
   'Medium', 'Validation')
tc('SA-12', 'Plans', 'Create plan', 'A new plan can be created and shows on the page.',
   'On Plans', 'Name "QA plan", code qa, ₹999/month, 50 products',
   ['Create a new plan with these values', 'Save', 'Open Plans'],
   'A QA plan card shows with its price and limits; set it inactive afterwards (listed apart).',
   'Low', 'Functional')

# ---------------------------------------------------------------- SA-13 Subscriptions
tc('SA-13', 'Subscriptions', 'Figures and tabs', 'Subscriptions shows the money figures and status tabs.',
   'Signed in as super admin', '—',
   ['Open Billing → Subscriptions'],
   'MRR, On trial, Past due and Renewing in 7 days; tabs by status with counts; a row per vendor with plan, billing, period end, next amount incl. GST and last payment.',
   'High', 'UI/UX', smoke=True)
tc('SA-13', 'Subscriptions', 'Record payment on past due', 'A past-due row offers Record payment.',
   'A past-due subscription (period end in the past)', '—',
   ['Open the Past due tab', 'Press Record payment on a row'],
   'The vendor\'s Billing card opens ready to record the payment.',
   'Medium', 'Integration')
tc('SA-13', 'Subscriptions', 'Export CSV', 'Export downloads the tab shown.',
   'On Subscriptions', '—',
   ['Pick a tab', 'Press Export CSV'],
   'A CSV with the rows of that tab.',
   'Low', 'Functional')
tc('SA-13', 'Subscriptions', 'MRR follows payments', 'Recording a payment updates the figures.',
   'A trial or past-due subscription', 'Record a payment (SA-10)',
   ['Note MRR and Past due', 'Record a payment on Billing', 'Reload Subscriptions'],
   'The subscription moves to Active and the figures change accordingly.',
   'Medium', 'Integration')

# ---------------------------------------------------------------- SA-14 Team
tc('SA-14', 'Team', 'List and security', 'Team and access lists the platform team and security rules.',
   'Signed in as super admin', '—',
   ['Open Platform → Team and access'],
   'You as Super admin with Two-step On and last sign-in; Security says two-step Required, 8-hour session, lockout and password length.',
   'High', 'UI/UX', smoke=True)
tc('SA-14', 'Team', 'Invite teammate', 'Inviting a Support teammate sends an invite.',
   'On Team and access', 'support.qa@tenantecom.local, Support',
   ['Invite the teammate as Support', 'Watch the terminal'],
   'Listed as Support, invite pending; the invite email prints in the terminal.',
   'High', 'Functional')
tc('SA-14', 'Team', 'Invalid email', 'An invalid email is refused.',
   'On Team and access', 'Email "not-an-email"',
   ['Invite with the invalid email'],
   'Refused with an email format message.',
   'Medium', 'Validation')
tc('SA-14', 'Team', 'Reset two-step (super admin only)', 'A super admin resets a teammate\'s two-step.',
   'A teammate with two-step On', '—',
   ['Press Reset two-step on the teammate and confirm'],
   'Two-step Off; the teammate must set it up again at the next sign-in; the reset is audited.',
   'High', 'Security/Permissions')
tc('SA-14', 'Staff users', 'Staff users list', 'Staff users lists every admin user.',
   'Signed in as super admin', '—',
   ['Open Platform → Staff users'],
   'A list of users with email and roles; secrets such as two-step keys never show.',
   'Medium', 'Security/Permissions')

# ---------------------------------------------------------------- SA-15 Permissions
tc('SA-15', 'Support role', 'Support cannot onboard', 'A Support teammate has no New vendor and cannot create stores.',
   'Signed in as Support (two-step set up)', '—',
   ['Read the menu', f'Open {ADMIN}/new-vendor'],
   'New vendor is not in the menu and the page refuses access.',
   'High', 'Security/Permissions')
tc('SA-15', 'Support role', 'Support cannot reset two-step', 'Only super admins reset two-step.',
   'Signed in as Support', '—',
   ['Open Team and access'],
   'No Reset two-step action (or it is refused).',
   'High', 'Security/Permissions')
tc('SA-15', 'Store staff', 'Store staff never see the platform', 'A store owner cannot open platform screens.',
   'Signed in as a store owner', f'{ADMIN}/collections/tenants, {ADMIN}/collections/plans',
   ['Open each address'],
   '"Nothing found" or no access for both; the menu has no Vendors, Billing or Platform.',
   'Critical', 'Security/Permissions', smoke=True)
tc('SA-15', 'API', 'Platform endpoints need a platform login', 'Platform exports refuse store staff and guests.',
   'Signed out, then signed in as a store owner', f'{ADMIN.replace("/admin", "")}/api/admin/v1/platform/vendors/export',
   ['Open the address signed out', 'Open it as a store owner'],
   'Refused both times (401 or 403); no CSV is returned.',
   'High', 'Security/Permissions')
