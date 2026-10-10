"""Cross-portal end-to-end workflows: super admin, vendor CMS and the storefront together."""

from qa_model import ADMIN, STORE, Case, Module

MODULES = [
    Module('E2E-01', 'End-to-End', 'Vendor onboarding to first store preview', 'onboarding', ADMIN,
           'Super admin, then the new owner', 'A store created by the platform reaches its owner and its own address.',
           ['Super admin signed in'], ['SA-04', 'VC-01'], ['sa-vendor-new', 'cms-dashboard']),
    Module('E2E-02', 'End-to-End', 'Feature switches across portals', 'features', ADMIN,
           'Super admin and store owner', 'A feature switched in the platform changes the CMS menu and the store, checked on the server.',
           ['Super admin and Home Orbit owner signed in (two windows)'], ['SA-07'], ['sa-vendor-features']),
    Module('E2E-03', 'End-to-End', 'Catalogue to storefront', 'catalogue', ADMIN,
           'Store owner, then shopper', 'A category and product made in the CMS appear on the store with filters, search and Add to cart.',
           ['Home Orbit owner signed in', 'Store selling (`pnpm demo:selling home-orbit`)'], ['VC-04', 'VC-05'], ['cms-products', 'st-category', 'st-search', 'st-product']),
    Module('E2E-04', 'End-to-End', 'Order to cash (COD)', 'order-to-cash', STORE,
           'Shopper, store owner, super admin', 'A guest buys with COD; the store packs, ships and delivers; the platform sees the sale.',
           ['Store selling', 'COD on with rules (VC-25)', 'Shipping zones (VC-24)'], ['VC-10', 'VC-24', 'VC-25'], ['st-cart', 'st-checkout', 'cms-order', 'sa-dashboard']),
    Module('E2E-05', 'End-to-End', 'Schemes and coupons to checkout', 'offers', ADMIN,
           'Store owner, then shopper', 'A scheme and a coupon change prices on the store and are applied once by the server.',
           ['Store selling', 'Schemes and coupons features on'], ['VC-14', 'VC-15'], ['cms-schemes', 'st-offers', 'st-cart']),
    Module('E2E-06', 'End-to-End', 'Review lifecycle', 'reviews', STORE,
           'Shopper and store owner', 'Only a delivered buyer can review; the store approves; the store shows it.',
           ['A delivered order for a shopper with an account'], ['VC-19', 'VC-10'], ['st-review', 'cms-reviews']),
    Module('E2E-07', 'End-to-End', 'Store status across portals', 'store-status', ADMIN,
           'Super admin, shopper', 'Go live, suspend and resume change what shoppers and search engines see.',
           ['Super admin signed in'], ['SA-05'], ['sa-vendor', 'st-offline']),
    Module('E2E-08', 'End-to-End', 'Platform support session audit', 'support-session', ADMIN,
           'Super admin, store owner', 'A platform session inside a store is limited, visible and audited.',
           ['Super admin and owner signed in'], ['SA-06'], ['sa-vendor']),
    Module('E2E-09', 'End-to-End', 'Connector allowance to checkout', 'connectors', ADMIN,
           'Super admin, owner, shopper', 'A provider blocked by the platform cannot be used by the store or at checkout.',
           ['Super admin and owner signed in'], ['SA-08', 'VC-25'], ['sa-vendor-connectors', 'cms-payments', 'st-checkout']),
    Module('E2E-10', 'End-to-End', 'Staff roles and two-step reset', 'staff', ADMIN,
           'Owner, staff, super admin', 'Roles limit what staff reach; a lost phone is handled by the platform.',
           ['Owner signed in'], ['VC-28', 'SA-11'], ['cms-staff', 'sa-vendor-staff']),
    Module('E2E-11', 'End-to-End', 'Tenant isolation', 'isolation', ADMIN,
           'Two store owners, shoppers', 'One store never sees another store\'s data, logins or carts.',
           ['Home Orbit and Demo Sanitary owners signed in (separate browsers)'], ['SA-15'], ['cms-products']),
    Module('E2E-12', 'End-to-End', 'Enquiry from store to inbox', 'enquiries', STORE,
           'Shopper and store owner', 'A quote request reaches the inbox, dashboard and bell, and is worked to closed.',
           ['Enquiries feature on'], ['VC-13'], ['st-contact', 'cms-enquiries']),
    Module('E2E-13', 'End-to-End', 'Returns and refunds', 'returns', STORE,
           'Shopper and store owner', 'A delivered order is returned, received and refunded with a credit note in reports.',
           ['A delivered order for a shopper account'], ['VC-11', 'VC-29'], ['st-order', 'cms-order', 'cms-reports']),
    Module('E2E-14', 'End-to-End', 'Offer consent, abandoned cart and unsubscribe', 'abandoned', STORE,
           'Shopper and store owner', 'Consent at checkout drives reminders and offers; unsubscribe stops them but not order updates.',
           ['Offer messages and abandoned cart features on'], ['VC-16', 'VC-17'], ['st-checkout', 'cms-abandoned']),
    Module('E2E-15', 'End-to-End', 'Affiliate referral to commission', 'affiliate', STORE,
           'Affiliate, shopper, store owner', 'A referral is tracked to a commission without exposing the shopper.',
           ['Enterprise plan with Affiliate program on'], ['VC-18'], ['st-affiliate', 'cms-affiliates']),
    Module('E2E-16', 'End-to-End', 'Billing to subscriptions', 'billing', ADMIN,
           'Super admin', 'Payments recorded on a vendor change subscriptions and the dashboard money figures.',
           ['Super admin signed in'], ['SA-10', 'SA-13'], ['sa-vendor-billing', 'sa-subscriptions']),
    Module('E2E-17', 'End-to-End', 'Shopper account and wishlist across devices', 'account', STORE,
           'Shopper', 'Guest orders join the account; the wishlist follows sign-in; sessions are per store.',
           ['Store selling', 'Wishlist feature on'], ['VC-12'], ['st-login', 'st-account', 'st-wishlist']),
    Module('E2E-18', 'End-to-End', 'Storefront chrome and search (shop experience)', 'storefront', STORE,
           'Shopper', 'Header, phone bottom navigation, footer, instant search and listing tools behave as the wireframes.',
           ['Store selling', 'A desktop window and a phone-size window'], ['VC-03', 'VC-21'], ['st-home', 'st-search', 'st-category', 'st-filters']),
]

CASES: list[Case] = []


def tc(module, sub, func, scenario, pre, data, steps, expected, priority='High', type='Integration',
       role='', notes='', smoke=False):
    n = sum(1 for c in CASES if c.module == module) + 1
    CASES.append(Case(f'{module}-{n:03d}', module, sub, func, scenario, pre, data, steps, expected,
                      priority, type, role, notes, smoke))


# E2E-01 Onboarding
tc('E2E-01', 'Onboarding', 'Create, invite, set password, preview',
   'A vendor created by the super admin is usable end to end by its owner.',
   'Super admin signed in; slug e2e-store unused', 'E2E Store / E2E Store Pvt Ltd / Hardware / 29AABCT1234F1ZM / e2e-store / Starter / e2e.owner@example.com',
   ['Super admin: New vendor with the data, invite ticked → Create vendor',
    'Copy the set-password link from the `pnpm dev` terminal',
    'Private window: open the link, set password "E2eStore@2026"',
    'Verify the owner lands on the E2E Store dashboard with the launch checklist',
    'Open http://e2e-store.localhost:3000'],
   'Store draft in All vendors; owner signed in to their own store only; the store opens in the default design with a preview banner.',
   'Critical', role='Super admin, Store owner', smoke=True)
tc('E2E-01', 'Onboarding', 'Owner cannot reach the platform',
   'The new owner sees only their store.',
   'E2E-01-001 done', '—',
   ['As the new owner open /admin/collections/tenants', 'Read the menu'],
   '"Nothing found"; no Vendors, Billing or Platform in the menu.',
   'Critical', 'Security/Permissions', role='Store owner')
tc('E2E-01', 'Onboarding', 'Dashboard counts follow',
   'The platform dashboard and lists include the new store.',
   'E2E-01-001 done', '—',
   ['Super admin: open the dashboard and All vendors'],
   'Recently onboarded lists E2E Store (Draft); Needs attention lists it as a draft; All vendors counts it.',
   'High', role='Super admin')

# E2E-02 Features
tc('E2E-02', 'Features', 'Reviews off everywhere',
   'Switching Reviews off removes it from the CMS, the store and the server.',
   'Reviews on; a published review exists', '—',
   ['Super admin: Home Orbit → Features → Reviews off',
    'Owner: reload the CMS; look for Marketing → Reviews',
    'Store: open the reviewed product',
    'Try the /review/<token> link from a review email'],
   'Reviews is gone from the menu; the product page shows no ratings; the review link is refused. Switching it on restores all.',
   'Critical', role='Super admin, Store owner, Shopper', smoke=True)
tc('E2E-02', 'Features', 'Dealer locator off',
   'Switching the dealer locator off hides the page, block, menu and links.',
   'Dealer locator on', '—',
   ['Super admin: Dealer locator off', f'Open {STORE}/dealers', 'Read the home page and footer', 'On a phone read the bottom bar'],
   '/dealers is not found; the dealer finder block and Find a dealer links are gone; the bottom bar shows Search in place of Dealers.',
   'High', role='Super admin, Shopper')

# E2E-03 Catalogue to storefront
tc('E2E-03', 'Catalogue', 'New category and product on the store',
   'A category and an active product appear on the store.',
   'Owner signed in; store selling', 'Category "QA hooks" under Home decor; product "QA hook" QA-HOOK-1, photo, price ₹499, HSN 8302, GST 18%, Buy online and quote, Active',
   ['Create the category', 'Create the product with a photo and price; Save Active', f'Open {STORE}/c', 'Open Home decor → QA hooks'],
   'The category shows on /c and the menu; the product card shows ₹499 with Add to cart.',
   'Critical', role='Store owner, Shopper', smoke=True)
tc('E2E-03', 'Catalogue', 'Search finds it by model number and typo',
   'Instant search finds the new product.',
   'E2E-03-001 done', '"QA-HOOK"; "qahook1"; "qa hok"',
   ['Type each in the header search'],
   'Each lists QA hook in the suggestions; Enter opens Results with it first.',
   'High', role='Shopper')
tc('E2E-03', 'Catalogue', 'Filters, sort and Add to cart on the listing',
   'The listing filters by price and sorts by price.',
   'E2E-03-001 done', 'min 400, max 600; sort Price low to high',
   ['Open Home decor', 'Set the price box to 400–600 and Go', 'Sort by Price: low to high', 'Press Add to cart on QA hook'],
   'Only products ₹400–₹600 show, cheapest first; "Added ✓" and the cart count goes up.',
   'High', role='Shopper')
tc('E2E-03', 'Catalogue', 'Archive removes it from the store',
   'Archiving takes the product off the store.',
   'E2E-03-001 done', '—',
   ['Owner: archive QA hook', 'Store: reload the category and the product address'],
   'Gone from the category; the product address shows not found (or redirects if a redirect exists).',
   'High', role='Store owner, Shopper')

# E2E-04 Order to cash
tc('E2E-04', 'Checkout', 'Guest COD order',
   'A guest places a COD order.',
   'Store selling; COD on; zones set', 'Rahul Kulkarni, 98765 43210, rahul.k@example.com, 411045, Flat 12 Shanti Kunj, Baner Road',
   [f'Open {STORE}/products/feather-stainless-steel-pull-handle-hoph-504', 'Check delivery for 411045', 'Add to cart',
    'Cart → Checkout', 'Fill contact and address (state fills from the pincode)', 'Choose Cash on delivery', 'Place order'],
   '"Thank you, Rahul. Your order is placed." with the order number (HOM-…), amount to pay in cash, delivery date and items; the cart is empty again.',
   'Critical', role='Shopper', smoke=True)
tc('E2E-04', 'Checkout', 'Server recomputes totals',
   'Totals cannot be changed from the browser.',
   'An item in the cart', 'Change a price in the page with DevTools before placing',
   ['Edit the shown total in DevTools', 'Place the order'],
   'The order uses the server\'s price; the edited number has no effect.',
   'Critical', 'Security/Permissions', role='Shopper')
tc('E2E-04', 'Checkout', 'Confirmation page is private',
   'Only the browser that placed the order sees the confirmation.',
   'E2E-04-001 done', 'The confirmation address',
   ['Open the confirmation address in another browser'],
   '"We can\'t show this order here".',
   'High', 'Security/Permissions', role='Shopper')
tc('E2E-04', 'Fulfilment', 'CMS sees, packs, ships, delivers',
   'The order flows through the CMS and messages.',
   'E2E-04-001 done', 'Tracking 12345',
   ['Owner: Sales → Orders → open the order', 'Mark as packed', 'Save and tell the shopper it shipped', 'Out for delivery', 'Delivered',
    'Read Messages to the shopper', 'Watch the terminal'],
   'Invoice issued at packing; order Completed, Paid, Delivered; messages queued then "Sent (dev log)" for each step.',
   'Critical', role='Store owner', smoke=True)
tc('E2E-04', 'Tracking', 'No-login tracking page',
   'The tracking link shows progress without personal details.',
   'Shipped order; link from the message', '/t/<code>',
   ['Open the tracking link', 'Open a made-up code'],
   'Journey, courier and AWB, items and masked phone; no address or invoice. A made-up code: "We can\'t find this order".',
   'High', 'Security/Permissions', role='Shopper')
tc('E2E-04', 'Platform', 'Sale reaches the platform dashboard',
   'The super admin sees the order in figures.',
   'E2E-04-001 done today', '—',
   ['Super admin: open the dashboard', 'Open All vendors'],
   'Orders today counts it; GMV this month includes it once delivered/paid; Home Orbit\'s Orders in 30 days goes up.',
   'High', role='Super admin')
tc('E2E-04', 'Stock', 'Stock held and released',
   'Stock is held at checkout and returned on cancel.',
   'A variant with stock 2', 'Order 2, then cancel',
   ['Order both pieces', 'Try to buy one more', 'Owner cancels the order', 'Try again'],
   '"Only 0 left"/Out of stock while held; buyable again after cancel.',
   'High', 'Boundary', role='Shopper, Store owner')

# E2E-05 Offers
tc('E2E-05', 'Scheme', 'Live scheme prices everywhere',
   'A live scheme shows the same price on card, product, cart and order.',
   'Store selling', 'Diwali 2026, 10% off, max ₹1,500, whole store, live now',
   ['Owner: create and schedule the scheme', 'Store: read a card, the product page, the cart, then place a COD order'],
   'The same offer price on card and product page; the cart shows the scheme line; the order\'s discount equals the cart\'s.',
   'Critical', role='Store owner, Shopper', smoke=True)
tc('E2E-05', 'Coupon', 'Coupon on product page and cart',
   'A public coupon shows as an offer and applies once.',
   'Coupons on', 'HOME200, ₹200 off above ₹1,000, public',
   ['Owner: create HOME200', 'Store: open a product it covers', 'Read Offers for you', 'Copy the code; apply it in a ₹1,000+ cart'],
   'Offers for you lists HOME200 with Copy; the cart applies ₹200 once; a second code replaces the first (one coupon per order).',
   'High', role='Store owner, Shopper')
tc('E2E-05', 'Scheme', 'Upcoming scheme shown honestly',
   'A scheduled scheme shows its real start date.',
   'A scheme starting next week with Show before start', '—',
   ['Store: open a covered product', 'Open /offers'],
   'Offers for you says "from <real start date>"; /offers lists it as coming up; prices are not changed yet.',
   'Medium', role='Shopper')

# E2E-06 Reviews
tc('E2E-06', 'Reviews', 'Delivered buyer writes, store approves, store shows',
   'The full review cycle.',
   'A delivered order for shopper rahul.k@example.com with an account', '2 stars, title, text, a photo',
   ['Shopper: My account → Write a review on the delivered order', 'Owner: Marketing → Reviews → Approve with reply', 'Store: open the product and a category'],
   'Product page shows the review with "Verified purchase" and the reply; cards show stars; the home page Reviews block shows it if 4+ stars only.',
   'Critical', role='Shopper, Store owner', smoke=True)
tc('E2E-06', 'Reviews', 'Non-buyers cannot review',
   'Only delivered items can be reviewed.',
   'A shopper with no delivered order', '—',
   ['Look for Write a review in My account', 'Open a review link for another order'],
   'No Write a review; foreign or expired links are refused.',
   'High', 'Security/Permissions', role='Shopper')

# E2E-07 Store status
tc('E2E-07', 'Status', 'Go live, suspend, resume',
   'Store status reaches shoppers and search engines.',
   'Home Orbit draft', 'Reasons for suspend',
   ['Super admin: Go live', f'Store: reload; open /robots.txt and /sitemap.xml', 'Super admin: Suspend with a reason', 'Store: reload in a private window', 'Super admin: Resume'],
   'Live: no preview bar, robots allows, sitemap lists home, 13 categories and 110 products. Suspended: "Store unavailable", robots Disallow, sitemap gone. Resumed: back at once. Recent changes lists all with reasons.',
   'Critical', role='Super admin, Shopper', smoke=True)
tc('E2E-07', 'Status', 'Suspended store refuses orders',
   'A suspended store cannot take orders even from an open checkout.',
   'Checkout open in a tab', '—',
   ['Open checkout with an item', 'Super admin suspends the store', 'Place the order'],
   'The order is refused; no order is created.',
   'High', 'Security/Permissions', role='Shopper, Super admin')

# E2E-08 Support session
tc('E2E-08', 'Session', 'Audited manage session',
   'Changes made by the platform inside a store are visible to the store and the platform.',
   'Super admin and owner', 'Reason "Vendor asked us to set up the Diwali page"',
   ['Super admin: Manage store with the reason', 'Edit About us; Save Draft', 'End session', 'Owner: open Pages', 'Super admin: Recent changes'],
   'Owner sees "by Platform Admin (platform team)"; Recent changes lists the session, reason and edit.',
   'High', role='Super admin, Store owner')
tc('E2E-08', 'Session', 'Support view cannot change data',
   'View as support never saves.',
   'View as support session', '—',
   ['Try to save a product and a setting'],
   'Nothing saves; no Save buttons or the save is refused.',
   'High', 'Security/Permissions', role='Super admin')

# E2E-09 Connectors
tc('E2E-09', 'Connectors', 'Razorpay blocked by the platform',
   'A disallowed provider is unusable for the store.',
   'Razorpay keys saved by the owner', '—',
   ['Super admin: Connectors → Razorpay Allowed off', 'Owner: open Payments', 'Shopper: open checkout'],
   'Payments says Razorpay is not allowed; checkout offers no Pay online (COD only if on); switching it back restores.',
   'High', role='Super admin, Store owner, Shopper')
tc('E2E-09', 'Connectors', 'COD rules at checkout',
   'COD rules from Payments apply at checkout and show to the platform.',
   'COD ₹499–₹25,000, fee ₹49', 'Carts ₹300 and ₹600',
   ['Shopper: checkout with ₹300 then ₹600', 'Super admin: Connectors tab'],
   '₹300 has no COD; ₹600 offers COD with ₹49; the platform shows the vendor\'s rules.',
   'High', 'Boundary', role='Shopper, Super admin')

# E2E-10 Staff
tc('E2E-10', 'Roles', 'Order manager limits',
   'An order manager handles orders but not keys, staff or catalogue writes.',
   'Owner invites orders@homeorbit.example as Order manager', '—',
   ['Accept the invite in another browser', 'Pack an order', 'Open /admin/payments, /admin/staff', 'Edit a product'],
   'Orders work; payments and staff refused; product editing refused or read-only.',
   'Critical', 'Security/Permissions', role='Store owner, Order manager', smoke=True)
tc('E2E-10', 'Two-step', 'Platform resets a staff member\'s two-step',
   'A vendor staff member who lost their phone is reset by the super admin.',
   'Staff member with two-step On', '—',
   ['Super admin: Home Orbit → Staff → Reset two-step', 'Staff member signs in'],
   'They sign in with the password only and can set two-step again; the reset is in the audit log.',
   'High', 'Security/Permissions', role='Super admin, Store staff')

# E2E-11 Isolation
tc('E2E-11', 'Isolation', 'Another store\'s records are invisible',
   'Demo Sanitary\'s owner cannot see Home Orbit data.',
   'Both owners signed in', 'A Home Orbit product address',
   ['Demo Sanitary owner: open Products, Categories, Media, Enquiries, Orders', 'Paste a Home Orbit product\'s admin address'],
   'All lists show only Demo Sanitary\'s records; the pasted address says it could not be found or no access.',
   'Critical', 'Security/Permissions', role='Store owners', smoke=True)
tc('E2E-11', 'Isolation', 'Shopper logins are per store',
   'A shopper account on one store does not sign in on another.',
   'Shopper account on Home Orbit', 'Same email on demo-sanitary.localhost',
   ['Sign in on Home Orbit', 'Open http://demo-sanitary.localhost:3000/account'],
   'Not signed in on Demo Sanitary; the same email there is a separate account.',
   'High', 'Security/Permissions', role='Shopper')
tc('E2E-11', 'Isolation', 'API reads are scoped',
   'The REST API never returns another store\'s records.',
   'Signed in as Demo Sanitary owner', '/api/products?limit=5',
   ['Open /api/products?limit=5 in the browser'],
   'Only Demo Sanitary\'s products (or none); never Home Orbit\'s.',
   'Critical', 'Security/Permissions', role='Store owner')

# E2E-12 Enquiry
tc('E2E-12', 'Enquiry', 'Quote to inbox to closed',
   'A product quote request reaches the inbox and is worked.',
   'Enquiries on', 'Name, 10-digit mobile, city, quantity 50, consent ticked; options picked',
   ['Store: product page → Request a bulk quote with the data', 'Owner: dashboard figures and bell', 'Inbox: open it, assign, Contacted, note, Won'],
   'Store says thanks with ENQ-n; dashboard and bell count it; the inbox shows the options; it moves New → In progress → Closed.',
   'Critical', role='Shopper, Store owner', smoke=True)
tc('E2E-12', 'Enquiry', 'Validation and spam limit',
   'The quote form validates and limits repeats.',
   '—', 'Empty form; then 6 sends in 10 minutes',
   ['Send the form empty', 'Send a valid form 6 times quickly'],
   'Errors under Name and consent and "Add a mobile number or an email…"; the 6th send is refused with the wait message.',
   'High', 'Validation, Boundary', role='Shopper')

# E2E-13 Returns
tc('E2E-13', 'Returns', 'Request, approve, receive, refund',
   'A return runs from the shopper to a refund and the report.',
   'A delivered order for a shopper account', 'Reason, note, a photo',
   ['Shopper: order page → Request return', 'Owner: Orders → Returns → Approve with pickup note', 'Mark received; Refund', 'Insights → Reports'],
   'Shopper sees each state; the return reads Refunded; a credit note lowers the GST summary row.',
   'High', role='Shopper, Store owner')

# E2E-14 Abandoned
tc('E2E-14', 'Consent', 'Consent drives reminders; unsubscribe stops offers only',
   'Offer consent at checkout and unsubscribe behave as promised.',
   'Offer messages and abandoned cart on', 'Tick "Offers and new launches · By email"',
   ['Shopper: checkout, tick offers by email, leave', 'After the delay: reminder in the terminal; Return to your cart restores it',
    'Open Unsubscribe and confirm', 'Owner: send an offer message', 'Place and ship an order for the same email'],
   'Reminder sent with consent; after unsubscribe no offer message is sent to that email, but order updates still are.',
   'High', role='Shopper, Store owner')

# E2E-15 Affiliate
tc('E2E-15', 'Affiliate', 'Referral to approved commission',
   'An affiliate link credits the order without exposing the shopper.',
   'Approved affiliate', '/r/<CODE>?to=/products/<slug>',
   ['Open the link in another browser; place a COD order', 'Affiliate: /affiliate/dashboard', 'Owner: deliver the order; wait the hold days or run the job'],
   'Dashboard shows the order "Pending: not delivered yet" without shopper details; after delivery and hold it becomes approved; cancelling reverses it.',
   'Medium', role='Affiliate, Shopper, Store owner')

# E2E-16 Billing
tc('E2E-16', 'Billing', 'Payment updates subscriptions and MRR',
   'Recording a vendor payment changes the platform money views.',
   'A trial or past-due vendor', '₹9,999',
   ['Super admin: note Subscriptions and dashboard figures', 'Record a payment on the vendor\'s Billing', 'Reload Subscriptions and the dashboard'],
   'The subscription is Active with the new period; Past due and MRR change accordingly.',
   'High', role='Super admin')

# E2E-17 Account
tc('E2E-17', 'Account', 'Guest orders join the account',
   'Logging in with the checkout email shows earlier guest orders.',
   'A guest COD order with rahul.k@example.com', 'Code from the terminal',
   [f'Open {STORE}/account → Send code to the email', 'Type the code from the terminal', 'Read Your orders'],
   'My account "Hi Rahul" lists the guest order with Track order and Invoice.',
   'High', role='Shopper')
tc('E2E-17', 'Wishlist', 'Wishlist follows sign-in',
   'A guest wishlist merges into the account and shows on another browser.',
   'Wishlist on', '—',
   ['As a guest tap the heart on two cards', 'Log in', 'Open /wishlist in another browser signed in'],
   'Both products in the wishlist on both browsers; the header heart shows 2.',
   'Medium', 'Data persistence', role='Shopper')
tc('E2E-17', 'Account', 'Log out of all devices',
   'Logging out everywhere ends other sessions.',
   'Signed in on two browsers', '—',
   ['Press Log out of all devices on one', 'Open a page on the other'],
   'The other browser is signed out on its next page.',
   'Medium', 'Security/Permissions', role='Shopper')

# E2E-18 Storefront chrome (shop experience, 10 October 2026)
tc('E2E-18', 'Header', 'Desktop header icons and menu',
   'The desktop header has the menu, search and icons and never overflows.',
   'Store selling; wishlist on', 'Widths 1280 and 1024',
   [f'Open {STORE} at 1280 px', 'Read the header', 'Narrow to 1024 px'],
   'Menu items on one line, search box, account, wishlist with count and cart with count; at 1024 the search becomes an icon and nothing overlaps.',
   'High', 'UI/UX', role='Shopper', smoke=True)
tc('E2E-18', 'Phone', 'Bottom navigation',
   'The phone bottom bar shows the right tabs and hides on pages with their own bar.',
   'Phone size (375 px)', '—',
   ['Read the bottom bar on the home page', 'Tap Shop', 'Open a product, the cart and checkout'],
   'Home, Shop, Dealers, Account, Cart; Shop opens /c with all categories; on product, cart and checkout the page\'s sticky button replaces the bar.',
   'High', 'UI/UX', role='Shopper', smoke=True)
tc('E2E-18', 'Footer', 'Footer columns and legal line',
   'The footer matches the wireframe and the store\'s features.',
   'Store selling; contact and grievance officer saved (VC-03)', '—',
   ['Scroll to the footer'],
   'Logo, contact, Get our offers first; Shop with Offers; Help with Track order, published policies, Contact us; Company with Find a dealer and Downloads; legal name, GSTIN, grievance officer and ways to pay.',
   'High', 'UI/UX', role='Shopper')
tc('E2E-18', 'Search', 'Instant search with typos and recent searches',
   'Suggestions rank model numbers first and forgive typos.',
   'Store with Home Orbit\'s catalogue', '"610"; "hogdh610"; "glas handel"',
   ['Type each in the header search', 'Use arrow keys and Enter', 'Clear the box and focus it'],
   'HOGDH-610 first for the first two; glass door handles for the typo; Enter opens the choice; Recent searches list earlier terms.',
   'High', 'Functional', role='Shopper', smoke=True)
tc('E2E-18', 'Listing', 'Filter sheet on phones',
   'The phone filter sheet works and reports the count.',
   'Phone size; store selling', 'Price 500–1000',
   ['Open a category', 'Tap Filter', 'Enter the price and Go', 'Tap Show N products'],
   'A sheet over a dimmed page with Close and Clear; the count matches the list; Filter (1) after closing.',
   'Medium', 'UI/UX', role='Shopper')
tc('E2E-18', 'Cart', 'Move to wishlist and Complete the look',
   'Cart extras work.',
   'Two items in the cart; wishlist on', '—',
   ['Press Move to wishlist on one line', 'Read Complete the look', 'Add one suggestion'],
   'The line leaves the cart and the heart count goes up; suggestions come from the same categories and Add to cart adds one.',
   'Medium', 'Functional', role='Shopper')
