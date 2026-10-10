"""Vendor CMS (store admin) modules and test cases. Labels follow the built screens
(docs/screens/vendor-cms.md, docs/manual-testing.md sections 2, 3.7, 3.8, 4)."""

from qa_model import ADMIN, STORE, Case, Module

OWNER = 'Store owner'
PRE_OWNER = 'Signed in as Home Orbit\'s owner (or super admin with Manage store on Home Orbit)'
PRE_SELL = PRE_OWNER + '; store selling: `pnpm demo:selling home-orbit` run'

MODULES = [
    Module('VC-01', 'Vendor CMS', 'Sign in, first password and session', 'sign-in', f'{ADMIN}/login', OWNER,
           'Store staff set a password from the invite, sign in (optional two-step), lockout.',
           ['Home Orbit owner invite link (Resend invite on SA-11 prints it in the `pnpm dev` terminal)'], ['SA-11'], ['cms-staff']),
    Module('VC-02', 'Vendor CMS', 'Store dashboard and navigation', 'dashboard', ADMIN, OWNER,
           'Greeting, launch checklist, figures, charts, lists, quick actions, menu, top bar search.',
           [PRE_OWNER], ['VC-01'], ['cms-dashboard']),
    Module('VC-03', 'Vendor CMS', 'Store settings', 'store-settings', f'{ADMIN}/collections/site-settings', OWNER,
           'Branding, contact, grievance officer, GST and invoices, checkout and returns, announcement bar, policies, SEO, store status.',
           [PRE_OWNER], ['VC-01'], ['cms-settings']),
    Module('VC-04', 'Vendor CMS', 'Products and product editor', 'products', f'{ADMIN}/collections/products', OWNER,
           'Product list with tabs, search, filters, bulk actions, export; the editor with specifications, variants, price and GST, publishing rules.',
           [PRE_OWNER], ['VC-05', 'VC-06'], ['cms-products', 'cms-product-edit']),
    Module('VC-05', 'Vendor CMS', 'Categories', 'categories', f'{ADMIN}/collections/categories', OWNER,
           'Category tree with drag and drop, nesting up to 3 levels, category form.', [PRE_OWNER], ['VC-06'], ['cms-categories']),
    Module('VC-06', 'Vendor CMS', 'Attribute sets', 'attribute-sets', f'{ADMIN}/collections/attribute-sets', OWNER,
           'Sets with fields, filter and finish options, swatches, validation.', [PRE_OWNER], [], ['cms-attributes']),
    Module('VC-07', 'Vendor CMS', 'Brands, Documents and Variants', 'brands-documents', f'{ADMIN}/collections/brands', OWNER,
           'Supporting catalogue records: brands, product documents (PDF), variants list.', [PRE_OWNER], ['VC-04'], ['cms-products']),
    Module('VC-08', 'Vendor CMS', 'Import and export', 'import', f'{ADMIN}/import', OWNER,
           'CSV import of products, stock and prices, dealers with a full check first; templates; error report; export.',
           [PRE_OWNER], ['VC-04'], ['cms-import']),
    Module('VC-09', 'Vendor CMS', 'Media library', 'media', f'{ADMIN}/collections/media', OWNER,
           'Grid, tabs, search, storage meter, alt text, where used, replace, delete.', [PRE_OWNER], [], ['cms-media']),
    Module('VC-10', 'Vendor CMS', 'Orders and order detail', 'orders', f'{ADMIN}/collections/orders', OWNER,
           'Order list, tabs, search, filters, pack, ship, deliver, invoices, refunds, cancel, CSV.',
           [PRE_SELL, 'At least one storefront order (E2E-04)'], ['VC-24', 'VC-25'], ['cms-orders', 'cms-order']),
    Module('VC-11', 'Vendor CMS', 'Returns', 'returns', f'{ADMIN}/collections/orders → Returns', OWNER,
           'Return requests: approve with pickup note, reject with reason, receive, refund.',
           [PRE_SELL, 'A delivered order with a shopper account'], ['VC-10'], ['cms-order']),
    Module('VC-12', 'Vendor CMS', 'Customers and privacy requests', 'customers', f'{ADMIN}/collections/customers', OWNER,
           'Shopper accounts, search, export; privacy requests (export, delete).', [PRE_SELL, 'A shopper account (E2E-04)'], ['VC-10'], ['cms-customers']),
    Module('VC-13', 'Vendor CMS', 'Enquiries inbox', 'enquiries', f'{ADMIN}/collections/enquiries', OWNER,
           'Inbox tabs, filters, search, the open enquiry, reply, assign, status, notes, log a phone enquiry.',
           [PRE_OWNER, 'Enquiries feature on', 'At least one enquiry from the store'], [], ['cms-enquiries']),
    Module('VC-14', 'Vendor CMS', 'Schemes and offers', 'schemes', f'{ADMIN}/collections/schemes', OWNER,
           'Occasion templates, timeline, scheme editor, schedule, live pricing, end now.', [PRE_SELL, 'Schemes feature on'], ['VC-04'], ['cms-schemes', 'cms-scheme-edit']),
    Module('VC-15', 'Vendor CMS', 'Coupons', 'coupons', f'{ADMIN}/collections/coupons', OWNER,
           'Coupon codes, rules, visibility, bulk codes.', [PRE_SELL, 'Coupons feature on'], ['VC-14'], ['cms-coupons']),
    Module('VC-16', 'Vendor CMS', 'Offer messages', 'offer-messages', f'{ADMIN}/collections/offer-campaigns', OWNER,
           'Offer emails to opted-in shoppers: audience, test, schedule, send window, results.',
           [PRE_SELL, 'Offer messages feature on', 'A shopper who agreed to offers by email'], ['VC-14'], ['cms-campaigns']),
    Module('VC-17', 'Vendor CMS', 'Abandoned carts', 'abandoned-carts', f'{ADMIN}/collections/carts', OWNER,
           'Left carts, reminders with consent, settings, restore links.', [PRE_SELL, 'Abandoned cart feature on'], ['VC-16'], ['cms-abandoned']),
    Module('VC-18', 'Vendor CMS', 'Affiliates', 'affiliates', f'{ADMIN}/collections/affiliates', OWNER,
           'Applications, approve, reject, rates, personal coupon, payouts.',
           [PRE_SELL, 'Plan Enterprise and Affiliate program on (SA-07, SA-10)'], ['VC-15'], ['cms-affiliates']),
    Module('VC-19', 'Vendor CMS', 'Reviews', 'reviews', f'{ADMIN}/collections/reviews', OWNER,
           'To approve, approve with reply, reject with reason, settings.', [PRE_SELL, 'Reviews feature on', 'A review written on the store (E2E-06)'], ['VC-10'], ['cms-reviews']),
    Module('VC-20', 'Vendor CMS', 'Pages and page builder', 'pages', f'{ADMIN}/collections/pages', OWNER,
           'Pages list, templates, duplicate, delete, block editor, preview, SEO, publish.', [PRE_OWNER], ['VC-09'], ['cms-pages', 'cms-page-edit']),
    Module('VC-21', 'Vendor CMS', 'Navigation (menus)', 'navigation', f'{ADMIN}/collections/navigation', OWNER,
           'Header menu outline, footer columns, phone menu, link targets.', [PRE_OWNER], ['VC-05', 'VC-20'], ['cms-navigation']),
    Module('VC-22', 'Vendor CMS', 'Banners and redirects', 'banners-redirects', f'{ADMIN}/collections/banners', OWNER,
           'Banners with placement and schedule; redirects added by hand and on slug change.', [PRE_OWNER], ['VC-09'], ['cms-banners', 'cms-redirects']),
    Module('VC-23', 'Vendor CMS', 'Dealers', 'dealers', f'{ADMIN}/collections/dealers', OWNER,
           'Dealer list with Shown switch and map, dealer form with pin and pincode fill.', [PRE_OWNER, 'Dealer locator feature on'], [], ['cms-dealers']),
    Module('VC-24', 'Vendor CMS', 'Shipping zones and Shiprocket', 'shipping', f'{ADMIN}/shipping', OWNER,
           'Zones table, pincode test, add, edit, delete zones, validation; Shiprocket card.', [PRE_SELL], [], ['cms-shipping']),
    Module('VC-25', 'Vendor CMS', 'Payments (Razorpay and COD)', 'payments', f'{ADMIN}/payments', OWNER,
           'Razorpay keys (encrypted), test connection, webhook; cash on delivery rules.', [PRE_OWNER + ' (owner only)'], [], ['cms-payments']),
    Module('VC-26', 'Vendor CMS', 'WhatsApp and SMS', 'messaging', f'{ADMIN}/messaging', OWNER,
           'WhatsApp keys, webhook, message templates; SMS later.', [PRE_OWNER + ' (owner only)'], [], ['cms-messaging']),
    Module('VC-27', 'Vendor CMS', 'Order updates', 'order-updates', f'{ADMIN}/notifications', OWNER,
           'Steps with email and WhatsApp switches, preview, send test, delays, alerts.', [PRE_OWNER], ['VC-26'], ['cms-notifications']),
    Module('VC-28', 'Vendor CMS', 'Staff and roles', 'staff', f'{ADMIN}/staff', OWNER,
           'Invite staff with roles, change roles, remove, what each role can reach.', [PRE_OWNER], ['VC-01'], ['cms-staff']),
    Module('VC-29', 'Vendor CMS', 'Reports', 'reports', f'{ADMIN}/reports', OWNER,
           'Sales figures, daily sales, best sellers, offers, GST summary by HSN, exports.', [PRE_SELL, 'Delivered orders (VC-10)'], ['VC-10'], ['cms-reports']),
]

CASES: list[Case] = []


def tc(module, sub, func, scenario, pre, data, steps, expected, priority='High', type='Functional',
       role=OWNER, notes='', smoke=False):
    n = sum(1 for c in CASES if c.module == module) + 1
    CASES.append(Case(f'{module}-{n:03d}', module, sub, func, scenario, pre, data, steps, expected,
                      priority, type, role, notes, smoke))


# ---------------------------------------------------------------- VC-01 Sign in
tc('VC-01', 'First password', 'Short password refused', 'The set-password page refuses passwords under 10 characters.',
   'Owner invite link open (private window)', 'Password "Short12"',
   ['Type the short password in New Password and Confirm Password', 'Save'],
   'Refused with the minimum length message; the account stays without a password.',
   'High', 'Validation, Boundary')
tc('VC-01', 'First password', 'Mismatch', 'New and confirm password must match.',
   'Invite link open', '"HomeOrbit@2026" and "HomeOrbit@2027"',
   ['Type two different passwords', 'Save'],
   'Refused with a "passwords do not match" message.',
   'Medium', 'Validation')
tc('VC-01', 'First password', 'Set password and land on dashboard', 'A valid password signs the owner in.',
   'Invite link open', 'Password "HomeOrbit@2026"',
   ['Type it twice', 'Save'],
   'Signed in at the store dashboard: greeting, today\'s date, Home Orbit, View store and Add product.',
   'Critical', 'Functional', smoke=True)
tc('VC-01', 'First password', 'Link works once', 'An invite link cannot be reused.',
   'Password already set with the link', 'Same link',
   ['Open the same invite link again'],
   'The link is refused as used or expired.',
   'High', 'Security/Permissions')
tc('VC-01', 'Sign in', 'Owner signs in without a code', 'Two-step is optional for store staff.',
   'Owner has not set up two-step', 'Owner email and password',
   ['Sign out', 'Sign in with email and password'],
   'The dashboard opens without a code step.',
   'High', 'Functional')
tc('VC-01', 'Sign in', 'Optional two-step', 'A store owner can turn on two-step and is then asked for the code.',
   'Owner signed in', 'An authenticator app',
   ['Open your account (top bar name)', 'Set up two-step sign-in with the app', 'Sign out and in'],
   'Step 2 of 2 asks for the code; turning it off again is possible for store staff.',
   'Medium', 'Security/Permissions')
tc('VC-01', 'Sign in', 'Wrong password', 'A wrong password is refused.',
   'Signed out', 'Wrong password',
   ['Sign in with the wrong password'],
   '"The email or password provided is incorrect."',
   'High', 'Negative')

# ---------------------------------------------------------------- VC-02 Dashboard
tc('VC-02', 'Header', 'Greeting and actions', 'The dashboard header matches the wireframe.',
   PRE_OWNER, '—',
   [f'Open {ADMIN}'],
   '"Good morning/afternoon/evening", today\'s date and Home Orbit, Import CSV (or View store) and Add product; "Your store isn\'t live yet" while a draft.',
   'High', 'UI/UX', smoke=True)
tc('VC-02', 'Menu', 'Groups and plan meter', 'The menu has the store groups and the plan usage.',
   PRE_OWNER, '—',
   ['Read the left menu'],
   'Dashboard, Catalog, Sales, Marketing, Content, Store, Insights; Products 110 / 500 and the plan at the foot; no Vendors or Plans.',
   'High', 'UI/UX, Security/Permissions', smoke=True)
tc('VC-02', 'Menu', 'Collapse persists', 'The collapsed menu stays collapsed after reload.',
   PRE_OWNER, '—',
   ['Press the collapse button at the bottom of the menu', 'Reload'],
   'The menu shows icons only (names on hover) and stays collapsed after reload.',
   'Low', 'Data persistence, UI/UX')
tc('VC-02', 'Top bar', 'Search with Ctrl K', 'The top bar search jumps to products and other records.',
   PRE_OWNER, 'Search "soap"',
   ['Press Ctrl K', 'Type soap', 'Press Enter'],
   'Products opens filtered to soap dishes; arrow keys could pick Enquiries or Pages instead.',
   'Medium', 'Functional')
tc('VC-02', 'Top bar', 'Enquiry bell', 'The bell counts new enquiries.',
   PRE_OWNER + '; new enquiries exist', '—',
   ['Read the bell number', 'Compare with Enquiries → New'],
   'The numbers match; the bell opens the inbox.',
   'Medium', 'Integration')
tc('VC-02', 'Checklist', 'Launch checklist', 'The checklist shows the wireframe steps with Open links.',
   PRE_OWNER, '—',
   ['Read the Launch checklist', 'Press Open on a step to do'],
   'Store name and logo, GST details, Razorpay connected, Shipping zones, catalogue and content steps; each open step has Open that goes to the right screen.',
   'High', 'Functional')
tc('VC-02', 'Checklist', 'Step ticks when done', 'Completing a step ticks it.',
   PRE_OWNER, 'Save contact details (VC-03)',
   ['Note the checklist count', 'Complete a step', 'Reload the dashboard'],
   'That step is ticked and the count goes up.',
   'Medium', 'Integration')
tc('VC-02', 'Figures', 'Figures and charts', 'Figures and charts use real orders.',
   PRE_SELL + '; `pnpm demo:orders home-orbit`', '—',
   ['Read Orders today, Sales today, To ship, New enquiries, Low stock', 'Read Sales, last 14 days and Orders to ship'],
   'Figures show numbers; each figure opens its list; the chart has bars; Orders to ship lists waiting orders with Paid or COD.',
   'High', 'Integration')
tc('VC-02', 'Lists', 'Needs attention, quick actions, activity', 'The lower cards show the store\'s state.',
   PRE_OWNER, '—',
   ['Read Needs your attention, Quick actions, Recent activity, Coming up and the plan card'],
   'Policy pages still drafts are listed; Quick actions has Add product, Create page, Landing page, Upload media, Add category, Log an enquiry, Add dealer, Invite staff, Store settings; Recent activity shows who and when.',
   'Medium', 'UI/UX')
tc('VC-02', 'Roles', 'Dashboard follows role', 'A catalog editor\'s dashboard hides what they cannot use.',
   'Signed in as a Catalog editor (VC-28)', '—',
   ['Open the dashboard'],
   'No launch checklist, no enquiry cards and only the quick actions they can use.',
   'High', 'Security/Permissions', role='Catalog editor')
tc('VC-02', 'Responsive', 'Narrow screen', 'Below 1024 px the menu opens from a button.',
   PRE_OWNER, 'Window 800 px wide',
   ['Narrow the window', 'Press ☰'],
   'The menu opens over the page and closes again; nothing runs off the screen.',
   'Low', 'UI/UX')

# ---------------------------------------------------------------- VC-03 Store settings
tc('VC-03', 'Layout', 'Section links', 'Settings is one page with links to each section.',
   PRE_OWNER, '—',
   ['Open Store → Settings', 'Press Contact in the links at the top'],
   'Sections Branding, Contact, Grievance officer and labels, GST and invoices, Checkout and returns, Announcement bar, Policies, Search and analytics, Store status; the page scrolls to Contact.',
   'Medium', 'UI/UX')
tc('VC-03', 'Contact', 'Save contact and WhatsApp', 'Contact details save and reach the store.',
   PRE_OWNER, 'Phone +91 98765 43210; WhatsApp 98765 43210; email care@homeorbit.example',
   ['Fill the Contact section', 'Save', f'Reload a product page on {STORE}', 'Hover Ask on WhatsApp'],
   '"Updated successfully."; Ask on WhatsApp appears and links to https://wa.me/919876543210?text=… (91 added); /contact shows the phone and email; the footer shows them.',
   'Critical', 'Functional, Integration', smoke=True)
tc('VC-03', 'Contact', 'Invalid email', 'An invalid contact email is refused.',
   PRE_OWNER, 'Email "care@"',
   ['Type the email', 'Save'],
   'Refused with an email format message.',
   'Medium', 'Validation')
tc('VC-03', 'Grievance officer', 'Shown on the store', 'The grievance officer shows on contact and footer.',
   PRE_OWNER, 'Name Priya Shah, Director, grievance@homeorbit.example, phone',
   ['Fill Grievance officer and labels', 'Save', f'Open {STORE}/contact and the footer'],
   'Both show the grievance officer\'s name, designation and contact.',
   'High', 'Integration')
tc('VC-03', 'GST', 'GSTIN read-only', 'The store\'s GSTIN cannot be edited here.',
   PRE_OWNER, '—',
   ['Open GST and invoices'],
   'GSTIN shows read-only (changed only by the platform).',
   'Medium', 'Security/Permissions')
tc('VC-03', 'Returns', 'Return window', 'The return window shows on product pages.',
   PRE_SELL, 'Return window 10 days',
   ['Set Return window to 10', 'Save', f'Open a product on {STORE}'],
   '"10-day returns" in the promises line; 0 and 91 are refused (0 to 90 allowed).',
   'Medium', 'Integration, Boundary')
tc('VC-03', 'Announcement bar', 'Store announcement', 'The announcement bar text shows on the store when on.',
   PRE_OWNER, 'Text "Free delivery above ₹999", enabled',
   ['Fill and enable Announcement bar', 'Save', f'Reload {STORE}'],
   'The text shows at the top of every store page (unless a live scheme\'s announcement replaces it).',
   'Medium', 'Integration')
tc('VC-03', 'Store status', 'Maintenance mode', 'Maintenance mode closes the store and warns staff.',
   PRE_OWNER, 'Tick Maintenance mode',
   ['Tick Maintenance mode', 'Save', f'Open {STORE}', 'Untick and Save'],
   'A yellow "Maintenance mode is on" bar on every CMS page and in Needs your attention; the store shows "Home Orbit will be back soon"; unticking reopens it.',
   'High', 'Integration')
tc('VC-03', 'Permissions', 'Read-only for catalog editor', 'A catalog editor sees settings read-only.',
   'Signed in as Catalog editor', '—',
   ['Open Store → Settings'],
   'No Save button; fields cannot be changed.',
   'High', 'Security/Permissions', role='Catalog editor')

# ---------------------------------------------------------------- VC-04 Products
tc('VC-04', 'List', 'Header, tabs and columns', 'The product list matches the wireframe.',
   PRE_OWNER, '—',
   ['Open Catalog → Products'],
   '"110 products · 500 allowed on Starter", Import, Export, Add product; tabs All, Active, Draft, Archived with counts; rows with photo, model number, category, finishes, price or range, stock, status, updated.',
   'High', 'UI/UX', smoke=True)
tc('VC-04', 'List', 'Search by model number', 'Search finds a product by model number.',
   PRE_OWNER, 'HOPH-504',
   ['Type HOPH-504 in the search'],
   'One result: the Feather pull handle.',
   'High', 'Functional', smoke=True)
tc('VC-04', 'List', 'Search by exact SKU', 'An exact variant SKU finds its product.',
   PRE_OWNER + '; variants created (VC-04-012)', 'HOPH-504-8-INCH-ANTIQUE',
   ['Search the SKU'],
   'The parent product is listed.',
   'Medium', 'Functional')
tc('VC-04', 'List', 'Category filter with subcategories', 'Filtering by a parent category includes its children.',
   PRE_OWNER, 'Category Door hardware',
   ['Pick Category = Door hardware'],
   '50 products from Aldrops, Pull handles, Glass door handles and Door stoppers.',
   'Medium', 'Functional')
tc('VC-04', 'List', 'Stock filter', 'The stock filter shows low and out-of-stock products.',
   PRE_SELL, 'Stock = Out of stock',
   ['Pick the stock filter'],
   'Only products whose variants are out of stock; an empty state when none.',
   'Low', 'Functional')
tc('VC-04', 'Bulk', 'Publish and archive selected', 'Bulk actions act on ticked rows and report failures.',
   PRE_OWNER, 'Tick two products, one without a photo',
   ['Tick two rows', 'Press Archive', 'Then tick them and Publish'],
   'Archive moves both to Archived; Publish activates the one that can and lists the other with the reason (no photo).',
   'High', 'Functional, Negative')
tc('VC-04', 'Bulk', 'Change category', 'Bulk change category moves products.',
   PRE_OWNER, 'Two products → Towel rings',
   ['Tick two products', 'Press Change category', 'Pick Towel rings and confirm'],
   'Both now show Towel rings as their category.',
   'Medium', 'Functional')
tc('VC-04', 'Export', 'Export and export selected', 'Export gives the import template\'s columns.',
   PRE_OWNER, '—',
   ['Press Export', 'Tick two rows and press Export selected'],
   'CSVs in the template columns (with option.<axis> columns); the selected export has only those two; importing the file unchanged reports no changes.',
   'Medium', 'Functional, Integration')
tc('VC-04', 'Editor', 'Sections and side column', 'The editor has the wireframe\'s sections.',
   PRE_OWNER, 'Open HOPH-504',
   ['Open the product'],
   'Basics, Photos and videos, Specifications, Finishes prices and stock, Price and GST, Documents, Spare parts and related products, Search engines; side: Status, How shoppers buy, Legal details, weight and box size, Featured, Offers and reviews.',
   'Medium', 'UI/UX')
tc('VC-04', 'Editor', 'GST preview', 'The GST split preview follows the price.',
   PRE_OWNER, 'Price ₹1,849, GST 18%',
   ['Enter the price', 'Read the line under Price and GST'],
   '"For ₹1,849.00 the taxable value is ₹1,566.95 and GST is ₹282.05" (prices include GST).',
   'Medium', 'Functional')
tc('VC-04', 'Editor', 'Finish offered reaches the store', 'Unticking a finish removes it from the store.',
   PRE_OWNER, 'HOPH-504: untick Black matt',
   ['Untick Black matt under Specifications', 'Save', f'Open the product on {STORE}', 'Tick it again and Save'],
   'Black matt is gone from the finish choices, then back.',
   'High', 'Integration')
tc('VC-04', 'Variants', 'Create variants', 'Variants are created for every combination once.',
   PRE_OWNER, 'HOPH-504 with 3 sizes and 5 finishes',
   ['Press Create variants for every combination', 'Press it again'],
   '"15 variants created" with codes like HOPH-504-8-INCH-ANTIQUE; the second press says "Every combination already has a variant".',
   'High', 'Functional')
tc('VC-04', 'Rules', 'Active needs a photo', 'A product cannot be active without a photo.',
   PRE_OWNER, 'Test handle, TEST-1, Aldrops, Active, no photo',
   ['Add product with these values', 'Save'],
   'Refused with "Add at least one photo before making the product active" (and a label details note); saving as Draft works.',
   'Critical', 'Validation', smoke=True)
tc('VC-04', 'Rules', 'Online selling needs price and HSN', 'Buy online needs a selling price and HSN.',
   PRE_OWNER, 'How shoppers buy = Buy online, no price',
   ['Set Buy online without a price', 'Make it Active and Save'],
   '"Products sold online need a selling price and an HSN code"; back to "Request a quote only" saves.',
   'High', 'Validation')
tc('VC-04', 'Rules', 'Duplicate model number', 'A model number used by another product is refused.',
   PRE_OWNER, 'Model number HOPH-504 on a new product',
   ['Create a product with model number HOPH-504', 'Save'],
   'Refused as already used in this store.',
   'High', 'Validation', notes='Requires confirmation that model numbers are unique per store.')
tc('VC-04', 'Rules', 'Plan product limit', 'Products beyond the plan limit are refused.',
   'A store at its plan\'s product limit (lower a test plan\'s limit)', 'One more product',
   ['Try to add a product past the limit'],
   'Refused with the plan limit message; the list header shows the limit.',
   'Medium', 'Boundary', notes='Use a test plan with a small limit on a throw-away store.')
tc('VC-04', 'Persistence', 'Edit and reload', 'Edits persist after reload and appear on the store.',
   PRE_OWNER, 'Short description "QA edit"',
   ['Change the short description of an active product', 'Save', 'Reload the editor', 'Open it on the store'],
   'The new text shows in both places.',
   'High', 'Data persistence, Integration')
tc('VC-04', 'Versions', 'Restore a version', 'An earlier version can be restored.',
   PRE_OWNER, 'Product edited twice',
   ['Open the Versions tab', 'Restore the earlier version'],
   'The product returns to the earlier values.',
   'Low', 'Functional')

# ---------------------------------------------------------------- VC-05 Categories
tc('VC-05', 'Tree', 'Tree with counts', 'Categories show as a tree with product counts.',
   PRE_OWNER, '—',
   ['Open Catalog → Categories'],
   'Door hardware 50 with its four subcategories, Home decor, Bathroom accessories and children, with counts.',
   'High', 'UI/UX', smoke=True)
tc('VC-05', 'Tree', 'Drag to reorder', 'Dragging reorders and the order is kept.',
   PRE_OWNER, 'Towel racks above Towel rings',
   ['Drag Towel racks above Towel rings', 'Reload', f'Open the store menu on {STORE}'],
   'The new order stays after reload and is the order of menus and tiles.',
   'High', 'Data persistence, Integration')
tc('VC-05', 'Tree', 'Nest by dropping', 'Dropping onto a category nests it; more than 3 levels is refused.',
   PRE_OWNER, 'A test category',
   ['Drop Test category onto Aldrops (level 3)', 'Try to drop another category onto Test category (level 4)'],
   'The first works; the 4th level is refused with a message.',
   'Medium', 'Boundary')
tc('VC-05', 'Tree', 'Keyboard moves', 'Alt + arrow keys move a category.',
   PRE_OWNER, '—',
   ['Focus a category name', 'Press Alt + Up', 'Reload'],
   'It moves up one place and stays there.',
   'Low', 'Accessibility')
tc('VC-05', 'Form', 'Slug from name', 'The slug fills from the name.',
   PRE_OWNER, 'Name "Test category"',
   ['Create a category with only the name', 'Save'],
   'Slug test-category; it shows in the tree.',
   'Medium', 'Functional')
tc('VC-05', 'Form', 'Name required', 'A category needs a name.',
   PRE_OWNER, 'Empty name',
   ['Create a category with no name', 'Save'],
   'Refused with a required field message.',
   'Medium', 'Validation')
tc('VC-05', 'Form', 'No loops', 'A category cannot be its own parent or descendant\'s child.',
   PRE_OWNER, 'Door hardware parent = Aldrops',
   ['Set Door hardware\'s parent to Aldrops', 'Save'],
   'Refused (would create a loop).',
   'Medium', 'Negative')
tc('VC-05', 'Form', 'View on store', 'View on store opens the category page.',
   PRE_OWNER, 'Aldrops',
   ['Open Aldrops', 'Press View on store'],
   f'{STORE}/c/door-hardware/aldrops opens.',
   'Low', 'Integration')
tc('VC-05', 'Form', 'Hide from store', 'Unticking Show on store hides the category.',
   PRE_OWNER, 'Test category with a product',
   ['Untick Show on store', 'Save', 'Open its store address'],
   'The category is gone from menus and its address shows not found.',
   'Medium', 'Integration')

# ---------------------------------------------------------------- VC-06 Attribute sets
tc('VC-06', 'Layout', 'Sets and table', 'Attribute sets show the sets list and the field table.',
   PRE_OWNER, 'Open Aldrops',
   ['Open Catalog → Attribute sets', 'Open Aldrops'],
   'Sets on the left with "N fields · M categories"; a table of fields with Filter, Finish option, Compare and Required ticks; Options for Finish with swatches.',
   'Medium', 'UI/UX')
tc('VC-06', 'Editor', 'Live table', 'The table follows edits before saving.',
   PRE_OWNER, 'Rename a field label',
   ['Change a field label below the table'],
   'The table shows the new label as you type.',
   'Low', 'UI/UX')
tc('VC-06', 'Validation', 'Unique codes', 'Two fields cannot share a code.',
   PRE_OWNER, 'Two fields with code "finish"',
   ['Add a field with an existing code', 'Save'],
   'Refused naming the duplicate code.',
   'High', 'Validation')
tc('VC-06', 'Validation', 'Options required', 'Select fields need options.',
   PRE_OWNER, 'A select field with no options',
   ['Add a select field without options', 'Save'],
   'Refused with a message about missing options.',
   'Medium', 'Validation')
tc('VC-06', 'Validation', 'At most 3 variant options', 'No more than 3 fields can be finish/variant options.',
   PRE_OWNER, 'Tick Finish option on a 4th field',
   ['Tick a 4th variant option', 'Save'],
   'Refused: at most 3 variant options.',
   'Medium', 'Boundary')
tc('VC-06', 'Integration', 'Filters on the store', 'Filterable fields become category filters.',
   PRE_OWNER, 'Tick Filter on Finish',
   ['Tick Filter', 'Save', f'Open the category on {STORE}'],
   'A Finish filter with counts appears on the category page.',
   'High', 'Integration')

# ---------------------------------------------------------------- VC-07 Brands, documents, variants
tc('VC-07', 'Brands', 'Create brand', 'A brand saves with a name.',
   PRE_OWNER, 'Brand "Home Orbit Premium"',
   ['Open Catalog → Brands', 'Create New', 'Type the name, Save'],
   'The brand is listed; an empty name is refused.',
   'Low', 'Functional')
tc('VC-07', 'Brands', 'Duplicate brand', 'Two brands with the same slug are refused.',
   PRE_OWNER, 'Same name again',
   ['Create a brand with the same name'],
   'Refused as already used.',
   'Low', 'Validation')
tc('VC-07', 'Documents', 'Add a PDF', 'A product document with a PDF saves and links to a product.',
   PRE_OWNER, 'Title "Aldrop spec sheet", type Spec sheet, a small PDF, Show on the Downloads page',
   ['Open Catalog → Documents', 'Create New with the PDF', 'Link it on product HOAL-101 (Documents section)', 'Save'],
   f'The document is listed; {STORE}/downloads lists it; the product page shows it under Downloads.',
   'Medium', 'Integration')
tc('VC-07', 'Documents', 'PDF only', 'Non-PDF files are refused as documents.',
   PRE_OWNER, 'A .jpg file',
   ['Try to attach a JPG as the PDF'],
   'Refused (PDF required).',
   'Low', 'Validation')
tc('VC-07', 'Variants', 'Variants list', 'The Variants list shows SKUs with stock and status.',
   PRE_OWNER + '; variants created', '—',
   ['Open Catalog → Variants'],
   'Columns SKU, title, product, stock, status; search by SKU works.',
   'Low', 'Functional')
tc('VC-07', 'Variants', 'Stock edit reaches store', 'Changing a variant\'s stock changes the store.',
   PRE_SELL + '; variants exist', 'Stock 0 on one variant',
   ['Set In stock = 0 on a variant', 'Save', 'Open the product on the store and pick that finish'],
   'The store says Out of stock for that finish and cannot add it to the cart.',
   'High', 'Integration')

# ---------------------------------------------------------------- VC-08 Import
tc('VC-08', 'Templates', 'Download template', 'Templates download for each import kind.',
   PRE_OWNER, '—',
   ['Open Catalog → Import and export', 'Download the Products template'],
   'A CSV with the template columns downloads.',
   'Medium', 'Functional')
tc('VC-08', 'Check', 'Bad rows found before import', 'The check lists bad rows and changes nothing.',
   PRE_OWNER, 'Template with a price "4,250/-" on one row',
   ['Upload the file'],
   'Figures and the bad row with "Price must be a number in rupees"; Products are unchanged so far.',
   'High', 'Validation')
tc('VC-08', 'Check', 'Error report', 'The error report downloads.',
   'A checked file with errors', '—',
   ['Press Download error report'],
   'A CSV of the bad rows with reasons.',
   'Medium', 'Functional')
tc('VC-08', 'Import', 'Import ready rows', 'Ready rows import in the background.',
   'A checked file', 'Two new rows with two finishes; one price change',
   ['Press Import N ready rows', 'Wait about a minute', 'Read Recent imports and the terminal'],
   'Status Imported; an email printed in the terminal; the new product is a draft with both finishes; the existing SKU has its new price.',
   'High', 'Functional, Integration')
tc('VC-08', 'Import', 'Wrong file', 'A non-CSV or wrong columns file is refused.',
   PRE_OWNER, 'A .xlsx or a CSV with other headers',
   ['Upload the file'],
   'Refused with a clear message about the format or missing columns.',
   'Medium', 'Negative')
tc('VC-08', 'Import', 'Stock and prices only', 'The stock and prices import updates existing SKUs.',
   PRE_OWNER + '; variants exist', 'sku,price,mrp,stock_qty for 2 SKUs; 1 unknown SKU',
   ['Choose Stock and prices only', 'Upload and import'],
   'Known SKUs update; the unknown SKU is listed as an error.',
   'Medium', 'Functional, Negative')
tc('VC-08', 'Permissions', 'Who can import', 'Only owners, managers and catalog editors import.',
   'Signed in as Order manager', '—',
   ['Look for Import and export in the menu', f'Open {ADMIN}/import'],
   'Not in the menu; the page refuses access.',
   'Medium', 'Security/Permissions', role='Order manager')

# ---------------------------------------------------------------- VC-09 Media
tc('VC-09', 'Library', 'Grid and tabs', 'The media library shows a grid with tabs and storage.',
   PRE_OWNER, '—',
   ['Open Catalog → Media'],
   'Tabs All, Images, Documents, Videos; search; storage meter against the plan; a grid of files.',
   'Medium', 'UI/UX')
tc('VC-09', 'Detail', 'Where used and alt text', 'Selecting a file shows its details and where it is used.',
   PRE_OWNER, 'A product photo',
   ['Click a photo', 'Edit Alt text and Save in place', 'Reload'],
   'Preview, alt text, type and size, sizes made, used by products/categories; the new alt text stays after reload.',
   'Medium', 'Data persistence')
tc('VC-09', 'Upload', 'Alt text required', 'An image cannot be saved without alt text.',
   PRE_OWNER, 'A JPG, no alt text',
   ['Upload the image without alt text', 'Save'],
   'Refused; with alt text it saves and the storage meter goes up.',
   'High', 'Validation')
tc('VC-09', 'Upload', 'Unsupported file', 'Files that are not images, PDFs or allowed types are refused.',
   PRE_OWNER, 'An .exe or .zip',
   ['Try to upload it'],
   'Refused with the allowed types.',
   'Medium', 'Negative')
tc('VC-09', 'Delete', 'Delete a file in use', 'Deleting warns when a file is used.',
   PRE_OWNER, 'A photo used by a product',
   ['Select it', 'Press Delete'],
   'A warning lists where it is used before confirming.',
   'Medium', 'Negative', notes='Requires confirmation of whether deleting in-use files is blocked or only warned.')
tc('VC-09', 'Search', 'Search media', 'Search filters by name or alt text.',
   PRE_OWNER, '"towel"',
   ['Type towel'],
   'Only matching files remain.',
   'Low', 'Functional')

# ---------------------------------------------------------------- VC-10 Orders
tc('VC-10', 'List', 'Tabs and columns', 'Orders list shows tabs and separate order, payment and delivery state.',
   PRE_SELL + '; an order from E2E-04', '—',
   ['Open Sales → Orders'],
   'Tabs All, To pack, Packed, Shipped, Out for delivery, Delivered, Awaiting payment, Cancelled, Returns with counts; the new order shows "COD, to collect" and "Not shipped".',
   'Critical', 'UI/UX', smoke=True)
tc('VC-10', 'List', 'Search by number and phone', 'Search finds orders by number and phone.',
   'An order exists', 'Order number; phone 98765',
   ['Search the order number', 'Search 98765'],
   'The order is found both ways.',
   'High', 'Functional')
tc('VC-10', 'List', 'Filters', 'Placed, payment and state filters narrow the list.',
   'Several orders', 'Payment = COD',
   ['Pick each filter'],
   'Rows and counts follow the filters; clearing restores the list.',
   'Medium', 'Functional')
tc('VC-10', 'Detail', 'GST split by place of supply', 'An order within the store\'s state shows CGST and SGST.',
   'Order to pincode 411045 (Maharashtra) from a Maharashtra GSTIN', '—',
   ['Open the order'],
   'Items with CGST and SGST, the place of supply line, the customer ("first order"), address and payment.',
   'High', 'Functional')
tc('VC-10', 'Fulfilment', 'Mark as packed creates the invoice', 'Packing issues the GST invoice.',
   'A confirmed order', '—',
   ['Press Mark as packed and confirm', 'Read Invoice', 'Press Download invoice'],
   'The parcel shows Packed; Invoice lists INV/26-27/00001 (next number); the GST invoice opens.',
   'Critical', 'Functional', smoke=True)
tc('VC-10', 'Fulfilment', 'Ship, out for delivery, delivered', 'The parcel moves through shipping to delivered.',
   'A packed order', 'Tracking number 12345, courier Delhivery',
   ['Type the tracking number', 'Press Save and tell the shopper it shipped', 'Press Out for delivery', 'Press Delivered'],
   'The order reads Completed, Paid, Delivered; the timeline ends with "₹… collected in cash on delivery"; messages are queued for each step.',
   'Critical', 'Functional, Integration', smoke=True)
tc('VC-10', 'Fulfilment', 'Steps cannot be skipped backwards', 'A delivered parcel cannot go back to packed.',
   'A delivered order', '—',
   ['Look for actions that move it back'],
   'No backwards actions; the state stays Delivered.',
   'Medium', 'Negative')
tc('VC-10', 'Refund', 'Partial refund', 'A partial refund records a credit note.',
   'A delivered order', '₹100, reason, UPI reference',
   ['Press Refund', 'Enter ₹100, a reason and the reference', 'Confirm'],
   'Payment shows Partly refunded; the invoice card lists credit note CN/26-27/00001.',
   'High', 'Functional')
tc('VC-10', 'Refund', 'Refund over the amount', 'A refund larger than the amount paid is refused.',
   'A delivered order of ₹X', 'Refund ₹X + 1',
   ['Try to refund more than paid'],
   'Refused with a message.',
   'High', 'Boundary, Negative')
tc('VC-10', 'Cancel', 'Cancel order', 'Cancelling returns stock and needs a reason.',
   'A new COD order', 'Reason "Customer asked"',
   ['Press Cancel order', 'Try without a reason, then with one'],
   'Without a reason it waits; with one the order reads Cancelled and stock goes back.',
   'High', 'Functional, Validation')
tc('VC-10', 'Bulk', 'Download invoices and shipped from CSV', 'Bulk invoice download and CSV shipping.',
   'Two invoiced orders', 'CSV line "HOM-10003, Delhivery, 12345"',
   ['Tick two orders and Download invoices', 'Use Shipped from CSV with the line', 'Press Export CSV'],
   'Invoices print for invoiced orders only; the CSV marks the order shipped with courier and tracking; Export CSV downloads the list.',
   'Medium', 'Functional')
tc('VC-10', 'Permissions', 'Catalog editor has no orders', 'Orders are hidden from catalog editors; support sees no actions.',
   'Signed in as Catalog editor; then as store Support', '—',
   ['Look for Orders', f'Open {ADMIN}/collections/orders'],
   'Catalog editor: not in the menu and refused. Support: list visible without action buttons.',
   'High', 'Security/Permissions', role='Catalog editor, Store support')

# ---------------------------------------------------------------- VC-11 Returns
tc('VC-11', 'Returns', 'Return appears in the tab', 'A shopper\'s return request lists under Returns.',
   'A delivered order with a return requested (E2E-14)', '—',
   ['Open Orders → Returns tab', 'Open the order'],
   'The order is listed; the Returns card shows items, reason, note and photo.',
   'High', 'Integration')
tc('VC-11', 'Returns', 'Approve with pickup note', 'Approving shows the pickup note to the shopper.',
   'A requested return', 'Pickup note "Courier will collect on Monday"',
   ['Press Approve with the note'],
   'Status Approved; the shopper\'s order page shows the note; a "Return approved" email is queued.',
   'High', 'Functional, Integration')
tc('VC-11', 'Returns', 'Receive and refund', 'Receiving then refunding completes the return.',
   'An approved return', 'Refund the item amount',
   ['Press Mark received', 'Press Refund with the amount'],
   'The return reads Refunded; a credit note is added.',
   'High', 'Functional')
tc('VC-11', 'Returns', 'Reject needs a reason', 'Rejecting needs a reason shown to the shopper.',
   'A requested return', 'Reason "Item used"',
   ['Press Reject without a reason', 'Then with the reason'],
   'Without a reason it is refused; with it the shopper sees why.',
   'Medium', 'Validation')

# ---------------------------------------------------------------- VC-12 Customers
tc('VC-12', 'List', 'Customer list', 'Customers lists shopper accounts with masked phone.',
   PRE_SELL + '; a shopper account', '—',
   ['Open Sales → Customers'],
   'Rows with name, email, masked phone, orders link, spent, last order, roles, offers and joined date.',
   'High', 'UI/UX')
tc('VC-12', 'List', 'Search and export', 'Search by name, email or phone; export CSV.',
   'A shopper account', 'Shopper email',
   ['Search the email', 'Press Export CSV'],
   'The account is found; a CSV downloads.',
   'Medium', 'Functional')
tc('VC-12', 'Privacy', 'Data export request', 'A data export request is due in 30 days and downloads JSON.',
   'A shopper account', 'Type Data export',
   ['Press Privacy requests → Record a request', 'Pick Data export and the shopper\'s email', 'Press Download data'],
   'Shown as Due in 30 days; a JSON file with account, addresses, orders and preferences.',
   'High', 'Functional')
tc('VC-12', 'Privacy', 'Delete account request', 'Deleting an account keeps its orders.',
   'A throw-away shopper account', 'Type Delete account',
   ['Record a Delete account request', 'Start', 'Delete account and confirm'],
   'The account is gone from Customers; its orders stay under Orders.',
   'High', 'Functional, Data persistence')
tc('VC-12', 'Permissions', 'No privacy actions for order manager', 'Order managers see customers without request buttons.',
   'Signed in as Order manager', '—',
   ['Open Customers'],
   'The list shows without Record a request or delete actions.',
   'Medium', 'Security/Permissions', role='Order manager')

# ---------------------------------------------------------------- VC-13 Enquiries
tc('VC-13', 'Inbox', 'Tabs, filter and cards', 'The inbox shows tabs, filter, search and the open enquiry.',
   PRE_OWNER + '; enquiries from the store', '—',
   ['Open Sales → Enquiries'],
   'Tabs New, In progress, Closed with counts, a Type filter, search, cards on the left and the newest open on the right.',
   'High', 'UI/UX', smoke=True)
tc('VC-13', 'Detail', 'Product enquiry details', 'A product enquiry shows the product and chosen options.',
   'A quote request sent from a product page with options', '—',
   ['Click the product enquiry'],
   'Name, company, phone, email, city, when; the product with photo, model number and quantity; the message with "Options: …".',
   'High', 'Integration')
tc('VC-13', 'Reply', 'Reply on WhatsApp and email', 'Reply buttons open WhatsApp or email.',
   'An enquiry with phone and email', '—',
   ['Press Reply on WhatsApp', 'Look for Reply by email'],
   'WhatsApp opens to the shopper\'s number with a greeting naming the enquiry; Reply by email shows when an email exists; Create formal quote is marked P2.',
   'Medium', 'Functional')
tc('VC-13', 'Workflow', 'Assign, status and notes', 'Assignment, status and notes save at once.',
   'An enquiry under New', 'Assign to yourself; status Contacted; note "Called back"',
   ['Assign it to yourself', 'Set Status to Contacted', 'Add the note with Add note', 'Reload'],
   'Each saves at once; the note lists with your name; the enquiry moves to In progress.',
   'High', 'Functional, Data persistence')
tc('VC-13', 'Workflow', 'Close as won', 'Won moves the enquiry to Closed.',
   'An enquiry in progress', 'Status Won',
   ['Set Status to Won'],
   'The enquiry moves to Closed.',
   'Medium', 'Functional')
tc('VC-13', 'Log', 'Log a phone enquiry', 'Staff can log an enquiry by hand.',
   PRE_OWNER, 'Name, phone, message',
   ['Press Log an enquiry', 'Fill and save'],
   'It gets the next ENQ number and shows under New.',
   'Medium', 'Functional')
tc('VC-13', 'Log', 'Contact required', 'A logged enquiry needs a phone or email.',
   PRE_OWNER, 'Name only',
   ['Log an enquiry with only a name'],
   'Refused asking for a phone or email.',
   'Medium', 'Validation')
tc('VC-13', 'Permissions', 'Catalog editor has no enquiries', 'Catalog editors cannot open enquiries.',
   'Signed in as Catalog editor', f'{ADMIN}/collections/enquiries',
   ['Open the address'],
   '"Nothing found"; no Sales group in the menu.',
   'High', 'Security/Permissions', role='Catalog editor')

# ---------------------------------------------------------------- VC-14 Schemes
tc('VC-14', 'Start', 'Start from an occasion', 'An occasion opens a prefilled draft.',
   PRE_SELL, 'Occasion Diwali',
   ['Open Marketing → Schemes and offers', 'Press Diwali under Start from an occasion'],
   'The editor opens a draft "Diwali 2026" with its badge.',
   'High', 'Functional', smoke=True)
tc('VC-14', 'Editor', 'Dates validation', 'The end must be after the start.',
   'Scheme draft', 'Ends before Starts',
   ['Set Ends earlier than Starts', 'Save'],
   'Refused with a message.',
   'High', 'Validation')
tc('VC-14', 'Editor', 'Percent off range', 'Percent off must be between 1 and 100.',
   'Scheme draft', 'Percent off 0, then 150',
   ['Enter 0 and save', 'Enter 150 and save'],
   'Both refused.',
   'Medium', 'Boundary')
tc('VC-14', 'Schedule', 'Go live', 'Scheduling a started scheme makes it live on the store.',
   'Scheme draft', 'Starts a minute ago, ends next week, Percent off 10, max 1500, Whole store, announcement text',
   ['Fill the scheme', 'Save', 'Press Schedule', f'Open {STORE}'],
   'Status Live; the top bar shows the announcement; cards show the badge, offer price, MRP struck through and "until <date>"; product page says "Offer ends".',
   'Critical', 'Functional, Integration', smoke=True)
tc('VC-14', 'Schedule', 'Cart discount line', 'A live scheme shows as its own discount line.',
   'Scheme live', 'Add an item to the cart',
   ['Add a covered product to the cart', 'Open the cart'],
   '"Diwali 2026 − ₹…" under Discounts; totals recomputed by the server.',
   'Critical', 'Integration')
tc('VC-14', 'Timeline', 'Overlap explained', 'The timeline shows overlapping schemes.',
   'Two schemes with overlapping dates', '—',
   ['Open the Schemes list'],
   'The six-month timeline shows both bars and the first overlap explained.',
   'Low', 'UI/UX')
tc('VC-14', 'End', 'End now', 'Ending a scheme restores prices at once.',
   'Scheme live', '—',
   ['Press End now in the editor', f'Reload {STORE} and /offers/diwali-2026'],
   'Prices go back, the announcement goes, and the offer page says the offer has ended.',
   'High', 'Integration')
tc('VC-14', 'Permissions', 'Order manager read-only', 'Order managers see schemes without buttons.',
   'Signed in as Order manager', '—',
   ['Open Schemes and offers'],
   'The list shows without create or edit actions.',
   'Medium', 'Security/Permissions', role='Order manager')

# ---------------------------------------------------------------- VC-15 Coupons
tc('VC-15', 'Create', 'New coupon', 'A coupon saves with its rule.',
   PRE_SELL, 'HOME200, Amount off 200, Minimum order 1000, show at the cart and Offers page',
   ['Open Marketing → Coupons → + New coupon', 'Fill and Save'],
   'Listed as active and public.',
   'High', 'Functional', smoke=True)
tc('VC-15', 'Create', 'Duplicate code', 'A code already used in the store is refused.',
   'HOME200 exists', 'HOME200 again',
   ['Create another coupon HOME200'],
   'Refused as already used.',
   'High', 'Validation')
tc('VC-15', 'Cart', 'Invalid code in the cart', 'An unknown code is refused with a reason.',
   'Items in the cart', 'Code "nope"',
   ['Type nope in the cart coupon box', 'Apply'],
   '"This code isn\'t valid in this store."',
   'High', 'Negative', role='Shopper')
tc('VC-15', 'Cart', 'Minimum order', 'Below the minimum the cart says how much more.',
   'Cart below ₹1,000', 'HOME200',
   ['Read the HOME200 card in the cart', 'Add items past ₹1,000', 'Apply'],
   '"Add ₹… more" until the cart passes ₹1,000; then it applies and the total drops by ₹200.',
   'Critical', 'Boundary, Integration', role='Shopper')
tc('VC-15', 'Cart', 'Scheme and coupon together', 'When a scheme does not combine with coupons, the cart says which it kept.',
   'Diwali live (not with coupons)', 'HOME200',
   ['Apply HOME200 with the scheme live'],
   'The cart keeps the better offer and says why.',
   'High', 'Integration', role='Shopper')
tc('VC-15', 'Bulk', 'Make bulk codes', 'Bulk codes are created from a coupon.',
   'HOME200 exists', 'Prefix WED, 5 codes',
   ['Press Make bulk codes', 'Prefix WED, 5, based on HOME200'],
   'A CSV downloads (or arrives by email) and the list shows one "WED-••••••" row with "0 / 5".',
   'Medium', 'Functional')
tc('VC-15', 'Usage', 'Usage limit', 'A coupon past its usage limit stops working.',
   'A coupon with usage limit 1, used once', '—',
   ['Apply it in a new cart'],
   'Refused as used up.',
   'Medium', 'Boundary')

# ---------------------------------------------------------------- VC-16 Offer messages
tc('VC-16', 'Create', 'New message from a scheme', 'Picking a scheme fills the message.',
   PRE_SELL + '; a scheme exists', '—',
   ['Open Marketing → Offer messages → + New message', 'Pick the scheme'],
   'Subject, headline and link fill in; Everyone who agreed to offers and Email selected; a line says how many get it.',
   'Medium', 'Functional')
tc('VC-16', 'Test', 'Send test to me', 'A test email is sent to the staff member.',
   'A message draft', '—',
   ['Press Send test to me', 'Wait a minute, watch the terminal'],
   'The email is printed in the `pnpm dev` terminal.',
   'Medium', 'Integration')
tc('VC-16', 'Schedule', 'Send window', 'Scheduling outside 10:00–20:00 moves into the window.',
   'A message draft', 'Schedule for 22:00',
   ['Schedule for 22:00'],
   'The time moves to the next 10:00; at send time each opted-in shopper gets one email with an unsubscribe link.',
   'Medium', 'Boundary')
tc('VC-16', 'Consent', 'Only opted-in shoppers', 'Shoppers without consent never get offers.',
   'Two shoppers: one opted in, one not', '—',
   ['Send a message to Everyone who agreed', 'Read the terminal'],
   'Only the opted-in shopper gets it.',
   'Critical', 'Security/Permissions')

# ---------------------------------------------------------------- VC-17 Abandoned carts
tc('VC-17', 'Reminders', 'First reminder', 'A left cart with consent gets a reminder.',
   'Cart left with offers ticked at checkout, after the First reminder delay', '—',
   ['Wait the delay (1 hour by default) plus 5 minutes', 'Open Marketing → Abandoned carts'],
   'The cart shows "1st sent · email"; the reminder prints in the terminal (inside the send window).',
   'High', 'Integration')
tc('VC-17', 'Reminders', 'No consent, no reminder', 'A cart without consent is not reminded.',
   'Cart left without ticking offers', '—',
   ['Open Abandoned carts after the delay'],
   '"Not reminded: no offer consent".',
   'High', 'Security/Permissions')
tc('VC-17', 'Restore', 'Return to your cart', 'The reminder link restores the cart anywhere.',
   'A reminder email', '—',
   ['Open Return to your cart in another browser'],
   'The same cart opens with prices worked out again.',
   'Medium', 'Integration', role='Shopper')
tc('VC-17', 'Settings', 'Second reminder with coupon', 'The second reminder can carry a coupon.',
   PRE_SELL, 'Tick Send a second reminder; coupon HOME200',
   ['On Reminders tick the second reminder, pick the coupon', 'Save reminders'],
   'Saved; the second reminder carries HOME200.',
   'Low', 'Functional')

# ---------------------------------------------------------------- VC-18 Affiliates
tc('VC-18', 'Applications', 'Approve', 'Approving an application sends the welcome email.',
   'An application from /affiliate', '—',
   ['Open Marketing → Affiliates → Applications', 'Press Approve'],
   'The affiliate is active; the welcome email with the link prints in the terminal.',
   'High', 'Functional')
tc('VC-18', 'Applications', 'Reject needs a reason', 'Rejecting asks for a reason.',
   'An application', 'Reason "Audience does not match"',
   ['Press Reject', 'Confirm without, then with a reason'],
   'The reason is required; the applicant sees the outcome.',
   'Medium', 'Validation')
tc('VC-18', 'Commission', 'Referral order earns pending commission', 'An order through the link is credited.',
   'An approved affiliate with code', '/r/<CODE>?to=/products/<slug>, COD order with another email',
   ['Open the referral link in another browser', 'Place a COD order'],
   'The affiliate\'s row shows 1 order and the commission pending (rate on the order before GST and delivery); own orders never earn.',
   'High', 'Integration')
tc('VC-18', 'Rates', 'Change rate', 'Rates and a category rate save.',
   'An approved affiliate', 'Rate 7%; category rate 10% for Key hangers',
   ['Press Change rate, set both', 'Save'],
   'Saved and shown on the affiliate.',
   'Low', 'Functional')
tc('VC-18', 'Payouts', 'Record payout (owner only)', 'Payouts need approved commission above the minimum.',
   'Approved commission above the minimum', 'UTR reference',
   ['Press Record payout', 'Check UPI, TDS and net', 'Mark paid and email statement'],
   'The payout is recorded with gross, TDS, net and UTR; a manager does not see Record payout.',
   'Medium', 'Functional, Security/Permissions')

# ---------------------------------------------------------------- VC-19 Reviews
tc('VC-19', 'Moderation', 'To approve', 'A new review waits under To approve.',
   'A review written on the store', '—',
   ['Open Marketing → Reviews'],
   'Listed under To approve with "Verified purchase" and a low-rating note when 1–2 stars.',
   'High', 'Integration')
tc('VC-19', 'Moderation', 'Approve with reply', 'Approving with a reply publishes it with the reply.',
   'A review to approve', 'Reply "Thank you, we will send a new aerator"',
   ['Type the reply', 'Press Approve with reply', 'Open the product on the store'],
   'The product page shows the rating, bars and the review with the store\'s reply; cards show stars; the reply email prints in the terminal.',
   'Critical', 'Integration', smoke=True)
tc('VC-19', 'Moderation', 'Reject needs a reason', 'Rejecting waits for a reason.',
   'A review to approve', '—',
   ['Press Reject with no reason'],
   'The button waits for a reason; with one it is rejected and never shown.',
   'Medium', 'Validation')
tc('VC-19', 'Settings', 'Publish straight away', 'Unticking Hold publishes new reviews at once.',
   'Reviews settings', 'Untick Hold new reviews for approval',
   ['Untick it', 'Save settings', 'Write another review on the store'],
   'The next review is published at once.',
   'Medium', 'Functional')
tc('VC-19', 'Honesty', 'Store cannot edit a review', 'The review text cannot be changed by the store.',
   'A published review', '—',
   ['Open the review', 'Try to change its text or stars'],
   'Text and stars are read-only; only the reply can be written.',
   'High', 'Security/Permissions')

# ---------------------------------------------------------------- VC-20 Pages
tc('VC-20', 'List', 'Tabs and rows', 'Pages lists with status tabs and details.',
   PRE_OWNER, '—',
   ['Open Content → Pages'],
   'Tabs All 7 · Published 2 · Drafts 5; About us (Default) and Home (Landing) published; policy pages drafts; template, status, who and when per row.',
   'High', 'UI/UX', smoke=True)
tc('VC-20', 'List', 'Search and template filter', 'Search and template filter narrow the list.',
   PRE_OWNER, '"ship"; Template Policy',
   ['Type ship (or press / first)', 'Pick Template → Policy', 'Press Clear filters from an empty result'],
   'Only Shipping policy remains; filters combine; Clear filters restores.',
   'Medium', 'Functional')
tc('VC-20', 'Create', 'Choose a template', 'Create page offers templates.',
   PRE_OWNER, 'Landing',
   ['Press Create page', 'Pick Landing'],
   'The editor opens with Landing ticked; leaving without saving creates nothing.',
   'Medium', 'Functional')
tc('VC-20', 'Row actions', 'Duplicate and delete', 'Duplicate makes a draft copy; delete asks first.',
   PRE_OWNER, 'About us',
   ['⋯ → Duplicate on About us', '⋯ → Delete on the copy', 'Confirm'],
   '"About us (copy)" opens as a draft; delete asks first and says what is deleted; then it is gone.',
   'Medium', 'Functional')
tc('VC-20', 'Builder', 'Block library', 'Add block shows the grouped library by feature.',
   PRE_OWNER, 'Open Home',
   ['Press Add block'],
   'Groups Marketing, Commerce, Basic, Utility with pictures and one line each; Offer strip, Reviews, Scheme products, Coupon list, Offers sign-up appear only while their features are on.',
   'High', 'UI/UX')
tc('VC-20', 'Builder', 'Draft preview vs published', 'A draft change shows in preview but not on the store until published.',
   PRE_OWNER, 'Hero heading "QA heading"',
   ['Open the preview (eye button)', 'Change the hero heading', 'Save Draft', f'Open {STORE}', 'Publish', f'Reload {STORE}', 'Change it back and publish'],
   'Preview updates on draft; the store keeps the old heading until Publish, then shows the new one.',
   'Critical', 'Functional, Integration', smoke=True)
tc('VC-20', 'SEO', 'Search preview and length', 'The SEO tab previews and warns on length.',
   PRE_OWNER, 'Title of 80 characters',
   ['Open the SEO tab', 'Type a long title'],
   'A Google preview shows; it says when the title or description is too long.',
   'Low', 'Validation')
tc('VC-20', 'Publish', 'Publish a policy page', 'A published policy page opens on the store and in the footer.',
   PRE_OWNER, 'Shipping policy, one line',
   ['Open the Shipping policy draft', 'Write a line', 'Publish', f'Open {STORE}/pages/shipping'],
   'The page opens; the footer\'s Help column lists Shipping policy.',
   'High', 'Integration')
tc('VC-20', 'Permissions', 'Content editor edits pages', 'A content editor can edit pages but not products.',
   'Signed in as Content editor', '—',
   ['Edit and save a page', 'Open Products'],
   'Pages save; Products are read-only or hidden.',
   'Medium', 'Security/Permissions', role='Content editor')

# ---------------------------------------------------------------- VC-21 Navigation
tc('VC-21', 'Header menu', 'Outline follows the editor', 'The header menu outline mirrors edits.',
   PRE_OWNER, 'Rename "About us" to "Our story"',
   ['Open Content → Navigation', 'Rename the item below', 'Read the outline'],
   'The outline follows as you type; after Save the store menu shows the new name.',
   'Medium', 'Integration')
tc('VC-21', 'Footer', 'Footer columns', 'Footer columns show on the store.',
   PRE_OWNER, 'Add a link "Warranty" to /pages/warranty in Company',
   ['Edit the footer column', 'Save', f'Reload {STORE}'],
   'The footer shows the link; feature links (Find a dealer, Downloads) are still listed.',
   'Medium', 'Integration')
tc('VC-21', 'Links', 'Link to a page, category, product or URL', 'Each link type points to the right place.',
   PRE_OWNER, 'One link of each type',
   ['Add one link of each type', 'Save', 'Click each on the store'],
   'Each opens the chosen page, category, product or address.',
   'Medium', 'Functional')
tc('VC-21', 'Limits', 'Dropdown up to 4 columns', 'A dropdown allows at most four columns.',
   PRE_OWNER, 'A 5th column',
   ['Add a 5th column to a dropdown'],
   'Refused or the add button disappears at 4.',
   'Low', 'Boundary')

# ---------------------------------------------------------------- VC-22 Banners and redirects
tc('VC-22', 'Banners', 'Create a banner', 'A banner needs a title, placement and image.',
   PRE_OWNER, 'Title "QA banner", Home page hero, an image, Show on store',
   ['Open Content → Banners', 'Create New with these values', 'Save', 'Try again with no image'],
   'Saves with all values; without the desktop image it is refused.',
   'Medium', 'Validation')
tc('VC-22', 'Banners', 'Schedule', 'A banner shows only between its dates.',
   'A banner', 'Starts tomorrow',
   ['Set Starts to tomorrow', 'Save', 'Check where it is placed on the store'],
   'Not shown today; shown from tomorrow.',
   'Low', 'Functional')
tc('VC-22', 'Redirects', 'Slug change makes a redirect', 'Changing a product slug redirects the old address.',
   PRE_OWNER, 'A live product\'s slug',
   ['Change the slug and save', 'Open /products/<old-slug> on the store', 'Open Content → Redirects'],
   'The old address goes to the new one; Redirects lists it as Address changed.',
   'High', 'Integration')
tc('VC-22', 'Redirects', 'Manual redirect', 'A redirect added by hand works.',
   PRE_OWNER, '/old-site/catalogue.html → /c/door-hardware',
   ['Add the redirect', 'Open the old address on the store'],
   'It lands on the category; an address with no page and no redirect shows the 404 page.',
   'Medium', 'Functional')
tc('VC-22', 'Redirects', 'Duplicate old address', 'Two redirects from the same address are refused.',
   PRE_OWNER, 'Same Old address again',
   ['Add a second redirect from the same address'],
   'Refused as already used.',
   'Low', 'Validation')

# ---------------------------------------------------------------- VC-23 Dealers
tc('VC-23', 'List', 'List and map', 'Dealers show with a Shown switch beside a map.',
   PRE_OWNER + '; dealers exist', '—',
   ['Open Store → Dealers', 'Click a dealer'],
   'Rows with name (phone partly hidden), type, city, pincode and Shown; the pin turns red and the address and position show under the map.',
   'High', 'UI/UX')
tc('VC-23', 'Create', 'Add dealer with pincode fill', 'A new dealer can be placed from its pincode.',
   PRE_OWNER, 'Name, city Pune, pincode 411045, phone',
   ['Press Add dealer', 'Fill the fields', 'Press Fill from the pincode', 'Drag the pin', 'Save'],
   'The pin lands near the pincode (or the store\'s other dealers there); the dragged position is saved; the dashboard Dealers step turns Done.',
   'High', 'Functional')
tc('VC-23', 'Create', 'Required fields and pincode format', 'Name and a 6-digit pincode are required.',
   PRE_OWNER, 'Pincode 12345',
   ['Save with an empty name and a 5-digit pincode'],
   'Both refused with messages.',
   'Medium', 'Validation')
tc('VC-23', 'Shown', 'Hide a dealer', 'Shown off removes the dealer from the map and the store.',
   'A shown dealer', '—',
   ['Switch Shown off', f'Open {STORE}/dealers'],
   'The dealer leaves the map and the store\'s dealer locator.',
   'High', 'Integration')

# ---------------------------------------------------------------- VC-24 Shipping
tc('VC-24', 'Zones', 'Zones table', 'The zones table shows fees, COD and days.',
   PRE_SELL, '—',
   ['Open Store → Shipping'],
   'Home state (1 state, Flat ₹99, free above ₹999, COD allowed, 2 to 3 days) and Rest of India (35 states, Flat ₹149).',
   'High', 'UI/UX', smoke=True)
tc('VC-24', 'Test', 'Test a pincode', 'The pincode test answers from the zones.',
   PRE_SELL, '411045; 110001; 12345',
   ['Test 411045', 'Test 110001', 'Test 12345'],
   '411045: Home state · Maharashtra, ₹99, free above ₹999, COD allowed, 2 to 3 days, "From your zones". 110001: Rest of India. 12345: "Enter a 6-digit pincode".',
   'High', 'Functional, Validation')
tc('VC-24', 'Zones', 'Add a weight-based zone', 'A pincode zone with weight pricing saves and applies.',
   PRE_SELL, 'Remote areas, pincodes 744101, 1941; Weight; ₹299 up to 2 kg; ₹40/kg; 7–10 days; COD off',
   ['Press Add zone with these values', 'Test 744101', 'At checkout use 744101'],
   'Table shows "2 pincodes", "₹299 up to 2 kg, then ₹40 per kg", COD Not allowed; checkout offers no COD for 744101.',
   'High', 'Functional, Integration')
tc('VC-24', 'Zones', 'Validation', 'Empty coverage and reversed days are refused.',
   PRE_SELL, 'No states or pincodes; days 6 to 2',
   ['Add a zone with no coverage', 'Add one with days 6 to 2'],
   '"Pick at least one state or pincode"; "The first number of days must not be more than the second".',
   'High', 'Validation')
tc('VC-24', 'Zones', 'Delete zone', 'A zone can be deleted after confirmation.',
   'Remote areas exists', '—',
   ['Pick Remote areas', 'Delete zone → Yes, delete'],
   'It is gone; 744101 is no longer deliverable (or falls back to another zone).',
   'Medium', 'Functional')
tc('VC-24', 'Permissions', 'Order manager has no shipping', 'Order managers cannot open shipping.',
   'Signed in as Order manager', f'{ADMIN}/shipping',
   ['Open the address'],
   'Says only owners and managers see it; not in the menu.',
   'Medium', 'Security/Permissions', role='Order manager')

# ---------------------------------------------------------------- VC-25 Payments
tc('VC-25', 'Razorpay', 'Not connected state', 'Payments shows the Razorpay form when not connected.',
   PRE_OWNER, '—',
   ['Open Store → Payments'],
   '"Not connected", Mode Test/Live, Key ID, Key secret, Webhook secret, the webhook address with Copy and the events to tick.',
   'High', 'UI/UX')
tc('VC-25', 'Razorpay', 'Key ID format', 'A key ID must start with rzp_test_ or rzp_live_.',
   PRE_OWNER, 'Key ID "abc"',
   ['Type abc', 'Save'],
   '"A Razorpay key ID starts with rzp_test_ or rzp_live_".',
   'High', 'Validation')
tc('VC-25', 'Razorpay', 'Secrets saved hidden', 'Saved secrets never come back to the browser.',
   PRE_OWNER, 'rzp_test_AbCdEfGh1234, any secrets',
   ['Save the keys', 'Reload', 'Check the page and its network responses for the secret'],
   '"Razorpay saved"; secrets read "Saved · hidden" with Replace; the store shows a Test mode note; the secret values appear nowhere.',
   'Critical', 'Security/Permissions', smoke=True)
tc('VC-25', 'Razorpay', 'Test connection', 'Made-up keys are refused by Razorpay.',
   'Made-up keys saved', '—',
   ['Press Test connection'],
   'The pill says "Keys refused" with the reason; real test keys say "Razorpay accepted the test keys".',
   'High', 'Integration')
tc('VC-25', 'COD', 'Cash on delivery rules', 'COD rules save and apply at checkout.',
   PRE_OWNER + '; cod feature on', 'On, min ₹499, max ₹25,000, fee ₹49',
   ['Switch COD on with the values', 'Save', 'Check a cart of ₹300 and one of ₹600 at checkout'],
   'Saved; COD is not offered for ₹300, offered for ₹600 with the ₹49 fee.',
   'Critical', 'Boundary, Integration')
tc('VC-25', 'COD', 'Min above max', 'A minimum above the maximum is refused.',
   PRE_OWNER, 'Min ₹30,000, max ₹25,000',
   ['Save'],
   'Refused with a message.',
   'Medium', 'Validation')
tc('VC-25', 'Permissions', 'Owner only', 'Managers and editors never see keys.',
   'Signed in as Manager', f'{ADMIN}/payments',
   ['Look for Payments', 'Open the address'],
   'Not in the menu; the page says only the owner sees keys.',
   'Critical', 'Security/Permissions', role='Store manager')

# ---------------------------------------------------------------- VC-26 WhatsApp and SMS
tc('VC-26', 'WhatsApp', 'Form and webhook', 'The WhatsApp form and Meta webhook details show.',
   PRE_OWNER, '—',
   ['Open Store → WhatsApp and SMS'],
   'Phone number ID, business account ID, access token, app secret; webhook address and verify token; SMS "comes later"; email sent by the platform.',
   'Medium', 'UI/UX')
tc('VC-26', 'Templates', 'Message templates', 'Templates are listed with approval state.',
   PRE_OWNER, '—',
   ['Read Message templates'],
   '14 templates in the store\'s name, "0 of 14 approved"; Submit to Meta needs WhatsApp connected.',
   'Medium', 'Functional')
tc('VC-26', 'WhatsApp', 'Secrets hidden', 'Saved WhatsApp secrets are hidden.',
   PRE_OWNER, 'Any token and app secret',
   ['Save', 'Reload'],
   'Secrets read "Saved · hidden"; never shown again.',
   'High', 'Security/Permissions')
tc('VC-26', 'Permissions', 'Owner only', 'Only the owner sees WhatsApp keys.',
   'Signed in as Manager', f'{ADMIN}/messaging',
   ['Open the address'],
   'Refused; not in the menu.',
   'High', 'Security/Permissions', role='Store manager')

# ---------------------------------------------------------------- VC-27 Order updates
tc('VC-27', 'Channels', 'Channel states', 'Order updates shows each channel and the steps.',
   PRE_OWNER, '—',
   ['Open Store → Order updates'],
   'WhatsApp "Not connected", SMS "Comes later", Email "Ready"; a row per step with Email and WhatsApp switches.',
   'High', 'UI/UX')
tc('VC-27', 'Preview', 'Preview and send test', 'Previews use a sample order; the test prints in the terminal.',
   PRE_OWNER, 'Your email',
   ['Pick "Shipped · WhatsApp", then "Order confirmed (COD) · Email"', 'Type your email and Send test to my email'],
   'The text uses a sample order with the store\'s name; the email prints in the terminal.',
   'Medium', 'Functional')
tc('VC-27', 'Settings', 'Save switches and delays', 'Switches, delay and alert email persist.',
   PRE_OWNER, 'Packed email on; delay 5; alert email',
   ['Change them', 'Save', 'Reload'],
   'The changes stay after reload.',
   'High', 'Data persistence')
tc('VC-27', 'Permissions', 'Order manager read-only', 'Order managers see the screen without Save.',
   'Signed in as Order manager', '—',
   ['Open Order updates'],
   'Switches greyed and no Save.',
   'Medium', 'Security/Permissions', role='Order manager')
tc('VC-27', 'Quiet hours', 'Night messages wait', 'Messages after 21:00 wait until 09:00 (except out for delivery and failed).',
   'An order changed after 21:00', '—',
   ['Mark an order packed after 21:00', 'Read Messages to the shopper'],
   'The message shows "Goes out at 09:00".',
   'Low', 'Boundary')

# ---------------------------------------------------------------- VC-28 Staff and roles
tc('VC-28', 'Invite', 'Role required', 'An invite needs at least one role.',
   PRE_OWNER, 'editor@homeorbit.example, Cat Editor, no role',
   ['Open Store → Staff and roles', 'Fill email and name without a role'],
   'Send invite stays grey until a role is ticked.',
   'High', 'Validation')
tc('VC-28', 'Invite', 'Invite catalog editor', 'The invite email prints with a link.',
   PRE_OWNER, 'editor@homeorbit.example, Catalog editor',
   ['Tick Catalog editor', 'Send invite'],
   '"Invite emailed to editor@homeorbit.example" and the email with a link in the terminal.',
   'Critical', 'Functional', smoke=True)
tc('VC-28', 'Access', 'Catalog editor menu', 'The catalog editor sees only their areas.',
   'Editor set a password from the link (third window)', '—',
   ['Sign in as the editor', 'Read the menu', f'Open {ADMIN}/collections/enquiries and {ADMIN}/staff'],
   'Catalog, Content and Store settings; no Sales or Marketing; enquiries "Nothing found"; staff "Only the store owner manages staff."',
   'Critical', 'Security/Permissions', role='Catalog editor', smoke=True)
tc('VC-28', 'Roles', 'Change roles', 'The owner adds a role.',
   'Editor exists', 'Add Content editor',
   ['Press Change roles', 'Tick Content editor', 'Save'],
   'The editor now has both roles; their menu follows on reload.',
   'Medium', 'Functional')
tc('VC-28', 'Remove', 'Remove staff', 'Removing a staff member ends access at once.',
   'Editor signed in elsewhere', '—',
   ['Press Remove on the editor and confirm', 'Reload the editor\'s window'],
   'They lose access to Home Orbit at once.',
   'High', 'Security/Permissions')
tc('VC-28', 'Remove', 'Last owner protected', 'The owner cannot remove themselves as last owner.',
   'Only one owner', '—',
   ['Press Remove on your own row'],
   '"The store needs at least one owner. Make someone else owner first."',
   'High', 'Negative')
tc('VC-28', 'Access', 'Staff page owner only', 'Only owners manage staff.',
   'Signed in as Manager', f'{ADMIN}/staff',
   ['Open the address'],
   '"Only the store owner manages staff."',
   'High', 'Security/Permissions', role='Store manager')

# ---------------------------------------------------------------- VC-29 Reports
tc('VC-29', 'Figures', 'Month figures', 'Reports show the month\'s sales figures.',
   PRE_SELL + '; a delivered COD order', '—',
   ['Open Insights → Reports'],
   'Gross sales, orders, average, refunds and paid online share; the day\'s bar in Daily sales; the product in Best sellers; schemes and coupons in Offers.',
   'High', 'Integration')
tc('VC-29', 'GST', 'GST summary by HSN', 'GST summary lists HSN and rate with tax split.',
   'Delivered orders', '—',
   ['Read GST summary by HSN'],
   'Each HSN and rate with taxable value and IGST or CGST and SGST; a credit note lowers its row.',
   'High', 'Functional')
tc('VC-29', 'Export', 'GSTR-1 and orders CSV', 'Exports download with two decimals.',
   'Report open', '—',
   ['Press Export for GSTR-1 (CSV)', 'Press Export orders CSV'],
   'Two CSVs: the GST table with two decimals and the month\'s orders.',
   'Medium', 'Functional')
tc('VC-29', 'Filter', 'Month picker', 'Picking last month changes the figures.',
   'Report open', 'Last month',
   ['Pick last month'],
   'The figures change to that month.',
   'Low', 'Functional')
tc('VC-29', 'Permissions', 'Who sees reports', 'Order managers see reports; content editors do not.',
   'Signed in as Content editor', f'{ADMIN}/reports',
   ['Open the address'],
   'Refused for the content editor; allowed for an order manager.',
   'Medium', 'Security/Permissions', role='Content editor, Order manager')
