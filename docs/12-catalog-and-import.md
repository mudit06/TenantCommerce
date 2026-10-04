# 12 Catalog, CSV import, search

## Catalog rules

- Category -> attribute set decides which attributes a product has, which are filters, which are
  variant axes (finish, size, colour) and which show in compare.
- `products.attributes` is a JSON object validated against the attribute set in a `beforeValidate`
  hook (unknown codes rejected, select values must be in options, units normalized).
- Model/article number and SKU must be searchable and shown on product pages (hardware and
  sanitary buyers search by them).
- `purchaseMode = enquire` hides price/cart and shows "Request quote"; `both` shows both.
- Drafts + versions on products (Payload versions). Scheduled publish allowed.
- Slugs auto-generated from title, editable, unique per tenant; changing a slug creates a redirect.
- A product can't go `active` without its `legal` details (docs/06): generic name, country of
  origin, net quantity and who made, packed or imported it, which the product page must show.
- Offer prices are not product data. A launch price or festival discount lives in a scheme
  (docs/06 `schemes`), so the product's own price and MRP never change for an offer and go back on
  their own when the scheme ends. Changing the product's real price is a normal edit (and is
  written to `audit-logs`).
- Ratings come from published reviews only (`products.ratingSummary`); staff can't type a rating.
- **As built (3 October 2026):** a variant option (finish, size) is stored on the product as the
  list of values it is offered in (`attributes.finish = ['antique', 'rose-gold']`); an option with
  nothing ticked doesn't apply to that product. "Create variants for every combination" makes the
  missing variants (at most 120) with a title ("8 inch · Antique") and a SKU
  (`HOPH-504-8-INCH-ANTIQUE`). In catalogue mode the product page's finish and size pickers read
  the offered values, so variants are only needed once prices and stock are. Category filters and
  counts are computed in memory from the store's cached product list for that category.
- Merch collections can be the target of a scheme or a coupon ("10% off the matt black range").

## CSV import (MVP)

One row per **variant**; products grouped by `product_handle`. Template downloadable from admin
per category (columns generated from its attribute set).

| Column | Required | Notes |
|---|---|---|
| `product_handle` | yes | Groups rows into one product; becomes slug if `slug` empty |
| `title` | first row | |
| `category_path` | first row | `Bathroom > Faucets > Basin Mixers` (created if missing, optional flag) |
| `brand`, `model_number`, `short_description`, `description_html` | no | |
| `sku` | yes | Unique per tenant; update key |
| `option.<axis>` | if variable | e.g. `option.finish`, `option.size` |
| `price`, `mrp` | yes | Rupees with up to 2 decimals in CSV; converted to paise |
| `gst_rate`, `hsn_code` | yes | Must match one of the tenant's `tax-rates` (0, 0.25, 3, 5, 18, 40 since 22 Sep 2025; a clothing rate carries its ₹2,500 rule); HSN 4/6/8 digits |
| `generic_name`, `country_of_origin`, `net_quantity` | first row | Legal Metrology details shown on the product page; country as ISO code or name |
| `made_by`, `made_by_name`, `made_by_address`, `consumer_care` | no | Default from store settings; importer name and address required for imported goods |
| `stock_qty`, `weight_g`, `length_mm`, `width_mm`, `height_mm` | no | |
| `attr.<code>` | no | Attribute values; multiselect separated by `|` |
| `image_urls` | no | `|` separated; downloaded and stored by the job |
| `document_urls` | no | `type:url|type:url` |
| `status` | no | draft/active |
| `seo_title`, `seo_description` | no | |

Flow: upload -> `import-jobs` doc -> **validate job** (dry run: parse with streaming CSV parser,
validate every row with zod, produce error CSV with row numbers and messages) -> staff reviews
counts -> **commit job** (batches of 100, upsert by `(tenant, sku)`, images fetched with
concurrency 4 and size limits, progress updated) -> summary + error file.

Limits: 10k rows / 20 MB per file. Same mechanism for stock-only and price-only updates.
Export: products, variants, stock, orders, customers to CSV (job, emailed link).

Phase 2: Shopify/WooCommerce product CSV mapping presets; Google Sheets sync.

## Search (MongoDB Atlas Search)

One search index on `products` (and one on `variants` for SKU) with:
- `tenant` (objectId/token) used in a `filter` clause on **every** query
- `title`, `modelNumber`, `searchKeywords`, `shortDescription` with `lucene.standard` + an
  autocomplete field (edgeGram 2-15) on title and modelNumber
- `categories`, `brand`, `status`, `legal.countryOfOrigin`, `attributes.*` facets (stringFacet)
  for filters
- fuzzy matching (`maxEdits: 1`) on title so small typos ("basin mixr") still match; exact
  model number and SKU matches rank first
- synonyms collection per tenant (Phase 2): "wc = toilet = commode", "tap = faucet"

Autocomplete returns top 6 products + top 3 categories in < 150 ms. Fall back to regex search on
`title/modelNumber/sku` in local dev without Atlas.

If search needs outgrow Atlas Search, move to Typesense/Meilisearch fed by `product.changed`
events (one index per tenant or tenant filter). Keep all search calls behind
`src/modules/search/index.ts` so that swap is local.

## Filters

Listing filters come from the category's attribute set (`isFilterable`) + price range + brand +
in-stock + "on offer" (a live scheme covers it) + rating (with `reviews`) + country of origin (shown when the store has imported products: the Legal Metrology
(Packaged Commodities) Amendment Rules 2026 require a searchable and sortable country-of-origin
filter from 1 July 2026 for e-commerce entities selling imported goods). Facet counts from Atlas Search `$searchMeta`. Filter state lives in the URL query.

## Media

**As built (3 October 2026, `src/modules/content/collections/Media.ts`).**

- **Where files live.** Production: S3-compatible object storage (Cloudflare R2 recommended, or
  AWS S3 Mumbai) through `@payloadcms/storage-s3`, switched on by `S3_BUCKET`; shoppers load files
  straight from the bucket's CDN domain (`MEDIA_PUBLIC_URL`), so image traffic never passes
  through our app server or the database. Local development: the `media/` folder (git-ignored).
  **MongoDB holds only each file's metadata** (name, size, dimensions, alt text, store), about
  1 KB per file, never the bytes.
- **One folder per store (4 October 2026).** New files go to `media/<tenantId>/<file>` in the
  bucket (the `prefix` field's default, so browser uploads and server uploads agree). A store's
  files can then be listed, backed up, exported for a DPDP request or removed with an archived
  store without touching another store's; a bucket lifecycle rule or a CDN purge can target one
  store. Files uploaded earlier keep `media/<file>` and keep working.
- **Production guard.** `src/lib/mediaStorage.ts` checks at boot: on Vercel the app refuses to
  start without `S3_BUCKET` (its disk is wiped on every deploy and differs between instances, so
  uploads would vanish); elsewhere in production it warns. It also warns when `MEDIA_PUBLIC_URL`
  is missing, because then every image is streamed through the app server.
- **What is stored per image.** The upload is re-encoded to WebP at most 2000 px on the long side
  (this also strips EXIF, including phone GPS), plus `thumb` 200, `card` 600 and `detail` 1200 px
  WebP versions. The original serves as the zoom image. A 4 MB phone photo becomes roughly
  300 KB (original), 120 KB (detail), 40 KB (card) and 8 KB (thumb); the storefront loads the
  smallest size that fits (`card` on listings, `detail` on the product page).
- **Limits.** 10 MB per image, 50 MB per PDF; JPEG, PNG, WebP, AVIF and PDF only. Every stored
  byte (original plus sizes) counts against the plan's storage (`tenants.usage.storageBytes`); an
  upload past the limit is refused. Alt text is required for images.
- **Uploads on Vercel.** Vercel caps a request at 4.5 MB, so production sets `S3_CLIENT_UPLOADS`
  and the browser sends the file straight to the bucket with a signed URL.
- **Access.** Files are public by URL (shoppers must see product photos); listing the library is
  staff-only, per store. Private files (shoppers' enquiry attachments, invoices) will use a
  separate private collection with signed, expiring links.

**Does storing MBs of images slow the store? (500 visitors an hour)** 500 visitors an hour who
each open about 8 pages is about 4,000 page views an hour, roughly one a second. A listing page
with 24 `card` images at about 40 KB is about 1 MB of images, served by the CDN from the edge
nearest the shopper (Mumbai, Chennai, Delhi for R2 and CloudFront), not by our server. The
database answers a small metadata query per page. At this traffic neither the app server nor
MongoDB notices the images; image traffic is at most about 4 GB an hour (less once browsers and
the CDN cache repeat views), which R2 serves without download fees. What would make a store slow
is serving the multi-MB originals or storing files inside MongoDB; neither is done. Storage
cost: a 2,000-product catalogue with 5 photos each is about 10,000 images, about 5 GB with all
sizes: inside R2's free 10 GB, then about ₹1.30 per GB a month. Put the bucket on a custom
domain behind Cloudflare's cache so repeat views don't count as bucket reads.

**What still costs at higher load (reviewed 4 October 2026).** Serving is fine as above; the
upload side is where load shows first. Each image upload is resized four times with sharp inside
the request (a few hundred ms of CPU per photo), which is fine for staff uploading by hand but not
for a 2,000-photo CSV import: that import should queue the resizing as a job (docs/15 worker).
Storage totals are kept with an atomic `$inc`, so parallel uploads don't lose bytes. Before
launch: give the bucket's files a long `Cache-Control` and purge the CDN when staff replace a
file, and choose the production bucket (docs/open-items).
