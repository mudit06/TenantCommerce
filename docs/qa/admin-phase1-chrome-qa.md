# Admin panel QA script (Phase 1): for Claude in Chrome

> **Superseded (10 October 2026).** Written for the 4 October build, before two-step sign-in and the
> wireframe screens. Use the module-wise regression scripts and the workbook in `docs/qa/README.md`.

Covers both admin workspaces as built on branch `claude/adoring-cori-we1zlg` (commit `cf85d96`,
4 October 2026): the **super admin (platform panel)** and the **vendor CMS**. It also has a few
storefront checks, which confirm that an admin change reached the shopper store.

How to use it:

1. **Part A** (you, in a terminal, about 10 minutes). Set up the app on your machine and collect
   the links that only the terminal shows.
2. **Part B** (Claude in Chrome). Fill in the four blanks at the top of the prompt, then paste
   everything between the `BEGIN PROMPT` and `END PROMPT` lines into Claude in Chrome. Keep the
   `pnpm dev` terminal open. Claude will stop and ask you for invite links when they appear
   there.
3. **Part C**. Paste Claude in Chrome's final report back into the Claude Code session for
   validation.

---

## Part A: setup (you, in a terminal)

You need Node 22, pnpm 10 (`corepack enable`) and Docker Desktop running.

```bash
git fetch origin claude/adoring-cori-we1zlg
git checkout claude/adoring-cori-we1zlg && git pull

pnpm install
pnpm setup:local                                          # prints the super admin email + password
docker compose -f docker/docker-compose.yml down -v       # start from an EMPTY database (important: expected counts assume it)
docker compose -f docker/docker-compose.yml up -d mongo   # wait ~10 s
pnpm seed                                                 # plans, super admin, Demo Sanitary + Demo Clothing
pnpm seed:home-orbit                                      # Home Orbit: 110 products, pages, menus
pnpm dev                                                  # keep this terminal open and visible
```

Copy these into the blanks at the top of the prompt:

- Super admin email and password (printed by `pnpm setup:local`, also in `.env` as
  `SEED_SUPER_ADMIN_EMAIL` / `SEED_SUPER_ADMIN_PASSWORD`)
- The **Home Orbit** owner set-password link (printed by `pnpm seed:home-orbit`)
- The **Demo Sanitary** owner set-password link (printed by `pnpm seed`)

Open http://localhost:3000/admin once yourself and wait until it loads. The first compile takes
10 to 30 seconds, and Claude may read a slow first load as a failure.

---

## Part B: the prompt

```text
=== BEGIN PROMPT ===

You are a QA tester. Run the test script below against a web app on my own machine, using this
Chrome tab. Work only on http://localhost:3000, http://*.localhost:3000 and nothing else. This is a
local test database, so creating, editing and deleting test data here is expected and safe.

INPUTS (filled in by me):
- SUPER_ADMIN_EMAIL = ____________
- SUPER_ADMIN_PASSWORD = ____________
- HOME_ORBIT_SET_PASSWORD_LINK = ____________
- DEMO_SANITARY_SET_PASSWORD_LINK = ____________

Passwords you will set during the run (test-only, local):
- Home Orbit owner (owner@homeorbit.example): HomeOrbit@2026
- Demo Sanitary owner (owner@demo-sanitary.example): DemoSanitary@2026
- Catalog editor (editor@homeorbit.example): CatEditor@2026
- Support teammate (support@tenantecom.local): SupportUser@2026

RULES
1. Run the tests in order. Each test has an ID, steps and an EXPECT line. Compare what you see
   with EXPECT and give each test exactly one result:
   PASS     = everything in EXPECT happened
   FAIL     = something in EXPECT did not happen, or an error appeared
   BLOCKED  = you could not run it (a missing link, an earlier failure, a page that never loaded)
   SKIP     = the test says it is optional and you skipped it
2. For every FAIL, record: the URL, what you did, what you expected, what you actually saw
   (quote exact on-screen text), and any red errors in the browser console. Take a screenshot if
   you can.
3. Where a test says RECORD, write down the exact value or text you saw, even on PASS.
4. Only one person can be signed in at a time in this browser. When a test says SIGN OUT, use the
   account menu, or open http://localhost:3000/admin/logout . Then confirm you are on the sign-in
   page before you go on.
5. Invite and set-password links are printed in my terminal, which you cannot see. When a test
   says ASK USER FOR LINK, stop and ask me for it; I will paste it in. If I don't answer, mark the
   tests that need it BLOCKED and carry on.
6. If you will not type a password into a form, ask me to sign in, wait until I say "done", then
   continue.
7. In development the first load of each new page can take up to 30 seconds. Wait before calling
   it a failure. If a page shows a Next.js error overlay, that is a FAIL: quote the error.
8. Do not "fix" anything and do not skip ahead. If a step is impossible, mark it BLOCKED and move
   on.
9. After the last test, produce the REPORT in the exact format given at the end.

=====================================================================
SECTION 1: SUPER ADMIN (platform panel)
=====================================================================

SA-01 Wrong password
  Open http://localhost:3000/admin . Sign in with SUPER_ADMIN_EMAIL and the password "wrong-password-1".
  EXPECT: you stay on the sign-in page with the message "The email or password provided is incorrect."

SA-02 Sign in
  Sign in with SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD.
  EXPECT: the platform dashboard, with a greeting "Good morning/afternoon/evening".

SA-03 Platform menu
  Look at the left menu.
  EXPECT: Dashboard; Vendors (All vendors, New vendor); Billing (Plans, Subscriptions); Platform
  (Team and access, Staff users). NO store sections (no Catalog, Products, Pages, Enquiries).
  RECORD: the full menu as shown.

SA-04 Dashboard figures
  EXPECT: tiles for Live stores, MRR, Past due and On trial. "Needs attention" lists Home Orbit as a
  draft store and owners who haven't accepted their invites. "Recently onboarded" lists Home Orbit,
  Demo Clothing and Demo Sanitary.
  RECORD: each tile's value, and every row under Needs attention.

SA-05 Store records are hidden from the platform panel
  Open http://localhost:3000/admin/collections/pages , then
  http://localhost:3000/admin/collections/products .
  EXPECT: both say "Nothing found" (or not found). No store data is shown.

SA-06 Plans list
  Menu: Billing > Plans.
  EXPECT: Starter at ₹3,499 a month, introductory offer ₹9,999 for 3 months, 500 products.
  Enterprise at ₹6,999 a month, 10,000 products.
  RECORD: the plans and prices as shown.

SA-07 Edit and save a plan
  Open Starter, change nothing, press Save.
  EXPECT: a success message and no errors.

SA-08 Create a plan
  Create a new plan named "QA Plan" at ₹1,000 a month, with a product limit of 50. Save it.
  Then try a negative monthly price (-5) and save.
  EXPECT: the valid plan saves. The negative price is refused with a validation message.
  RECORD: the validation message.

SA-09 All vendors list
  Menu: Vendors > All vendors.
  EXPECT: 3 stores. Status tabs with counts: All 3, Draft 1, Active 2.
  Type "orbit" in search: only Home Orbit stays. Click the Draft tab: only Home Orbit.
  RECORD: the column headers.

SA-10 Vendor overview header and tabs
  Open Home Orbit.
  EXPECT: tabs Overview, Features, Connectors, Domains, Billing, Staff. The header shows Store
  draft, Starter plan and home-orbit.localhost, with buttons including View store, Go live, Manage
  store and View as support. DO NOT press Go live yet.

SA-11 Plan usage
  EXPECT: Plan usage shows Products 110 / 500 and Staff users 1 / 3.

SA-12 GSTIN auto-fill and check
  In the GSTIN field, type 27AAPFU0939F1ZX (wrong last character).
  EXPECT: a message that the last character doesn't match.
  Change it to 27AAPFU0939F1ZV.
  EXPECT: PAN and State fill in by themselves (State: Maharashtra, 27).

SA-13 Internal notes and Recent changes
  Add the line "QA note 1" under Internal notes and Save.
  EXPECT: saved without errors, and "Recent changes" at the bottom lists the edit.

SA-14 Manage store: reason required
  Press Manage store. Leave the reason empty and press the button that opens the store's CMS.
  Then try "abc".
  EXPECT: both refused with "Say in a few words why you are opening this store."

SA-15 Manage store session
  Reason: "QA: checking the About us page". Open it.
  EXPECT: a bar on every page saying you are managing Home Orbit as platform admin, with the reason
  and an end time. The menu turns into Home Orbit's store menu (Catalog, Sales, Marketing,
  Content, Store, Insights), and the platform sections are gone.
  Open http://localhost:3000/admin/collections/plans .
  EXPECT: "Nothing found".

SA-16 Change inside a managed session is attributed
  Content > Pages > open "About us". Add the word "QA" to the text and press Save Draft.
  Go back to the Pages list.
  EXPECT: the About us row shows it was changed by Platform Admin (platform team).

SA-17 End the session
  Press "End session" in the bar.
  EXPECT: back on the platform dashboard with the platform menu.
  Open All vendors > Home Orbit > Overview > Recent changes.
  EXPECT: the store session and its reason are listed.

SA-18 View as support is read-only
  On Home Orbit, press View as support with the reason "QA: read-only check". Open
  Content > Pages > About us.
  EXPECT: the bar says read-only/support. There is no working Save/Publish, or a save attempt is
  refused. Open Store > Settings: it cannot be saved either.
  RECORD: what you saw when you tried to save.
  Press End session.

SA-19 Features tab
  Home Orbit > Features.
  EXPECT: one row per feature with a switch. Rows outside the Starter plan or marked Phase 2 are
  locked (they can't be switched on).
  RECORD: the switched-on features, and which rows are locked.

SA-20 Feature switch reaches the storefront
  Switch "Enquiries inbox" OFF.
  EXPECT: a message like "Saved. The live store has the change now."
  In a new tab open
  http://home-orbit.localhost:3000/products/feather-stainless-steel-pull-handle-hoph-504
  EXPECT: there is NO "Request a quote" form on the page.
  Switch Enquiries inbox back ON and reload the product page.
  EXPECT: the Request a quote form is back. Close the tab.

SA-21 Feature dependency prompt
  Try switching on a feature that depends on another feature that is off (if any row mentions a
  dependency). If none does, SKIP.
  EXPECT: a prompt that explains the dependency.
  RECORD: which feature, and the prompt text. Undo your change.

SA-22 Connectors tab
  EXPECT: a list of the connectors the plan allows (for example Razorpay, Shiprocket). There are
  no key fields yet (that is expected).
  RECORD: the connectors listed.

SA-23 Domains tab
  EXPECT: home-orbit.localhost, marked primary.

SA-24 Billing tab: record payment
  EXPECT: Starter at ₹3,499 + GST and the ₹9,999 starting offer, with cards Record payment, Change
  plan, and Pause or cancel.
  RECORD: the "paid until" date (or current period end) BEFORE the payment.
  Record a payment of ₹9,999.
  EXPECT: the payment shows in the history, and the paid period moves forward by about 3 months.
  RECORD: the new date.

SA-25 Staff tab
  EXPECT: owner@homeorbit.example listed as Owner, with the invite pending.
  Press Resend invite.
  EXPECT: a success message. (The email is printed in my terminal; the HOME_ORBIT link I gave you
  may now be replaced. If HOME_ORBIT_SET_PASSWORD_LINK fails later, ASK USER FOR LINK.)

SA-26 Subscriptions list
  Menu: Billing > Subscriptions.
  EXPECT: summary figures (MRR, on trial, past due, renewing in 7 days) and a list with filters.
  RECORD: the figures.

SA-27 New vendor: GSTIN check
  Menu: Vendors > New vendor.
  1 Business: Store name "Test Locks", Legal name "Test Locks Pvt Ltd", Industry: Locks.
  GSTIN 29AABCT1234F1ZN.
  EXPECT: "The last character does not match…".
  Change it to 29AABCT1234F1ZM.
  EXPECT: PAN AABCT1234F and Karnataka (29) fill in.

SA-28 New vendor: slug and summary
  2 Store: slug "test-locks".
  EXPECT: the "Will be created" summary shows test-locks.localhost.
  Also try the slug "home-orbit".
  EXPECT: refused as already taken (at once, or when you press Create). Set it back to "test-locks".

SA-29 New vendor: create
  3 Plan: Starter, trial 14 days (the summary mentions "Starts at ₹9,999 for 3 months").
  4 Starting features: switched on from the Locks preset.
  5 Owner: name "Test Owner", email owner@testlocks.example, "Email the invite now" ticked.
  Press Create vendor.
  EXPECT: you land on Test Locks' overview as Store draft.
  RECORD: the features that were switched on.

SA-30 New store's storefront
  Open http://test-locks.localhost:3000 in a new tab.
  EXPECT: a preview banner and the default store design with the name Test Locks, and no
  products. Close the tab.

SA-31 Status actions on Test Locks (throw-away store)
  On Test Locks: press Go live. EXPECT: Status Active.
  Press Suspend store, then confirm with an empty reason. EXPECT: refused, a reason is required.
  Suspend with the reason "QA suspend". EXPECT: Status Suspended.
  Open http://test-locks.localhost:3000 . EXPECT: "Store unavailable".
  Press Resume store. EXPECT: Active again, and the store opens.
  Press Archive with the reason "QA archive" and confirm.
  EXPECT: Status Archived, and Recent changes lists Go live, Suspend, Resume and Archive with their
  reasons.

SA-32 Billing: pause, resume, change plan (Demo Clothing)
  All vendors > Demo Clothing > Billing. Change plan to Enterprise and confirm.
  EXPECT: the plan shows Enterprise. Pause, then Resume.
  EXPECT: the status follows each action and the history lists it.
  RECORD: the status after each step.

SA-33 Team and access: invite support
  Menu: Platform > Team and access.
  EXPECT: you are listed as Super admin. A security summary shows password length, lockout and
  session length, and two-step verification marked as deferred.
  Invite "QA Support", support@tenantecom.local, role Support.
  EXPECT: a success message. ASK USER FOR LINK (the support invite link from the terminal) and keep
  it for SUP-01.

SA-34 Staff users
  Menu: Platform > Staff users.
  EXPECT: a list of users. RECORD: how many rows there are.

SA-35 Sign out
  SIGN OUT.

=====================================================================
SECTION 2: LOCKOUT (signed out)
=====================================================================

LK-01 Lockout after 5 wrong passwords
  At http://localhost:3000/admin sign in as owner@demo-clothing.example with the password
  "wrong-password-1", 5 times in a row.
  EXPECT: each time, "The email or password provided is incorrect."
  6th try (still wrong):
  EXPECT: "This user is locked due to having too many failed login attempts."
  (Do NOT use the super admin account for this.)

=====================================================================
SECTION 3: PLATFORM SUPPORT ROLE (needs the link from SA-33)
=====================================================================

SUP-01 Support signs in
  Open the support invite link. Set the password SupportUser@2026. (First try "short1" and EXPECT
  it refused, because at least 10 characters are needed.)
  EXPECT: signed in to the platform dashboard.

SUP-02 Support's limits
  EXPECT: there is NO "New vendor" in the menu. Open http://localhost:3000/admin/vendors/new .
  EXPECT: it is refused, or the screen is for super admins only.
  Open All vendors > Home Orbit.
  EXPECT: "View as support" is offered but NOT "Manage store". Go live, Suspend and Archive are not
  available, or are refused.
  RECORD: what support can and can't press on the vendor overview, Billing and Features tabs.

SUP-03 SIGN OUT.

=====================================================================
SECTION 4: VENDOR CMS (Home Orbit owner)
=====================================================================

CMS-01 First sign-in and password policy
  Open HOME_ORBIT_SET_PASSWORD_LINK (ASK USER FOR LINK if it says expired or invalid).
  Try the password "short1".
  EXPECT: refused (at least 10 characters).
  Set HomeOrbit@2026.
  EXPECT: signed in on the store dashboard: a greeting, today's date, Home Orbit, the buttons
  View store and Add product, and "Your store isn't live yet".

CMS-02 Store menu
  EXPECT: a dark menu with Home Orbit at the top, and the groups Dashboard, Catalog, Sales,
  Marketing, Content, Store, Insights. Unbuilt screens are greyed with a "Soon" tag and do nothing
  when clicked: Import and export, Orders, Customers, Shipping, Payments, WhatsApp and SMS, Order
  updates, Reports, and the Marketing entries for switched-on features. At the foot: Products
  110 / 500, Starter plan. NO Vendors, Plans or Subscriptions.
  Click one "Soon" entry. EXPECT: nothing happens.
  RECORD: the full menu, with the entries marked Soon.

CMS-03 Platform screens are blocked
  Open http://localhost:3000/admin/collections/plans and
  http://localhost:3000/admin/collections/tenants .
  EXPECT: "Nothing found", or no other store is visible.

CMS-04 Top bar and search
  EXPECT: a search box, View store, a bell, and "<name> · Owner".
  Press Ctrl+K: the search box gets focus. Type "soap" and press Enter.
  EXPECT: Products opens, filtered to soap items.

CMS-05 Launch checklist and figures
  Dashboard.
  EXPECT: "Launch checklist · 6 of 9 done". Done: Attribute sets, Categories, Media library,
  Products live, Home page published, Menus. To do: Store settings, Policy pages published,
  Dealers.
  Figures: Orders today "—", Products live 110, New enquiries 0, Draft pages 5, Low stock 0.
  Click "Products live". EXPECT: the Products list opens.
  RECORD: the checklist and the figures exactly as shown. (If SA-16 left About us with a draft
  change, Needs your attention may also list unpublished changes. That is fine; record it.)

CMS-06 Needs attention, quick actions, activity
  EXPECT: Needs your attention mentions the 5 draft policy pages. Quick actions has Add product,
  Create page, Landing page, Upload media, Add category, Log an enquiry, Add dealer, Invite staff,
  Store settings. Recent activity lists changes with who and when, and the plan card shows Staff
  and media storage.
  RECORD: the quick action labels.

CMS-07 Collapse the menu
  Press the collapse button at the bottom of the menu.
  EXPECT: the menu shrinks to icons. Reload: it stays collapsed. Expand it again.

CMS-08 Store settings: contact reaches the storefront
  Store > Settings, Contact tab. Phone "+91 98765 43210", WhatsApp "98765 43210", email
  "care@homeorbit.example". Save.
  EXPECT: "Updated successfully."
  Open http://home-orbit.localhost:3000/contact
  EXPECT: the phone, "Chat on WhatsApp" and the email are shown.
  Open the HOPH-504 product page (URL in SA-20).
  EXPECT: an "Ask on WhatsApp" button whose link starts with https://wa.me/919876543210

CMS-09 Grievance officer
  Settings, Grievance officer and labels tab: name "QA Officer", designation "Manager", email
  "grievance@homeorbit.example", phone "9876500000". Save.
  EXPECT: saved. The storefront contact page and footer show the grievance officer. The
  dashboard checklist now says 7 of 9.

CMS-10 Settings validation
  Contact tab: set the email to "not-an-email" and Save.
  EXPECT: refused with a validation message. Put the right email back.
  RECORD: the message.

CMS-11 Maintenance mode
  Store status tab: tick Maintenance mode and Save.
  EXPECT: a yellow "Maintenance mode is on" bar on every CMS page, and an item in Needs your
  attention. http://home-orbit.localhost:3000 shows "Home Orbit will be back soon" (or similar).
  Untick it and Save. EXPECT: the bar is gone and the store is back.

CMS-12 Attribute sets
  Catalog > Attribute sets.
  EXPECT: 6 sets: Aldrops, Door handles, Door stoppers, Key hangers, Curtain brackets, Bathroom
  accessories. Open Aldrops. EXPECT: fields Size and Finish (variant options; Finish has swatch
  colours) and Material.

CMS-13 Attribute set validation
  Create a new attribute set "QA set". Add two fields with the SAME code (for example both
  labelled "Colour"). Save.
  EXPECT: refused because the codes must be unique.
  Then add 4 fields all marked "variant option" and save.
  EXPECT: refused (at most 3 variant options). Fix the set or discard it.
  RECORD: both messages.

CMS-14 Categories
  Catalog > Categories. EXPECT: 13 categories. Open Aldrops: parent Door hardware, attribute set
  Aldrops.
  Create a category with only the name "QA category" and Save. EXPECT: the slug fills in as
  qa-category.
  Try making Door hardware's parent one of its own children (for example Aldrops).
  EXPECT: refused (no loops).
  RECORD: the message.

CMS-15 Products list and search
  Catalog > Products. EXPECT: 110 products. Search "HOPH-504": one result, "Feather stainless
  steel pull handle HOPH-504", Active.

CMS-16 Product editor tabs and specifications
  Open it. RECORD: the product id from the address bar (/admin/collections/products/<id>); ISO-04
  needs it.
  EXPECT: tabs Basics, Photos and videos, Specifications, Finishes and sizes, Price and GST,
  Label details, Documents and related, Search engines.
  Specifications: Size offered 8, 10, 12 inch; Finish offered Antique, Stainless steel, Chrome
  plated, Black matt, Rose gold; Material.

CMS-17 Spec change reaches the storefront
  Untick Black matt and Save. On the storefront HOPH-504 page: Black matt is gone from the finish
  choices. Tick it again and Save. Reload: Black matt is back.

CMS-18 Create variants
  Finishes and sizes tab: press "Create variants for every combination".
  EXPECT: "15 variants created", with codes like HOPH-504-8-INCH-ANTIQUE.
  Press it again. EXPECT: "Every combination already has a variant".
  Catalog > Variants: the 15 variants are listed.

CMS-19 Product publishing rules
  Create a product: title "QA handle", model number "QA-1", main category Aldrops, status Active,
  no photo. Save.
  EXPECT: refused with "Add at least one photo before making the product active" (and possibly a
  note about label details).
  Set status to Draft and Save. EXPECT: saved.
  Set "How shoppers buy" to Buy online, with no price and no HSN, and status Active.
  EXPECT: refused ("Products sold online need a selling price and an HSN code"). Set it back to
  "Request a quote only" and Draft, and Save.

CMS-20 Money input
  On QA handle, Price and GST tab: type a selling price of 1499.50 and an MRP of 999 (lower than
  the price).
  RECORD: what happens (is ₹1,499.50 accepted and shown back correctly after Save and a reload? Is
  an MRP below the price warned about or refused?). Clear the prices, keep it Draft, and Save.

CMS-21 Brands and documents
  Catalog > Brands: create "QA Brand" and save. Catalog > Documents: open the list.
  EXPECT: both screens load and the brand saves.
  RECORD: how many documents are listed.

CMS-22 Media upload and alt text
  Catalog > Media: upload any small image (if you can't upload a file from this browser, mark it
  BLOCKED). Try saving without alt text. EXPECT: refused. Add alt text "QA image". EXPECT: saved.

CMS-23 Pages list
  Content > Pages.
  EXPECT: tabs with counts: All 7, Published 2, Drafts 5 (plus Unpublished changes / Scheduled if
  present). About us (Default) and Home (Landing) are published; 5 policy pages are drafts. Rows
  show template, status, who changed it and when, and when it was published.
  Type "ship" in search: only Shipping policy remains. Filter Template = Policy. Clear filters.
  RECORD: the tab counts.

CMS-24 Create page chooser
  Press Create page. EXPECT: a choice of Default, Landing or Policy page. Pick Landing.
  EXPECT: the editor opens with Landing ticked in the sidebar. Leave without saving.

CMS-25 Duplicate and delete
  On the About us row: ⋯ > Duplicate. EXPECT: a draft "About us (copy)".
  On the copy: ⋯ > Delete. EXPECT: a confirmation that says what will be deleted. Confirm.
  EXPECT: the copy is gone.

CMS-26 Page builder blocks and preview
  Open Home. EXPECT: blocks named by their content (for example "01 Hero slider · Right choice for
  the home"). Press Add block. EXPECT: a library grouped Marketing, Commerce, Basic, Utility, with
  a picture and a description for each block. Close it.
  Press the preview (eye) button. EXPECT: the page in Home Orbit's design on the right, with
  Phone, Tablet and Desktop sizes.
  Change the hero heading to "QA heading" and Save Draft. EXPECT: the preview shows QA heading,
  and http://home-orbit.localhost:3000 still shows the OLD heading.
  Publish. EXPECT: the store shows QA heading. Change it back to the original text and Publish.
  RECORD: the original heading text.

CMS-27 SEO tab
  Home > SEO tab. EXPECT: a Google result preview. Type a 100-character title.
  EXPECT: a warning that the title is too long. Discard the change.

CMS-28 Publish a policy page
  Open the Shipping policy draft, write one line, and Publish.
  EXPECT: it opens at http://home-orbit.localhost:3000/pages/shipping .
  RECORD: the full URL that worked.

CMS-29 Scheduled publishing
  Open the Returns (or any other draft policy) page and schedule it to publish 1 day from now.
  EXPECT: it appears under a Scheduled tab or status, and the dashboard's "Coming up" lists it.
  RECORD: what you saw. (If you can't find scheduling, mark FAIL and describe what you looked for.)

CMS-30 Navigation and banners
  Content > Navigation. EXPECT: the header menu with category dropdowns, footer columns and a
  phone menu.
  Content > Banners. EXPECT: empty for Home Orbit. Add a banner "QA banner" and save. EXPECT: it
  saves.

CMS-31 Dealers
  Store > Dealers: add a dealer "QA Dealer", city Mumbai, pincode 400001, phone 9876511111. Save.
  EXPECT: saved, and the dashboard's Dealers checklist step is now done.
  Try the pincode "12" on a new dealer. RECORD: is it refused?

CMS-32 Enquiries from the storefront
  On the storefront HOPH-504 page, choose 12 inch and Rose gold. Press Send quote request with
  everything empty.
  EXPECT: errors (name, consent, "Add a mobile number or an email…").
  Fill in name "QA Shopper", mobile 9876543210, city Pune, quantity 5, tick consent, and send.
  EXPECT: "Thank you… Your reference is ENQ-<number>…". RECORD: the ENQ number.

CMS-33 Enquiries inbox
  CMS: Sales > Enquiries. EXPECT: tabs All, New, In progress, Closed with counts, and your
  enquiry under New. The bell in the top bar shows the new count.
  Open it. EXPECT: product, model number, quantity, "Options: Size: 12 inch, Finish: Rose gold",
  name, phone, city and consent.
  Set Status to Contacted, assign it to yourself, add an internal note, and Save.
  EXPECT: it moves to In progress. Set it to Won. EXPECT: it moves to Closed.
  Check that "Reply on WhatsApp" is a wa.me link to 919876543210. (Don't send anything.)

CMS-34 Log a phone enquiry
  Create a new enquiry by hand (type: phone). EXPECT: it gets the next ENQ number.

CMS-35 Staff and roles
  Store > Staff and roles. EXPECT: you as Owner, and an explanation of what each role can do.
  Invite editor@homeorbit.example, name "Cat Editor". EXPECT: with no role ticked, Send invite is
  disabled. Tick only Catalog editor and send. EXPECT: "Invite emailed to editor@homeorbit.example".
  ASK USER FOR LINK (the editor invite link) and keep it for ED-01.
  Press Remove on your own row. EXPECT: refused with "The store needs at least one owner…".

CMS-36 SIGN OUT.

=====================================================================
SECTION 5: CATALOG EDITOR ROLE (needs the link from CMS-35)
=====================================================================

ED-01 Editor signs in
  Open the editor link, set CatEditor@2026, and sign in.
  EXPECT: the store dashboard WITHOUT the launch checklist or enquiry cards, and only the quick
  actions the editor can use.

ED-02 Editor's menu and access
  EXPECT: Catalog, Content and Store > Settings are there. There is NO Sales group (no Enquiries),
  NO Marketing, and NO Staff and roles.
  Store > Settings opens read-only (no Save).
  Open http://localhost:3000/admin/collections/enquiries . EXPECT: "Nothing found".
  Open http://localhost:3000/admin/staff . EXPECT: "Only the store owner manages staff."
  Open a product, change a word in its description, and Save. EXPECT: saved (editors can edit the
  catalog). Undo the change.
  RECORD: the editor's full menu.

ED-03 Editor sees no money or plan controls
  RECORD: whether the editor can see the plan usage card or any billing information. (A finding,
  not a pass/fail; mark PASS once recorded.)

ED-04 SIGN OUT.

=====================================================================
SECTION 6: TENANT ISOLATION (Demo Sanitary owner)
=====================================================================

ISO-01 Demo Sanitary signs in
  Open DEMO_SANITARY_SET_PASSWORD_LINK and set DemoSanitary@2026.
  EXPECT: Demo Sanitary's dashboard.

ISO-02 No Home Orbit data in lists
  EXPECT: Products, Categories, Media, Enquiries, Pages (except Demo Sanitary's own default pages),
  Dealers and Navigation contain NOTHING from Home Orbit (no 110 products, no ENQ from CMS-32, no
  QA Dealer).
  RECORD: the count in each list.

ISO-03 No Home Orbit data through the API
  Open each of these addresses (they return JSON):
    http://localhost:3000/api/products?limit=1
    http://localhost:3000/api/enquiries?limit=1
    http://localhost:3000/api/dealers?limit=1
    http://localhost:3000/api/tenants?limit=5
    http://localhost:3000/api/users?limit=5
    http://localhost:3000/api/subscriptions?limit=5
  EXPECT: products, enquiries and dealers show "totalDocs": 0. Tenants shows only Demo Sanitary
  (or is forbidden). Users shows only Demo Sanitary's own people (or is forbidden). Subscriptions
  shows only Demo Sanitary's (or is forbidden). Home Orbit, Demo Clothing and Test Locks never
  appear.
  RECORD: the totalDocs (or error) for each address.

ISO-04 Direct link to another store's record
  Use the HOPH-504 product id you recorded in CMS-16. Open
  http://localhost:3000/admin/collections/products/<that id> .
  EXPECT: not found / no access. Home Orbit's product is NOT shown.
  Also open http://localhost:3000/api/products/<that id> .
  EXPECT: not found or forbidden, NOT the product's JSON.

ISO-05 SIGN OUT.

=====================================================================
SECTION 7: GO LIVE (super admin) AND THE STOREFRONT FOLLOWS
=====================================================================

GL-01 Sign in as super admin. All vendors > Home Orbit. Press Go live.
  EXPECT: Status Active. The dashboard's Live stores figure goes up by 1.
  RECORD: Live stores before and after.

GL-02 Storefront after go live
  Open http://home-orbit.localhost:3000 . EXPECT: no preview bar.
  Open /robots.txt . EXPECT: search engines allowed, and a sitemap named.
  Open /sitemap.xml . EXPECT: home, 13 categories and 110 products listed (a rough count is fine).

GL-03 Suspend and resume Home Orbit
  Suspend with the reason "QA suspend HO", then reload the store. EXPECT: "Store unavailable", and
  robots.txt says Disallow: /.
  Resume. EXPECT: the store is back at once.
  In the CMS, a suspended store shows a bar on every page. (Optional: sign in as the Home Orbit
  owner while suspended and RECORD what they see. Resume afterwards.)

GL-04 Audit trail
  Home Orbit > Overview > Recent changes.
  EXPECT: the store sessions from SA-15 and SA-18, Go live, Suspend and Resume, each with the
  reason and who did it.
  RECORD: the list.

GL-05 Console check
  On the platform dashboard, the vendor overview, the store dashboard and the page editor (you
  can re-open them), read the browser console.
  RECORD: any red errors, with the page.

GL-06 SIGN OUT.

=====================================================================
REPORT FORMAT (produce exactly this, in one message, as plain markdown)
=====================================================================

# Admin QA report
- Date and time:
- Branch/commit tested: claude/adoring-cori-we1zlg (as given)
- Browser:
- Totals: PASS n · FAIL n · BLOCKED n · SKIP n

## Results
| ID | Result | Observed / recorded (exact text, values) |
|----|--------|-------------------------------------------|
| SA-01 | PASS | ... |
(one row for EVERY test ID above, in order, none left out)

## Failures in detail
For each FAIL:
### <ID> <short title>
- URL:
- Steps done:
- Expected:
- Actual (quote on-screen text):
- Console errors:
- Screenshot: yes/no

## Recorded values
(every RECORD item, by test ID)

## Other observations
(anything odd you noticed that no test covered: layout breaking, slow pages over 5 s after the
first compile, confusing wording, missing confirmations)

=== END PROMPT ===
```

---

## Part C: what to send back

Paste the whole **Admin QA report** into the Claude Code session. If a FAIL has a screenshot,
attach it. Also paste any error lines from the `pnpm dev` terminal for the same time.

## Coverage map

| Screen (docs/screens) | Tests |
|---|---|
| `sa-login` | SA-01, SA-02, LK-01, SUP-01 |
| `sa-dashboard` | SA-04, GL-01 |
| `sa-vendors` | SA-09 |
| `sa-vendor-new` | SA-27 to SA-30 |
| `sa-vendor` (incl. Manage store, View as support, status) | SA-10 to SA-18, SA-31, GL-03, GL-04 |
| `sa-vendor-features` | SA-19 to SA-21 |
| `sa-vendor-connectors` | SA-22 |
| `sa-vendor-domains` | SA-23 |
| `sa-vendor-billing` | SA-24, SA-32 |
| `sa-vendor-staff` | SA-25 |
| `sa-plans` | SA-06 to SA-08 |
| `sa-subscriptions` | SA-26 |
| `sa-team` | SA-33, SA-34, SUP-01, SUP-02 |
| `cms-dashboard` | CMS-01, CMS-02, CMS-04 to CMS-07, ED-01 |
| `cms-settings` | CMS-08 to CMS-11 |
| `cms-attributes` | CMS-12, CMS-13 |
| `cms-categories` | CMS-14 |
| `cms-products`, `cms-product-edit` (and variants, brands, documents) | CMS-15 to CMS-21 |
| `cms-media` | CMS-22 |
| `cms-pages`, `cms-page-edit` | CMS-23 to CMS-29 |
| `cms-navigation` (and banners) | CMS-30 |
| `cms-dealers` | CMS-31 |
| `cms-enquiries` | CMS-32 to CMS-34 |
| `cms-staff` | CMS-35, ED-02 |
| Roles and tenant isolation | CMS-03, SA-05, SA-15, SUP-02, ED-02, ISO-01 to ISO-04 |

Not tested because they aren't built yet: CSV import, orders, customers, shipping, payments,
WhatsApp/SMS, order updates, reports, schemes, coupons, offer messages, abandoned carts, reviews,
affiliates, two-step login.
