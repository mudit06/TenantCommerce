# 17 Roadmap

Research behind these choices: `research/features.html`.

## MVP, also called Phase 1 (a vendor can launch a branded PWA store, take paid orders with GST invoices and run offers)

On 3 October 2026 mudit moved these growth features into Phase 1: festival schemes (Diwali, Holi,
New Year, Wedding Season), special launch offers, coupons, affiliates with commissions, wishlist,
reviews, offer messages and abandoned cart reminders. Dealers, retailers, wholesalers, interior
designers, dealer anniversary offers, loyalty points and product compare are Phase 2.

**Platform (super admin)**
- Tenant onboarding (script + admin), subdomain, owner login, suspend/resume
- Plans with module/connector allow-lists and limits; manual subscription tracking
- Feature enablement per tenant, including each vendor's WhatsApp offers switch; platform
  dashboard (tenants, orders, GMV)
- Manage store (super admins, full edit in the vendor's CMS) and View as support (read-only), both
  with a reason, time-boxed and written to the audit log (docs/05)

**Vendor admin**
- Store settings: branding, contact, policies, GST details, invoice settings, checkout rules (COD)
- Catalog: categories (tree), attribute sets per category, products with simple variants,
  finish/colour swatches, model numbers, documents (spec sheet, manual, brochure, catalogue), videos,
  warranty months, linked accessories and spare parts, HSN + GST rate, inventory (one warehouse),
  drafts/versions
- CSV import (dry run + error report) and export
- CMS: pages from blocks, navigation, banners, SEO fields, redirects, forms
- Orders: list/filter, status transitions, cancel, refund, GST invoice PDF, credit notes; parcel
  journey (packed, shipped, out for delivery, delivery failed, delivered, RTO), moved by Shiprocket
  tracking or, for manual shipping, by staff one order at a time or in bulk from a CSV
- Shiprocket connector on the vendor's own account (moved from Phase 2): pincode serviceability
  with COD and ETA, pack and book the courier (AWB), labels and manifest, pickups, live tracking,
  failed-delivery actions (re-attempt or return), RTO, return pickups. Manual shipping stays for
  vendors without it (docs/09)
- Order updates to shoppers on WhatsApp, SMS and email from the vendor's own WhatsApp number and
  SMS sender: channel per step, approved templates, delivery status per message, resend, test
  send (docs/18)
- Shipping zones by pincode/state, flat/weight/value rates, COD per zone
- Razorpay connector + COD; WhatsApp (Meta Cloud API) and SMS (MSG91) connectors; staff users with
  roles; enquiries inbox; dealers list
- Schemes and offers (`schemes`, docs/11): festival schemes from occasion templates (Diwali, Holi,
  New Year, Wedding Season) and special launch offers; percent or flat off, spend tiers, buy X get
  Y, free delivery or a special launch price; for all products, categories, collections or chosen
  products; scheduled start and end; badge, announcement bar and landing page; results per scheme.
  Retail shoppers only in Phase 1
- Coupons (`coupons`): percent, flat or free delivery; minimum order, cap, dates, total and
  per-shopper limits, first order only, prepaid only; public codes shown at the cart or private
  codes; bulk single-use codes; one coupon per order
- Affiliates and commissions (`affiliate`): application and approval, referral link and personal
  coupon, 30-day attribution, commission % per affiliate and per category, pending until the
  return window closes, reversed on cancellation or return, monthly statements, payouts the vendor
  makes itself and records (with TDS where due)
- Reviews (`reviews`): verified-purchase ratings with photos, staff approval, vendor reply, review
  request after delivery, rating on cards and product pages
- Offer messages (`offer-messages`): scheme and launch messages by email and, when our team
  switches on `whatsapp-offers` for that vendor in super admin, WhatsApp marketing templates; only
  to shoppers who opted in; frequency cap, unsubscribe in one tap
- Abandoned cart reminders (`abandoned-cart`): up to two reminders (1 hour, 24 hours) by email and
  WhatsApp to opted-in shoppers, with a link that restores the cart; recovery report
- Basic reports: sales, orders, GST export, offers and coupons, affiliate sales

**Shopper storefront (per-vendor UI over shared kit)**
- Home, category listing with attribute filters, search with autocomplete (model no./SKU),
  product page (gallery, swatches, spec table, documents, videos, pincode check with ETA and COD),
  enquire/request-quote, size guide (clothing)
- Cart, guest + account checkout, address with pincode autofill, Razorpay (UPI/cards/netbanking)
  and COD, order confirmation
- Account: email OTP/password login, orders, tracking, invoice download, addresses, cancel, return
  request, wishlist, my reviews, offer preferences
- WhatsApp opt-in at checkout, tracking page behind the short link in every message, stop updates
  anytime
- Offers page and scheme landing pages, offer badges and prices on cards and product pages (real
  end dates only), coupon box and available coupons at the cart, offers sign-up (email and
  WhatsApp) with its own consent, one-tap unsubscribe
- Wishlist (heart on cards and product page, saved on the device for guests, moved to the account
  on login), reviews on product pages, write a review from the order or the review email
- Affiliate program page with application form, affiliate dashboard (link, code, referred orders,
  commission, payouts), `/r/<code>` referral links
- Abandoned cart restore link
- Dealer/store locator, downloads page, WhatsApp button, contact/enquiry forms
- PWA install + offline page, SEO (sitemaps, schema), order emails

**Cross-cutting**: tenant isolation tests, roles, rate limits, encrypted secrets, audit log of
staff and platform actions (viewer Later), pincode directory, Legal Metrology details and a
grievance officer on every store, Sentry, backups, Lighthouse ≥ 90.

## Phase 2 (growth modules, switched on per vendor)

- Self-serve re-delivery after a failed attempt (sends Shiprocket's NDR action), COD confirmation
  on WhatsApp
- Phone OTP login over SMS/WhatsApp; self-serve "Connect WhatsApp" (Embedded Signup) that can
  reuse the vendor's WhatsApp Business app number; Hindi and regional message templates; staff
  alerts on WhatsApp
- Warranty registration, service requests and tracking, installation booking
- Spare parts finder (model number + exploded diagram hotspots)
- Product compare (up to 4 products side by side, from attributes marked "compare")
- Trade accounts (`b2b`) for four partner types, each with its own application, approval and
  terms: **dealers** (dealer price list, credit limit and days, quotes, statements), **retailers**
  (retailer price list for resale, GST invoice with their GSTIN, minimum order), **wholesalers**
  (bulk price tiers, higher minimum quantities and pack sizes, credit) and **interior designers**
  (trade price on their own orders plus commission on client orders they refer). Shared: quick
  order by SKU and CSV paste, reorder, tiered/volume pricing, MOQ and pack sizes
- Trade schemes: schemes aimed at one or more partner types (target or slab schemes, festival
  trade offers), and **dealer anniversary** offers: a personal coupon sent on each dealer's
  anniversary with the brand, valid for a set number of days
- Partner commissions: the affiliate commission engine extended to interior designers and other
  trade partners
- Loyalty points (`loyalty`): points on delivered orders after the return window, redeemed at
  checkout up to a share of the order, expiry, points statement in the account
- Prepaid discount at checkout
- Lookbooks/inspiration galleries, virtual appointment booking, blog
- Multilingual storefront (Hindi + regional), per tenant
- Custom domains with automatic SSL; automated subscription billing (Razorpay Subscriptions)
- Sales analytics dashboard; push notifications; Google Merchant feed; Shopify/Woo import presets

## Later

Multi-currency and international shipping; vendor public API + outbound webhooks (ERP/Tally);
GST e-invoicing (IRN) and e-way bills via GSP; gift cards; product configurator;
3D/AR room visualizer; size advisor (clothing); barcode/QR scan to find a product; find a product
from a photo; QR-based product authenticity check; audit log UI; multi-warehouse;
marketplace channel sync (Amazon/Flipkart inventory); shared WhatsApp inbox for vendor staff,
promotional SMS (DLT promotional sender, DND scrubbing), RCS messages, WhatsApp BSP connectors
(Interakt, Gupshup) for vendors who already use one; Shiprocket courier rates as the shopper's
delivery charge; COD remittance reconciliation imported from Shiprocket; price-drop and
back-in-stock alerts for wishlisted products.

## Build order for MVP (suggested sprints of 2 weeks)

1. Scaffold (Payload ecommerce template + multi-tenant plugin), tenancy, auth, isolation tests, CI
2. Catalog + attribute sets + media + CSV import
3. Storefront kit: layout, listing, PDP, search; default vendor UI
4. Cart, checkout, Razorpay + COD, stock reservation
5. Orders admin, parcel journey, GST invoices, shipping zones, manual shipping, notification engine
   + emails
6. Shiprocket connector: serviceability, pack and book, labels and manifest, pickups, tracking
   webhook and reconciliation, failed deliveries, RTO, return pickups
7. WhatsApp (Meta Cloud API) and SMS (MSG91) connectors, templates, delivery receipts, opt-out,
   tracking page
8. CMS blocks, dealers, enquiries, downloads, PWA, SEO
9. Promotions: promotions engine in the pricing service (schemes and coupons), Schemes and
   Coupons screens, offer badges and prices, offers page, coupon box
10. Engagement: wishlist, reviews (moderation, review request), offer messages (email and
    WhatsApp marketing templates, consent, unsubscribe), abandoned cart reminders and restore link
11. Affiliates: applications, attribution (link and coupon), commission ledger and approval job,
    payouts and statements, affiliate dashboard
12. First real vendor UI, hardening, Lighthouse, go-live checklist

Sprints 9 to 11 add about six weeks to the MVP. They can run alongside sprints 6 to 8 with a
second developer, since promotions touch only the pricing service and its own module.

Start each launch vendor's Shiprocket KYC and Meta and DLT paperwork (docs/09, docs/18) when its
contract is signed; approvals take days, not hours.
