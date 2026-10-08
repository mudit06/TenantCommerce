# 11 Orders, payments, GST and invoices

## Pricing and totals (server only, `src/modules/cart/services/pricing.ts`)

All amounts in paise (integers). Product prices are **GST-inclusive** by default (Indian B2C
norm), configurable per product (`taxInclusive`).

Per line:
1. `unit = variant.price ?? product.price` (or the trade price list price, Phase 2). A live
   `special-price` scheme (launch offer) replaces `unit` with its price for that variant, and
   the line keeps the MRP for display
2. `gross = unit * qty`
3. `discount` = this line's share of the promotions applied (below), integer paise, remainder
   to the largest line (`src/lib/money.allocate`)
4. `net = gross - discount` (inclusive of tax)
5. `gstRate` = the product's tax rate. If that rate has a `valueRule` (clothing: 5% up to ₹2,500 a
   piece, 18% above, since 22 September 2025), work out one piece's taxable value at the lower
   rate, `round((net / qty) * 100 / (100 + ratePercent))`, and use `rateAbovePercent` when it is
   above `maxUnitTaxableMinor`. Inclusive prices from about ₹2,626 to ₹2,950 a piece have no
   consistent rate (5% puts the value above ₹2,500, 18% puts it below), so the product editor warns
   about them and the vendor's CA decides the treatment.
6. `taxable = round(net * 100 / (100 + gstRate))`, `tax = net - taxable`
7. Split tax: if `placeOfSupplyStateCode === tenant.stateCode` -> `cgst = floor(tax/2)`, `sgst = tax - cgst`; else `igst = tax`

Order: `subtotal = Σ net`, `+ shipping`, `+ codFee`, `grandTotal`, round to the nearest rupee with
`roundOff` line if the tenant enables it.

**Delivery charge and COD fee.** When the vendor delivers its own goods, both are part of a
composite supply and take the GST rate of the goods, not a flat 18% for a service. Both are
GST-inclusive like prices. When an order mixes rates, split each charge across the lines in
proportion to their taxable value (largest remainder gets the leftover paise) and tax each share
at that line's rate, with the same CGST + SGST or IGST split. The invoice shows them as separate
lines with their rate. Have a CA confirm this once before launch (docs/open-items.md).

Place of supply = shipping address state for B2C goods. Use the 2-digit GST state codes table in
`src/lib/gst/states.ts`; the state comes from the `pincodes` directory (docs/06), not from what
the shopper types.

Unit-test this module heavily (`tests/unit/pricing.test.ts`): intra/inter-state, 0% / 5% / 18% /
40% rates, the clothing ₹2,500 rule on both sides of the line (a discount can move a piece across
it), multiple qty, rounding remainders, scheme and coupon allocation, every scheme type, delivery
charge and COD fee split across mixed rates.

## Promotions engine (`src/modules/promotions/services/engine.ts`, MVP)

`cart` pricing calls `applyPromotions(tenantId, lines, context)` and gets back
`appliedOffers[]` and per-line discounts. `context` is the shopper's identity (customer, or phone
and email from checkout), the payment method when chosen, the coupon code, the audience
(`retail`; trade types in Phase 2) and the time. Order of work, every time the cart changes and
again at `POST /checkout`:

1. **Live schemes** for this audience and time. Each eligible line gets at most one scheme: the
   one that gives the shopper the lower price (ties: higher `priority`). Schemes don't stack with
   each other. Enquire-only products are never discounted.
   - `percent` and `fixed`: per eligible line (`fixed` is per unit, never below ₹0).
   - `buy-x-get-y`: eligible units sorted by price; in each group of `buyQty + getQty`, the
     cheapest `getQty` units get `getDiscountPercent`. The discount spreads over the group's lines.
   - `tiered`: the highest tier reached by the eligible subtotal; the amount spreads over eligible
     lines by value.
   - `free-shipping`: the delivery charge becomes 0 once `minOrderMinor` is reached.
   - `special-price`: already applied in step 1 of the line pricing above.
   - `maxDiscountMinor` caps a scheme's total for the order.
2. **Coupon** (at most one per order). Checks: active, dates, `usageLimit`, `perCustomerLimit`
   against `coupon-redemptions` by phone and email, `firstOrderOnly`, `minOrderMinor` (on the
   subtotal after scheme discounts), payment method, and that no scheme on the cart has
   `combinesWithCoupons: false`. If a scheme blocks the coupon, the cart explains which one gives
   the shopper more and keeps that. The coupon's discount is spread over its eligible lines by
   value.
3. **Phase 2**: loyalty points redeemed as a last discount line, capped at `maxRedeemPercent`.

Rules:

- Totals come only from the server. The browser sends codes and quantities, never prices or
  discounts. The same function runs at checkout, so a scheme that ended a minute ago no longer
  applies; the cart says so before payment.
- The order stores `appliedOffers[]` and every line's `discountMinor` as a snapshot; reprinting an
  invoice never re-runs the engine.
- **GST on discounts.** Scheme and coupon discounts are known at the time of supply and shown on
  the invoice, so they reduce the taxable value (CGST Act s.15(3)(a)): GST is worked out on `net`.
  A free item in buy X get Y is shown as a line with its discount, not as a separate free supply.
  Loyalty points (Phase 2) are treated the same way as a discount line. Have the CA confirm the
  buy-X-get-Y and loyalty treatment before launch (docs/open-items.md).
- **Returns and refunds of discounted items** refund what the shopper paid for that line (its
  `net` plus its share of delivery if refunded). When a return breaks a buy X get Y or a tier, the
  refund still uses each line's stored share; the vendor can't claw back the rest. Coupons used on
  a fully cancelled order are released; on a return they stay used.
- **Display.** Product cards and pages show the scheme price for one unit next to the MRP, with the
  badge and, when `showCountdown` is on, the real end time. Spend tiers and buy X get Y show as a
  label, since the price depends on the cart.

**As built (7 October 2026):** `src/modules/promotions/rules.ts` (pure, `tests/unit/promotions.test.ts`)
and `services/engine.ts`. Each line first gets the scheme that takes most off it; spend tiers
and buy X get Y are then worked out again on the lines they won. A launch price is applied as a
scheme discount on the line (unit price minus the launch price), which gives the same net and
GST as replacing the unit price and keeps the scheme visible on the invoice. A scheme's minimum
order is the cart's value before discounts; a coupon's is after schemes. When a scheme that
doesn't combine with coupons is on the cart, the engine prices both ways and keeps the one that
saves the shopper more, and the cart says which. The coupon comes from the cart at checkout,
never from the browser's form; its use is counted with a conditional `$inc` inside the order's
transaction and released on cancel (`coupon-redemptions`).

## Affiliate commissions (MVP)

- **Attribution.** At checkout the order is referred when the shopper used an affiliate's coupon,
  or else when a valid `ref` cookie (30 days, last click) is present. An affiliate's own orders
  (same customer, phone or email) are never referred. Trade orders (Phase 2) aren't referred.
- **Base and amount.** `commissionBaseMinor` = the order's taxable value after discounts (no
  delivery charge, COD fee or GST). Rate = the affiliate's category rate for each line, else their
  `commissionPercent`. Worked out per line, summed, rounded once.
- **Ledger.** `order.paid` (prepaid) or `order.delivered` (COD) creates the `referrals` row as
  `pending` with `holdUntil` = return window end. A daily job approves rows whose window has closed
  with no open return. `order.cancelled` reverses it; a partial refund or return reduces it by the
  refunded share (an `adjustments[]` entry). Approved amounts go into the next payout statement.
- **Payout and TDS.** The vendor pays its affiliates directly (UPI or bank) and records the payment;
  the platform never holds the money. Commission TDS falls under the Income-tax Act 2025, s.393(1)
  (payment code 1006; it was s.194H of the 1961 Act until 31 March 2026): when an affiliate's
  commission from the vendor crosses ₹20,000 in a financial year, TDS of 2% applies (20% without a
  valid PAN) on the full year's amount, including what was paid before the threshold.
  The statement shows gross, TDS and net; the vendor deposits the TDS and files it. Have the CA
  confirm before launch. GST-registered affiliates may add GST to their commission invoice; the
  statement records their GSTIN.
- Phase 2 extends the same ledger to interior designers' client referrals and other trade partners.

**As built (9 October 2026):** the referral row is created when the order is confirmed (COD at
once, prepaid when paid) as `pending` with no hold date; delivery sets `holdUntil` to delivery
plus the program's hold days (default 7, the return window until returns are built); the
`approve-commission` job (05:00 India time) approves rows past it. A cancelled order reverses
pending and approved rows; a processed refund cuts the commission by the refunded share of the
order total. Rows already paid are not clawed back. Category rates match the product's main
category, its other categories and their parents. TDS on a payout =
2% (20% without PAN) of the year's commission once it passes ₹20,000, less TDS already deducted
that year, never more than the payout. Affiliates are in the Enterprise plan's features.

## Order lifecycle

```
            checkout
               |
           [pending] --payment failed/expired (30 min)--> [cancelled] (stock released)
               |
   paid (Razorpay) or COD placed
               v
          [confirmed] --cancel by customer/staff--> [cancelled] (refund if paid)
               v
          [processing] (first parcel packed)
               v
     parcels: packed -> shipped -> out for delivery -> delivered   (see Parcel journey)
               v
          [completed] (every parcel delivered) --return window--> returns flow -> refund / credit note
```

`status`, `paymentStatus` and `fulfillmentStatus` are separate fields; transitions only through
`orders/services/transition.ts` which validates the move, writes `order-events`, and emits events.

## Parcel journey

Each parcel is a `shipments` doc; an order usually has one, and can have several when items ship
separately. The parcel's status is what the shopper is told about (docs/18):

```
 packed -> shipped -> in_transit -> out_for_delivery -> delivered
                                      |        ^
                                      v        |  re-attempt
                                 delivery_failed
                                      |
                                      v
                       rto_initiated -> rto_delivered     (parcel returns to the vendor)

 packed can go to cancelled (order cancelled before pickup)
 any step after shipped can go to lost (lost, damaged or destroyed in transit)
```

- **Who moves it.** Packing is always a staff action (one order or bulk); with Shiprocket it also
  books the courier, label and pickup. After that, Shiprocket tracking moves the parcel by itself
  (status map in docs/09). With manual shipping, staff move it, one order at a time or in bulk from
  a CSV of order number, courier and tracking number.
- **One door.** Transitions go only through `shipping/services/transition.ts`: it validates the
  move, ignores repeats and backward moves (webhooks arrive late and out of order), appends
  `shipments.events[]` and `order-events`, and emits `shipment.<status>` with
  `{ tenantId, orderId, shipmentId, attempt }`. Skipping forward is allowed (staff often go
  straight from shipped to delivered); skipped steps send no message.
- **Shipped** needs the courier and tracking number; the expected delivery date is optional.
- **Delivery failed** needs a reason (`customer_unavailable|address_issue|refused|cod_not_ready|other`)
  and increments `attempts`; a re-attempt moves the parcel back to `out_for_delivery`. After the
  courier gives up it goes to `rto_initiated`. With Shiprocket, staff answer each failed delivery
  from an "Action needed" list: re-attempt (new date, address line, phone) or return to the vendor.
  Phase 2 adds a self-serve form on the shopper's tracking page that sends the same action.
- **Lost** alerts staff, who refund or send a replacement order; the shopper gets no automatic
  message.
- **COD payment.** A COD order's `paymentStatus` becomes `paid` when its parcel is delivered (the
  courier collected the cash). Shiprocket remits it to the vendor's bank; in the MVP the vendor
  reconciles remittances in Shiprocket's panel.
- **Order roll-up.** `orders.fulfillmentStatus` is derived from the parcels: the least advanced
  open parcel decides, `partially_shipped` while some items have no parcel. When every parcel is
  delivered the order becomes `completed` and `order.delivered` fires.
- **Messages** hang off parcel events, never off the order roll-up, so a one-parcel order gets one
  "delivered" message, not two.
- **COD confirmation** (Phase 2, `cod-confirmation`): a COD order can wait in `confirmed` with
  `codConfirmation.status = pending` until the shopper confirms on WhatsApp (docs/18); packing it
  earlier shows a warning.

**As built (7 October 2026).** Parcel moves live in `src/modules/orders/services/parcels.ts`
(`packParcel`, `moveParcel`, `rollUpFulfillment`), not in the shipping module, because they
change orders and checkout already uses the shipping module. Staff can't mark a packed parcel
delivered without shipping it first on the order screen; the service still accepts skipped
steps for imports and Shiprocket. A parcel worth more than ₹50,000 needs its e-way bill number
when packed.

## Events and side effects

| Event | Handlers |
|---|---|
| `order.placed` | reserve stock, hold the coupon use (`coupon-redemptions`), mark the abandoned cart recovered |
| `order.confirmed` | `order_confirmed` message (docs/18), alert vendor staff |
| `order.paid` | convert reservation to sale, generate invoice (job) unless one exists (COD orders already have one from packing), affiliate referral `pending` (prepaid) |
| `order.cancelled` | release stock, refund if paid, credit note if invoiced, release the coupon use, reverse the referral, `order_cancelled` message |
| `shipment.packed` / `shipped` / `in_transit` / `out_for_delivery` / `delivery_failed` / `delivered` | roll up the order's `fulfillmentStatus`; journey message per the tenant's rules (docs/18); `delivery_failed` also alerts staff; the first `shipment.packed` of a COD order generates its invoice |
| `shipment.rto_initiated` / `rto_delivered` | alert staff; on `rto_delivered` staff confirm restock, refund if prepaid, order cancelled |
| `shipment.lost` | alert staff (refund or replacement) |
| `order.delivered` (every parcel delivered) | start return window, allow reviews for its items and queue the review request (`reviews`, docs/18), affiliate referral `pending` for COD orders, commission approved after the window; Phase 2: loyalty points earned after the window |
| `refund.processed` | update payment status, credit note, reduce the referral's commission by the refunded share, `refund_processed` message |
| `return.approved` / `return.rejected` | message to the shopper |
| `return.received` | restock, refund or exchange, reduce the referral's commission for the returned lines |

## Stock

Atomic conditional update: `findOneAndUpdate({ _id, tenant, $expr: { $gte: [{ $subtract: ['$stockQty', '$reservedQty'] }, qty] } }, { $inc: { reservedQty: qty } })`.
Use a Mongo transaction for multi-line orders (Atlas replica set). Reservations expire with the
pending order. Every change writes a `stock-movements` doc.

## Idempotency

- `POST /checkout` requires `Idempotency-Key`; the key, request hash and response are stored in
  `idempotency-keys` for 24 h per tenant (docs/06). A repeat with the same key returns the stored
  response; the same key with a different body is a 409.
- Webhooks dedupe on provider event id (`transactions.processedEventIds`).
- Shopper messages are deduplicated by a unique `(tenant, dedupeKey)` on `notification-logs`
  (docs/18), so a repeated status or webhook never sends twice.

## GST invoice

Generated by a job: for prepaid orders after `order.paid`; for COD orders when the first parcel is
packed (`shipment.packed`), so the invoice exists before goods leave and prints with the Shiprocket
label. No tenant setting. Requirements (Rule 46, CGST Rules) the PDF must show:

- Supplier legal name, address, GSTIN; invoice number (consecutive, unique per financial year,
  max 16 chars, may contain `-` and `/`); invoice date
- Recipient name, address, GSTIN if registered; place of supply (state name + code) for
  inter-state supplies
- Per line: description, HSN code, quantity + unit, total value, discount, taxable value, rate
  and amount of CGST/SGST or IGST (and cess)
- Totals, amount in words, "Whether tax is payable on reverse charge: No", signature or
  digital signature of authorised signatory

Numbering: `counters` key `invoice:<FY>` with FY `2026-27` starting 1 April. Format from
site-settings prefix, e.g. `INV/26-27/00042`. Never reuse a number; cancellations issue a credit
note with its own series.

E-invoicing (IRN + QR) is mandatory only for vendors above the government turnover threshold
(currently ₹5 crore AATO for B2B invoices). Model has `irn` and `qrCode` fields; integration via a
GSP connector is **Later**.

Reports: `GET /api/admin/v1/reports/sales` must export a GSTR-1-friendly CSV (B2B invoices with
GSTIN, B2C large/small, HSN summary, credit notes).

## Refunds

Full or partial, via `PaymentConnector.refund`. COD refunds recorded manually (bank transfer/UPI
reference). Each refund creates a credit note when an invoice exists. A refund is never more than
what the shopper paid for the lines refunded (each line's `net`, after its discount share).

## Returns and exchanges

Window from site-settings (default 7 days, clothing often 15 to 30). Customer requests with
reason + photos; staff approve; the reverse pickup is booked through Shiprocket (MVP), or arranged
by staff for manual shipping. The return parcel is a `shipments` doc with `direction: return`, and
its tracking moves the return to `picked` and `received`; then refund or exchange order. Exchange
creates a new zero-value order linked to the original.
