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
| Policy texts: shipping, returns, privacy, terms, warranty | Draft pages exist with placeholders and are hidden until published | Going live |
| Product photos on a plain white background, several angles, at least 1200 px | The catalogue crops are 300 dpi page cut-outs with mixed backgrounds; clean photos look far better in the product grid | Quality, not launch |
| Confirmed model numbers and names for the items above | Shoppers and staff search by model number | Quality |
| Finishes and sizes for glass door handles, door stoppers, key hangers, curtain brackets | Filters and the quote form | Quality |
| HSN codes, GST rates, MRP and selling prices, weights and box sizes | Only for selling online (stage B) | Stage B |
| Dealer list (name, address, pincode, phone) | Dealer locator, if they want one | Optional |
| Spec sheets or the catalogue PDF for download | Downloads section | Optional |
