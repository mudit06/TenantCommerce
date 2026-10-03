# ADR 0006: Own the product, cart and order collections instead of the Payload ecommerce plugin

- Status: **proposed** (3 October 2026). Needs mudit's approval: it changes the stack line
  "`@payloadcms/plugin-ecommerce` (custom Razorpay payment adapter)" in CLAUDE.md and docs/00.
- Context: Sprint 1 spike 1 (docs/open-items section 2). `@payloadcms/plugin-ecommerce` 3.90.2
  was installed in a throwaway project and its collections, endpoints and hooks read. What it
  does, against what our docs require:

  | Area | Plugin 3.90.2 | Our docs |
  |---|---|---|
  | Price | One number field per currency: `priceInINR`, `priceInINREnabled` | `{ amountMinor, currency }` everywhere (ADR 0004, docs/06) |
  | Variants | Its own `variantTypes` and `variantOptions` collections, shared across products | Variant axes come from the category's attribute set (`isVariantAxis`), one tool for every industry (docs/12) |
  | Stock | One `inventory` number lowered when an order is placed | `stockQty` plus `reservedQty`, reserved at checkout and released on timeout (docs/11) |
  | Cart API | `/api/carts/:id/add-item` and friends, tenant not resolved from the host | `/api/store/cart`, tenant from the host (docs/07); prices, schemes, coupons and GST computed by our promotions and tax services (docs/11) |
  | Orders | Simple order with items and amount | Order numbers per store, GST split (CGST/SGST or IGST), parcel journey, invoices, returns, refunds (docs/11) |
  | Tenancy | Not aware of tenants: every collection needs the multi-tenant plugin bolted on, and its hooks query without a tenant filter | Every query filtered by tenant (hard rule 1) |

- Options: (a) adopt the plugin's shapes and rewrite docs/06, 11 and 12 around them; (b) use the
  plugin and override most of it (fields, endpoints, hooks); (c) own the collections: products,
  variants, carts, orders, transactions, written as ordinary collections in our modules
  (`catalog`, `cart`, `orders`, `payments`), with Razorpay as our own connector (docs/09).
- Decision (proposed): (c).
- Why: (a) loses money in paise, attribute-set variants and reserve-at-checkout, all of which the
  storefront specs depend on, and its cart endpoints would bypass the host-to-tenant rule. (b)
  keeps the plugin as a dependency while replacing nearly everything it brings, and every plugin
  upgrade could break our overrides. The parts it would save us (an add-to-cart endpoint, a
  basic order) are small next to the promotions engine and GST work we write either way.
- Consequences: we write and test the cart and order services ourselves (planned in docs/17
  sprints 3 to 5 anyway). The plugin is removed from docs/02 and CLAUDE.md's stack list. Razorpay
  becomes a connector behind the payment interface (docs/09) rather than a plugin adapter.
  Payload upgrades touch fewer moving parts.
- Until approved: categories, attribute sets, brands and documents are built (they don't depend
  on this choice); products, variants, cart and orders wait.
