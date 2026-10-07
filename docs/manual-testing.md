# Manual test guide: run it locally and check every flow

A step-by-step walk through everything built so far: the super admin, the vendor CMS (Home
Orbit's owner) and Home Orbit's storefront. Each step says what to do and what you should see.
Tick the boxes as you go; if a step shows something else, note the step number and take a
screenshot.

Last checked end to end on a fresh database: 3 October 2026. About 60 to 90 minutes in full;
sections 1 to 4 alone take about 30.

## 0. One-time setup

You need **Node.js 22**, **pnpm 10** (run `corepack enable` once) and **Docker Desktop** running.
Use **Chrome** (or Edge, Firefox): it opens `*.localhost` addresses with no setup. Safari needs a
hosts file entry (README).

```bash
git fetch origin claude/adoring-cori-we1zlg
git checkout claude/adoring-cori-we1zlg
git pull

pnpm install
pnpm setup:local                                          # creates .env; prints your super admin login
docker compose -f docker/docker-compose.yml down -v       # only if you ran an older version before: empties the database
docker compose -f docker/docker-compose.yml up -d mongo   # wait about 10 seconds after this
pnpm seed                                                 # plans, super admin, 2 demo stores
pnpm seed:home-orbit                                      # Home Orbit store, 110 products, photos, pages, menus
pnpm dev                                                  # keep this terminal open
```

- [ ] `pnpm setup:local` printed an email (`admin@tenantecom.local`) and a password like
      `j4Zq-fEY2-GB2x-7auT`. They are also in `.env` (`SEED_SUPER_ADMIN_PASSWORD`).
- [ ] `pnpm seed` ended with `Seed complete.` and printed two lines like
      `owner owner@demo-sanitary.example sets a password at http://localhost:3000/admin/reset/…`.
- [ ] `pnpm seed:home-orbit` printed `+ products: 110 added`, a set-password link for
      `owner@homeorbit.example`, a warning about placeholder business details (expected), and
      `Home Orbit ready.`
- [ ] **Copy the three set-password links** into a note (Home Orbit, Demo Sanitary, Demo
      Clothing). They work once and expire after 72 hours. Lost one? Section 1.6 shows how to
      send a new one.
- [ ] `pnpm dev` shows `Ready`. The first page you open takes 10 to 30 seconds to compile; later
      pages are fast.

**Two people in one browser.** The super admin and the store owner both sign in at
`localhost:3000/admin`, and one browser holds one sign-in. Use a normal window for the super
admin and a **private (incognito) window** for the store owner, or two different browsers.

## 1. Super admin (platform panel)

Normal window: http://localhost:3000/admin

### 1.1 Sign in

- [ ] Type the right email with a wrong password. Expect "The email or password provided is
      incorrect."
- [ ] Sign in with the right password. You land on the platform dashboard: "Good morning/
      afternoon/evening, Platform".

### 1.2 Dashboard

- [ ] Tiles: **Live stores 2** (1 paying, 1 on trial), **MRR ₹6,999** before GST, **Past due 0**,
      **On trial 2**.
- [ ] **Needs attention** lists Home Orbit ("Store is still a draft") and three owners who have
      not accepted their invite.
- [ ] **Recently onboarded** lists Home Orbit (Draft), Demo Clothing and Demo Sanitary (Active).
- [ ] The menu on the left has Vendors (All vendors, Billing, Plans, Subscriptions), Platform
      (Staff users), and Shortcuts (New vendor, Team and access). It also shows the store
      sections (Catalog, Content and so on): a super admin can open any store's records.

### 1.3 Plans

- [ ] Vendors → Plans: **Starter ₹3,499 / month**, introductory offer **₹9,999 for 3 months**,
      500 products. **Enterprise ₹6,999 / month**, 10,000 products.
- [ ] Open Starter, change nothing, press Save. It saves without errors.

### 1.4 All vendors

- [ ] Vendors → All vendors: three stores. Tabs show **All 3, Draft 1, Active 2**.
- [ ] Type `orbit` in the search box: only Home Orbit stays.
- [ ] Click the Draft tab: only Home Orbit.

### 1.5 Vendor overview (Home Orbit)

Click Home Orbit.

- [ ] Tabs across the top: **Overview, Features, Connectors, Domains, Billing, Staff**.
- [ ] The header shows "Store draft", "Starter plan", `home-orbit.localhost`, and the buttons
      **View store** and **Go live**. Don't press Go live yet (section 5 does).
- [ ] **Plan usage**: Products **110 / 500**, Staff users 1 / 3.
- [ ] Type in the GSTIN field `27AAPFU0939F1ZV`: PAN and State fill in by themselves
      (Maharashtra 27).
- [ ] Add a line under **Internal notes** and Save. **Recent changes** at the bottom lists your
      edit.
- [ ] The menu on the left has only platform sections (Vendors, Billing, Platform). Typing
      `/admin/collections/pages` in the address bar says "Nothing found": store screens open only
      inside a store session.
- [ ] Press **Manage store**. A box explains the 2-hour session and asks for a reason; "Open the
      store's CMS" with an empty or 3-letter reason is refused. Type "Vendor asked us to set up the
      Diwali page" and open it.
- [ ] A brown bar on every page says "You are managing Home Orbit as platform admin", with the
      reason and the end time. The menu is Home Orbit's own (Catalog, Sales, Marketing,
      Content, Store, Insights) and the platform sections are gone; `/admin/collections/plans` says "Nothing
      found".
- [ ] Change a word on the **About us** page and save it as a draft. The Pages list says
      "by Platform Admin (platform team)". Back in the platform panel later, **Recent changes**
      on the vendor overview lists the session and the change with the reason.
- [ ] Press **End session** in the bar: you are back on the platform dashboard. **View as
      support** works the same way but nothing can be saved.

### 1.6 Vendor tabs

- [ ] **Features**: one row per feature with a switch. Rows outside the Starter plan or marked
      Phase 2 are locked.
- [ ] Switch **Enquiries inbox** off. Expect the message "Saved. The live store has the change
      now." In another tab, open
      http://home-orbit.localhost:3000/products/feather-stainless-steel-pull-handle-hoph-504 :
      the **Request a quote** form is gone. Switch it back on, reload the product page: the form
      is back.
- [ ] **Connectors**: Payments (Razorpay), Shipping (manual, always on; Shiprocket), Order
      updates (WhatsApp, SMS "Comes later", email, Phase 2 self-serve WhatsApp). Each provider
      has an **Allowed** switch. Switch Razorpay off: "Razorpay switched off for this store".
      Switch it back on. Rows say "Not connected by the vendor yet" until keys are saved (2.8).
- [ ] **Domains**: `home-orbit.localhost`, primary.
- [ ] **Billing**: Starter at ₹3,499 + GST and the ₹9,999 starting offer, with the cards
      **Record payment**, **Change plan** and **Pause or cancel**. Record a test payment of
      ₹9,999: the paid period moves ahead (the first payment covers the offer's 3 months) and the
      payment shows in the history.
- [ ] **Staff**: the owner `owner@homeorbit.example`, invite pending. Press **Resend invite**:
      the `pnpm dev` terminal prints an email starting `[dev-log email] To:
      owner@homeorbit.example` with a fresh set-password link. Local emails are printed there,
      never sent.

### 1.7 New vendor (onboarding a store from the panel)

Shortcuts → New vendor. One page with five sections and a "Will be created" summary on the
right. This makes a throw-away test store; reset the database afterwards if you want it gone
(section 9).

- [ ] **1 Business**: Store name `Test Locks`, Legal name `Test Locks Pvt Ltd`, Industry: Locks.
- [ ] GSTIN `29AABCT1234F1ZN` (last letter wrong on purpose): "The last character does not
      match. Check for a typing mistake". Change it to `29AABCT1234F1ZM`: PAN `AABCT1234F` and
      Karnataka (29) fill in.
- [ ] **2 Store**: slug `test-locks`. The summary shows the address `test-locks.localhost`.
- [ ] **3 Plan and trial**: Starter, with "Starts at ₹9,999 for 3 months"; trial 14 days.
- [ ] **4 Starting features**: switched on from the industry preset, within the plan.
- [ ] **5 Owner login**: name `Test Owner`, email `owner@testlocks.example`, "Email the invite
      now" ticked. The summary reads "Emailed to owner@testlocks.example". Press **Create
      vendor**.
- [ ] You land on the new vendor's overview as **Store draft**. The `pnpm dev` terminal printed
      "You're invited to manage Test Locks" with a set-password link.
- [ ] Open http://test-locks.localhost:3000 : a **preview banner** at the top and the shared
      default design (no Home Orbit look), with no products yet.

### 1.8 Team and access

- [ ] Shortcuts → Team and access: you are listed as Super admin. Invite a teammate as
      **Support**. The invite email prints in the terminal.

### 1.9 Lockout after 5 wrong passwords

Use a store owner who doesn't matter, so you don't lock yourself out. In a private window:

- [ ] Sign in as `owner@demo-clothing.example` with a wrong password **5 times**. Each time:
      "The email or password provided is incorrect."
- [ ] The **6th** try: "This user is locked due to having too many failed login attempts." The
      lock lifts after 15 minutes.

## 2. Vendor CMS (Home Orbit's owner)

Private window. Open the **Home Orbit** set-password link from section 0 (or the fresh one from
1.6).

### 2.1 First sign-in

- [ ] The page asks for New Password and Confirm Password. A password shorter than 10 characters
      is refused. Use 10 or more, for example `HomeOrbit@2026`.
- [ ] After saving you are signed in at the **store dashboard**, laid out as the wireframe
      (`docs/wireframes/index.html#cms-dashboard`, Design view): "Good morning" (or afternoon,
      evening), today's date and Home Orbit, **View store** and **Add product**, and "Your store
      isn't live yet".
- [ ] The menu is dark, with Home Orbit and "Store admin" at the top and the wireframe's groups:
      Dashboard, Catalog, Sales, Marketing, Content, Store, Insights, each entry with an icon and
      a draft count on Pages. Screens not built yet (Import and export, Customers, Reports, and
      the Marketing entries whose switch is on) are greyed with a **Soon** tag and do nothing. At the foot: Products
      **110 / 500**, Starter plan. There is no Vendors or Plans: store staff never see the
      platform panel.
- [ ] The white top bar has a search box (**Ctrl K** jumps to it), **View store**, a bell with the
      number of new enquiries, and "your name · Owner". Type `soap` and press Enter: Products
      opens filtered to soap dishes; the arrow keys pick Enquiries or Pages instead.
- [ ] **Launch checklist · 6 of 9 done**, as ticked boxes. Done: Attribute sets (6), Categories
      (13), Media library (115), Products live (110), Home page published, Menus. To do, each
      with **Open**: Store settings, Policy pages published, Dealers.
- [ ] Figures: Orders today "—" (starts with online selling), Products live 110, New enquiries 0,
      Draft pages 5, Low stock 0. Each opens the matching list.
- [ ] **Needs your attention** says the 5 policy pages are still drafts. **Quick actions** has Add
      product, Create page, Landing page, Upload media, Add category, Log an enquiry, Add dealer,
      Invite staff, Store settings.
- [ ] **Recent activity** lists Home and About us and the uploaded photos, with who and when;
      **Coming up** says nothing is scheduled; the plan card shows Staff 1 / 3 and media storage.
- [ ] The collapse button at the bottom of the menu shrinks it to icons (hover shows the names);
      it stays collapsed after a reload. Below 1024 px wide the menu opens from the ☰ button.

### 2.2 Store settings (contact details reach the storefront)

Store → Store settings, tab **Contact**.

- [ ] Phone `+91 98765 43210`, WhatsApp number `98765 43210`, email `care@homeorbit.example`.
      Save. Expect "Updated successfully."
- [ ] Reload a Home Orbit product page: green **Ask on WhatsApp** buttons appear (on phones, also
      at the bottom of the screen). Hover one: the link is `https://wa.me/919876543210?text=…`,
      so the 91 country code was added for you.
- [ ] http://home-orbit.localhost:3000/contact now shows the phone, "Chat on WhatsApp" and the
      email.
- [ ] Tab **Grievance officer and labels**: fill in a name, designation, email and phone, then
      Save. The contact page and the footer show the grievance officer.
- [ ] Back on the dashboard, the Store settings step is ticked (7 of 9).
- [ ] Tab **Store status**: tick **Maintenance mode** and Save. A yellow bar "Maintenance mode is
      on" shows on every page of the CMS and in Needs your attention. Untick it again.

### 2.3 Attribute sets and categories

- [ ] Catalog → Attribute sets: six sets (Aldrops, Door handles, Door stoppers, Key hangers,
      Curtain brackets, Bathroom accessories). Open **Aldrops**: fields such as Size and Finish
      (variant options, with swatch colours) and Material.
- [ ] Catalog → Categories: 13 categories. Open **Aldrops**: its parent is Door hardware and its
      attribute set is Aldrops.
- [ ] Create a category with only the name `Test category` and Save: the slug fills itself
      (`test-category`).

### 2.4 Products and variants

- [ ] Catalog → Products: 110 products. Search `HOPH-504`: one result, "Feather stainless steel
      pull handle HOPH-504", Active.
- [ ] Open it. Tabs: Basics, Photos and videos, Specifications, Finishes and sizes, Price and
      GST, Label details, Documents and related, Search engines.
- [ ] **Specifications**: Size offered in 8, 10, 12 inch; Finish offered in Antique, Stainless
      steel, Chrome plated, Black matt, Rose gold; Material.
- [ ] Untick **Black matt** and Save. On the storefront product page, Black matt is gone from the
      finish choices. Tick it again and Save.
- [ ] **Finishes and sizes**: press **Create variants for every combination**. Expect "15
      variants created" (3 sizes × 5 finishes), each with a code like
      `HOPH-504-8-INCH-ANTIQUE`. Press it again: "Every combination already has a variant".
- [ ] Create a new product: title `Test handle`, model number `TEST-1`, main category Aldrops,
      status **Active**, no photo. Save. Expect it refused with "Add at least one photo before
      making the product active" (and a note about label details if those are empty). Set
      status to Draft and it saves.
- [ ] In the right-hand column, change **How shoppers buy** to Buy online, with no price, and
      try to make it Active. It is refused ("Products sold online need a selling price and an
      HSN code"). Put it back to "Request a quote only".

### 2.5 Media, pages, menus, banners

- [ ] Content → Media: upload any photo. Saving without **alt text** is refused; add it and the
      photo saves. The dashboard's media storage goes up.
- [ ] Content → Pages: tabs All 7 · Published 2 · Drafts 5. **About us** (Default) and **Home**
      (Landing) are published; the five policy pages are drafts. Each row shows the template, the
      status, when and by whom it was changed, and when it was published.
- [ ] Type `ship` in the search box (or press `/` first): only Shipping policy is left. Pick
      Template → Policy, then **Clear filters** from an empty result.
- [ ] **Create page** opens the choice of Default, Landing or Policy page. Pick Landing: the
      editor opens with Landing ticked in the sidebar. Leave without saving.
- [ ] On a row, ⋯ → **Duplicate** opens a draft copy ("About us (copy)"); ⋯ → **Delete** on the
      copy asks first and says what is deleted. Confirm: it is gone.
- [ ] Open **Home**. The blocks read like the page: "01 Hero slider · Right choice for the home"
      and so on. **Add block** opens the library grouped Marketing, Commerce, Basic, Utility, each
      with a picture and one line on what it does.
- [ ] Press the eye button next to Save Draft: the page appears on the right in Home Orbit's own
      design, with Phone, Tablet and Desktop sizes. Change the hero heading and **Save Draft**: the
      preview updates; http://home-orbit.localhost:3000 still shows the old heading. Publish, and
      the store shows the new one. Change it back.
- [ ] The **SEO** tab shows how the page looks in Google and says when the title or description is
      too long.
- [ ] Open the **Shipping policy** draft, write a line, and Publish. It opens at
      http://home-orbit.localhost:3000/pages/shipping .
- [ ] Content → Menus: the header menu with the category dropdowns, footer columns and the phone
      menu.
- [ ] Content → Banners is empty for Home Orbit: its three banners (soap dispenser, towel rack,
      towel rings) sit on the home page as page blocks. Add a banner here to try the list.

### 2.6 Dealers

- [ ] Store → Dealers: add a dealer (name, city, pincode, phone) and Save. The dashboard's
      Dealers step turns Done. The dealer locator page itself is not built yet.

### 2.7 Staff and roles

- [ ] Store → Staff and roles: you are the Owner. The page explains what each role can do.
- [ ] Invite `editor@homeorbit.example`, name `Cat Editor`. No role is ticked at first and
      **Send invite** stays grey; tick only **Catalog editor**, then send. Expect "Invite emailed
      to editor@homeorbit.example", and the email (with a link) in the `pnpm dev` terminal.
- [ ] Open that link in a **third** window (another browser or another private profile), set a
      password, and sign in. The editor's menu has Catalog, Content and Store settings but **no
      Enquiries** (no Sales group at all) and no Marketing. Their dashboard has no launch
      checklist, no enquiry cards and only the quick actions they can use. Store settings opens read-only (no Save button). Typing
      `/admin/collections/enquiries` in the address bar says "Nothing found", and `/admin/staff`
      says "Only the store owner manages staff."
- [ ] As the owner, press **Change roles** on the editor and add Content editor, then **Remove**
      them. They lose access to Home Orbit at once.
- [ ] Press Remove on your own row: refused with "The store needs at least one owner. Make
      someone else owner first."

### 2.8 Payments and WhatsApp keys (owner only)

Do this as the owner, or as the super admin with **Manage store** on Home Orbit.

- [ ] Store → **Payments**. Razorpay shows "Not connected", Mode Test/Live, Key ID, Key secret,
      Webhook secret, the webhook address with **Copy**, and the events to tick in Razorpay.
- [ ] Type Key ID `rzp_test_AbCdEfGh1234`, any key secret and webhook secret, press **Save**:
      "Razorpay saved". Both secrets now read **Saved · hidden** with **Replace**; the store shows
      a yellow "Test mode" note. Reload: the secrets are still hidden (they never come back to
      the browser).
- [ ] Press **Test connection**. With these made-up keys Razorpay refuses them: the pill says
      "Keys refused" and the reason shows above the form. With your real test keys from Razorpay
      (Settings → API keys) it says "Razorpay accepted the test keys" and the pill turns green.
- [ ] A Key ID like `abc` is refused with "A Razorpay key ID starts with rzp_test_ or rzp_live_".
- [ ] **Cash on delivery** (only when the `cod` feature is on): switch on, min ₹499, max
      ₹25,000, fee ₹49, Save. On the super admin Connectors tab the COD line now reads "Vendor
      rules: orders ₹499.00 to ₹25,000.00, ₹49.00 fee".
- [ ] Store → **WhatsApp and SMS**: the WhatsApp form (phone number ID, business account ID,
      access token, app secret), the webhook address and verify token for Meta. SMS says it comes
      later; email is sent by the platform.
- [ ] Sign in as a manager or catalog editor: neither Payments nor WhatsApp and SMS is in their
      menu, and `/admin/payments` says only the owner sees keys.
- [ ] Back in the super admin, the vendor's Connectors tab shows "Connected by", the mode, the
      masked key ID and "Encrypted, never shown" for each secret, never the secret itself.

### 2.9 Shipping zones and Shiprocket

As Home Orbit's owner (after `pnpm demo:selling home-orbit`, which adds two zones):

- [ ] Store → **Shipping**: the zones table shows Home state (1 state, Flat ₹99, free above
      ₹999, COD allowed, 2 to 3 days) and Rest of India (35 states, Flat ₹149).
- [ ] **Test a pincode** `411045`: "Home state · Maharashtra", Delivery ₹99, free above ₹999,
      cash on delivery allowed, 2 to 3 days, "From your zones". `110001` answers from Rest of
      India; `12345` is refused with "Enter a 6-digit pincode".
- [ ] **Add zone**: name Remote areas, pincodes `744101, 1941`, Fee based on **Weight**, fee ₹299,
      covers up to 2 kg, ₹40 per extra kg, days 7 to 10, Allow cash on delivery off → **Add zone**.
      The table shows "2 pincodes", "₹299 up to 2 kg, then ₹40 per kg", COD Not allowed. Test
      `744101`: Remote areas, ₹299, cash on delivery not allowed. On the store, that pincode at
      checkout offers no cash on delivery.
- [ ] Pick Remote areas in the table, **Delete zone** → Yes, delete: it's gone.
- [ ] A zone with no states and no pincodes is refused with "Pick at least one state or
      pincode"; days 6 to 2 with "The first number of days must not be more than the second".
- [ ] The **Shiprocket** card shows the API user email and password, pickup location and
      pincode, usual box size, courier choice, the webhook address (it says `courier`, not
      `shiprocket`: Shiprocket refuses its own name) and, once saved, the token to paste with it.
      With real API user details (Shiprocket → Settings → API) **Test connection** turns the pill
      green, the subtitle reads "Ships from <your pickup city>", and checkout charges Shiprocket's
      live courier rate (the zones still decide COD and free delivery).
- [ ] Sign in as an order manager: Shipping isn't in the menu and `/admin/shipping` says only
      owners and managers see it. A manager sees the zones and can change them, but not the
      Shiprocket keys.

### 2.10 Order updates (email and WhatsApp)

Locally nothing is really sent: emails and WhatsApp messages are printed in the `pnpm dev`
terminal (`[dev-log email]`, `[dev-log whatsapp]`) about a minute after they are queued (the job
queue runs every minute).

- [ ] Store → **Order updates**: WhatsApp "Not connected", SMS "Comes later", Email "Ready". The
      steps table has an Email and a WhatsApp switch per step and "Not submitted" templates;
      Return approved and rejected show "Comes with returns".
- [ ] Preview: pick "Shipped · WhatsApp", then "Order confirmed (COD) · Email": the text uses a
      sample order with the store's name. Type your email and **Send test to my email**: the
      terminal prints it.
- [ ] Switch **Packed** on for email, change the packed delay to 5 and add an alert email, then
      **Save**: reload and the changes stay. Signed in as an order manager the switches are
      greyed and there is no Save.
- [ ] Store → **WhatsApp and SMS**: **Message templates** lists 14 templates in the store's name,
      "0 of 14 approved". Submit to Meta needs WhatsApp connected (with real Meta details,
      **Submit to Meta** then, a day later, **Sync templates** shows Approved or the reason).
- [ ] After 3.6, the order's **Messages to the shopper** shows Order confirmed by email and
      WhatsApp, "Sending" then "Sent (dev log)" after a minute, and "Opted in to WhatsApp at
      checkout". The alert email address gets "New order …".
- [ ] Mark it packed: "Packed" waits ("Goes out at …"); ship it straight away and the packed
      message is dropped (Not sent: out of date) while "Shipped" goes out with the courier and
      tracking number. After 21:00 messages wait until 09:00, except out for delivery and
      delivery failed.
- [ ] **Resend** on a sent message: refused for 10 minutes after it went out, then queued again.
- [ ] Open the tracking link printed in the message (`http://home-orbit.localhost:3000/t/<code>`):
      the journey, courier and AWB, the items, "Updates for +91 98xxx xx210". **Stop updates
      for this number**: the next WhatsApp step on that order shows "The shopper stopped these
      updates"; email still goes. A made-up code shows "We can't find this order".
- [ ] With WhatsApp connected and templates approved (real Meta details): messages go from the
      store's number; replies show on the order, STOP and START switch updates off and on, and
      any other reply gets one automatic answer a day with the store's phone and email.

## 3. Storefront (what shoppers see)

http://home-orbit.localhost:3000 . Check it twice: on a normal desktop window, and as a phone
(Chrome DevTools, `Ctrl+Shift+M` or `Cmd+Shift+M`, choose a phone such as iPhone 12 Pro).

### 3.1 Home page

- [ ] A thin **preview** bar at the top: "Preview: this store is not live yet, so search engines
      don't list it." It shows only while the store is a draft.
- [ ] Home Orbit's logo, orange and charcoal colours, uppercase headings, the hero "Right choice
      for the home".
- [ ] Then: benefits, category tiles, featured products, banners, the brand story and an
      enquiry form.
- [ ] Header menu: hover (desktop) or tap the menu button (phone) to see the categories. Nothing
      runs off the side of the phone screen.

### 3.2 Category listing and filters

- [ ] Open **Door hardware → Aldrops** (http://home-orbit.localhost:3000/c/door-hardware/aldrops).
      Breadcrumbs, product cards with photos and model numbers.
- [ ] Desktop: filters on the left (Finish, Size, Material) with counts. Tick a finish: the list
      narrows, and the address bar changes (for example `?finish=antique`). Copy that address
      into a new tab: the same filtered list opens.
- [ ] Phone: a **Filters** button opens a sheet from the bottom.
- [ ] Change the sort order, and go to page 2 if there is one.
- [ ] Open **Door hardware** itself: it lists its subcategories and the products of all of
      them.

### 3.3 Product page and quote request

Open http://home-orbit.localhost:3000/products/feather-stainless-steel-pull-handle-hoph-504

- [ ] Photo gallery, the title with its model number, Size and Finish choices (finishes with
      colour dots), specification table, label details (manufacturer, country of origin…),
      related products.
- [ ] Pick **12 inch** and **Rose gold**. The quote box summary reads "… · Size: 12 inch,
      Finish: Rose gold".
- [ ] Press **Send quote request** with everything empty. Errors under Name and the consent box,
      and "Add a mobile number or an email so the store can reply".
- [ ] Fill in a name, a 10-digit mobile number, a city and a quantity, and tick the consent box.
      Send. Expect: "Thank you, your request has been sent. Your reference is ENQ-1 (or the next
      number). The Home Orbit team will contact you soon."
- [ ] Phone view: **Request a quote** and **WhatsApp** stay fixed at the bottom of the screen
      while you scroll.
- [ ] Press the WhatsApp button (after 2.2): it opens WhatsApp with a ready message naming the
      product and the size and finish you chose.

### 3.4 Search, pages, contact, errors

- [ ] Search `HOAL-101` (model number) and `towel` (name): matching products. A nonsense word
      shows "0 results for …" and "Try a shorter word or the model number printed in our catalogue."
- [ ] Footer → **About us** (`/pages/about-us`): Home Orbit's story from their document.
- [ ] **Contact** (`/contact`): send the form. It also gets an ENQ number.
- [ ] Spam limit: send the contact form **6 times within 10 minutes**. The 6th says "You have sent
      several requests already. Please wait a few minutes, or call us." Restarting `pnpm dev`
      clears it.
- [ ] http://home-orbit.localhost:3000/no-such-page : the store's own "page not found", still in
      Home Orbit's design.
- [ ] http://unknown-store.localhost:3000 : a plain 404. Unknown addresses never show a store.
- [ ] http://home-orbit.localhost:3000/robots.txt : `Disallow: /` while the store is a draft.

### 3.5 The other stores

- [ ] http://demo-sanitary.localhost:3000 : the default design with Demo Sanitary's name. It has
      no products: nobody has entered any.

### 3.6 Buying (cart, checkout, cash on delivery)

Home Orbit's real prices aren't in yet, so give it sample ones first (local only, never on real
data): `pnpm demo:selling home-orbit`. It prints how many products it priced, and sets COD
(₹49 fee) and two delivery zones. To try online payment too, put your Razorpay **test** keys in
`.env` as `RAZORPAY_TEST_KEY_ID`, `RAZORPAY_TEST_KEY_SECRET` (and optionally
`RAZORPAY_TEST_WEBHOOK_SECRET`) before running it, or enter them on Payments (2.8).

- [ ] Open a product, e.g. http://home-orbit.localhost:3000/products/feather-stainless-steel-pull-handle-hoph-504 :
      a price with the MRP struck through and "% off", "Inclusive of all taxes", quantity and
      "In stock", **Check delivery**, **Add to cart** and **Buy now**, then **Request a bulk
      quote** and WhatsApp.
- [ ] Type pincode 411045 and press Check: a delivery date, "Free delivery on this order" or the
      fee, and "Cash on delivery available".
- [ ] **Add to cart**: "Added to your cart" and the cart icon in the header shows 1.
- [ ] Cart: the line, its price, quantity buttons and Remove; Price details with items, delivery
      ("At checkout" until a pincode is set), total and "Includes GST of …". Press + : the total
      goes up. Enter a pincode under the items: the delivery fee and date appear.
- [ ] **Checkout**: fill mobile, email, pincode 411045 (the state fills itself: Maharashtra),
      city, name and address. Delivery shows Standard with its date. Choose **Cash on delivery**:
      the ₹49 fee joins the summary and the button reads "Place order · ₹…".
- [ ] Place the order: "Thank you, Rahul. Your order is placed." with the order number (HOM-10001
      for the first), the amount "to pay in cash on delivery", the delivery date and address,
      and the items. The cart icon is empty again.
- [ ] Copy the page address into another browser: "We can’t show this order here" (only the
      browser that placed it sees it).
- [ ] With test keys: choose **Pay online**; Razorpay's test window opens. Pay with a test card
      or UPI `success@razorpay`: the confirmation says "paid by …". Close the window instead: the
      page says the order is waiting for payment, with **Complete payment**.
- [ ] Put a pincode outside India's zones that the store doesn't cover (none by default) or
      empty the store's zones: delivery messages follow the zones (Shipping zones arrive in M5).

### 3.7 Orders in the CMS (after 3.6)

As Home Orbit's owner, or the super admin with **Manage store**:

- [ ] Sales → **Orders**: the order from 3.6 with "COD, to collect" and "Not shipped"; the tabs
      count it under All and To pack. Search for its number, then for the phone 98765.
- [ ] Open it: Order HOM-10001 with Confirmed, COD to collect, Not shipped. Items with GST
      shown as CGST and SGST (Pune is in Maharashtra, like the store's placeholder GSTIN), the
      place of supply line, the customer ("first order"), address and payment.
- [ ] **Mark as packed** → Mark as packed: the parcel shows Packed and **Invoice** now lists
      `INV/26-27/00001`. **Download invoice** opens the GST invoice; Print or save as PDF.
- [ ] In the parcel, type a tracking number and press **Save and tell the shopper it shipped**;
      then **Out for delivery**, then **Delivered**. The order reads Completed, Paid, Delivered
      and the timeline ends with "₹… collected in cash on delivery".
- [ ] **Refund** ₹100 with a reason and a UPI reference: the payment shows Partly refunded and
      the invoice card lists a credit note `CN/26-27/00001`.
- [ ] Place another COD order on the store, then **Cancel order** with a reason: stock goes
      back and the order reads Cancelled.
- [ ] With Shiprocket connected (2.9, real API user): pack an order, then **Book with
      Shiprocket** in the parcel. It shows the courier, AWB, pickup date and **Print the label**;
      the parcel stays Packed until the courier picks it up, then moves by itself (Shiprocket's
      webhook, or the 3-hourly re-track). Cancelling the order before pickup cancels the booking.
- [ ] On the list, tick two orders and **Download invoices** (only invoiced ones print); try
      **Shipped from CSV** with a line `HOM-10003, Delhivery, 12345`; **Export CSV** downloads
      the list for accounts.
- [ ] Sign in as a catalog editor: Orders isn't in the menu. A store support login sees orders
      but no action buttons.

### 3.8 Shopper accounts and Customers (after 3.6)

On the store (http://home-orbit.localhost:3000), in a private window:

- [ ] Open **/account**: it sends you to **Log in or create an account**. Type the email you
      used at checkout in 3.6 and **Send code**. The code is printed in the `pnpm dev` terminal
      ("Your code to log in to Home Orbit: 123456"). Type it (or paste all six digits into the
      first box): you land on **My account**, "Hi Rahul".
- [ ] **Your orders** lists the order from 3.6 (placed as a guest with this email). **Track
      order** opens `/account/orders/HOM-…` with the journey, items, GST line, delivery
      address, the WhatsApp updates switch, **Download invoice** once packed, and **Cancel
      order** until it ships.
- [ ] Wrong code five times: "Send a new one". Ask for another code straight away: "Resend
      code in 0:2x". The message is the same for an email with no account (the code creates it).
- [ ] **Saved address** → **+ Add address**, then **Profile**: add a mobile and **Set a
      password**. Log out, then log in on the **Password** tab with it.
- [ ] Add something to the cart and open **Checkout**: "Logged in as …", the contact and the
      saved address are filled in, and "Save this address to my account" is offered. Place a
      COD order: it shows on My account.
- [ ] **Log out of all devices** from one window: another window signed in to the same account
      is signed out on its next page. The same email on another store (for example
      `demo.localhost:3000/account/login`) is a separate account.
- [ ] On the order confirmation page as a guest: **Create account** fills the email in. On the
      tracking page `/t/<code>`: **Log in to see more** goes to the order after signing in.

In the CMS as the owner, **Sales → Customers**:

- [ ] The account with its masked phone, orders (a link to its orders), spent, last order,
      roles, offers and joined date; search by name, email or phone; **Export CSV**.
- [ ] **Privacy requests → Record a request** (Data export, the shopper's email): it shows
      "Due" in 30 days. **Download data** gives a JSON file with the account, addresses, orders
      and preferences. Record a **Delete account** request, **Start**, then **Delete account**:
      the account is gone from the list, its orders stay under Orders.
- [ ] As an order manager or support login: Customers shows the list without the request
      buttons.

## 4. Enquiries inbox (vendor CMS)

Back in the owner's private window.

- [ ] Sales → Enquiries: tabs **All, New, In progress, Closed** with counts. Your requests from
      section 3 are under New, with reference, name, type (Product question or Contact form),
      product and date.
- [ ] Open the product one. It shows the product, model number, quantity, and the message
      "Options: Size: 12 inch, Finish: Rose gold", plus the shopper's name, phone and city, and
      that they agreed to be contacted.
- [ ] **Reply on WhatsApp** opens WhatsApp to the shopper's number with a greeting naming the
      enquiry. **Reply by email** shows when they gave an email.
- [ ] Set Status to **Contacted**, assign it to yourself, add an internal note, and Save. It
      moves to the **In progress** tab. Set it to **Won** and it moves to Closed.
- [ ] **Create New**: log a phone enquiry by hand. It gets the next ENQ number.
- [ ] The dashboard shows the new enquiries in the figures, the **New enquiries** list and the
      **Enquiries, last 14 days** chart, and the top bar bell shows the same number. One left new
      for more than a day shows in Needs your attention as "waiting more than a day".

## 5. Store status: Go live, Suspend, Resume

Super admin window → All vendors → Home Orbit.

- [ ] Press **Go live**. Status becomes Active. Reload the store: the preview bar is gone,
      `/robots.txt` now allows search engines and names the sitemap, and `/sitemap.xml` lists
      the home page, 13 categories and 110 products.
- [ ] The super admin dashboard: Live stores is now 3.
- [ ] Press **Suspend store**, type a reason (required) and confirm. Reload the store: "Store
      unavailable". `/sitemap.xml` is gone and `/robots.txt` says `Disallow: /`. (Your browser may
      keep showing its own copy of the sitemap for up to an hour; open it in a private window.)
- [ ] Press **Resume store**: the store is back at once.
- [ ] The vendor overview's **Recent changes** lists Go live, Suspend and Resume with your
      reasons.
- [ ] Owner window → Store settings → tab **Store status** → tick maintenance mode, then Save.
      The store shows "Home Orbit will be back soon". Untick it and Save.

There is no button to put a store back to draft; reset the database (section 9) if you want
Home Orbit as a draft again.

## 6. Stores can't see each other's data

Use the **Demo Sanitary** set-password link from section 0 in a private window (sign out of Home
Orbit first, or use another browser).

- [ ] Products, Categories, Media and Enquiries are all **empty**: none of Home Orbit's 110
      products, photos or enquiries show.
- [ ] In the Home Orbit owner's window, open a product and copy its address
      (`…/admin/collections/products/<id>`). Paste it into Demo Sanitary's window: "could not be
      found … or you may not have access to it."

## 7. Production mode (optional, about 5 minutes)

Shows what shoppers get on a real server. Stop `pnpm dev` (Ctrl+C) first.

```bash
pnpm build
pnpm start
```

- [ ] Speed: pages open much faster than in `pnpm dev`.
- [ ] A **draft** store shows **"Coming soon"** instead of the preview (try Test Locks from 1.7,
      or Home Orbit if you didn't go live).
- [ ] Optional: Chrome DevTools → Lighthouse → Mobile on the home, a category and a product
      page (store must be live). Expect performance about 90 to 99 and 100 for accessibility,
      best practices and SEO. The very first load after `pnpm start` scores lower (about 85);
      run it twice.

Run `pnpm dev` again to continue editing.

## 8. Automated checks (optional)

```bash
pnpm verify      # typecheck, lint, 94 tests, production build (a few minutes)
```

- [ ] Ends without errors.

The integration tests download a temporary MongoDB the first time. If that download is blocked
(office network or VPN), point them at the Docker one: set
`MONGODB_TEST_URI=mongodb://localhost:27017/x?replicaSet=rs0&directConnection=true` in `.env`.

## 9. Start again from scratch

```bash
docker compose -f docker/docker-compose.yml down -v
docker compose -f docker/docker-compose.yml up -d mongo
pnpm seed
pnpm seed:home-orbit
```

Uploaded files stay in `media/`; delete that folder too for a completely clean start.

## Not built yet (so don't test these)

- SMS updates (later), returns
- Offers, coupons, reviews, wishlist, affiliates (stage C)
- CSV import, the dealer locator page, the PWA "install app" and offline page
- Two-step login (deferred)
- Real emails: locally they are printed in the `pnpm dev` terminal
- Custom domains: locally every store is `<slug>.localhost:3000`

`docs/progress.md` has the full list, screen by screen.
