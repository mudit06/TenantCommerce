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
      reason and the end time. The menu is Home Orbit's own (Content, Commerce, Engagement,
      Settings) and the platform sections are gone; `/admin/collections/plans` says "Nothing
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
- [ ] **Connectors**: lists what the plan allows (Razorpay, Shiprocket and others). Keys come in
      stage B, so there is nothing to enter yet.
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
- [ ] After saving you are signed in at the **store dashboard**: "Good morning" (or afternoon,
      evening), Home Orbit at the top of the menu, and "Your store isn't live yet".
- [ ] Cards: Published pages 2, Draft pages 5, Scheduled 0, Products 110 active of 110, New
      enquiries 0. Each card opens the matching list.
- [ ] **Needs your attention** says the 5 policy pages are still drafts; **Recent activity** lists
      Home and About us published and the uploaded photos, with who and when.
- [ ] Plan card: Products **110 / 500**, Staff 1 / 3, Media storage about 0.01 GB.
- [ ] **Set up your store: 5 of 8**. Done: Attribute sets (6), Categories (13), Media library
      (115), Home page published, Menus. To do: Store settings, Policy pages, Dealers.
- [ ] The menu shows only store sections (Content, Commerce, Engagement, Settings), with a draft
      count on Pages. There is no Vendors or Plans: store staff never see the platform panel.
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
- [ ] Back on the dashboard, the Store settings step reads Done (6 of 8).

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

- [ ] Team → Staff and roles: you are the Owner. The page explains what each role can do.
- [ ] Invite `editor@homeorbit.example`, name `Cat Editor`. No role is ticked at first and
      **Send invite** stays grey; tick only **Catalog editor**, then send. Expect "Invite emailed
      to editor@homeorbit.example", and the email (with a link) in the `pnpm dev` terminal.
- [ ] Open that link in a **third** window (another browser or another private profile), set a
      password, and sign in. The editor's menu has Catalog, Content and Store settings but **no
      Enquiries**. Store settings opens read-only (no Save button). Typing
      `/admin/collections/enquiries` in the address bar says "Nothing found", and `/admin/staff`
      says "Only the store owner manages staff."
- [ ] As the owner, press **Change roles** on the editor and add Content editor, then **Remove**
      them. They lose access to Home Orbit at once.
- [ ] Press Remove on your own row: refused with "The store needs at least one owner. Make
      someone else owner first."

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
- [ ] The dashboard shows the count of new enquiries.

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

- Prices, cart, checkout, payments, shipping, orders, customer accounts (stage B)
- Offers, coupons, reviews, wishlist, affiliates (stage C)
- CSV import, the dealer locator page, the PWA "install app" and offline page
- Two-step login (deferred)
- Real emails: locally they are printed in the `pnpm dev` terminal
- Custom domains: locally every store is `<slug>.localhost:3000`

`docs/progress.md` has the full list, screen by screen.
