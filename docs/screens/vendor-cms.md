# Screens: Vendor CMS (each vendor's admin)

Build spec for every vendor CMS screen. Generated from the clickable wireframes by
`node docs/wireframes/build-specs.js`; edit the wireframe or this intro, never the generated
sections by hand. Open `docs/wireframes/index.html` (or https://tenantecom-wireframes.vercel.app)
to see each screen while you read. The sample vendor is the fictional Aquaverde Sanitary.

## What this panel is

- The Payload admin at `admin.<platform-domain>/admin`, scoped to one tenant by
  `@payloadcms/plugin-multi-tenant`. Staff of one vendor only ever see that vendor's data.
- **The same CMS for every vendor.** It is not per-vendor code: vendors differ only by their data,
  plan, feature flags, logo and store name. Never add vendor-specific screens or `if (tenant === x)`.
- Most screens are standard Payload list and edit views of the collections named on each screen.
  Custom views (Payload `admin.components.views` / custom components): Dashboard, CSV import flow,
  Order detail actions and Messages panel, Page builder preview, Order updates settings,
  Reports, the scheme timeline and preview, the offer message composer, the affiliate payout
  form and the review moderation queue.
- Store settings, Menus and Order updates are per-store singleton collections (`isGlobal: true` in
  the multi-tenant plugin) at `/admin/collections/<slug>`, never Payload globals, which every store
  would share (`docs/04`).
- Roles: owner, manager, catalog-editor, order-manager, content-editor, support. What each can do is
  the matrix in `docs/05-auth-and-roles.md` (also drawn on the Staff and roles screen). Hide what a
  role can't use, and enforce it in access control, not just the UI.
- Optional features (schemes, coupons, offer messages, abandoned carts, affiliates, reviews, and in
  Phase 2 service requests, trade accounts, loyalty points) appear in the menu only when their
  feature flag is on, and their collections return no access when off (`docs/08`).

## Menu

Dashboard · Catalog (Products, Categories, Attribute sets, Import and export, Media) · Sales
(Orders, Customers, Enquiries) · Marketing (Schemes and offers, Coupons, Offer messages, Abandoned
carts, Affiliates, Reviews) · Content (Pages, Navigation) · Store (Dealers, Shipping, Payments,
WhatsApp and SMS, Order updates, Settings, Staff and roles) · Insights (Reports) · Modules (Phase 2,
only when switched on: Service requests, Trade accounts, Loyalty points).

**As built (4 October 2026, `src/admin/nav/menu.ts`), as the wireframe (mudit, replacing the
earlier Content/Commerce/Engagement/Settings grouping):** Dashboard · Catalog (Products, Variants,
Categories, Attribute sets, Brands, Documents, Import and export, Media) · Sales (Orders,
Customers, Enquiries) · Marketing (the six growth screens) · Content (Pages, Navigation, Banners)
· Store (Dealers, Shipping, Payments, WhatsApp and SMS, Order updates, Settings, Staff and roles)
· Insights (Reports). Screens not built yet show greyed with "Soon" and no link, only to the
roles that will use them and only when their feature is on. The plan's product allowance sits at
the foot of the menu; search (Ctrl K), View store, the new-enquiry bell and name · role sit in the
top bar. Pages shows
the number of drafts and Enquiries the number of new ones. The store's name sits at the top of
the menu (a switcher for staff of several stores), the signed-in person at the bottom; the menu
collapses to icons with tooltips. The platform panel has its own menu and never appears inside
a store's CMS (docs/05 "As built").

## Rules that apply to every screen

- Every query is filtered by `tenant` (`docs/04`). Money: type rupees, store integer paise.
  Prices include GST by default; totals and tax are always computed on the server (`docs/11`).
- Status pills show order, payment and delivery status separately (`docs/11`).
- Discounts are never typed on an order or a product. Schemes and coupons are rules the server
  applies (`docs/11`); the order keeps a snapshot of what was applied.
- Secrets are write-only ("Saved · hidden" + Replace).
- Problems that stop money or messages (failing Razorpay webhook, broken WhatsApp channel) show
  as a banner on every CMS page until fixed.
- When one of our super admins manages the store ("Manage store" in super admin, docs/05), every
  page shows "You are managing Aquaverde as platform admin (Rohit Verma) · reason · ends 11:40";
  they can use every screen, including owner-only ones, and each change lands in the audit log
  with their name and reason. A support login sees the same screens read-only.

## Look and feel (the Design view in the wireframes)

One TenantEcom theme applied to Payload's admin through its custom CSS variables and
`admin.components.graphics` (logo, icon). Light and dark both supported.

| Token | Light | Dark | Used for |
|---|---|---|---|
| Brand | `#2B4ACB` | `#7D93FF` | Primary buttons, active tab, toggles, checkboxes, charts |
| Brand soft | `#E8ECFB` | `#1D2648` | Info callouts, selected chips, row hover |
| Text / secondary / faint | `#111827` / `#4B5565` / `#8A93A3` | `#E8ECF2` / `#A8B2C1` / `#77839A` | Text levels |
| Page / card / line | `#F5F7FA` / `#FFFFFF` / `#E3E7ED` | `#10151D` / `#161C26` / `#283141` | Backgrounds, borders |
| Success | `#0B7A53` on `#E1F3EA` | `#4FCB9C` on `#10302A` | Paid, active, delivered |
| Warning | `#965A00` on `#FCEFD8` | `#F0B355` on `#352812` | Pending, COD to collect, fallback |
| Danger | `#BE3328` on `#FBE5E2` | `#FF8577` on `#3B1B18` | Failed, past due, rejected |
| Sidebar | `#0F1A2B`, active `#1B2A41`, text `#B6C1D2` | `#0B1018`, `#18212F`, `#A0ACBE` | Dark left menu |

Type: Plus Jakarta Sans (UI), IBM Plex Mono (order numbers, SKUs, codes). Cards 12 px radius with a
light shadow; buttons and inputs 8 px radius; status pills are soft-coloured with a dot.

**As built (4 October 2026, `src/app/(payload)/styles`).** The brand, text, status and surface
tokens above are kept. A store's CMS uses the dark sidebar from the table above (since 4
October 2026, as the wireframe); the platform panel's sidebar is light (`#FBFBFC`, active row
brand soft with a brand bar; dark theme `#0C1117`), and Payload's own grey scale is re-tinted to the
same cool slate so its screens (lists, editors, drawers, sign-in) match ours. Plus Jakarta Sans
is self-hosted; code text uses the system monospace font. Content status is always icon plus
words (Draft, Published, Scheduled, Unpublished changes), never colour alone. Shared pieces live
in `src/admin/ui` (page header, button links, badges, empty states, skeletons, confirm dialog,
icons); new screens use them rather than their own styles.

## Phase notes as of 3 October 2026

- **Growth features in Phase 1** (mudit, 3 October 2026): Schemes and offers (Diwali, Holi, New
  Year, Wedding Season, special launch), Coupons, Offer messages, Abandoned carts, Affiliates with
  commissions, Reviews and the wishlist. Schemes and coupons are for retail shoppers in Phase 1;
  commissions go to affiliates only.
- **Phase 2**: Trade accounts for dealers, retailers, wholesalers and interior designers, trade
  schemes and dealer anniversary offers, loyalty points and product compare. The Trade accounts
  screen is drawn as a Phase 2 example.

- **Shiprocket** is a Phase 1 (MVP) connector for post-order handling (moved from Phase 2 by mudit):
  each vendor connects its own account; it answers the pincode check (COD, delivery dates), picks a
  courier by rate when booking, and handles AWB, labels, pickups and tracking. The shopper's
  delivery fee still comes from the vendor's own shipping zones (rate card); live rates at checkout
  are an open question for mudit. Manual shipping stays for vendors with their own vans or couriers. Setup and rules: `docs/09-connectors.md`.
- **WhatsApp and SMS order updates** (Order updates, WhatsApp and SMS screens, Messages panel) are
  drawn as MVP per `docs/18-notifications.md`; still waiting on mudit's confirmation.

## Screen index

**Home**

- [Store dashboard](#cms-dashboard) `cms-dashboard`

**Catalog**

- [Products](#cms-products) `cms-products`
- [Product editor](#cms-product-edit) `cms-product-edit`
- [Categories](#cms-categories) `cms-categories`
- [Attribute sets](#cms-attributes) `cms-attributes`
- [CSV import](#cms-import) `cms-import`
- [Media library](#cms-media) `cms-media`

**Sales**

- [Orders](#cms-orders) `cms-orders`
- [Order detail](#cms-order) `cms-order`
- [Customers](#cms-customers) `cms-customers`
- [Enquiries inbox](#cms-enquiries) `cms-enquiries`

**Marketing**

- [Schemes and offers](#cms-schemes) `cms-schemes`
- [Scheme editor](#cms-scheme-edit) `cms-scheme-edit`
- [Coupons](#cms-coupons) `cms-coupons`
- [Offer messages](#cms-campaigns) `cms-campaigns`
- [Abandoned carts](#cms-abandoned) `cms-abandoned`
- [Affiliates](#cms-affiliates) `cms-affiliates`
- [Reviews](#cms-reviews) `cms-reviews`

**Content**

- [Pages](#cms-pages) `cms-pages`
- [Page builder](#cms-page-edit) `cms-page-edit`
- [Menus](#cms-navigation) `cms-navigation`

**Store**

- [Dealers](#cms-dealers) `cms-dealers`
- [Shipping zones](#cms-shipping) `cms-shipping`
- [Payments](#cms-payments) `cms-payments`
- [Order updates](#cms-notifications) `cms-notifications`
- [WhatsApp and SMS](#cms-messaging) `cms-messaging`
- [Store settings](#cms-settings) `cms-settings`
- [Staff and roles](#cms-staff) `cms-staff`

**Insights**

- [Reports](#cms-reports) `cms-reports`

**Modules**

- [Service requests](#cms-service) `cms-service` (Phase 2)
- [Trade accounts](#cms-trade) `cms-trade` (Phase 2)

<a id="cms-dashboard"></a>

## Store dashboard

What needs doing today in this store: orders to ship, enquiries to answer, stock running low, and how sales are going.

- **Route:** `/admin`
- **Who:** All vendor staff; cards depend on role
- **Collections:** `orders`, `enquiries`, `variants`, `site-settings`, `schemes`, `reviews`, `affiliates`, `carts`
- **Read first:** `docs/05-auth-and-roles.md`, `docs/10-storefront-and-vendor-ui.md`
- **Wireframe:** `docs/wireframes/index.html#cms-dashboard`
- **Links to:** [Payments](#cms-payments), [CSV import](#cms-import), [Product editor](#cms-product-edit), [Pages](#cms-pages), [Orders](#cms-orders), [Enquiries inbox](#cms-enquiries), [Products](#cms-products), [Order updates](#cms-notifications), [Schemes and offers](#cms-schemes), [Reviews](#cms-reviews), [Affiliates](#cms-affiliates), [Abandoned carts](#cms-abandoned), [Order detail](#cms-order)

### On the screen (top to bottom, sample data)

- Notice: “Razorpay webhooks are failing since 10:42. Paid orders are being checked every 15 minutes until this is fixed. Fix in Payments”
- Page title: Good morning, Priya (Friday, 2 October 2026)
- Actions: Import CSV · Add product
- **Launch checklist · 7 of 8 done**
  - ✓ Store name and logo ✓ GST details ✓ Razorpay connected ✓ Shipping zones ✓ Products imported ✓ WhatsApp templates approved ✓ SMS sender approved on DLT Warranty policy page Open pages
- Figure: Orders today = 23 (9 still to ship)
- Figure: Sales today = ₹1,12,400 (incl. GST)
- Figure: To ship = 9 (oldest 2 days)
- Figure: New enquiries = 5 (2 quote requests)
- Figure: Low stock = 12 (variants)
- **Sales, last 14 days**
  - Bar chart (x: 19 Sep 2 Oct)
- **New enquiries**
  - Actions: All
  - Row: Quote request Mehta Builders, Surat · 40 × Sola diverter 2 h → Enquiries inbox
  - Row: Product question Rough-in size for Nimbus WC? 5 h → Enquiries inbox
  - Row: Dealership Wants to stock Aquaverde in Nagpur Yesterday → Enquiries inbox
- **Order updates today**
  - Actions: Settings
  - Row: WhatsApp 86 sent 2 failed, sent by SMS
  - Row: SMS 9 sent
  - Row: Email 41 sent
- **Offers and growth**
  - 41 orders · ₹16,400 off · ends 31 Oct
  - Next: Diwali, starts 1 Nov
  - oldest 1 day · average this month 4.5
  - ₹6,420 commission pending · ₹3,150 approved
  - ₹31,280 recovered this week
- **Orders to ship**
  - Table: Order, Customer, Total, Payment
    - row: AQV-10482 | Rahul Kulkarni | ₹23,640.00 | Paid
    - row: AQV-10481 | Sneha Reddy | ₹4,299.00 | COD
    - row: AQV-10479 | Vikram Singh | ₹31,140.00 | Paid
- **Low stock**
  - Table: Variant, In stock, Alert at
    - row: Rainline overhead shower · Matt black | 4 | 10
    - row: Quadra towel rail · Chrome | 0 | 5
    - row: Aria basin mixer · Brushed gold | 18 | 20

### Rules and behaviour

1. Cards follow the person’s role. A catalog editor sees stock and products but no sales figures; an order manager sees orders and enquiries.
2. The launch checklist follows the new vendor checklist and disappears once everything is done.
3. Connector problems show as a banner on every CMS page until fixed, because they can stop orders being marked paid.
4. Order updates sent today on WhatsApp, SMS and email. A WhatsApp message that fails is sent again by SMS automatically.
5. Growth at a glance: the live scheme and the next one, reviews waiting for approval, affiliate applications and commission, and carts recovered by reminders. Each row opens its Marketing screen; rows for switched-off features don’t show.

<a id="cms-products"></a>

## Products

The vendor’s whole catalogue: find a product by name, SKU or model number, see price and stock, and act on many at once.

- **Route:** `/admin/collections/products`
- **Who:** Owner, manager, catalog editor; others read-only
- **Collections:** `products`, `variants`, `categories`
- **Read first:** `docs/12-catalog-and-import.md`, `docs/06-data-model.md`
- **Wireframe:** `docs/wireframes/index.html#cms-products`
- **Links to:** [CSV import](#cms-import), [Product editor](#cms-product-edit)

### On the screen (top to bottom, sample data)

- Page title: Products (1,240 products · 2,000 allowed on Growth)
- Actions: Import · Export · Add product
- Tabs: All 1,240 · Active 1,198 · Draft 31 · Archived 11
- Field (sample: “Search title, SKU or model no.”)
- Select (sample: “Category: all”)
- Select (sample: “Stock: all”)
- Actions: More filters
- Checkbox: ✓ (selected in sample)
- Actions: Publish · Archive · Change category · Export selected
- Table: Product, Category, Variants, Price, In stock, Status, Updated
  - row: — | Aria single-lever basin mixer AV-BM-1120 | Basin mixers | 3 finishes | ₹4,250 – ₹5,890 | 146 | Active | Today 09:12
  - row: — | Nimbus wall-hung WC with soft-close seat AV-WH-2041 | Wall-hung WCs | 1 | ₹18,450 | 22 | Active | 30 Sep
  - row: — | Rainline 200 mm overhead shower AV-OS-3200 | Overhead showers | 2 finishes | ₹2,690 | 4 Low | Active | 28 Sep
  - row: — | Sola thermostatic diverter AV-TD-4410 | Diverters | 1 | Enquire only | 60 | Active | 27 Sep
  - row: — | Edge countertop basin 600 AV-CB-5600 | Wash basins | 1 | ₹7,990 | 31 | Draft | Yesterday
  - row: — | Quadra towel rail 600 AV-TR-6060 | Accessories | 2 finishes | ₹1,890 | 0 Out of stock | Active | 21 Sep
- Actions: Previous · Next

### Rules and behaviour

1. Search matches model numbers and SKUs exactly first, which is how dealers and fitters look products up.
2. Price shows the range across finishes. Amounts are typed in rupees and stored as whole paise.
3. Enquire-only products show “Request a quote” instead of a price on the store. Needs the enquire-only feature.
4. The plan’s product limit is shown here and blocks new products when it is reached.

<a id="cms-product-edit"></a>

## Product editor

Everything about one product: details, photos and videos, specifications, finishes with their own price and stock, GST, documents and search settings.

- **Route:** `/admin/collections/products/:id`
- **Who:** Owner, manager, catalog editor
- **Collections:** `products`, `variants`, `attribute-sets`, `product-documents`, `media`, `tax-rates`
- **Read first:** `docs/12-catalog-and-import.md`, `docs/06-data-model.md`, `docs/11-orders-payments-gst.md`
- **Wireframe:** `docs/wireframes/index.html#cms-product-edit`
- **Links to:** [Product page](storefront.md#st-product), [Attribute sets](#cms-attributes), [Schemes and offers](#cms-schemes), [Reviews](#cms-reviews)

### On the screen (top to bottom, sample data)

- Page title: Aria single-lever basin mixer Published Unsaved changes (Model AV-BM-1120 · last saved by Neha Patel at 09:12)
- Actions: Preview · Save draft · Publish changes
- Part shown only as: Multilingual, P2
  - Tabs: English · हिन्दी · ગુજરાતી
- **Basics**
  - Field: Title * (sample: “Aria single-lever basin mixer”)
  - Field: Model number * (sample: “AV-BM-1120”)
  - Select: Brand (sample: “Aquaverde”)
  - Select: Main category * (sample: “Faucets › Basin mixers”) — Decides the specification fields below
  - Field: Also show in
  - Field: Short description (sample: “Solid brass single-lever mixer for counter-top and wall-hung basins.”)
  - Field: Highlights
  - Text area: Description (sample: “B I List Link Table”)
- **Photos and videos**
  - Image: Main
  - Image: + Add
  - Part shown only as: flag: product-videos
    - Row: Installation video · youtube.com/watch?v=… Installation
    - Actions: Add video
- **Specifications · from attribute set “Faucets”**
  - Actions: Edit attribute set
  - Section: Technical
  - Select: Material * (sample: “Brass”)
  - Select: Mounting * (sample: “Deck mounted”)
  - Select: Cartridge (sample: “35 mm ceramic disc”)
  - Field: Flow rate (sample: “6 LPM”)
  - Field: Working pressure (sample: “0.5 to 5 bar”)
  - Field: Warranty (sample: “5 years”)
  - Section: Dimensions
  - Field: Spout reach (sample: “120 mm”)
  - Field: Height (sample: “165 mm”)
  - Field: Tap hole (sample: “35 mm”)
- **Finishes, prices and stock**
  - Chrome
  - Matt black
  - Brushed gold
  - Actions: Edit options
  - Table: Finish, SKU, Price incl. GST (₹), MRP (₹), In stock, Reserved, Status
    - row: Chrome | AV-BM-1120-CP | 4,250.00 | 5,600.00 | 86 | 3 | Active
    - row: Matt black | AV-BM-1120-MB | 5,190.00 | 6,900.00 | 42 | 1 | Active
    - row: Brushed gold | AV-BM-1120-BG | 5,890.00 | 7,800.00 | 18 | 0 | Active
  - Field: Alert me below (sample: “20 units”)
  - Switch: [off] Allow orders when out of stock — off in sample
- **Price and GST**
  - Select: GST rate * (sample: “GST 18%”)
  - Field: HSN code * (sample: “8481”)
  - Field: Prices
  - Notice: “For ₹4,250.00 the taxable value is ₹3,601.69 and GST is ₹648.31. It is split into CGST and SGST, or IGST, at checkout from the delivery state.”
- **Documents**
  - Table: Title, Type, File, Who can see
    - row: Aria spec sheet | Spec sheet | PDF · 420 KB | Everyone
    - row: Installation manual | Installation manual | PDF · 1.8 MB | Everyone
    - row: Dealer price list, Aria series | Price list | PDF · 180 KB | Trade partners [P2]
  - Actions: Attach document
- **Spare parts and related products**
  - Part shown only as: P2, flag: spare-parts
    - Field: Spare parts
  - Field: Goes well with
- **Search engines**
  - Field: Address (sample: “/products/aria-single-lever-basin-mixer”)
  - Field: Page title (sample: “Aria single-lever basin mixer · Aquaverde”)
  - Field: Search keywords (sample: “1120, basin tap, wash basin mixer”)
  - Text area: Description (sample: “Solid brass single-lever basin mixer with 35 mm cartridge and 5-year warranty.”)
- **Status**
  - Active Draft Archived
- Part shown only as: flag: enquire-only-products
  - **How shoppers buy**
    - Buy online Request a quote only Both
    - Field: Min. quantity (sample: “1”)
    - Field: Max. quantity (sample: “10”)
- **Legal details**
  - Field: Generic name * (sample: “Basin mixer”)
  - Select: Country of origin * (sample: “India”)
  - Field: Net quantity * (sample: “1 piece”)
  - Select: Made by (sample: “Manufacturer”)
  - Field: Name and address (sample: “Aquaverde Ceramics Pvt Ltd, Morbi, Gujarat 363642”) — From Store settings
  - Field: Consumer care (sample: “1800 000 0000 · care@aquaverde.example”) — From Store settings
- **Warranty and shipping**
  - Field: Warranty (sample: “60 months”)
  - Field: Weight (sample: “1,450 g”)
  - Field: Box size (sample: “220 × 180 × 90 mm”)
- **Show on store**
  - [on] Featured in Bestsellers [off] New arrival badge
- **Offers and reviews**
  - Row: Diwali offer from 1 Nov 10% off → Schemes and offers
  - Row: 4.6 from 38 reviews 2 waiting → Reviews
- **Versions**
  - Row: v14 Neha · today 09:12 Current
  - Row: v13 Neha · 28 Sep Restore
  - Row: v12 Arjun · 14 Sep Restore
  - Actions: Compare versions

### Rules and behaviour

1. The category’s attribute set decides which specification fields appear and which become filters on the store. A lock or a kurta gets different fields with no code change.
2. Each finish is a variant with its own SKU, price, MRP and stock. Prices are typed in rupees and saved as whole paise.
3. HSN code and GST rate are required for the GST invoice. The tax split is always worked out on the server.
4. Documents can be public, or limited to signed-in trade partners in Phase 2 (for example a dealer price list). CAD files are not offered.
5. “How shoppers buy” switches a product to “Request a quote”, useful for project items. Needs the enquire-only feature.
6. Every save keeps a version. Publish makes the draft live; older versions can be compared and restored.
7. Legal details are required before a product can go live: India’s Legal Metrology and e-commerce rules make the product page show what it is, the country of origin, net quantity, who made, packed or imported it, and consumer care. Name, address and consumer care come from Store settings.
8. Offer prices are not typed here. A launch price or festival discount is a scheme, so the product’s own price and MRP stay untouched and come back by themselves when the scheme ends. The rating comes from published reviews and can’t be edited.

<a id="cms-categories"></a>

## Categories

The category tree shoppers browse, and which attribute set each category uses.

- **Route:** `/admin/collections/categories`
- **Who:** Owner, manager, catalog editor
- **Collections:** `categories`, `attribute-sets`, `redirects`
- **Read first:** `docs/12-catalog-and-import.md`, `docs/06-data-model.md`
- **Wireframe:** `docs/wireframes/index.html#cms-categories`
- **Links to:** [Category listing](storefront.md#st-category)

### On the screen (top to bottom, sample data)

- Page title: Categories (23 categories)
- Actions: Add category
- **Tree**
  - Faucets 104
  - Basin mixers 64
  - Wall mixers 22
  - Kitchen sink mixers 18
  - Showers 65
  - Overhead showers 31
  - Hand showers 26
  - Shower panels 8
  - Sanitaryware 98
  - Wall-hung WCs 40
  - Wash basins 52
  - Urinals 6
  - Accessories 44
  - Spare parts 120
- **Basin mixers**
  - Field: Name * (sample: “Basin mixers”)
  - Select: Parent (sample: “Faucets”)
  - Field: Slug (sample: “basin-mixers”) — Store address: /c/faucets/basin-mixers
  - Select: Attribute set * (sample: “Faucets”) — Specification fields and filters for products here
  - Field: Tile image
  - Field: Banner
  - Text area: Description (sample: “Single-lever and twin-handle mixers for counter-top and wall-hung basins.”)
  - Field: Show on store
  - Field: Sort order (sample: “1”)
  - Field: Page title (sample: “Basin mixers · Aquaverde”)
  - Field: Meta description (sample: “64 basin mixers in chrome, matt black and brushed gold.”)
  - Actions: Save · View on store

### Rules and behaviour

1. Each category points to one attribute set. Products in it get those specification fields, and the store’s filters for the category come from the same set.
2. Changing a slug changes the store address. The old address should redirect to the new one so links and search rankings keep working.
3. Drag to reorder or nest. The order here is the order in menus and category tiles.

<a id="cms-attributes"></a>

## Attribute sets

Define the specification fields for each kind of product: their type, unit, and whether they filter, create finishes or appear in comparisons.

- **Route:** `/admin/collections/attribute-sets/:id`
- **Who:** Owner, manager, catalog editor
- **Collections:** `attribute-sets`
- **Read first:** `docs/12-catalog-and-import.md`, `docs/06-data-model.md`
- **Wireframe:** `docs/wireframes/index.html#cms-attributes`

### On the screen (top to bottom, sample data)

- Page title: Attribute sets
- Actions: New attribute set
- **Sets**
  - Row: Faucets 9 fields · 6 categories
  - Row: WCs and toilets 12 fields · 3 categories
  - Row: Showers 8 fields · 3 categories
  - Row: Wash basins 9 fields · 2 categories
  - Row: Accessories 5 fields · 4 categories
- **Faucets**
  - Actions: Add field
  - Table: Label, Code, Type, Unit, Filter, Finish option, Compare [P2], Required, Group
    - row: Finish | finish | Select, swatches | — | ✓ | ✓ | ✓ | ✓ | Appearance
    - row: Material | material | Select | — | ✓ | — | ✓ | ✓ | Material
    - row: Mounting | mounting | Select | — | ✓ | — | ✓ | ✓ | Technical
    - row: Cartridge | cartridge | Select | mm | ✓ | — | ✓ | — | Technical
    - row: Flow rate | flow_rate | Number | LPM | ✓ | — | ✓ | — | Technical
    - row: Working pressure | pressure | Text | bar | — | — | ✓ | — | Technical
    - row: Spout reach | spout_reach | Number | mm | — | — | ✓ | — | Dimensions
    - row: Height | height | Number | mm | — | — | ✓ | — | Dimensions
    - row: Warranty | warranty_years | Number | years | ✓ | — | ✓ | — | General
- **Options for Finish**
  - Row: Chrome chrome
  - Row: Matt black matt-black
  - Row: Brushed gold brushed-gold
  - Row: Gun metal gun-metal
  - Add option · swatch colour or photo
- Notice: “Other industries, same screen Locks: lock type, door thickness (mm), key type, number of keys. Clothing: size, colour, fabric, fit, sleeve; size and colour as options.”

### Rules and behaviour

1. “Filter” adds the attribute to the category’s filters on the store, with counts.
2. “Finish option” makes it a variant option, so each value becomes its own SKU with price and stock (finish, colour, size).
3. The same tool covers every industry without code. Locks use lock type, door thickness and number of keys; clothing uses size, colour, fabric and fit.

<a id="cms-import"></a>

## CSV import

Bring in or update hundreds of products from a spreadsheet, with a full check before anything changes.

- **Route:** `/admin/import`
- **Who:** Owner, manager, catalog editor
- **Collections:** `import-jobs`, `products`, `variants`, `categories`
- **Read first:** `docs/12-catalog-and-import.md`
- **Wireframe:** `docs/wireframes/index.html#cms-import`

### On the screen (top to bottom, sample data)

- Page title: Import products (aquaverde-products-oct.csv · uploaded by Neha Patel at 09:30)
- Actions: Cancel
- Progress: ✓ Upload file → ✓ Match columns → 3 Check → 4 Import
- Figure: Rows in file = 1,180
- Figure: New products = 236
- Figure: Updates = 926 (matched on SKU)
- Figure: Rows with errors = 18 (will be skipped)
- Notice: “✓ Check finished. Nothing has changed yet. 1,162 rows are ready. Fix the 18 rows below, or import the ready rows now.”
- **Rows with errors**
  - Actions: Download error report
  - Table: Row, Column, What to fix, Value
    - row: 14 | hsn_code | HSN code is required for GST invoices. | —
    - row: 87 | price | Price must be a number in rupees, like 4250 or 4250.50. | 4,250/-
    - row: 203 | category | Category “Basin Mixer” not found. Did you mean “Basin mixers”? | Basin Mixer
    - row: 311 | finish | “Gun Metal Grey” is not a Finish option. Add it to the Faucets set or change the row. | Gun Metal Grey
    - row: 512 | sku | SKU AV-BM-1120-CP appears twice in this file. | AV-BM-1120-CP
  - Showing 5 of 18
- Actions: Upload a fixed file · Import 1,162 ready rows
- Text: Runs in the background. You’ll get an email when it finishes.
- **Import type**
  - Products: create and update Stock and prices only Dealers
- **Templates**
  - Row: Products template
  - Row: Stock and price template
  - Row: Dealers template
- **Recent imports**
  - Row: stock-29-sep.csv Stock and prices · 1,240 rows Done
  - Row: dealers-west.csv Dealers · 214 rows Done
  - Row: launch-catalogue.csv Products · 1,004 rows, 3 skipped Done

### Rules and behaviour

1. A check run always comes first. Nothing in the store changes until staff confirm the import.
2. Imports run as a background job, so a 5,000-row file does not time out. Staff get an email when it finishes.
3. Errors give the row number, the column and what to do, in plain words. The full list downloads as a CSV to fix and upload again.
4. Rows are matched on SKU: an existing SKU updates, a new SKU creates. The same flow handles stock and price updates and dealer lists.

<a id="cms-media"></a>

## Media library

All photos, documents and videos the store uses, with alt text and where each file is used.

- **Route:** `/admin/collections/media`
- **Who:** Owner, manager, catalog and content editors
- **Collections:** `media`
- **Read first:** `docs/13-pwa-seo-performance.md`, `docs/14-security-and-compliance.md`
- **Wireframe:** `docs/wireframes/index.html#cms-media`

### On the screen (top to bottom, sample data)

- Page title: Media (3,912 files)
- Actions: Upload
- Tabs: All · Images · Documents · Videos
- Field (sample: “Search file name or alt text”)
- Usage bar: Storage 7.8 / 20 GB
- Image: PDF
- **aria-mb-side.webp**
  - Image: Preview
  - Field: Alt text * (sample: “Aria basin mixer in matt black, side view”)
  - Row: Type WebP · 182 KB
  - Row: Size 1600 × 1600
  - Row: Versions 5 sizes made
  - Row: Used in 2 products
  - Actions: Replace · Delete

### Rules and behaviour

1. Alt text is required on images so the store stays accessible and readable by search engines.
2. Uploads are resized into phone and desktop sizes in modern formats automatically, which keeps product pages fast.
3. Storage counts toward the plan limit.

<a id="cms-orders"></a>

## Orders

Every order in the store, grouped by what needs doing next: confirm, pack, ship, handle returns.

- **Route:** `/admin/collections/orders`
- **Who:** Owner, manager, order manager; support read-only
- **Collections:** `orders`, `transactions`, `shipments`
- **Read first:** `docs/11-orders-payments-gst.md`
- **Wireframe:** `docs/wireframes/index.html#cms-orders`
- **Links to:** [Order detail](#cms-order)

### On the screen (top to bottom, sample data)

- Page title: Orders
- Actions: Export CSV
- Tabs: All 4,812 · To pack 9 · Packed 4 · Shipped 41 · Out for delivery 6 · Delivered 4,601 · Cancelled 155 · Returns 2
- Field (sample: “Order no., phone or email”)
- Select (sample: “Last 30 days”)
- Select (sample: “Payment: any”)
- Select (sample: “State: any”)
- Checkbox: ✓ (selected in sample)
- Actions: Mark packed · Mark shipped · Shipped from CSV · Download invoices · Export
- Table: Order, Placed, Customer, Items, Total, Payment, Delivery
  - row: — | AQV-10482 | Today 09:41 | Rahul Kulkarni Pune, Maharashtra | 2 | ₹23,640.00 | Paid UPI | Not shipped
  - row: — | AQV-10481 | Today 09:12 | Sneha Reddy Hyderabad, Telangana | 1 | ₹4,299.00 | COD, to collect | Not shipped
  - row: — | AQV-10479 | Yesterday 18:30 | Vikram Singh Jaipur, Rajasthan | 3 | ₹31,140.00 | Paid Card | Packed
  - row: — | AQV-10470 | 1 Oct 11:05 | Anita Desai Ahmedabad, Gujarat | 1 | ₹18,450.00 | Paid Netbanking | Out for delivery Delhivery
  - row: — | AQV-10466 | 30 Sep 16:22 | Joseph Mathew Kochi, Kerala | 2 | ₹8,940.00 | Paid UPI | Delivered
  - row: — | AQV-10462 | 30 Sep 10:02 | Farhan Ali Lucknow, Uttar Pradesh | 1 | ₹2,690.00 | Refunded | Cancelled

### Rules and behaviour

1. Order, payment and delivery have separate statuses, so “paid but not shipped” and “shipped, COD not collected” are both clear at a glance.
2. Cash on delivery orders are confirmed straight away with payment still to collect. The COD fee is part of the total.
3. Invoices download in bulk as PDFs, and the list exports as CSV for accounts.
4. Marking parcels packed, shipped, out for delivery or delivered, one at a time, in bulk, or shipped from a CSV of order number, courier and tracking number, is what sends the shopper’s WhatsApp, SMS and email updates.

<a id="cms-order"></a>

## Order detail

One order end to end: what was bought, the GST breakdown, payment, shipment, invoice and every event so far.

- **Route:** `/admin/collections/orders/:id`
- **Who:** Owner, manager, order manager
- **Collections:** `orders`, `order-events`, `transactions`, `invoices`, `shipments`, `refunds`, `referrals`
- **Read first:** `docs/11-orders-payments-gst.md`
- **Wireframe:** `docs/wireframes/index.html#cms-order`
- **Links to:** [Product editor](#cms-product-edit), [Order updates](#cms-notifications), [Customers](#cms-customers), [Affiliates](#cms-affiliates)

### On the screen (top to bottom, sample data)

- Page title: Order AQV-10482 Confirmed Paid Not shipped (Placed today at 09:41 on the online store)
- Actions: Download invoice · Refund · Cancel order · Mark as packed
- **Items**
  - Table: Product, Price, Qty, GST, Total
    - row: Aria single-lever basin mixer Matt black · AV-BM-1120-MB | ₹5,190.00 | 1 | 18% | ₹5,190.00
    - row: Nimbus wall-hung WC with soft-close seat White · AV-WH-2041-WH | ₹18,450.00 | 1 | 18% | ₹18,450.00
  - Row: Items total, incl. GST ₹23,640.00
  - Row: Delivery ₹0.00
  - Row: Taxable value ₹20,033.90
  - Row: IGST 18% ₹3,606.10
  - Row: Order total ₹23,640.00
  - Text: Place of supply Maharashtra (27). Store in Gujarat (24).
- **Shipment**
  - Notice: “Not shipped yet”
  - Select: Carrier (sample: “Delhivery”)
  - Field: Tracking number (sample: “AWB number”)
  - Field: Tracking link (sample: “Filled from the carrier”)
  - Actions: Save and email customer · Book with Shiprocket
- **Timeline**
  - Row: 09:41 Order placed on the online store
  - Row: 09:41 ₹23,640.00 captured by Razorpay (UPI)
  - Row: 09:41 WhatsApp confirmation sent to +91 98xxx xx210
  - Row: 09:42 Invoice INV/26-27/00482 created
  - Row: 09:42 Confirmation email sent to rahul.k@example.com
  - Field (sample: “Add a note for your team”)
- **Messages to the shopper**
  - Actions: Settings
  - Row: Order confirmed WhatsApp · 09:41 Read 09:43 Resend
  - Row: Order confirmed Email · 09:42 Delivered Resend
  - Row: Order confirmed SMS · not sent Not needed, WhatsApp delivered
- **Customer**
  - rahul.k@example.com +91 98xxx xx210 · 3rd order
  - Actions: View customer
- **Delivery address**
  - Flat 12, Shanti Kunj, Baner Road Pune, Maharashtra 411045 Billing: same as delivery · No GSTIN (personal order)
- **Payment**
  - Row: Method Razorpay · UPI
  - Row: Payment ID pay_Q7x•••Lm2
  - Row: Captured Today 09:41
  - Row: Amount ₹23,640.00
- **Invoice**
  - Actions: Download invoice
- **Offers and referral**
  - Row: Scheme none applied
  - Row: Coupon none
  - Row: Referred by Riya Sharma · link /r/RIYA
  - Row: Commission ₹1,001.70 at 5% Pending: not delivered yet

### Rules and behaviour

1. Order, payment and delivery statuses are shown separately. Staff cannot edit prices on a placed order; totals were fixed by the server at checkout.
2. Delivery to Maharashtra (27) from a Gujarat (24) store is inter-state, so the whole tax is IGST. Within Gujarat it would be split into CGST and SGST.
3. Invoice numbers run per financial year with no gaps, for example INV/26-27/00482.
4. Each button is a checked status change. Marking as packed is allowed now; delivered is not, until it has shipped.
5. Every change, email and payment event is written to the timeline with who and when.
6. Messages lists every update sent for this order: channel, step, and whether it was delivered, read or failed, with the reason. Order roles can resend a message once every 10 minutes. Shopper replies on WhatsApp show here too.
7. Offers and referral shows what the server applied at checkout: the scheme and coupon with the amount each took off (as separate lines in Items too), and, when the order was referred, the affiliate, how (link or coupon) and the commission with its status. Cancelling or refunding adjusts the commission automatically.

<a id="cms-customers"></a>

## Customers

Shoppers with an account in this store, their orders and spend, and privacy requests.

- **Route:** `/admin/collections/customers`
- **Who:** Owner, manager; order manager and support read-only
- **Collections:** `customers`, `orders`, `addresses`, `contact-preferences`
- **Read first:** `docs/05-auth-and-roles.md`, `docs/14-security-and-compliance.md`
- **Wireframe:** `docs/wireframes/index.html#cms-customers`

### On the screen (top to bottom, sample data)

- Page title: Customers (2,318 accounts in this store)
- Actions: Export CSV
- Field (sample: “Name, email or phone”)
- Select (sample: “Role: all”)
- Select (sample: “Offers: any”)
- Table: Customer, Phone, Orders, Spent, Last order, Roles, Offers, Joined
  - row: Rahul Kulkarni rahul.k@example.com | +91 98xxx xx210 | 3 | ₹32,470 | Today | Shopper | Email | 14 Aug
  - row: Riya Sharma riya@example.com | +91 98xxx xx455 | 2 | ₹9,880 | 12 Sep | Shopper, Affiliate | Email, WhatsApp | 12 Aug
  - row: Vikram Singh vikram.s@example.com | +91 99xxx xx114 | 1 | ₹31,140 | Yesterday | Shopper | — | 1 Oct
  - row: Anita Desai anita.d@example.com | +91 97xxx xx508 | 4 | ₹41,620 | 1 Oct | Shopper | WhatsApp | 22 Aug
  - row: Mehta Builders purchase@mehta.example | +91 96xxx xx771 | 2 | ₹1,86,400 | 18 Sep | Trade: dealer [P2] | — | 2 Sep
  - row: Joseph Mathew joseph.m@example.com | +91 94xxx xx362 | 1 | ₹8,940 | 30 Sep | Shopper | — | 30 Sep
- Text: Guest orders are listed under Orders
- **Privacy requests**
  - Row: Data export · s.n@example.com Due 9 Oct
  - Row: Delete account · k.p@example.com Done
  - Actions: Record a request

### Rules and behaviour

1. Accounts belong to this store only. The same email in another vendor’s store is a separate account, and neither vendor sees the other.
2. Under India’s DPDP Act a shopper can ask for their data or for deletion. Staff handle it here; orders keep what tax law requires.
3. Guest checkouts appear in Orders only. Trade accounts (dealers, retailers, wholesalers, interior designers) arrive in Phase 2.
4. Affiliate is a role on a normal shopper account, so an affiliate also shops here. “Offers” shows which channels the shopper agreed to receive offers on; staff can’t switch it on for them.

<a id="cms-enquiries"></a>

## Enquiries inbox

Every question, quote request and dealership enquiry from the store in one inbox, with the product it was about.

- **Route:** `/admin/collections/enquiries`
- **Who:** Owner, manager, order manager, support
- **Collections:** `enquiries`, `products`
- **Read first:** `docs/08-modules-and-feature-flags.md`, `docs/06-data-model.md`
- **Wireframe:** `docs/wireframes/index.html#cms-enquiries`
- **Links to:** [Product editor](#cms-product-edit)

### On the screen (top to bottom, sample data)

- Page title: Enquiries
- Part shown only as: flag: enquiries
  - Tabs: New 5 · In progress 3 · Closed 212
  - Select (sample: “Type: all”)
  - Quote request 2 h
  - Product question 5 h
  - Dealership Yesterday
  - Contact Yesterday
  - **Quote request · Mehta Builders**
    - Notice: “Sola thermostatic diverter AV-TD-4410 · Request a quote product Qty 40”
    - Text: “Need 40 units for a residential project in Surat, delivery by November. Please share your best price with GST.”
    - BOQ-tower-B.pdf · 240 KB
    - Select: Assigned to (sample: “Arjun Mehta”)
    - Select: Status (sample: “New”)
    - Actions: Reply by email · Reply on WhatsApp
    - Part shown only as: P2
      - Actions: Create formal quote
    - Text area: Internal note (sample: “Only your team sees this”)

### Rules and behaviour

1. All store forms land here: product questions, quote requests, dealership enquiries and the contact form. Needs the enquiries feature.
2. Reply on WhatsApp opens a chat with the shopper’s number on the staff member’s phone or WhatsApp Web; no paid API is needed in the MVP.
3. Turning a request into a formal quote with prices and validity comes with the Phase 2 dealer portal.

<a id="cms-schemes"></a>

## Schemes and offers

Every festival scheme and launch offer the store runs, past, live and planned, and what each one brought in.

- **Route:** `/admin/collections/schemes`
- **Who:** Owner, manager; other roles read-only
- **Collections:** `schemes`, `daily-stats`
- **Read first:** `docs/11-orders-payments-gst.md`, `docs/06-data-model.md`, `docs/14-security-and-compliance.md`
- **Wireframe:** `docs/wireframes/index.html#cms-schemes`
- **Links to:** [Scheme editor](#cms-scheme-edit)

### On the screen (top to bottom, sample data)

- Page title: Schemes and offers (1 live · 3 scheduled)
- Actions: New scheme
- **Start from an occasion**
  - Part shown only as: P2
    - (locked) Dealer anniversary
- **Timeline, October 2026 to March 2027**
  - Oct Nov Dec Jan Feb Mar
- Tabs: All 8 · Live 1 · Scheduled 3 · Draft 1 · Ended 3
- Table: Scheme, Offer, Covers, Dates, Status, Orders, Discount given
  - row: Rainline shower launch Special launch | Launch price ₹2,290 (was ₹2,690) | Rainline, 2 finishes | 15 Sep to 31 Oct | Live | 41 | ₹16,400
  - row: Diwali 2026 Diwali | 10% off, up to ₹1,500, orders above ₹3,000 | Faucets, Showers | 1 Nov to 9 Nov | Scheduled | — | —
  - row: Wedding Season 2026 Wedding Season | Spend ₹25,000 get ₹2,000 off; ₹50,000 get ₹5,000 off | Whole store | 20 Nov to 15 Feb | Scheduled | — | —
  - row: New Year 2027 New Year | Free delivery | Whole store | 28 Dec to 2 Jan | Scheduled | — | —
  - row: Holi 2027 Holi | Buy 2 hand showers, get 1 free | Hand showers | 15 Mar to 22 Mar | Draft | — | —
  - row: Holi 2026 Holi | 8% off accessories | Accessories | 1 Mar to 4 Mar 2026 | Ended | 96 | ₹38,900
- Part shown only as: Phase 2, flag: trade-schemes
  - Notice: “Trade schemes (target and slab schemes for dealers, retailers, wholesalers and interior designers) and automatic dealer anniversary offers.”

### Rules and behaviour

1. Start from an occasion template (Diwali, Holi, New Year, Wedding Season, Special launch) or a blank scheme. The template fills the name, badge and offer type; the vendor always types the dates, because festival dates move every year.
2. A scheme starts and ends by itself at the minute set. The timeline shows overlaps: when two schemes cover the same product the shopper gets the better price, and schemes never add up.
3. Results come from the nightly rollup: orders, sales and discount given while the scheme was live.
4. In Phase 1 schemes are for retail shoppers. Trade schemes for dealers, retailers, wholesalers and interior designers, and dealer anniversary offers, come in Phase 2 with trade accounts.

<a id="cms-scheme-edit"></a>

## Scheme editor

Set up one scheme: when it runs, who gets it, the offer, what it covers, how the store shows it and who hears about it.

- **Route:** `/admin/collections/schemes/:id`
- **Who:** Owner, manager
- **Collections:** `schemes`, `banners`, `pages`, `offer-campaigns`, `categories`, `merch-collections`
- **Read first:** `docs/11-orders-payments-gst.md`, `docs/06-data-model.md`, `docs/14-security-and-compliance.md`, `docs/18-notifications.md`
- **Wireframe:** `docs/wireframes/index.html#cms-scheme-edit`
- **Links to:** [Offers page](storefront.md#st-offers), [Offer messages](#cms-campaigns)

### On the screen (top to bottom, sample data)

- Page title: Diwali 2026 Scheduled (Starts in 29 days · created from the Diwali template by Priya Shah today)
- Actions: Preview on store · Save draft · Schedule
- **When**
  - Field: Name * (sample: “Diwali 2026”)
  - Select: Occasion (sample: “Diwali”)
  - Field: Starts * (sample: “Sun, 1 Nov 2026, 00:00”)
  - Field: Ends * (sample: “Mon, 9 Nov 2026, 23:59”)
  - Field: Landing page address (sample: “/offers/diwali-2026”) — Times are India time (Asia/Kolkata)
- **Who gets it**
  - Choice: All shoppers (selected in sample)
  - Part shown only as: Trade audiences, P2
    - Dealers Retailers Wholesalers Interior designers
- **Offer**
  - Percent off Flat off each item Spend tiers Buy X get Y Free delivery Special price
  - Field: Discount (sample: “10 %”)
  - Field: Most off per order (sample: “₹1,500”)
  - Field: Minimum order (sample: “₹3,000”) — After other discounts
- **Covers**
  - Whole store Categories Collections Chosen products
  - Faucets · 104 products Showers · 65 products + Add
  - Leave out: Aria sensor basin mixer + Add
- **Rules**
  - Switch: [off] Works with coupons — off in sample
  - Switch: [off] Only for orders paid online — off in sample
  - Select: Orders per shopper (sample: “No limit”)
- **On the store**
  - Field: Badge (sample: “Diwali offer”)
  - Field: Announcement bar (sample: “Diwali offer: 10% off faucets and showers till 9 Nov”)
  - Field: Banner
  - Select: Landing page (sample: “Diwali offers · scheduled”) — Or let the store list the products
  - [on] Show on the Offers page before it starts [on] Show a countdown to the end (9 Nov, 23:59)
- Part shown only as: flag: offer-messages
  - **Tell shoppers**
    - Row: Email shoppers who opted in, when it starts 2,140 shoppers [on]
    - Row: [flag: whatsapp-offers] WhatsApp shoppers who opted in 860 · about ₹876 on your Meta bill [on]
    - Actions: Edit the message
- **Status**
  - Scheduled goes live Sun, 1 Nov, 00:00
  - Actions: Pause · End now
- **Preview**
  - Product card: Product photo Diwali offer AV-BM-1120 Aria single-lever basin mixer ₹3,825 ₹5,600 32% off Diwali offer · until 9 Nov
  - Section: Sample cart
  - Row: Aria basin mixer · Chrome ₹4,250.00
  - Row: Rainline overhead shower · Chrome ₹2,690.00
  - Row: Diwali offer, 10% −₹694.00
  - Row: Total ₹6,246.00
- **Results**
  - Notice: “Orders, sales and discount given appear once it starts.”
- **History**
  - Row: Today 09:48 Priya created it from the Diwali template
  - Row: Today 09:55 Priya set 10% off, up to ₹1,500

### Rules and behaviour

1. Start and end are to the minute in the store’s time zone. The scheme goes live and ends by itself, and store prices refresh at that minute. Checkout re-checks, so a scheme that just ended no longer applies.
2. Phase 1 schemes are for all retail shoppers. Phase 2 adds trade audiences (dealers, retailers, wholesalers, interior designers).
3. Offer types: percent off, flat off each item, spend tiers on the order, buy X get Y, free delivery and a special (launch) price per variant. One scheme per item; the better price for the shopper wins.
4. Covers the whole store, categories, collections or chosen products. Enquire-only products are never discounted.
5. “Works with coupons” off means a shopper picks either this scheme or a coupon; the cart explains which gives more. Prepaid-only and per-shopper limits are optional.
6. Badge, announcement and countdown are text and settings, styled by each vendor’s storefront. The countdown can only point at this scheme’s real end, and the MRP shown is the product’s real MRP (dark patterns rules, docs/14).
7. “Tell shoppers” schedules an offer message to shoppers who opted in, on the channels they chose. WhatsApp offers are marketing messages billed to the vendor’s Meta account.
8. The preview runs the same server engine as checkout, on sample products and a sample cart. GST is worked out on the discounted price.
9. Every change to a scheme is written to the audit log. Changing the offer of a live scheme asks for confirmation; past dates can’t be edited.

<a id="cms-coupons"></a>

## Coupons

Codes shoppers type at the cart: what each gives, its limits and how often it has been used.

- **Route:** `/admin/collections/coupons`
- **Who:** Owner, manager; other roles read-only
- **Collections:** `coupons`, `coupon-redemptions`, `affiliates`, `schemes`
- **Read first:** `docs/11-orders-payments-gst.md`, `docs/06-data-model.md`
- **Wireframe:** `docs/wireframes/index.html#cms-coupons`

### On the screen (top to bottom, sample data)

- Page title: Coupons (5 active · 1 expired)
- Actions: Make bulk codes · New coupon
- Tabs: All 6 · Active 5 · Expired 1
- Table: Code, Gives, Conditions, Used, Valid, Shown, Status
  - row: AQUA500 | ₹500 off | Orders above ₹20,000 · once per shopper | 12 / 500 | 1 Oct to 31 Dec | Public | Active
  - row: PREPAID5 | 5% off, up to ₹750 | Pay online only | 64 | No end | Public | Active
  - row: WELCOME10 | 10% off, up to ₹1,000 | First order only | 208 | No end | Private | Active
  - row: RIYA10 Affiliate: Riya Sharma | 10% off, up to ₹1,000 | Credits the affiliate | 7 | No end | Private | Active
  - row: WED-•••• 500 single-use codes | ₹1,000 off | Orders above ₹15,000 | 37 / 500 | 20 Nov to 15 Feb | Private | Active
  - row: FREESHIP | Free delivery | Orders above ₹499 | 1,000 / 1,000 | Ended 30 Sep | Public | Expired
- **Make bulk codes**
  - Field: Prefix (sample: “WED”)
  - Field: How many (sample: “500”)
  - Select: Based on (sample: “Wedding leaflet coupon”)
  - Actions: Make codes
- **AQUA500**
  - Field: Code * (sample: “AQUA500”)
  - Field: Note for staff (sample: “October to December, big orders”)
  - Field: Gives
  - Field: Amount (sample: “₹500”)
  - Field: Minimum order (sample: “₹20,000”)
  - Select: Covers (sample: “Whole store”)
  - Select: Payment (sample: “Any method”)
  - Field: Starts (sample: “1 Oct 2026”)
  - Field: Ends (sample: “31 Dec 2026, 23:59”)
  - Field: Total uses (sample: “500”)
  - Field: Per shopper (sample: “1”) — Checked by phone and email
  - [off] First order only [on] Show at the cart and on the Offers page
  - Select: Linked affiliate (sample: “None”)
  - Select: Linked scheme (sample: “None”)
  - Actions: Save · Pause

### Rules and behaviour

1. One coupon per order. Codes are unique in this store and match whatever the case the shopper types.
2. Per-shopper limits are checked by phone and email at checkout, so a guest can’t reuse a once-only code by not signing in. Uses count when an order is placed and come back if it is cancelled before payment.
3. Public codes are listed at the cart and on the Offers page; private codes are only typed. A scheme set to not work with coupons blocks them while it is live.
4. Bulk codes: hundreds of single-use codes from one coupon, for a printed leaflet or a partner. The list arrives as a CSV by email.
5. A coupon linked to an affiliate also credits that affiliate with the order. Every change is written to the audit log.

<a id="cms-campaigns"></a>

## Offer messages

Offer emails and WhatsApp messages to shoppers who asked for them: who gets each one, when, and what it brought in.

- **Route:** `/admin/collections/offer-campaigns`
- **Who:** Owner, manager, content editor
- **Collections:** `offer-campaigns`, `contact-preferences`, `notification-templates`, `notification-logs`
- **Read first:** `docs/18-notifications.md`, `docs/14-security-and-compliance.md`
- **Wireframe:** `docs/wireframes/index.html#cms-campaigns`

### On the screen (top to bottom, sample data)

- Page title: Offer messages (Sent only to shoppers who asked for offers)
- Actions: New message
- Table: Message, Channels, Send, Status, Sent, Orders, Sales
  - row: Rainline launch is here Scheme: Rainline launch · all opted in | Email, WhatsApp | 15 Sep, 11:00 | Sent | 2,912 | 31 | ₹71,000
  - row: Diwali offer starts today Scheme: Diwali 2026 · all opted in | Email, WhatsApp | 1 Nov, 10:30 | Scheduled | — | — | —
  - row: Last 2 days of Diwali Wishlisted products in the Diwali offer | Email | 8 Nov, 11:00 | Draft | — | — | —
- **Diwali offer starts today**
  - Select: Scheme (sample: “Diwali 2026”)
  - Field: Send at (sample: “Sun, 1 Nov, 10:30”) — Inside your window, 10:00 to 20:00
  - Field: Who
  - Field: Channels
  - Notice: “2,140 by email and 860 on WhatsApp after unsubscribes, bounces and the 2-a-week cap. WhatsApp: about ₹876 on your Meta bill.”
  - Actions: Send test to me · Schedule
- **Preview**
  - Business account
  - Image: Diwali banner
  - Message: “Hi Rahul, our Diwali offer is on: 10% off all faucets and showers, up to ₹1,500, on orders above ₹3,000. Ends Mon, 9 Nov. 10:30”
  - Message button: Shop the offer
  - Message button: Stop offers
- **Settings**
  - Field: Send window (sample: “10:00 to 20:00”)
  - Field: Offer messages per shopper (sample: “2 a week”) — Platform limit: 3
  - WhatsApp offers On, set by your platform team
  - Row: Opted in by email 2,236
  - Row: Opted in on WhatsApp 904
  - Row: Unsubscribed this month 96
  - Row: Spam complaints, 30 days 0.02%

### Rules and behaviour

1. Only shoppers who ticked the offers box for that channel are counted and sent to. Staff can’t add or import people without that consent.
2. Before scheduling, the screen shows how many will get it after unsubscribes, bounces and the weekly cap. Sending runs in batches inside the send window.
3. WhatsApp offers use the vendor’s own approved marketing templates, with a “Stop offers” button, and are billed by Meta to the vendor (about ₹1.02 each including GST). The platform team switches WhatsApp offers on or off for each vendor from super admin; without it the WhatsApp channel doesn’t appear here. Email offers go from the vendor’s domain with a one-click unsubscribe.
4. Results: delivered, read or opened, clicked, unsubscribed, and orders and sales within 7 days of the message.
5. The send window and weekly cap are vendor settings within platform limits. Complaints and bounces stop emails to that address automatically.

<a id="cms-abandoned"></a>

## Abandoned carts

Carts left without an order, the reminders sent to shoppers who agreed to offers, and the sales they brought back.

- **Route:** `/admin/collections/carts?status=abandoned`
- **Who:** Owner, manager
- **Collections:** `carts`, `notification-logs`, `coupons`, `contact-preferences`
- **Read first:** `docs/18-notifications.md`, `docs/06-data-model.md`
- **Wireframe:** `docs/wireframes/index.html#cms-abandoned`

### On the screen (top to bottom, sample data)

- Page title: Abandoned carts (Last 7 days)
- Figure: Abandoned = 96 (with items and a contact)
- Figure: Reminded = 71 (agreed to offers)
- Figure: Recovered = 14 (19.7% of reminded)
- Figure: Recovered sales = ₹31,280 (incl. GST)
- **Carts**
  - Table: Shopper, Items, Value, Left at, Reminders, Result
    - row: r•••@example.com | Aria basin mixer, Nimbus WC | ₹23,640 | Today 08:12 | 1st sent 09:12 · email, WhatsApp | Waiting
    - row: +91 97xxx xx508 | Rainline shower × 2 | ₹4,580 | Yesterday 21:40 | 1st sent today 10:00 | Recovered AQV-10480
    - row: s•••@example.com | Edge countertop basin | ₹7,990 | 1 Oct 16:05 | 1st and 2nd sent | No order
    - row: Guest, no consent | Quadra towel rail | ₹1,890 | Today 07:30 | Not reminded: no offer consent | —
- **Reminders**
  - Row: First reminder after 60 minutes
  - Row: Email · WhatsApp (if switched on by the platform) [on] [on]
  - Row: Second reminder after 24 hours
  - Row: Email · WhatsApp (if switched on by the platform) [on] [off]
  - Select: Code in the second reminder (sample: “COMEBACK5 · 5% off up to ₹500, single use”)
  - Only shoppers who agreed to offers on that channel. Restore links last 7 days.

### Rules and behaviour

1. A cart counts as abandoned when it has items and a contact (signed in, or the checkout contact step) and nothing happened for the first-reminder delay. Reminders go only to shoppers who ticked the offers box for that channel.
2. At most two reminders per cart and one series per shopper a week. The second can carry a single-use code. Ordering, emptying the cart or unsubscribing stops them.
3. The button in the reminder restores the exact cart on any device for 7 days. Prices are recalculated, so an offer that ended isn’t honoured.
4. Recovered means an order within 7 days of a reminder. Contacts are masked here.
5. Reminders follow the offer send window, so a cart left at night is reminded after 10:00.

<a id="cms-affiliates"></a>

## Affiliates

People who promote the store for a commission: applications, rates, what they referred, what is owed and what has been paid.

- **Route:** `/admin/collections/affiliates`
- **Who:** Owner, manager; order manager read-only; payouts owner only
- **Collections:** `affiliates`, `referrals`, `affiliate-payouts`, `affiliate-clicks`, `coupons`
- **Read first:** `docs/11-orders-payments-gst.md`, `docs/05-auth-and-roles.md`, `docs/14-security-and-compliance.md`
- **Wireframe:** `docs/wireframes/index.html#cms-affiliates`

### On the screen (top to bottom, sample data)

- Page title: Affiliates (38 approved · ₹6,420 pending · ₹3,150 approved to pay)
- Actions: Program settings
- Tabs: Approved 38 · Applications 2 · Paused 1
- Table: Affiliate, Code, Rate, Clicks, 30 d, Orders, 30 d, Pending, Approved, Paid to date
  - row: Riya Sharma Instagram · home styling | RIYA · RIYA10 | 5%, showers 8% | 1,240 | 18 | ₹2,140 | ₹1,180 | ₹7,250
  - row: Homes by Kavitha YouTube | KAVITHA | 6% | 2,860 | 9 | ₹1,760 | ₹640 | ₹11,900
  - row: Arvind Electricals WhatsApp groups · fitter | ARVIND | 5% | 310 | 6 | ₹980 | ₹420 | ₹2,600
- **Applications**
  - Row: Neel Desai Website · bathroom renovation blog · applied 2 Oct Approve Reject
  - Row: Sana Interiors Instagram · interior designer · applied 1 Oct Approve Reject
- **Riya Sharma**
  - Row: Status Approved
  - Row: Since 12 Aug 2026
  - Row: Rate 5%, Showers 8%
  - Row: Coupon RIYA10 · 10% off up to ₹1,000
  - Row: Payout to UPI ri••••@okaxis
  - Row: PAN ABCPS••••K
  - Row: This financial year ₹10,570 (TDS from ₹20,000)
  - Actions: Change rate · Pause
- **Record payout**
  - Row: Statement PAY/26-27/0015 · draft
  - Row: Approved so far in October ₹1,180.00
  - Row: TDS ₹0.00
  - Row: To pay ₹1,180.00
  - Field: Paid on (sample: “Date”)
  - Select: Method (sample: “UPI”)
  - Field: UTR or reference (sample: “For example 4021••••7731”)
  - Actions: Mark paid and email statement
- **Program**
  - Row: Default rate 5%
  - Row: Referral cookie 30 days, last click
  - Row: Approved after return window (7 days)
  - Row: Minimum payout ₹500
  - Row: Terms page /pages/affiliate-terms

### Rules and behaviour

1. Shoppers apply from the store’s affiliate page with their account. Approving gives them a code and link (/r/CODE); a personal coupon is optional.
2. Commission is a share of the order value before GST, delivery and COD fee, after discounts, at the affiliate’s rate or a category rate. It stays pending until the return window closes, then is approved by itself; cancellations, returns and refunds reduce or reverse it.
3. The vendor pays affiliates itself (UPI or bank) and records the payment here; the platform never holds the money. Statements show gross, TDS and net. TDS of 2% applies once an affiliate’s commission passes ₹20,000 in a financial year (20% without PAN); have your CA confirm.
4. Bank details and PAN are encrypted and masked. Only the owner sees them in full, and only while recording a payout. Every payout is written to the audit log.
5. An affiliate’s own orders never earn commission. Unusual patterns (many orders to one address) show in the affiliate report.

<a id="cms-reviews"></a>

## Reviews

Approve, reject or answer shoppers’ product reviews, and set when buyers are asked for one.

- **Route:** `/admin/collections/reviews`
- **Who:** Owner, manager, content editor, support
- **Collections:** `reviews`, `products`, `orders`
- **Read first:** `docs/06-data-model.md`, `docs/14-security-and-compliance.md`, `docs/18-notifications.md`
- **Wireframe:** `docs/wireframes/index.html#cms-reviews`
- **Links to:** [Enquiries inbox](#cms-enquiries)

### On the screen (top to bottom, sample data)

- Page title: Reviews (4.6 average from 412 published reviews)
- Tabs: To approve 6 · Published 412 · Rejected 9
- Select (sample: “Rating: all”)
- Select (sample: “Product: all”)
- Checkbox: With photos
- 5.0 Looks premium, no water spots Verified purchase
- Text: Fitted it on a counter-top basin. The matt black hides hard-water marks better than our old chrome tap.
- Actions: Approve · Reject · Reply
- 2.0 Seat hinge broke in a month Verified purchase
- Text: The WC is fine but the soft-close hinge snapped after four weeks.
- Notice: “Low ratings are published like any other. Reply to help the shopper.”
- Text area: Public reply (sample: “Sorry about this, Farooq. The seat has a 1-year warranty; we have sent a replacement hinge free. Our team will call you today.”)
- Actions: Approve with reply · Reject
- 1.0 Call me Verified purchase
- Text: Not working, call me on 98•••••321 urgently.
- Select (sample: “Reason: personal details”)
- Actions: Reject · Open an enquiry
- **Settings**
  - Switch: [on] Hold new reviews for approval — on in sample
  - Switch: [on] Show reviews on product pages — on in sample
  - Switch: [on] Allow photos (up to 4) — on in sample
  - Field: Ask for a review (sample: “5 days after delivery”)
  - Row: Email [on]
  - Row: WhatsApp (needs WhatsApp offers from the platform, and offers consent) [off]
- **This month**
  - Row: Requests sent 486
  - Row: Reviews received 73 (15%)
  - Row: Approved / rejected 66 / 1
  - Row: Average rating 4.5
  - Rejected reviews keep their reason · staff never edit a review

### Rules and behaviour

1. Every review is from a buyer of a delivered item (verified purchase), one per item.
2. Approve honest reviews whatever the rating. Reject only for abuse, personal details, spam, duplicates or text not about the product, and pick the reason; a low rating is never a reason.
3. Staff can reply publicly but never edit a shopper’s words. The reply shows under the review and the shopper gets an email.
4. The review request goes once per order, a set number of days after delivery, by email (and WhatsApp when switched on). It never offers anything in return for a review.
5. Ratings on the store update as soon as a review is approved.

<a id="cms-pages"></a>

## Pages

The store’s content pages, from the home page to policies, with drafts and scheduled publishing.

- **Route:** `/admin/collections/pages`
- **Who:** Owner, manager, content editor
- **Collections:** `pages`
- **Read first:** `docs/10-storefront-and-vendor-ui.md`
- **Wireframe:** `docs/wireframes/index.html#cms-pages`
- **Links to:** [Page builder](#cms-page-edit), [Scheme editor](#cms-scheme-edit)

### On the screen (top to bottom, sample data)

- Page title: Pages (12 pages)
- Actions: New page
- Table: Title, Address, Template, Status, Updated
  - row: Home | / | Landing | Published | Today 08:30 · Kavya
  - row: Diwali offers Landing page of the Diwali 2026 scheme | /offers/diwali-2026 | Landing | Scheduled 1 Nov, 00:00 | Today 09:50 · Kavya
  - row: About us | /pages/about | Default | Published | 20 Aug · Kavya
  - row: Bathroom collections | /pages/collections | Landing | Scheduled 5 Oct, 10:00 | Yesterday · Kavya
  - row: Warranty policy | /pages/warranty | Policy | Draft | 28 Sep · Priya
  - row: Shipping policy | /pages/shipping | Policy | Published | 18 Aug · Priya
  - row: Returns and refunds | /pages/returns | Policy | Published | 18 Aug · Priya
  - row: Privacy policy | /pages/privacy | Policy | Published | 18 Aug · Priya
  - row: Terms of use | /pages/terms | Policy | Published | 18 Aug · Priya
- Text: Versions are kept for every save

### Rules and behaviour

1. Pages can be scheduled. A festive landing page can go live at 10:00 on the day without anyone online.
2. Policy pages are linked from the footer and from checkout. A store should not launch with a policy still in draft.
3. Every save keeps a version that can be previewed and restored.

<a id="cms-page-edit"></a>

## Page builder

Build a page from ready-made blocks, fill in their content and preview it on phone and desktop before publishing.

- **Route:** `/admin/collections/pages/:id`
- **Who:** Owner, manager, content editor
- **Collections:** `pages`, `media`, `products`, `categories`
- **Read first:** `docs/10-storefront-and-vendor-ui.md`
- **Wireframe:** `docs/wireframes/index.html#cms-page-edit`
- **Links to:** [Home](storefront.md#st-home)

### On the screen (top to bottom, sample data)

- Page title: Home Published Unpublished changes (Same blocks, each vendor’s own look)
- Actions: Versions · Preview · Save draft · Schedule · Publish
- **Blocks on this page**
  - Hero slider
  - Benefits strip
  - Category tiles
  - Product carousel: Bestsellers
  - Banner: Matt black range
  - Brand story and numbers
  - Dealer finder
  - Testimonials
  - FAQ
  - Actions: Add block
- **Block types**
  - Hero Banner Product grid Carousel Category tiles Rich text Image and text Benefits Testimonials FAQ Video Downloads Dealer finder Enquiry form Brand story Offer strip Scheme products Coupon list Reviews Offers sign-up Affiliate invite
  - Part shown only as: P2
    - Lookbook Instagram
- **Hero slider**
  - Tabs: Slide 1 · Slide 2 · Slide 3 · + Add
  - Field: Desktop image *
  - Field: Phone image
  - Field: Heading * (sample: “Bathrooms that last a lifetime”)
  - Field: Subheading (sample: “Solid brass faucets with a 5-year warranty”)
  - Field: Button text (sample: “Shop basin mixers”)
  - Select: Button goes to (sample: “Category · Faucets › Basin mixers”)
  - Switch: [on] Autoplay every 6 seconds — on in sample
  - Actions: Remove block
- **Preview**
  - Phone Desktop
  - AQUAVERDE
  - Image: Hero
  - Image: Benefits
  - Image: Bestsellers
  - Image: Banner
  - Image: Brand story

### Rules and behaviour

1. Staff choose and order blocks. How each block looks comes from the vendor’s storefront code, so every page stays on-brand without a design tool.
2. Block data has the same shape for every vendor, which is what lets one CMS serve many different storefront designs.
3. Separate phone images keep the first screen fast on mobile.
4. Preview shows the draft in the real storefront code, not an approximation.
5. Blocks of optional features (offer strip, scheme products, coupon list, reviews, offers sign-up, affiliate invite) show only when their feature is on, and the offer strip hides itself on the store when no scheme is live. Phase 2 blocks show only when their module is on.

<a id="cms-navigation"></a>

## Menus

The header menu with its large dropdowns, the footer columns and the phone menu.

- **Route:** `/admin/collections/navigation (one per store)`
- **Who:** Owner, manager, content editor
- **Collections:** `navigation`
- **Read first:** `docs/10-storefront-and-vendor-ui.md`, `docs/06-data-model.md`
- **Wireframe:** `docs/wireframes/index.html#cms-navigation`

### On the screen (top to bottom, sample data)

- Page title: Menus
- Actions: Save menus
- **Header menu**
  - Actions: More · Add menu item
- **Footer**
  - Faucets, Showers, Sanitaryware
  - Track order, Shipping, Returns, Warranty
  - About, Dealers, Downloads
  - Actions: Edit footer
- **Phone menu**
  - [on] Same as header menu Switch off to set a shorter menu for phones.
- **Dropdown: Faucets**
  - Select: Columns (sample: “3”)
  - Field: Featured image

### Rules and behaviour

1. A menu item can point to a category, a page, a product or any web address. Category links update themselves when a slug changes.
2. A top item can open a large dropdown with up to four columns and a featured image.
3. The phone menu reuses the header menu unless the vendor sets a shorter one.

<a id="cms-dealers"></a>

## Dealers

The dealers, distributors and experience centres shown on the store’s dealer locator.

- **Route:** `/admin/collections/dealers`
- **Who:** Owner, manager
- **Collections:** `dealers`
- **Read first:** `docs/08-modules-and-feature-flags.md`
- **Wireframe:** `docs/wireframes/index.html#cms-dealers`
- **Links to:** [CSV import](#cms-import)

### On the screen (top to bottom, sample data)

- Page title: Dealers (214 dealers in 180 cities)
- Actions: Import CSV · Add dealer
- Part shown only as: flag: dealer-locator
  - Field (sample: “Name, city or pincode”)
  - Select (sample: “Type: all”)
  - Table: Dealer, Type, City, Pincode, Shown
    - row: Shree Sanitation +91 20xx xxx 412 | Dealer | Pune | 411045 | [on]
    - row: Aqua Bath Studio +91 79xx xxx 908 | Experience centre | Ahmedabad | 380054 | [on]
    - row: Patel Hardware and Sanitary +91 28xx xxx 101 | Dealer | Rajkot | 360001 | [on]
    - row: Kumar Distributors +91 14xx xxx 233 | Distributor | Jaipur | 302001 | [on]
    - row: Bathline Gallery +91 80xx xxx 650 | Experience centre | Bengaluru | 560038 | [off]
  - Image: Map preview
  - **Shree Sanitation**
    - Field: Address (sample: “Shop 4, Baner Road, Pune 411045”)
    - Field: Latitude (sample: “18.5590”)
    - Field: Longitude (sample: “73.7868”)
    - Filled from the pincode. Drag the pin on the map to correct it.

### Rules and behaviour

1. Only dealers marked “shown” appear on the store’s dealer locator. Needs the dealer-locator feature.
2. Location comes from the pincode, or staff can drop the pin on the map for accuracy.
3. Large dealer lists come in through CSV import, with the same check-first flow as products.

<a id="cms-shipping"></a>

## Shipping zones

Where the store delivers, what delivery costs, whether cash on delivery is allowed and how long it takes, by state or pincode.

- **Route:** `/admin/collections/shipping-zones`
- **Who:** Owner, manager
- **Collections:** `shipping-zones`, `shipping-rates`
- **Read first:** `docs/09-connectors.md`, `docs/11-orders-payments-gst.md`
- **Wireframe:** `docs/wireframes/index.html#cms-shipping`

### On the screen (top to bottom, sample data)

- Page title: Shipping zones (Ships from Morbi, Gujarat 363642)
- Actions: Add zone
- Table: Zone, Covers, Delivery fee, Free above, COD, Delivery time
  - row: Gujarat | 1 state | Flat ₹99 | ₹999 | Allowed | 2 to 3 days
  - row: West and South | 9 states | Flat ₹149 | ₹999 | Allowed | 3 to 5 days
  - row: North and East | 12 states | ₹149 up to 2 kg, then ₹40 per kg | ₹1,999 | Allowed | 4 to 7 days
  - row: Remote areas | 412 pincodes | Flat ₹299 | — | Not allowed | 7 to 10 days
- **Test a pincode**
  - Field (sample: “411045”)
  - Actions: Check
  - Notice: “West and South · Pune, Maharashtra Delivery ₹149, free above ₹999 Cash on delivery allowed 3 to 5 days”
- **Edit zone: West and South**
  - Field: States
  - Fee based on Flat Weight Order value
  - Field: Fee (sample: “₹149”)
  - Field: Free above (sample: “₹999”)
  - Field: Days (sample: “3 to 5”)
  - [on] Allow cash on delivery GST on delivery: same rate as the goods
- Notice: “Shiprocket connected (your own account): pincode check with COD and delivery dates, courier chosen by rate when booking, AWB labels, pickups and tracking. Shoppers still pay the delivery fee from the zones above. Manual shipping stays for your own vans or couriers. Shiprocket settings”

### Rules and behaviour

1. The pincode check on product pages, the delivery fee at checkout and whether COD is offered all come from these zones.
2. Delivery charges take the GST rate of the goods in the order (split by value when an order mixes rates) and the same CGST + SGST or IGST split, worked out on the server.
3. The delivery fee shoppers pay always comes from these zones (the vendor’s own rate card). With Shiprocket connected (Phase 1), Shiprocket answers the pincode check with COD and delivery dates, and its courier rates are used only to pick a courier when booking. Whether to show live rates at checkout instead is still an open question for you.

<a id="cms-payments"></a>

## Payments

Connect the vendor’s own Razorpay account and set the cash on delivery rules. Money goes straight to the vendor.

- **Route:** `/admin/collections/connector-configs`
- **Who:** Owner only
- **Collections:** `connector-configs`, `site-settings`
- **Read first:** `docs/09-connectors.md`, `docs/14-security-and-compliance.md`
- **Wireframe:** `docs/wireframes/index.html#cms-payments`
- **Links to:** [WhatsApp and SMS](#cms-messaging)

### On the screen (top to bottom, sample data)

- Notice: “Razorpay webhooks are failing since 10:42. Paid orders are being checked every 15 minutes until this is fixed. Fix in Payments”
- Page title: Payments (Payments go to your own Razorpay account)
- **Razorpay**
  - Test Live
  - Notice: “Webhooks failing since 10:42: signature mismatch. In Razorpay, open Settings, Webhooks, copy the secret, and paste it below.”
  - Field: Key ID (sample: “rzp_live_••••••a91F”)
  - Field: Key secret
  - Field: Webhook secret
  - Field: Webhook address to paste in Razorpay
  - Tick these events in Razorpay: payment.captured order.paid refund.processed
  - Actions: Test connection
- Part shown only as: flag: cod
  - **Cash on delivery**
    - Switch: [on] Offer cash on delivery — on in sample
    - Field: Min. order (sample: “₹499”)
    - Field: Max. order (sample: “₹25,000”)
    - Field: COD fee (sample: “₹49”)
    - Part shown only as: P2
      - [off] Confirm COD orders on WhatsApp before dispatch
- Part shown only as: Phase 2
  - **Prepaid discount**
    - [off] Give 2% off when paying online Reduces COD returns.
- **Other providers**
  - Row: Shiprocket shipping Connected
  - Row: WhatsApp and SMS order updates → WhatsApp and SMS

### Rules and behaviour

1. Only the owner can see this screen and change keys.
2. Secrets can be replaced but never viewed again once saved. They are encrypted and never sent to the browser.
3. Every webhook is signature-checked and handled once, even if Razorpay sends it twice. A wrong webhook secret is the usual cause of this error.
4. In test mode the store shows a “test payments” notice so nobody is charged by mistake.

<a id="cms-notifications"></a>

## Order updates

What shoppers are told at each step of their order, and on which channel. The owner sets it once; messages then go out by themselves as staff move parcels along.

- **Route:** `/admin/collections/notification-settings (one per store)`
- **Who:** Owner, manager; order manager read-only
- **Collections:** `notification-settings`, `notification-templates`, `notification-logs`
- **Read first:** `docs/18-notifications.md`, `docs/adr/0005-per-vendor-messaging-senders.md`
- **Wireframe:** `docs/wireframes/index.html#cms-notifications`
- **Links to:** [WhatsApp and SMS](#cms-messaging)

### On the screen (top to bottom, sample data)

- Page title: Order updates (Sent from your own WhatsApp number and SMS sender)
- Actions: Send test to my phone · Save
- WhatsApp Quality high
- SMS 1 rejected
- Email Ready
- **Steps and channels**
  - Table: Step, Email, WhatsApp, SMS, Templates
    - row: Order confirmed Prepaid and COD versions | On | On | Fallback | WhatsApp SMS
    - row: Packed Sent 15 minutes later | Off | On | Off | WhatsApp
    - row: Shipped Courier, tracking number, date | On | On | Fallback | WhatsApp SMS
    - row: In transit Off: too many messages | Off | Off | Off | —
    - row: Out for delivery Includes COD amount to keep ready | Off | On | On | WhatsApp SMS
    - row: Delivery failed Why, and what happens next | On | On | Fallback | WhatsApp SMS rejected A variable is longer than 30 characters
    - row: Delivered Invoice and return window | On | On | Off | WhatsApp
    - row: Order cancelled Refund note when prepaid | On | On | Fallback | WhatsApp SMS
    - row: Refund processed Amount and reference | On | On | Fallback | WhatsApp SMS
    - row: Return approved Pickup instructions | On | On | Off | WhatsApp
    - row: Return rejected Reason and help contact | On | On | Off | WhatsApp
- Notice: “About ₹1 per prepaid order with these settings: 5 WhatsApp messages and 1 SMS, billed to your own Meta and MSG91 accounts.”
- **Preview**
  - Select (sample: “Shipped · WhatsApp”)
  - Business account
  - Message: “Hi Rahul, your Aquaverde order AQV-10482 has shipped with Delhivery. Tracking number: 1490 2210 0458 Expected delivery: Wed 7 Oct We’ll message you again when it is out for delivery. 16:05”
  - Message button: Track order
  - Field: Test phone (sample: “+91 98xxx xx001”)
  - Actions: Send test to my phone
- **Timing and limits**
  - Field: “Packed” message delay (sample: “15 minutes”)
  - Field: Quiet hours (sample: “21:00 to 09:00”) — Out for delivery and failed delivery still go out
  - Switch: [on] Tick the WhatsApp box at checkout by default — on in sample
  - Field: Email me when a channel breaks (sample: “priya@aquaverde.example, arjun@aquaverde.example”)
  - Usage bar: SMS today, limit set by platform 312 / 2,000

### Rules and behaviour

1. The steps are fixed in code so templates and reports stay consistent. Vendors choose the channel for each step, not new steps.
2. “Fallback” sends the SMS only when WhatsApp can’t reach the shopper: no WhatsApp opt-in, template not approved, or not a WhatsApp user.
3. Meta approves WhatsApp templates and DLT approves SMS templates, separately for each vendor. A step goes out on a channel only once its template is approved; a rejection shows its reason.
4. Preview fills the template with a sample order. “Send test to my phone” sends the real approved template.
5. The packed message waits 15 minutes and is dropped if the parcel ships first. Quiet hours hold messages until 09:00, except out for delivery and failed delivery. Caps stop loops and SMS abuse.
6. Messages come from the vendor’s own WhatsApp number and SMS sender, billed by Meta and MSG91 to the vendor, about ₹1 per prepaid order with these defaults. Planned for the MVP; still waiting on your MVP or Phase 2 call.

<a id="cms-messaging"></a>

## WhatsApp and SMS

The vendor’s own WhatsApp number and SMS sender that order updates go out from, with their health and limits.

- **Route:** `/admin/collections/connector-configs (messaging)`
- **Who:** Owner only
- **Collections:** `connector-configs`, `notification-templates`
- **Read first:** `docs/09-connectors.md`, `docs/18-notifications.md`, `docs/adr/0005-per-vendor-messaging-senders.md`
- **Wireframe:** `docs/wireframes/index.html#cms-messaging`
- **Links to:** [Order updates](#cms-notifications)

### On the screen (top to bottom, sample data)

- Page title: WhatsApp and SMS (Your own accounts, billed to you by Meta and MSG91)
- Actions: Order update settings
- **WhatsApp Business**
  - +91 90000 00001 · sending number
  - Row: Business verification Verified
  - Row: Quality rating High
  - Row: Messaging limit 2,000 shoppers a day
  - Row: Templates 14 approved
  - Row: Set up By the platform team, 14 Aug
  - Field: Phone number ID (sample: “1093••••••4471”)
  - Field: Business account ID (sample: “2287••••••1190”)
  - Field: Access token
  - Field: App secret
  - Field: Webhook address for Meta
  - Actions: Sync templates · Send test
  - Part shown only as: Phase 2
    - Actions: Connect WhatsApp in one click
- **SMS**
  - MSG91 with DLT Connected
  - Row: Sender ID AQUABT
  - Row: DLT entity ID 1201••••••••3381
  - Row: Templates 8 approved, 1 rejected
  - Row: Whitelisted on DLT Store domain, 1800 000 0000
  - Field: Auth key
  - Field: Delivery report address for MSG91
  - Usage bar: SMS sent today 312 / 2,000
- **Email**
  - Sent by the platform Domain verified
- **Recent problems**
  - Row: 28 Sep DLT rejected the SMS template for “Delivery failed”: a variable is longer than 30 characters.
  - Actions: Fix in Order updates

### Rules and behaviour

1. Shoppers see the vendor’s own WhatsApp name and SMS sender ID, never the platform’s. Each vendor’s accounts, limits and bills are its own, so one vendor’s problem never affects another.
2. In the MVP the platform team sets this up with the vendor (Meta business account, DLT registration) and enters the details here. A one-click “Connect WhatsApp” comes in Phase 2.
3. Tokens, secrets and keys are encrypted and can only be replaced, never viewed.
4. A daily check reads the quality rating and messaging limit. If a channel breaks, updates fall back to SMS or email and the owner gets an email.
5. The platform sets each store’s daily SMS limit to guard against loops and SMS fraud.

<a id="cms-settings"></a>

## Store settings

Store name, logos and colour, contact details, GST invoice details, checkout and returns rules, analytics and maintenance mode.

- **Route:** `/admin/collections/site-settings (one per store)`
- **Who:** Owner, manager
- **Collections:** `site-settings`, `tenants (read-only GST fields)`, `counters`
- **Read first:** `docs/06-data-model.md`, `docs/10-storefront-and-vendor-ui.md`, `docs/11-orders-payments-gst.md`
- **Wireframe:** `docs/wireframes/index.html#cms-settings`

### On the screen (top to bottom, sample data)

- Page title: Store settings
- Actions: Save changes
- Branding Contact Grievance officer and labels GST and invoices Checkout Returns Announcement bar Search and analytics Store status
- Heading: Branding
- Text: Layout and design are set in code by the platform team.
- Field: Store name * (sample: “Aquaverde”)
- Field: Theme colour (sample: “#0F4C5C”)
- Field: Logo
- Field: Logo for dark backgrounds
- Field: Browser icon
- Field: App icon
- Heading: Contact
- Text: Shown in the footer, on invoices and on the contact page.
- Field: Email (sample: “care@aquaverde.example”)
- Field: Phone (sample: “1800 000 0000”)
- Field: WhatsApp number (sample: “+91 90000 00000”) — Used by the WhatsApp button
- Field: Address (sample: “Survey 112, NH 8-A, Morbi, Gujarat 363642”)
- Heading: Grievance officer and labels
- Text: Shown on the contact page and in the footer; the label details prefill every product.
- Field: Grievance officer * (sample: “Priya Shah, Director”)
- Field: Officer email * (sample: “grievance@aquaverde.example”)
- Field: Manufacturer name and address (sample: “Aquaverde Ceramics Pvt Ltd, Survey 112, NH 8-A, Morbi, Gujarat 363642”)
- Field: Consumer care (sample: “1800 000 0000 · care@aquaverde.example”)
- Heading: GST and invoices
- Text: Printed on every invoice and credit note.
- Field: GSTIN (sample: “24AAQCA4821K1Z9 · Gujarat (24)”) — Set by the platform team. Ask them to change it.
- Field: Legal name (sample: “Aquaverde Ceramics Pvt Ltd”)
- Field: Order number prefix (sample: “AQV”) — Set at onboarding
- Field: Invoice prefix (sample: “INV”) — Invoice numbers stay within GST’s 16 characters
- Field: Next invoice number (sample: “INV/26-27/00483”) — Restarts every financial year
- Field: Authorised signatory (sample: “Priya Shah, Director”)
- Field: Signature
- Field: Footer note (sample: “Goods once sold can be returned within 7 days as per our returns policy.”)
- Heading: Checkout
- Field: Minimum order value (sample: “₹299”)
- Heading: Returns
- Field: Return window (sample: “7 days after delivery”)
- Field: Type
- Heading: Search and analytics
- Field: Page title pattern (sample: “%s · Aquaverde”)
- Field: Google Analytics 4 ID (sample: “G-XXXXXXX”)
- Field: Meta Pixel ID (sample: “Optional”)
- Field: Google Tag Manager ID (sample: “Optional”)
- Heading: Store status
- [off] Maintenance mode: show shoppers a “back soon” page

### Rules and behaviour

1. Logos, icon and theme colour are the only look settings a vendor can change. Layout and design live in the vendor’s storefront code.
2. The 512 px icon and theme colour are used when shoppers install the store on their phone.
3. GSTIN and legal name come from the vendor record your team created. The next invoice number is shown, never edited, so numbering stays gapless.
4. Maintenance mode shows shoppers a “back soon” page while staff keep working.
5. India’s e-commerce rules need a grievance officer’s name and contact on the store, with complaints acknowledged in 48 hours and resolved within a month. The manufacturer details prefill each product’s legal details.

<a id="cms-staff"></a>

## Staff and roles

The owner invites colleagues and gives each one only the parts of the CMS they need.

- **Route:** `/admin/collections/users`
- **Who:** Owner only
- **Collections:** `users`
- **Read first:** `docs/05-auth-and-roles.md`
- **Wireframe:** `docs/wireframes/index.html#cms-staff`

### On the screen (top to bottom, sample data)

- Page title: Staff and roles (6 of 10 staff accounts)
- Actions: Invite staff
- Table: Name, Roles, Two-step, Last sign-in
  - row: Priya Shah priya@aquaverde.example | Owner | On | Today 09:05
  - row: Arjun Mehta arjun@aquaverde.example | Manager | On | Yesterday
  - row: Neha Patel neha@aquaverde.example | Catalog editor | Off | Today 09:12
  - row: Imran Sheikh imran@aquaverde.example | Order manager | Off | Today 08:40
  - row: Kavya Rao kavya@aquaverde.example | Content editor | Off | 28 Sep
  - row: Support desk support@aquaverde.example | Support | Off | 30 Sep
- **What each role can do**
  - Table: Owner, Manager, Catalog, Orders, Content, Support
    - row: Products, categories, import | ✓ | ✓ | ✓ | read | — | read
    - row: Pages and menus | ✓ | ✓ | — | — | ✓ | —
    - row: Media library | ✓ | ✓ | ✓ | — | ✓ | —
    - row: Dealers | ✓ | ✓ | — | — | — | —
    - row: Orders, refunds, invoices | ✓ | ✓ | — | ✓ | — | read
    - row: Customers | ✓ | ✓ | — | read | — | read
    - row: Enquiries and service | ✓ | ✓ | — | ✓ | — | ✓
    - row: Store settings, shipping | ✓ | ✓ | — | — | — | —
    - row: Schemes and coupons | ✓ | ✓ | read | read | read | read
    - row: Offer messages | ✓ | ✓ | — | — | ✓ | —
    - row: Abandoned carts | ✓ | ✓ | — | — | — | —
    - row: Reviews: approve, reject, reply | ✓ | ✓ | — | — | ✓ | ✓
    - row: Affiliates and commission rates | ✓ | ✓ | — | read | — | —
    - row: Record affiliate payouts | ✓ | — | — | — | — | —
    - row: Order update settings | ✓ | ✓ | — | read | — | —
    - row: Resend a message to a shopper | ✓ | ✓ | — | ✓ | — | —
    - row: Payment, WhatsApp and SMS keys, staff | ✓ | — | — | — | — | —
    - row: Reports | ✓ | ✓ | — | ✓ | — | —
- **Invite staff**
  - Field: Email (sample: “name@aquaverde.example”)
  - Field: Roles
  - Actions: Send invite

### Rules and behaviour

1. Roles come from the permission matrix in the auth doc. One person can have more than one role.
2. Payment, WhatsApp and SMS keys, staff accounts and affiliate payouts are owner-only, so a manager cannot redirect payments, change the sending number, add accounts or see an affiliate’s bank details.
3. The plan caps how many staff accounts a store can have.

<a id="cms-reports"></a>

## Reports

Sales for a period, best sellers, and the HSN-wise GST summary the vendor’s accountant needs for GSTR-1.

- **Route:** `/admin/reports`
- **Who:** Owner, manager, order manager
- **Collections:** `orders`, `invoices`, `refunds`, `daily-stats`, `schemes`, `coupons`, `referrals`, `carts`
- **Read first:** `docs/11-orders-payments-gst.md`, `docs/17-roadmap.md`
- **Wireframe:** `docs/wireframes/index.html#cms-reports`
- **Links to:** [Schemes and offers](#cms-schemes), [Affiliates](#cms-affiliates), [Abandoned carts](#cms-abandoned)

### On the screen (top to bottom, sample data)

- Page title: Reports (September 2026)
- Actions: Export orders CSV
- Figure: Gross sales = ₹33,74,800 (incl. GST)
- Figure: Orders = 1,312 (+8% vs August)
- Figure: Average order = ₹2,572
- Figure: Refunds = ₹41,200 (12 orders)
- Figure: Paid online = 66% (COD 34%)
- **Daily sales**
  - Bar chart (x: 1 Sep 15 Sep 30 Sep)
- **Best sellers**
  - Table: Product, Units, Sales
    - row: Aria single-lever basin mixer | 186 | ₹8,62,140
    - row: Nimbus wall-hung WC | 31 | ₹5,71,950
    - row: Rainline overhead shower | 124 | ₹3,33,560
    - row: Edge countertop basin | 22 | ₹1,75,780
    - row: Quadra towel rail | 61 | ₹1,15,290
- Part shown only as: Phase 2
  - **Traffic and conversion**
    - Notice: “Visitors, conversion rate and repeat buyers”
- **Offers**
  - Actions: Details
  - Table: Scheme or coupon, Orders, Sales, Discount
    - row: Rainline launch (live since 15 Sep) | 26 | ₹59,540 | ₹10,400
    - row: AQUA500 | 12 | ₹2,96,400 | ₹6,000
    - row: RIYA10 (affiliate) | 7 | ₹48,300 | ₹4,830
- **Affiliates and abandoned carts**
  - Row: Affiliate sales, September ₹1,84,200 · 38 orders → Affiliates
  - Row: Commission approved / pending ₹7,860 / ₹6,420 → Affiliates
  - Row: Carts reminded / recovered 212 / 37 → Abandoned carts
  - Row: Recovered sales ₹2,41,500 → Abandoned carts
- **GST summary by HSN**
  - Actions: Export for GSTR-1 (CSV)
  - Table: HSN, Description, Rate, Taxable value, IGST, CGST, SGST, Total tax
    - row: 8481 | Taps, mixers, valves | 18% | ₹12,40,000.00 | ₹1,65,600.00 | ₹28,800.00 | ₹28,800.00 | ₹2,23,200.00
    - row: 6910 | Ceramic sanitaryware | 18% | ₹16,20,000.00 | ₹2,16,000.00 | ₹37,800.00 | ₹37,800.00 | ₹2,91,600.00
    - row: Total | — | — | ₹28,60,000.00 | ₹3,81,600.00 | ₹66,600.00 | ₹66,600.00 | ₹5,14,800.00
- [Phase 2] Full analytics dashboard

### Rules and behaviour

1. The GST summary groups sales by HSN code and rate with IGST, CGST and SGST split, and exports as CSV for GSTR-1 filing.
2. Gross sales are paid and COD-collected orders including GST, before refunds. Refunds are shown separately.
3. A fuller analytics dashboard (traffic, conversion, cohorts) comes in Phase 2.
4. Offers shows each scheme and coupon with its orders, sales and discount given, so the vendor sees what an offer cost. Affiliates shows sales and commission by affiliate; abandoned carts shows reminders sent and carts recovered. All come from the nightly rollups.

<a id="cms-service"></a>

## Service requests (Phase 2)

Example of an optional module: warranty registrations and service visits for locks and sanitary vendors, shown only when switched on.

- **Route:** `/admin/collections/service-requests`
- **Who:** Owner, manager, order manager, support
- **Collections:** `warranty-registrations`, `service-requests`
- **Read first:** `docs/08-modules-and-feature-flags.md`, `docs/17-roadmap.md`
- **Wireframe:** `docs/wireframes/index.html#cms-service`

### On the screen (top to bottom, sample data)

- Page title: Service requests (Warranty registrations this month: 148)
- Actions: New request
- Part shown only as: Phase 2, flag: warranty, flag: service-requests
  - Figure: Open = 3
  - Figure: Visits booked = 2
  - Figure: First reply = 3 h (average)
  - Figure: Under warranty = 82% (of requests)
  - Open 3
  - Warranty until Aug 2031
  - Actions: Assign
  - SR-0190 Low flow from overhead shower Rainline · AV-OS-3200 Nashik 422005 Warranty until Mar 2030
  - SR-0187 Soft-close seat not working Nimbus · AV-WH-2041 Surat 395007 Out of warranty · quote needed
  - Visit booked 2
  - SR-0185 Install wall-hung WC Nimbus · AV-WH-2041 Pune 411021 Thu 8 Oct, 10 to 12 · Ramesh
  - SR-0183 Diverter stiff to turn Sola · AV-TD-4410 Mumbai 400076 Fri 9 Oct, 2 to 4 · Ramesh
  - In progress 1
  - SR-0180 Replace cartridge Aria · AV-BM-1120 Ahmedabad 380015 Part sent: AV-SP-0035 Shopper updated by email
  - Resolved 4
  - SR-0176 Aerator blocked Aria · AV-BM-1120 Rajkot 360005 Closed 30 Sep

### Rules and behaviour

1. This screen and its menu item exist only when the warranty and service-requests features are on for the vendor. Other Phase 2 modules (trade accounts, loyalty points) follow the same pattern.
2. Shoppers register a product and raise a request from the store. The warranty end date is worked out from the purchase date and the product’s warranty months.
3. Visit updates go to the shopper by email, and by WhatsApp once the messaging connector exists.

<a id="cms-trade"></a>

## Trade accounts (Phase 2)

Phase 2: dealers, retailers, wholesalers and interior designers who buy on trade terms, their applications, price lists, credit and anniversary offers.

- **Route:** `/admin/collections/trade-accounts`
- **Who:** Owner, manager; order manager and support read-only
- **Collections:** `trade-accounts`, `price-lists`, `quotes`, `schemes`, `coupons`
- **Read first:** `docs/17-roadmap.md`, `docs/06-data-model.md`, `docs/05-auth-and-roles.md`, `docs/08-modules-and-feature-flags.md`
- **Wireframe:** `docs/wireframes/index.html#cms-trade`
- **Links to:** [Schemes and offers](#cms-schemes)

### On the screen (top to bottom, sample data)

- Page title: Trade accounts (64 approved · 3 applications)
- Actions: Price lists · Add account
- Part shown only as: Phase 2, flag: b2b
  - Tabs: All 64 · Dealers 41 · Retailers 12 · Wholesalers 5 · Interior designers 6 · Applications 3
  - Table: Account, Type, City, Price list, Credit, Orders, 90 d, Anniversary, Status
    - row: Shree Sanitation 27AAKFS1234L1Z2 | Dealer | Pune | Dealer A | ₹5 L · 30 days | 14 | 12 Nov · 12 years | Approved
    - row: Patel Hardware and Sanitary | Retailer | Rajkot | Retailer | Prepaid | 6 | — | Approved
    - row: Kumar Distributors | Wholesaler | Jaipur | Wholesale tiers | ₹15 L · 45 days | 22 | 3 Jan · 8 years | Approved
    - row: Studio Ananta | Interior designer | Bengaluru | Designer, 12% off | Prepaid | 5 | — | Approved 4% on client orders
    - row: Om Sai Traders applied 2 Oct | Dealer | Nagpur | — | — | — | — | Approve
  - **Dealer anniversary**
    - Row: Shree Sanitation · 12 years on 12 Nov Code SHREE12 · ₹5,000 off orders above ₹50,000 · valid 15 days · sent by email and WhatsApp
    - Switch: [on] Send anniversary offers automatically — on in sample
  - **Trade schemes**
    - Row: Diwali dealer slab: 2% extra above ₹2 L, 3% above ₹5 L Scheduled → Schemes and offers

### Rules and behaviour

1. Four partner types, each switched on per vendor: dealers (dealer price list, credit, quotes, statements), retailers (retailer prices for resale, GST invoice with their GSTIN), wholesalers (bulk tiers, higher minimum quantities, credit) and interior designers (trade price on their own orders plus commission on client orders).
2. Partners apply from the store with their business and GSTIN; staff approve and pick the price list and terms. Trade prices show only to approved, signed-in partners.
3. Dealer anniversary: on each partner’s anniversary with the brand, a personal single-use code is made and sent by email and WhatsApp, valid for the set number of days.
4. Trade schemes are normal schemes aimed at one or more partner types, such as a Diwali slab scheme for dealers.

