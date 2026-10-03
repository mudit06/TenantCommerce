# 06 Data model (MongoDB via Payload collections)

Conventions used below:

- `T` = tenant-scoped (has `tenant` relationship, added by the multi-tenant plugin).
- `L` = localized field (Payload localization; `en` default, more locales in Phase 2).
- Money = `{ amountMinor: int, currency: 'INR' }` via the shared `moneyField()` in `src/fields/`.
- Every collection has Payload's `id`, `createdAt`, `updatedAt`. Soft-deletable collections have
  `deletedAt` (use Payload trash where supported).
- `status` fields are enums; transitions are enforced in services, not just in the UI.
- Products, variants, carts, orders, transactions and addresses are **our own collections**
  (ADR 0006, approved 3 October 2026), not the ecommerce plugin's. "(extends ecommerce plugin)"
  in older headings below is historical: the fields listed are the whole collection.

## Platform

### tenants
`name`, `slug` (unique, permanent), `status` (`draft|active|suspended|archived`), `legalName`,
`gstin`, `pan`, `registeredAddress` (address group), `stateCode` (GST state code, needed for
CGST/SGST vs IGST), `industry` (`sanitary|locks|hardware|decor|clothing|other`, multi),
`plan` -> plans, `defaultLocale`, `enabledLocales[]`, `currency` (default INR), `timezone`
(Asia/Kolkata), `supportEmail`, `supportPhone`, `whatsappNumber`, `dbRef` (default `shared`),
`notes` (internal), `usage { productsCount, staffCount, storageBytes, ordersThisMonth, updatedAt }`
(kept current by hooks on products, users and media plus the nightly stats job; drives the plan
meters and the 90% warnings; the staff meter counts `users` live), `createdBy` -> users,
`activatedAt` (first time the store went live), `presetAppliedAt` (industry preset last applied,
shown on the Features tab). The GSTIN fills `pan`, `stateCode` and the registered address's state.
`status` moves only through `changeTenantStatus` (lifecycle in docs/04, reason required to suspend
or archive); stores are created only by onboarding (`createTenant`) and never deleted from the admin.

### tenant-domains
`host` (unique, lowercased), `tenant`, `type` (`subdomain|custom`), `isPrimary` (one per store,
enforced by a hook), `verifiedAt`, `sslStatus` (`pending|issuing|active|failed`), `redirectToPrimary` (bool).

### plans
`name`, `code`, `priceMonthly` (money), `priceYearly`, `limits` group (`maxProducts`,
`maxStaffUsers`, `maxStorageGB`, `maxOrdersPerMonth`), `allowedModules[]` (feature keys),
`allowedConnectors[]` (connector keys), `isActive`, `sortOrder`, `introOffer { price (money), months }`
(optional starting offer: a subscription's first payment covers `months` at `price`, then the
plan price applies; Starter has ₹9,999 for 3 months, docs/00). Never deleted (subscriptions point at
them); removing a feature from `allowedModules` switches it off for that plan's stores.

### subscriptions
`tenant` (unique: one subscription per store), `vendorName` (copy of the store name for the list and
search), `plan`, `status` (`trialing|active|past_due|cancelled|paused`), `billingCycle`
(`monthly|yearly`), `currentPeriodStart`, `currentPeriodEnd` (exclusive; a trial's period ends at
`trialEndsAt`), `trialEndsAt`, `billingMode` (`manual|razorpay`), `providerSubscriptionId`,
`payments[] { amountMinor, paidOn, method (neft|rtgs|upi|cheque|card), reference, coversPeriod { start, end }, recordedBy }`
(the super admin "Record payment" form in the MVP; a payment covers the next period from the end of
the current one), `history[] { at, event, amountMinor, reference, by, data }` (trial started, plan
changed, payment recorded, paused...). Every field is read-only in the admin: changes go through
`recordSubscriptionPayment`, `changeSubscriptionPlan` and `changeSubscriptionStatus`. The daily
`tenancy-check-subscriptions` job stores `past_due`; screens compute it live as well.

### pincodes (platform, no tenant)
`pincode` (6 digits, unique), `city` (district), `state`, `stateCode` (2-digit GST state code),
`location` (GeoJSON Point, `2dsphere`, when known). Seeded by `scripts/import-pincodes` from the
government's All India Pincode Directory (data.gov.in, Open Government Data licence), refreshed
quarterly. Used for checkout city/state autofill, the place of supply, matching shipping zones
and placing dealers on the map (staff can still drag the pin). Owned by the `shipping` module.

### platform-invoices (Phase 2)
`tenant`, `subscription`, `number`, `amount`, `gst` breakdown, `status`, `pdf` -> media, `paidAt`.

### feature-flags (T)
`tenant`, `key` (e.g. `b2b`, `affiliate`, `warranty`), `enabled`, `config` (json, validated by the
module's zod schema), `enabledBy`, `enabledAt`. Unique `(tenant, key)`. Enabling checks the plan.

### users (platform + staff auth)
See 05-auth-and-roles.md. `email`, `name`, `phone` (optional), `platformRole`,
`tenants[] { tenant, roles[] }`, `status` (`invited|active|disabled`), `twoFactorSecret` (encrypted;
waits on the two-step login spike), `lastLoginAt`, `invitedBy`, `invitedAt`.

## Store configuration (T)

### site-settings (per-tenant singleton)
`storeName` (L), `logo`, `logoDark`, `favicon`, `pwaIcon` (512px), `themeColor`,
`contact` (email, phone, whatsapp, address), `grievanceOfficer { name, designation, email, phone }`
(shown on the contact page and in the footer, Consumer Protection E-Commerce Rules 2020),
`legalDefaults { manufacturerName, manufacturerAddress, consumerCare }` (prefills each product's
Legal Metrology details), `social` (links), `policies` (relations to pages:
shipping, returns, privacy, terms, warranty), `orderPrefix` (2 to 5 capital letters, set at
onboarding, e.g. `AQV`), `checkout` group (`codEnabled`, `codMinOrder`, `codMaxOrder`, `codFee`,
`prepaidDiscountPercent` (Phase 2), `minOrderValue`). Guest checkout is the `guest-checkout`
feature flag only, and COD is offered only when the `cod` flag is on **and** `codEnabled` is on
(docs/08),
`analytics` (`ga4Id`, `metaPixelId`, `gtmId`), `seoDefaults` (title template, OG image),
`announcementBar` (L), `invoice` group (`prefix`, `footerNote`, `signature` image,
`authorisedSignatory`), `returns` group (`windowDays`, `exchangeOnly`), `maintenanceMode`.

### connector-configs (T)
`tenant`, `kind` (`payment|shipping|messaging|analytics`), `provider` (`razorpay|manual|shiprocket|meta-whatsapp|msg91|resend|dev-log|...`;
COD has no row here: it is the `cod` feature flag plus the site-settings `checkout` rules),
`enabled`, `mode` (`test|live`), `publicConfig` (json, safe for browser e.g. Razorpay key id),
`secretConfig` (encrypted json: key secret, webhook secret, API tokens), `priority`,
`lastHealthCheckAt`, `lastError`. Unique `(tenant, provider)`. WhatsApp `publicConfig.phoneNumberId`
is unique across all tenants (it routes webhooks to a tenant, docs/09).

### tax-rates (T)
`name` (e.g. "GST 18%"), `ratePercent` (0, 0.25, 3, 5, 18, 40 or custom; the 12% and 28% slabs
ended on 22 September 2025), `cessPercent` (usually 0 now), `valueRule` (optional:
`{ maxUnitTaxableMinor, rateAbovePercent }` for goods whose rate depends on the price of one
piece, e.g. clothing: 5% up to ₹2,500 a piece, 18% above, docs/11), `isDefault`. Products
reference one. Seeded per tenant from the industry preset; rates are data, never hard-coded.

### counters (T)
`tenant`, `key` (`order`, `enquiry`, `invoice:2026-27`, `credit-note:2026-27`, `payout:2026-27`), `value`.
Incremented atomically with `$inc` + `findOneAndUpdate` (upsert). As built (`nextNumber` in the
`tax-invoicing` module): enquiry and order numbers are taken outside the save's transaction, so
two at the same moment never clash; a failed save leaves a gap. Invoice numbers must be
consecutive (GST rule 46) and will be taken inside the transaction with a retry.

## Catalog (T)

### categories
`name` (L), `slug`, `parent` (nested-docs), `breadcrumbs`, `description` (L, rich text), `image`,
`banner`, `attributeSet` -> attribute-sets, `sizeChart` -> media or rich text (clothing),
`sortOrder`, `isVisible`, `seo` group. As built: `slug` is unique per store and filled from the
name; `attributeSet` may be left empty to use the parent's; at most 3 levels; a category with
subcategories can't be deleted; `description` is plain text for now.

### attribute-sets
`name`, `attributes[]`: `{ code, label (L), type: 'text'|'number'|'select'|'multiselect'|'boolean'|'color',
options[] { value, label (L), swatchHex, swatchImage }, unit (mm, L, kg), isFilterable,
isVariantAxis, isComparable, isRequired, group ('Dimensions','Technical','Material'...) }`.

Examples: sanitary = finish, material, flush type, outlet type, mounting, dimensions, water
consumption, warranty years. Locks = lock type, door thickness range, finish, key type, number of
keys, smart features, BIS/CE marks. Clothing = size, colour, fabric, fit, sleeve, wash care.

### brands
`name`, `slug`, `logo`. (A manufacturer may sell sub-brands.)

### products (extends ecommerce plugin)
`title` (L), `slug`, `status` (`draft|active|archived`), `type` (`simple|variable`),
`modelNumber` / `articleNumber` (searchable, important for hardware and sanitary),
`brand`, `categories[]`, `primaryCategory`, `shortDescription` (L), `description` (L, rich text),
`highlights[]` (L), `gallery[]` -> media (first is primary), `videos[]` (YouTube URL or media,
type `installation|demo|promo`), `attributes` (json keyed by attribute code, validated against the
category's attribute set), `price` (money, GST-inclusive selling price), `compareAtPrice` (MRP),
`taxRate`, `hsnCode`, `taxInclusive` (default true), `weightGrams`, `dimensions` (L x W x H mm),
`documents[]` -> product-documents, `relatedProducts[]`, `spareParts[]` -> products,
`compatibleWith[]` -> products, `warrantyMonths`, `installationAvailable` (Phase 2),
`purchaseMode` (`buy|enquire|both`: enquire-only items show "Request quote"),
`minOrderQty`, `maxOrderQty`, `isFeatured`, `tags[]`, `seo` group, `searchKeywords`,
`legal` group, required before a product can go `active` (Legal Metrology (Packaged Commodities)
Rules, rule 6(10), and the Consumer Protection E-Commerce Rules 2020): `genericName` (L, e.g.
"Basin mixer"), `countryOfOrigin` (ISO country code, filterable), `netQuantity` (e.g. "1 piece",
"1 set of 3"), `madeBy` (`manufacturer|packer|importer`), `madeByName`, `madeByAddress`,
`consumerCare` (the last three default from site-settings `legalDefaults`; an importer's name and
address are required for imported goods), `stats { unitsSold30d, updatedAt }` (nightly job; drives
`sort=popular` and the Bestseller badge), `ratingSummary { average, count, histogram[5] }` (kept
current by the `reviews` module from published reviews only; drives stars on cards and the
`AggregateRating` markup).

As built (ADR 0006, 3 October 2026): all fields above exist except `spareParts`, `compatibleWith`,
`warrantyMonths`, `installationAvailable`, `minOrderQty`, `maxOrderQty`, `tags`, `stats` and
`ratingSummary` (they come with their modules); `taxRate` is `gstRate` (a select of the current
slabs until `tax-rates` exists); `purchaseMode` defaults to `enquire` until checkout exists; the
plan's product limit is checked on create and `tenants.usage.productsCount` kept current.

### variants (extends ecommerce plugin)
`product`, `sku` (unique per tenant), `options` (`{ finish: 'Chrome', size: 'M' }`, from the
attribute set's variant axes), `price` override, `compareAtPrice` override, `images[]`,
`barcode` (EAN), `stockQty`, `reservedQty`, `lowStockThreshold`, `allowBackorder`, `weightGrams`
override, `status`.

### product-documents
`title` (L), `type` (`spec-sheet|installation-manual|brochure|catalogue|price-list|warranty-card|certificate`),
`file` -> media (PDF), `products[]`, `isPublic` (false = signed-in trade partners only, Phase 2; CAD
files are not offered, mudit 3 October 2026),
`showOnDownloadsPage`.

### merch-collections
Curated lists ("New arrivals", "Matt black range"): `title` (L), `slug`, `rules` (manual list or
filter), `products[]`, `image`.

### stock-movements
`variant`, `delta`, `reason` (`order|cancel|return|adjustment|import`), `refType`, `refId`, `by`.

## Content (T)

### pages
`title` (L), `slug`, `layout` (blocks, see 10-storefront), `status` (draft/published, Payload
versions + drafts + scheduled publish), `seo` group, `template` (`default|landing|policy`).

### navigation (per-tenant singleton)
`header[]` (nested links, mega-menu columns, featured image), `footer` (columns of links),
`mobile[]`.

### banners
`title`, `placement` (`home-hero|category-top|announcement|popup`), `image`, `mobileImage`,
`link`, `startsAt`, `endsAt`, `priority`.

### media
Payload upload collection, tenant-scoped. `alt` (L, required for images), `focalPoint`,
image sizes: thumb 200, card 600, detail 1200 WebP, the original re-encoded to WebP at most
2000 px serves as zoom. Max upload 10 MB images, 50 MB PDFs. Files in S3/R2 behind a CDN in
production (local disk in development); the database stores metadata only (docs/12 "Media").

### redirects, forms, form-submissions
From the official plugins, tenant-scoped.

## Customers (T)

### customers (auth, see 05)
`email`, `phone`, `name`, `roles[]` (`affiliate`; Phase 2 `trade`; every customer can shop, docs/05),
`status`, `emailVerified`, `phoneVerified`, `marketingConsent` (read-only mirror of the offer
consent on the customer's `contact-preferences` rows, for display; the rows are the source of
truth, DPDP Act), `defaultAddress`, `tradeAccount` (Phase 2), `loyalty { balance, expiringNext,
updatedAt }` (Phase 2), `notes` (staff only), `lastOrderAt`, `ordersCount`, `totalSpentMinor`.

### addresses (extends ecommerce plugin)
`customer`, `name`, `phone`, `line1`, `line2`, `landmark`, `city`, `state`, `stateCode`,
`pincode` (6 digits, validated), `country` (IN), `type` (`home|work|site`), `gstin` (optional, for
business invoices), `isDefault`.

### customer-sessions
`customer`, `refreshTokenHash`, `userAgent`, `ip`, `expiresAt`, `revokedAt`.

### privacy-requests
DPDP Act rights requests, handled by staff from the Customers screen: `type`
(`export|correction|deletion`), `customer` (or `contact { email, phone }` for guests), `status`
(`received|in_progress|done|rejected`), `receivedAt`, `dueAt` (default 30 days; confirm the
period with the lawyer review in docs/14), `handledBy`, `notes`, `exportFile` -> media (expiring
link), `completedAt`.

## Commerce (T)

### carts (extends ecommerce plugin)
`customer` (nullable), `anonymousId` (cookie), `items[] { variant, product, qty, unitPriceMinor (snapshot), tradePrice? }`,
`couponCode`, `appliedOffers[]` (last pricing result, docs/11), `referral { affiliate, via (link|coupon), at }`
(set from the referral cookie or an affiliate's coupon), `contact { email, phone }` (from the
signed-in customer, or saved from the checkout contact step), `shippingAddress`, `pincode`,
`currency`, `totals` (computed), `status` (`active|converted|abandoned`), `abandonedAt`,
`reminders[] { step (1|2), channel, sentAt, notificationLog }`, `restoreTokenHash` (the link in a
reminder restores this cart on any device), `recoveredOrder` -> orders, `expiresAt` (TTL index,
30 days), `lastActivityAt`.

### orders (extends ecommerce plugin)
`orderNumber` (`<site-settings.orderPrefix>-<counter>`, e.g. `AQV-10482`; sequential, so it is
never enough on its own to open an order, docs/05), `customer` (nullable), `contact` (email, phone),
`items[] { product, variant, sku, title, options, qty, unitPriceMinor, mrpMinor, discountMinor,
taxableMinor, hsnCode, gstRate, cgstMinor, sgstMinor, igstMinor, lineTotalMinor }` (snapshot,
never re-read from product), `shippingAddress`, `billingAddress`, `buyerGstin`,
`placeOfSupplyStateCode`, `totals { subtotalMinor, discountMinor, shippingMinor, codFeeMinor,
taxMinor, roundOffMinor, grandTotalMinor }`, `paymentMethod` (`razorpay|cod`),
`paymentStatus` (`pending|authorized|paid|partially_refunded|refunded|failed`),
`fulfillmentStatus` (`unfulfilled|packed|partially_shipped|shipped|out_for_delivery|delivery_failed|delivered|rto|lost|returned|cancelled`,
derived from the parcels, docs/11), `status` (`pending|confirmed|processing|completed|cancelled`),
`couponCode`, `appliedOffers[] { kind (scheme|coupon), ref, code, name, discountMinor }` (snapshot;
each line's `discountMinor` is its share), `notes`, `source` (`web|pwa|b2b|admin`), `affiliate` ->
affiliates and `referral` -> referrals (when the order was referred), `recoveredFromCart` (step of
the abandoned cart reminder that brought the shopper back), `invoice` -> invoices,
`shipments[]`, `trackingCode` (random 10 characters for the `/t/<code>` link in messages, unique
per tenant), `locale` (language for messages), `codConfirmation` (Phase 2: `status`
`not_required|pending|confirmed|declined|no_response`, `requestedAt`, `respondedAt`),
`cancelReason`, `placedAt`, `ip`, `userAgent`.

### order-events
`order`, `type` (`created|payment_captured|status_changed|parcel_status_changed|note|refund|message_sent|shopper_reply`),
`from`, `to`, `by` (user/customer/system), `data`. Append-only audit trail of an order.

### transactions (extends ecommerce plugin)
`order`, `provider`, `providerOrderId`, `providerPaymentId`, `amountMinor`, `status`, `method`
(upi/card/netbanking/wallet), `raw` (sanitized webhook payload), `processedEventIds[]`.

### refunds
`order`, `transaction`, `amountMinor`, `reason`, `providerRefundId`, `status`, `creditNote` -> invoices.

### invoices
`order`, `type` (`tax-invoice|credit-note`), `number` (per tenant per financial year, at most 16
characters under GST Rule 46, e.g. `INV/26-27/00123`; validate prefix + format length when the
prefix is saved), `financialYear`, `issuedAt`, `seller` snapshot (legal name, GSTIN, address,
state code), `buyer` snapshot, `placeOfSupply`, `lines[]` (with HSN, taxable value, rates,
amounts), `totals`, `amountInWords`, `pdf` -> media, `irn` + `qrCode` (Later, e-invoicing for
vendors above the turnover threshold).

### shipping-zones / shipping-rates
Zone: `name`, `pincodes[]` / `pincodePrefixes[]` / `states[]`, `isServiceable`, `codAllowed`,
`etaDays { min, max }`. Rate: `zone`, `type` (`flat|weight|order-value`), `brackets[]`,
`freeAboveMinor`.

### shipments
One parcel. `order`, `direction` (`forward|return`), `return` -> returns (return parcels), `items[]`,
`status` (`packed|shipped|in_transit|out_for_delivery|delivery_failed|delivered|rto_initiated|rto_delivered|cancelled|lost`,
docs/11), `package { lengthMm, breadthMm, heightMm, weightGrams }`, `carrier` (courier name),
`courierId`, `trackingNumber`, `trackingUrl`, `expectedDeliveryDate`, `codAmountMinor`,
`ewayBillNo` (parcels over ₹50,000), `attempts`, `failureReason`
(`customer_unavailable|address_issue|refused|cod_not_ready|other`),
`ndrAction { action (re-attempt|return), deferredDate, note, by, at }`, `provider` (`manual|shiprocket`),
`providerOrderId`, `providerShipmentId`, `awb`, `label` -> media, `pickupScheduledFor`,
`events[] { status, at, source (staff|shiprocket|import), by, note, location }`, `packedAt`,
`shippedAt`, `outForDeliveryAt`, `deliveredAt`.

### returns
`order`, `items[]`, `type` (`return|exchange`), `reason`, `photos[]`, `status`
(`requested|approved|picked|received|refunded|rejected`), `shipment` -> shipments (the reverse
pickup parcel), `refund`.

## Lead and after-sales modules (T)

### enquiries (MVP)
`referenceNumber` (`ENQ-<counter>`, shown to the shopper), `type`
(`product|bulk|project|dealership|general`; the contact form is `general`), `product`, `variant`,
`qty`, `name`, `email`, `phone`, `city`, `pincode`, `company`, `message`, `attachments[]`, `status`
(`new|contacted|quoted|won|lost`; the inbox tabs group them as New, In progress = contacted or
quoted, Closed = won or lost), `assignedTo`, `internalNotes[] { by, at, text }` (staff only),
`source` (page URL, UTM), `consent`. As built (stage A): `product`/`variant` are the text fields
`productTitle` and `modelNumber` until products exist; `consent` is `consentToContact`;
`attachments` wait for a private upload collection (docs/open-items 2b). Staff can log phone and
walk-in enquiries; a phone or an email is required.

### dealers (MVP)
`name`, `type` (`dealer|distributor|showroom|service-centre|experience-centre`), `address`,
`city`, `state`, `pincode`, `location` (GeoJSON Point, `2dsphere` index), `phone`, `email`,
`hours`, `categories[]` (what they stock), `isActive`. As built: `location` is a Payload `point`
field ([longitude, latitude], 2dsphere index) typed by staff until the pincode lookup exists.

### warranty-registrations (Phase 2)
`customer` or contact, `product`, `serialNumber`, `purchaseDate`, `invoiceFile`, `purchasedFrom`
(online order or dealer), `order`, `warrantyEndsAt` (computed), `status`.

### service-requests (Phase 2)
`ticketNumber`, `customer`/contact, `product`, `warrantyRegistration`, `issueType`
(`installation|repair|spare-part|complaint`), `description`, `photos[]`, `preferredSlot`,
`address`, `status` (`open|scheduled|in-progress|resolved|closed`), `assignedTo`, `events[]`.

### part-diagrams (Phase 2)
`product`, `image`, `hotspots[] { x, y, label, part -> products/variants }`.

## Promotions (T, MVP, owned by the `promotions` module, rules in docs/11)

### schemes
A time-bound offer that applies by itself, no code needed. `name` (L), `slug` (landing page
`/offers/<slug>`), `occasion` (`diwali|holi|new-year|wedding-season|launch|custom`; Phase 2 adds
`dealer-anniversary`), `audience` (`retail` in MVP; Phase 2 adds `dealer|retailer|wholesaler|designer`,
several allowed), `startsAt`, `endsAt` (tenant timezone, minute precision), `status`
(`draft|scheduled|live|paused|ended`; `scheduled -> live -> ended` is moved by the
`switch-schemes` job), `offer` group:
- `type`: `percent` (percent off), `fixed` (₹ off each item), `tiered` (spend tiers on the order,
  e.g. ₹5,000 -> ₹500 off, ₹10,000 -> ₹1,200 off), `buy-x-get-y` (buy `buyQty`, get `getQty` of
  the cheapest eligible items at `getDiscountPercent`, 100 = free), `free-shipping` (above
  `minOrderMinor`), `special-price` (a launch price per variant in `specialPrices[] { variant, priceMinor }`)
- `value` (percent, or `amountMinor`), `tiers[] { minOrderMinor, discountMinor }`, `buyQty`,
  `getQty`, `getDiscountPercent`, `maxDiscountMinor` (cap per order), `minOrderMinor`

`appliesTo` (`all|categories|collections|products`, with the lists, and `excludeProducts[]`;
enquire-only products are never discounted), `combinesWithCoupons` (default false), `prepaidOnly`
(default false), `perCustomerLimit` (orders per phone/email, optional), `priority` (when two
schemes cover the same item, the better price for the shopper wins; `priority` breaks ties),
`display` group: `badgeText` (L, "Diwali offer"), `announcementText` (L), `banner` -> banners,
`landingPage` -> pages (optional; otherwise the kit's scheme page lists the products),
`showBeforeStart` (list it on the Offers page as "coming up" with its real start date),
`showCountdown` (counts down to the real `endsAt` only); `messages` group: `announceOnStart`
(email and, when allowed, WhatsApp to opted-in shoppers through an `offer-campaigns` doc),
`stats { orders, salesMinor, discountMinor, updatedAt }` (nightly and at end).

Occasion templates are code (`src/modules/promotions/occasions.ts`): suggested name, badge text,
banner placeholder and offer type, so "Start from Diwali" fills a draft. Dates are always typed by
the vendor because festival dates move every year.

### coupons
`code` (shown as typed) and `codeNormalized` (upper case, unique per tenant), `description`
(internal), `type` (`percent|fixed|free-shipping`), `value`, `minOrderMinor`, `maxDiscountMinor`,
`appliesTo` (as schemes), `startsAt`, `endsAt`, `usageLimit` (total), `perCustomerLimit` (by phone
and email, default 1), `usedCount` (atomic `$inc` on order placed, `-1` on cancel before payment),
`firstOrderOnly`, `paymentMethods[]` (e.g. `razorpay` only), `visibility` (`public`: listed at the
cart and on the offers page; `private`: typed only), `scheme` -> schemes (optional, a code that
belongs to a scheme), `affiliate` -> affiliates (optional: the affiliate's personal code, which
also attributes the order), `batch` (for bulk single-use codes: `{ id, prefix, count }`),
`status` (`active|paused|expired`).

### coupon-redemptions
`coupon`, `order`, `customer` or `contact { email, phone }`, `discountMinor`, `status`
(`held|used|released`). Written when an order is placed and released if it is cancelled before
payment; per-customer limits are checked against it.

## Reviews and wishlists (T, MVP, owned by the `reviews` module)

### reviews
`product`, `variant`, `order` and `orderItem` (verified purchase: only delivered order items can
be reviewed), `customer` (or guest contact from the order), `displayName` ("Rahul K."), `city`
(optional), `rating` (1 to 5), `title`, `body`, `photos[]` -> media (up to 4), `status`
(`pending|published|rejected`), `rejectionReason` (`abuse|personal-data|not-about-product|spam|duplicate`),
`reply { text, by, at }` (public vendor reply), `helpfulCount`, `reportedCount`, `source`
(`account|review-email`), `publishedAt`. One review per order item. Never edited by staff.

### wishlists
`customer`, `items[] { product, variant, addedAt }`. Guests keep the list on the device
(local storage, product ids only) and it merges into the account on sign-in.

## Affiliates and commissions (T, MVP, owned by the `affiliate` module)

### affiliates
`customer` (the affiliate's store account), `name`, `email`, `phone`, `code` (unique per tenant,
e.g. `RIYA`, used in `/r/RIYA`), `coupon` -> coupons (optional personal code, e.g. `RIYA10`),
`status` (`applied|approved|paused|rejected`), `application { promotesOn (instagram|youtube|website|whatsapp|offline|other), profileUrl, audienceNote, appliedAt }`,
`commissionPercent` (default from the feature config), `categoryRates[] { category, percent }`,
`payout` (encrypted: `method (upi|bank)`, `upiId` or `accountNumber`, `ifsc`, `accountName`),
`pan` (encrypted; masked as `ABCPS••••K`), `gstin` (optional, if the affiliate is GST-registered),
`totals { referredOrders, salesMinor, pendingMinor, approvedMinor, paidMinor, tdsMinor }`
(kept current by the ledger), `approvedBy`, `approvedAt`, `notes` (staff only).

### referrals (the commission ledger)
One per referred order. `affiliate`, `order`, `via` (`link|coupon`), `commissionBaseMinor` (the
order's taxable value after discounts, without delivery, COD fee or GST), `commissionPercent`
(snapshot), `commissionMinor`, `status` (`pending|approved|paid|reversed`), `holdUntil` (return
window end), `adjustments[] { reason (partial-refund|return|cancel), amountMinor, at }`,
`approvedAt`, `payout` -> affiliate-payouts.

### affiliate-payouts
A statement the vendor pays outside the platform and records. `number` (`PAY/26-27/0012`, from
`counters`), `affiliate`, `periodStart`, `periodEnd`, `referrals[]`, `grossMinor`, `tdsMinor`
(Income-tax Act 2025 s.393(1), formerly s.194H, docs/11), `netMinor`, `status` (`draft|paid`), `paidOn`, `method` (`upi|neft|imps`),
`reference` (UTR), `recordedBy`, `statementPdf` -> media.

### affiliate-clicks
Daily counters, not one document per click: `affiliate`, `date`, `clicks`, `uniqueVisitors`
(approximate, from a hashed cookie). Unique `(tenant, affiliate, date)`.

## Trade accounts (T, Phase 2, owned by the `b2b` module)

- **trade-accounts**: `type` (`dealer|retailer|wholesaler|designer`), `companyName`, `gstin`,
  `contacts[]` -> customers, `priceList` -> price-lists, `creditLimitMinor`, `creditDays`,
  `paymentTerms` (`prepaid|credit|cod`), `minOrderMinor`, `status` (`applied|approved|paused|rejected`),
  `anniversaryDate` (the date the partner joined the brand; dealer anniversary offers),
  `commissionPercent` (designers: commission on client orders they refer, through the affiliate
  ledger), `salesRep` -> users, `city`, `pincode`.
- **price-lists**: `name`, `forTypes[]` (trade types), `type` (`fixed|percent-off`),
  `entries[] { variant, priceMinor, minQty, packSize }`, `tiers[] { minQty, discountPercent }`.
- **quotes**: `tradeAccount`, `items[]`, `status` (`requested|sent|accepted|expired|converted`),
  `validUntil`, `pdf`, `order`.
- Schemes gain trade audiences and the `dealer-anniversary` occasion: on each partner's
  `anniversaryDate` the daily job creates a single-use coupon for that account (valid `validDays`)
  and sends it by email and WhatsApp.

## Loyalty (T, Phase 2, owned by the `loyalty` module)

- **loyalty-ledger**: `customer`, `type` (`earn|redeem|expire|adjust`), `points`, `order`,
  `expiresAt`, `note`, `by`. A customer's balance is the sum; a nightly job writes
  `customers.loyalty { balance, expiringNext, updatedAt }`. Points are earned on delivered orders
  after the return window (`pointsPer100` of the taxable value) and redeemed at checkout as a
  discount line, up to `maxRedeemPercent` of the order (rules in docs/11).

## Operations (T)

- **import-jobs**: `type` (`products|variants|stock|prices|dealers`), `file`, `mapping`, `status`
  (`uploaded|validating|validated|importing|done|failed`), `totals { rows, created, updated, failed }`,
  `errorsFile` -> media, `dryRun`, `by`.
- **idempotency-keys**: `key`, `route`, `requestHash`, `responseStatus`, `responseBody`,
  `expiresAt` (TTL 24 h). Unique `(tenant, key)`. Used by `POST /checkout` and payment endpoints
  (docs/11).
- **daily-stats**: `date` (tenant timezone), `ordersCount`, `grossSalesMinor`, `paidOnlineCount`,
  `codCount`, `refundsMinor`, `newCustomers`, `discountMinor` (schemes and coupons),
  `affiliateSalesMinor`, `recoveredCarts`. Unique `(tenant, date)`. Written by a nightly job
  (and today's row refreshed hourly); both dashboards and the platform GMV read these instead of
  scanning orders.
- **audit-logs** (writes in MVP, viewer Later): `tenant` (empty for platform-wide entries such as
  inviting a teammate or editing a plan, so it uses its own relationship rather than the
  multi-tenant plugin's required field), `actor` (user), `actorRole`, `summary` (one readable line,
  shown in Recent changes), `action`
  (`support_access|store_created|store_status_changed|feature_changed|connector_changed|plan_changed|plan_edited|subscription_payment|subscription_status_changed|staff_invited|staff_changed|two_factor_reset|domain_changed|price_changed|refund|scheme_changed|coupon_changed|commission_changed|affiliate_payout|review_moderated|...`; the list lives in `src/modules/audit/constants.ts`),
  `collectionSlug` (`collection` is a reserved name in Mongoose), `docId`, `diff`, `reason` (required for platform access: manage or view), `actingAsPlatform` (true for changes a super admin made while managing a store), `ip`, `at`. Append-only,
  tenant-scoped, readable by platform admins. The super admin "Recent changes" card reads it.

## Notifications (T, owned by the `notifications` module, docs/18)

### notification-settings (per-tenant singleton)
`milestones[] { key, email (on|off), whatsapp (on|off), sms (on|fallback|off) }` (defaults in
docs/18), `packedDelayMinutes` (15), `quietHours { start '21:00', end '09:00' }`,
`whatsappOptInDefault` (true), `staffAlertEmails[]`, `limits { perRecipientPerDay (10), smsPerDay (2000) }`
(platform admins only).

### notification-templates
`milestone` (an order milestone, or one of the offer message keys `abandoned_cart_1`,
`abandoned_cart_2`, `review_request`, `offer_campaign`, docs/18), `category` (`utility` for order
updates, `marketing` for offer messages; WhatsApp bills and approves them differently), `variant`
(`default|prepaid|cod`), `channel` (`email|whatsapp|sms`; offer messages use email and WhatsApp only), `locale`,
`subject` (email), `body` (exact approved text), `variables[]` (variable keys in template order),
`buttons[]` (WhatsApp URL button: label, URL with the variable suffix),
`whatsapp { name, language, category, providerTemplateId }`, `sms { msg91TemplateId, dltTemplateId, senderId }`,
`status` (`draft|submitted|approved|rejected|paused|disabled`), `rejectionReason`, `lastSyncedAt`,
`enabled`. Unique `(tenant, milestone, variant, channel, locale)`.

### notification-logs
`direction` (`out|in`), `kind` (`order|offer`), `milestone`, `channel`, `provider`, `to` (E.164 or
email), `order`, `shipment`, `cart`, `campaign` -> offer-campaigns, `template`, `variables[]`,
`dedupeKey` (unique per tenant), `status` (`queued|sent|delivered|read|clicked|failed|skipped`),
`skipReason` (`opted_out|no_whatsapp_opt_in|no_offer_consent|channel_off|template_not_approved|cap_reached|frequency_cap|no_phone|stale`),
`providerMessageId`, `fallbackOf` -> notification-logs, `error { code, message }`, `sendAfter`,
`sentAt`, `deliveredAt`, `readAt`, `failedAt`. Inbound rows add `text` (first 500 characters) and
`replyTo`. TTL 90 days.

### contact-preferences
One row per contact point, never a phone and an email in the same row: shoppers use different
phones and emails over time, and two unique fields on one row would collide (a second order with a
new phone but the same email couldn't be stored). `type` (`phone|email`), `value` (E.164 phone or
lowercased email), `customer` (optional link when known). Phone rows: `whatsapp { optedIn, at, source (checkout|account|reply), wordingVersion, optedOutAt }`
and `sms { optedOutAt }` (order updates), `offers.whatsapp { optedIn, at, source (checkout|signup|account|affiliate), wordingVersion, optedOutAt }`.
Email rows: `offers.email { ...same }`, `suppressed { reason (bounce|complaint), at }` (from the
Resend webhook). Both: `unsubscribeTokenHash`, `lastOfferAt` and `offersThisWeek` (frequency cap,
counted per contact point). Offer consent is a separate, unticked consent (docs/14). Unique
`(tenant, type, value)`; works for guests. On account deletion `value` is replaced by a hash so
opt-outs keep working.

### offer-campaigns
A promotional message to opted-in shoppers. `name`, `scheme` -> schemes (optional), `channels[]`
(`email`, `whatsapp`), `audience` (`all-opted-in`, `bought-from-categories`, `wishlisted-scheme-products`,
`inactive-days`, `affiliate-referred`; with parameters), `template` per channel (email subject and
body from blocks; WhatsApp: an approved `marketing` template), `sendAt` (inside the send window),
`status` (`draft|scheduled|sending|sent|cancelled`), `counts { eligible, sent, delivered, read,
clicked, failed, skipped, unsubscribed, orders, salesMinor }`, `createdBy`. Sending runs as a job
in batches through the notifications engine, never a direct connector call.

## Adding a collection (checklist)

1. Create it in the owning module: `src/modules/<m>/collections/<Name>.ts`.
2. Decide scope; if tenant-scoped, add its slug to the multi-tenant plugin `collections` list.
3. Add access functions from `src/access/` (never `() => true` for writes).
4. Add compound indexes starting with `tenant`; add unique-per-tenant indexes.
5. Add `afterChange` cache revalidation if the storefront reads it.
6. Run `pnpm payload generate:types`.
7. Add it to the tenant-isolation integration test.
8. Update this document.
