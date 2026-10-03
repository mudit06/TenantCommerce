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

Images uploaded to object storage; served through CDN with on-the-fly resizing (Cloudinary or
`next/image` with a custom loader). Require alt text. Strip EXIF. Max 2000px stored.
