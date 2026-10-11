# Home Orbit (vendor 1)

Onboarded 3 October 2026. Store slug `home-orbit`, local preview http://home-orbit.localhost:3000
after `pnpm seed:home-orbit` (README). Status: **draft** until the details below arrive.

## What we received

| Item | Used for |
|---|---|
| Logo (`scripts/vendors/home-orbit/brand/logo.webp`) and icon (`icon.png`, 50 px) | Header, footer (white), favicon. Brand colours sampled from it: orange `#F28432`, charcoal `#333333` |
| Home_Orbit_Content.docx (About us) | About us page and the home page's brand story |
| Home_Orbit_Catalogue_Second_Version.pdf (20 pages) | 110 products in 13 categories, sizes and finishes, product photos cropped from the pages (`scripts/vendors/home-orbit/catalogue.ts`, `photos/`) |

Decided: catalogue with enquiries first (no prices yet), online selling later (mudit, 3 October 2026).

## Storefront look and catalogue structure (11 October 2026)

Asked by mudit on 10 October 2026: a refresh in the manner of the Porto "shop51" theme, a
category structure and menu like ibo.com's, the shop-by-category and "Designed for modern homes"
sections of a Shopify demo, quick add on cards. We took the patterns, not the other sites' text,
images or code.

- **Look** (`src/storefront/vendors/home-orbit`): own header (light utility line, logo with a wide
  model-number search, category bar with All categories and large dropdowns, Offers), a rounded
  charcoal hero slider, sentence-case Plus Jakarta Sans headings, 12 px corners, warm surfaces.
  Every section's content and order stays in the CMS (Pages, Menus, Categories).
- **Categories**: "Soap dishes and dispensers" became **Soap dishes** (same category, new address;
  the old one redirects), and **Soap dispensers**, **Tumbler holders** and **Toilet paper holders**
  are new. Shelves that hold a dish, dispenser or tumbler are filed under one and "also shown in"
  the others. 16 categories in all.
- **Menus**: Door hardware (Aldrops and latches by range, Door handles with finish shortcuts, Door
  accessories), Home decor (Key hangers by material, Curtain hardware), Bathroom (Towel holders,
  Shelves and storage, Soap and toilet), each with a picture; range, finish and material links are
  web addresses to the filtered category, so they don't follow a renamed category on their own.
- **Home page**: hero (3 slides), offer strip, benefits, Shop by category cards, Designed for modern
  homes (promo card with featured products), carousels by range, banner, a scrolling line of ranges,
  brand story, dealers, reviews, offers sign-up, questions, bulk enquiry form.
- **Privacy policy**: written by us from how the platform handles data (docs/14) and published so
  the footer links to it (`scripts/vendors/home-orbit/policies.ts`). **Home Orbit's lawyer must
  review it before launch.**

`pnpm seed:home-orbit` applies all of this to a store seeded before: it moves the bathroom
products, and replaces the menus and home page only while they are still the first seed's (staff
edits are kept).

## Assumptions to confirm with Home Orbit

- **Model numbers we made up** where the catalogue repeats one code or has none: towel rings
  `STR-001-A` to `-H` (the catalogue labels all eight `STR-001`), soap dishes `SD-001-A` to `-C`,
  towel racks `TR-001-A` to `-C`, shelves `HO-BS-01` to `-07`, soap dish shelves `HO-SDS-02` to
  `-07`, the liquid soap dispenser `HO-LSD-01`, the toilet paper holder `HO-TPH-01`.
- **Design names we gave from the photos** (product titles): pull handles (Floral vine, Leaf,
  Paisley, Feather, Triple swirl, Lattice, Scroll, Greek key), glass door handles (Om lattice,
  Ganesha, Shubh Labh kalash, Sun, Peacock feather, Peacock pair, Tree of life, Arc, Honeycomb,
  Lotus, Star flower, Floral), key hangers (Veena, Trishul, Key, Classic, Fish…). HOKH-764 is
  "Devotional" because we couldn't read its text with certainty.
- **Finishes and sizes** come from the catalogue's size boxes: aldrops 101 to 305 in two tone, rose
  gold and brass antique, 8/10/12 inch rods, 16 mm × 3 or 4 mm; aldrops 401 to 405 list no
  finishes (left blank); pull handles 8/10/12 inch in antique, S.S., C.P., black matt and rose
  gold. Glass door handles, door stoppers, key hangers and curtain brackets list no sizes or
  finishes.
- **Made in India** (country of origin `IN`) and **Home Orbit as manufacturer** on every
  product's label details.
- Stats on the home page: "7+ years" (from the About us text), "110+ designs", "15 ranges".
- Plan: Starter (₹9,999 for the first 3 months, then ₹3,499 a month; 110 products of 500).

## Still needed from Home Orbit

| Needed | Why | Blocks |
|---|---|---|
| Legal name, GSTIN, registered address | Onboarding record, label details on every product page, invoices later. The local store uses placeholders (`business.example.json`) | Going live |
| Owner's name and email; staff to invite | CMS logins | Going live |
| Customer care phone, WhatsApp number, email, address | Header, footer, contact page, the WhatsApp buttons (hidden until a number is set) | Going live |
| Grievance officer: name, designation, email, phone | Required on the contact page and footer (Consumer Protection E-Commerce Rules 2020) | Going live |
| Domain (for example homeorbit.in) | The store's address; a subdomain of ours works until then | Going live |
| Policy texts: shipping, returns, terms, warranty; approval of our privacy policy draft | Draft pages exist with placeholders and are hidden until published; the privacy policy is our draft (above) | Going live |
| Product photos on a plain white background, several angles, at least 1200 px | The catalogue crops are 300 dpi page cut-outs with mixed backgrounds; clean photos look far better in the product grid | Quality, not launch |
| Confirmed model numbers and names for the items above | Shoppers and staff search by model number | Quality |
| Finishes and sizes for glass door handles, door stoppers, key hangers, curtain brackets | Filters and the quote form | Quality |
| HSN codes, GST rates, MRP and selling prices, weights and box sizes | Only for selling online (stage B) | Stage B |
| Dealer list (name, address, pincode, phone) | Dealer locator, if they want one | Optional |
| Spec sheets or the catalogue PDF for download | Downloads section | Optional |
