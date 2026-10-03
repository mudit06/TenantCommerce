# 18 Shopper notifications (WhatsApp, SMS, email)

Shoppers hear about their order at each step of its journey (confirmed, packed, shipped, out for
delivery, delivered...) on WhatsApp, SMS and email. The `notifications` module owns this: it
listens to order and parcel events, decides who gets what on which channel, and sends through the
vendor's messaging connectors (docs/09). The order and parcel statuses themselves are defined in
docs/11.

Since 3 October 2026 the same module also sends **offer messages** in Phase 1: scheme and launch
announcements, abandoned cart reminders and review requests (see "Offer messages and reminders"
below). They use a different consent, a different WhatsApp template category and stricter limits
than order updates, and the two are never mixed in one message.

## Decision: each vendor sends from its own number (ADR 0005)

Shopper messages come from the **vendor's own WhatsApp number and SMS sender ID**, on the vendor's
own Meta and MSG91 accounts, paid by the vendor and connected per tenant like Razorpay. Shoppers
never see the platform's name.

One shared platform sender was considered and rejected for shopper messages:

- The name a shopper sees belongs to the sending account: the WhatsApp display name, or the
  6-letter SMS sender ID registered on DLT. A shared sender would show our name, which shoppers
  don't know and could take for spam.
- WhatsApp quality rating and messaging limits are shared by everything sent from one number and
  business portfolio, so one vendor's blocks and reports would throttle every vendor.
- Meta's opt-in must name the business the shopper will hear from, and DLT sender IDs and templates
  belong to the registered entity.
- The platform would pay for every message and re-bill vendors; today it never holds vendor money.

Email is different: the platform's Resend account can send in each vendor's name and verified
domain, so email stays one platform connector.

The platform needs a sender of its own only for messages **to vendor staff** (new order, delivery
failed, a channel broke), where the platform is the brand. MVP sends these by email; WhatsApp staff
alerts from a platform number come in Phase 2.

## Order journey milestones

A milestone is a step the shopper is told about. The list is fixed in code (`MILESTONES` in
`src/modules/notifications/milestones.ts`) so templates, reports and the Shiprocket status map stay
consistent. Vendors choose channels and wording, not new steps.

| Milestone | Fired by (docs/11) | Email | WhatsApp | SMS | The message says |
|---|---|---|---|---|---|
| `order_confirmed` | `order.confirmed` (paid, or COD placed) | on | on | fallback | Order number, total, paid or COD amount due, link |
| `shipment_packed` | `shipment.packed` | off | on (delayed, see Rules) | off | Packed, ships soon |
| `shipment_shipped` | `shipment.shipped` | on | on | fallback | Courier, tracking number, expected date, link |
| `shipment_in_transit` | `shipment.in_transit` | off | off | off | Available but off by default (too chatty) |
| `shipment_out_for_delivery` | `shipment.out_for_delivery` | off | on | on | Arriving today; COD amount to keep ready |
| `shipment_delivery_failed` | `shipment.delivery_failed` | on | on | fallback | Why it failed, what happens next, help contact |
| `shipment_delivered` | `shipment.delivered` | on | on | off | Delivered; invoice and return window |
| `order_cancelled` | `order.cancelled` | on | on | fallback | Cancelled; refund note when prepaid |
| `refund_processed` | `refund.processed` | on | on | fallback | Amount, reference, days to reach the account |
| `return_approved` | `return.approved` | on | on | off | Pickup or drop-off instructions |
| `return_rejected` | `return.rejected` | on | on | off | Reason, help contact |

Channel modes: `on` sends; `off` doesn't; `fallback` (SMS only) sends only when WhatsApp can't
reach the shopper: no WhatsApp opt-in, template not approved, a send error, or a `failed` receipt
such as "not a WhatsApp user". Out for delivery goes on both because missing that message means a
failed delivery. The defaults live in `notification-settings`; an owner or manager can change any
cell, for example SMS `on` for every step.

With the defaults, a prepaid order sends about 5 WhatsApp messages and 1 SMS (costs below).

## How a message is sent

```
a Shiprocket tracking webhook arrives, or staff mark a parcel shipped (manual shipping)
  -> shipping/services/transition.ts validates, records, emits shipment.shipped { tenantId, orderId, shipmentId, attempt }
  -> notifications handler, once per channel the milestone's rule allows:
       recipient = order contact phone or email; locale = order locale
       preferences, template approval and caps checked -> otherwise a `skipped` log with the reason
       (WhatsApp skipped and SMS set to fallback -> the SMS is queued right away instead)
       create a notification-logs doc (status `queued`, dedupeKey); duplicate key = already handled, stop
       enqueue job notifications/send { tenantId, logId } to run at sendAfter
  -> job: re-read order and parcel, skip if stale, render variables, connector.send()
       log `sent` + providerMessageId
  -> provider webhook: delivered | read | failed -> update the log
       `failed` and the milestone has SMS fallback -> new SMS log + job
```

## Rules

- **Only through this module.** No code calls a messaging connector directly to reach a shopper;
  it emits an event. That is what guarantees consent checks, dedupe, caps and logging.
- **Dedupe.** `dedupeKey = <milestone>:<order|shipment|refund|return id>:<attempt>:<channel>`, unique
  per tenant on `notification-logs`. A repeated status, a double click or a retried webhook sends
  nothing new. `attempt` lets a second failed delivery send a second message.
- **Packed delay.** The packed message waits 15 minutes (tenant setting) and is dropped if the
  parcel has shipped by then, because staff often mark both together.
- **Quiet hours.** Messages created between 21:00 and 09:00 (tenant timezone) wait until 09:00,
  except out for delivery and delivery failed. A courtesy rule, set per tenant.
- **Stale check at send time.** A queued message is skipped if the order was cancelled meanwhile
  (except the cancellation message itself) or the parcel already moved past that step.
- **Caps.** At most 10 messages per recipient per day per store, and a daily SMS cap per store set
  by platform admins (default 2,000, alert at 80%). Protects against loops and SMS pumping
  (docs/14).
- **Retries.** Provider errors and timeouts retry with backoff (jobs default, max 5); then the log
  is `failed` and the fallback rule applies.
- **Phone numbers.** Indian mobiles only in MVP: `+91` and 10 digits starting 6 to 9, stored E.164.
- **Variables.** Plain text only: strip newlines and tabs, collapse repeated spaces, cap the length
  (WhatsApp rejects parameters with newlines; a DLT variable holds at most 30 characters). Only the
  path of a link is variable, never its domain.

## Templates

WhatsApp and SMS can only send text approved in advance, separately for each vendor. A row in
`notification-templates` is one milestone (and variant) on one channel in one language, holding the
exact approved text and the provider's reference.

| Channel | Approved by | Rules that matter |
|---|---|---|
| WhatsApp | Meta, per vendor WhatsApp Business account, usually within a day | Category **utility**: facts about this order only, no offers or promotion, or Meta moves it to the much pricier marketing category. Variables `{{1}}`, `{{2}}`...; don't start or end the body with a variable; give sample values when submitting. One "Track order" URL button whose path suffix is a variable |
| SMS | DLT, per vendor entity, category service implicit | Variables `{#var#}`, 30 characters each at most. Under 160 characters (one SMS) with realistic values. GSM-7 characters only, so write "Rs." not "₹" (₹ turns it into Unicode, 70 characters per SMS). Every URL and callback number in the text must be whitelisted on DLT; operators block the rest since 1 October 2024. One-way: shoppers can't reply |
| Email | Nobody; the vendor can edit the copy | React Email templates in `src/emails/` |

`order_confirmed`, `shipment_out_for_delivery` and `order_cancelled` have `prepaid` and `cod`
variants, because an approved template can't switch sentences.

**Starter library** (`src/modules/notifications/starter-templates/`, English in MVP): wording
written to pass both reviews. The platform team submits it for each vendor during onboarding.
`<Store>`, `<domain>` and `<support phone>` are filled in once per vendor before submission;
numbered variables are filled per message. Examples:

WhatsApp `shipment_shipped`
```
Hi {{1}}, your <Store> order {{2}} has shipped with {{3}}.
Tracking number: {{4}}
Expected delivery: {{5}}
We'll message you again when it is out for delivery.
Button "Track order": https://<domain>/t/{{1}}      (the button has its own variable)
```

WhatsApp `shipment_out_for_delivery` (cod)
```
Hi {{1}}, your <Store> order {{2}} is out for delivery today.
Please keep ₹{{3}} ready, as it is cash on delivery.
Button "Track order": https://<domain>/t/{{1}}
```

SMS `shipment_shipped`
```
Your <Store> order {#var#} has shipped via {#var#}, tracking no. {#var#}. Track: https://<domain>/t/{#var#}
```

SMS `shipment_out_for_delivery` (cod)
```
<Store>: your order {#var#} is out for delivery today. Please keep Rs.{#var#} ready for cash on delivery. Help: <support phone>
```

**Variables** (`src/modules/notifications/variables.ts`, pure functions of the order):
`customer.firstName`, `order.number`, `order.total` (`₹2,450`, or `Rs.2,450` in SMS),
`order.itemSummary` (`Basin mixer + 2 more`, 30 characters at most), `order.codDue`,
`shipment.courier`, `shipment.trackingNumber`, `shipment.expectedDate` (`Fri 9 Oct`),
`shipment.failureReason` (friendly text), `refund.amount`, `refund.reference`,
`return.instructions`, `links.trackCode` (the `<code>` in `/t/<code>`).

## Consent, opt-out and the tracking link

- **Basis.** Order updates go to the phone the shopper gave for that order, a legitimate use under
  the DPDP Act (s.7(a)) unless they object. WhatsApp also needs Meta's opt-in, which must say they
  will get messages on WhatsApp and name the business.
- **Checkout.** Under the phone field: "We'll send order updates to this number." Then a checkbox,
  "Send me order updates from <Store> on WhatsApp", ticked by default (tenant setting
  `whatsappOptInDefault`). Unticked means SMS and email only. Marketing consent stays a separate,
  unticked box and is never used for order updates (docs/14).
- **Opt-out.** Reply STOP on WhatsApp (or tap the "Stop updates" quick reply), the "Stop updates"
  switch on the tracking page, or account settings. Stored in `contact-preferences` by phone, so it
  works for guests too, and checked before every send. START turns WhatsApp back on.
- **Tracking link.** Every message links to `https://<vendor-domain>/t/<code>`: a tracking page on
  the vendor's own domain, so it is whitelisted on DLT once and needs no third-party link
  shortener. `<code>` is the random 10-character `orders.trackingCode`. The page shows the journey,
  courier and tracking number but never the address or contact details, which need login or OTP.

## Shopper replies on WhatsApp

A reply opens a 24-hour window in which free-form messages are allowed.

- **MVP** (separate sending number): STOP and START change preferences. Any other reply gets one
  automatic answer per 24 hours pointing to the vendor's chat number, phone and email
  (`site-settings.contact`). The reply shows on the order's message timeline and is emailed to the
  order managers. No inbox in MVP.
- **Phase 2** (coexistence, docs/09): the vendor's existing WhatsApp Business app number also sends
  the updates, so replies land in the app their staff already use, and the automatic answer is off.

## Admin (CMS)

- **Settings > Notifications** (owner, manager): the milestone table above with a channel switch
  per cell, a preview with a sample order, template status per channel (draft, submitted, approved,
  rejected with the reason, paused), "Send test to my phone", packed delay, quiet hours and the
  WhatsApp opt-in default.
- **Settings > Connectors** (owner): WhatsApp (number, display name, quality rating, messaging
  limit, "Sync templates") and SMS (sender ID, DLT entity ID, template IDs).
- **Order detail**: the parcel journey timeline, a Messages panel (channel, milestone, sent,
  delivered, read or failed with the reason), shopper replies, and "Resend" for order roles (once
  per 10 minutes per message).
- **Orders list**: bulk "Mark packed / shipped / out for delivery / delivered"; shipped can come
  from a CSV of order number, courier and tracking number.
- The owner gets an email when a channel breaks: token expired, template paused or rejected, low
  quality rating, DLT rejections. That channel falls back until fixed.
- **Marketing > Offer messages** (owner, manager, content editor): campaigns (audience, channels,
  preview, test send, schedule, results), the send window and weekly cap, and the status of
  WhatsApp offers (on or off, set by our team per vendor from super admin, with the marketing
  template status).
- **Marketing > Abandoned carts** (owner, manager): reminder timing and channels, the optional
  second-reminder coupon, and a list of abandoned carts with their reminder status and recoveries.
- **Marketing > Reviews** (owner, manager, content editor, support): the review request delay and
  channels next to the moderation queue.

## Vendor onboarding (platform team with the vendor)

Start both lists on day one: each approval usually takes a few days, so they run alongside the
storefront build. A vendor without approved channels still gets email updates.

WhatsApp (MVP, manual setup):
1. The vendor's Meta Business portfolio, with the platform team added as admins. Start business
   verification: unverified portfolios can message 250 customers a day, verified ones 2,000 and
   then more as quality allows.
2. A number for sending updates that is not active on the WhatsApp app (Phase 2 can reuse their
   WhatsApp Business app number through coexistence).
3. Create the WhatsApp Business account, register the number, display name = store brand.
4. The vendor adds a payment method in Meta, which bills the vendor directly.
5. Create a system user token; enter it with the phone number ID, account ID, app secret and
   webhook verify token in Settings > Connectors > WhatsApp; subscribe the webhook (docs/09).
6. Submit the starter templates from Settings > Notifications and wait for approval.
7. Send each template to a staff phone.

Email (MVP, platform Resend account):
1. Add the vendor's sending domain in Resend (for example `mail.aquaverde.in` for order emails
   and `news.aquaverde.in` for offer emails, the separate stream in docs/09).
2. The vendor adds the SPF, DKIM and DMARC records Resend shows to its DNS; offer emails need
   all three (Gmail and Yahoo bulk sender rules).
3. Until the domain verifies, order emails go from a platform address in the store's name
   (`<slug>@mail.<platform-domain>`, display name = store name) and offer emails don't go out.
4. Send a test order email and a test offer email (checking the one-click unsubscribe) to a
   staff inbox.

SMS (MVP, DLT + MSG91):
1. The vendor registers as a principal entity on one operator's DLT portal (company documents,
   about ₹5,900 including GST).
2. Register a sender ID of 6 letters (e.g. `AQUABT`) for service messages.
3. Register the starter SMS templates, exact text, as service implicit.
4. Whitelist the store domain (tracking links) and the support phone numbers.
5. The vendor opens an MSG91 account, links the DLT entity, sender ID and template IDs, and buys
   SMS credit.
6. Enter the MSG91 auth key and template IDs in Settings > Connectors > SMS; set the delivery
   report webhook (docs/09).
7. Send each template to a staff phone.

## Costs (the vendor pays the providers directly; checked 2 October 2026)

| Item | Price |
|---|---|
| WhatsApp utility message to an Indian number (Meta, per delivered message) | ₹0.115 + 18% GST |
| WhatsApp marketing message (offers, abandoned cart, review request on WhatsApp) | ₹0.8631 + 18% GST (Meta India rate card since 1 January 2026, unchanged on the 1 October 2026 card) |
| SMS through MSG91, depending on volume | about ₹0.16 to ₹0.25 + GST |
| DLT entity registration | about ₹5,900 including GST |
| Email | inside the platform's Resend plan |

With the default rules a prepaid order costs about ₹1 including GST (5 WhatsApp + 1 SMS). Offer
messages on WhatsApp cost about ₹1.02 each including GST, so a campaign to 5,000 opted-in shoppers
on WhatsApp costs the vendor about ₹5,100; by email it costs nothing extra. Meta updates its rate
cards often, so recheck before quoting a vendor. For comparison, Shiprocket's own
buyer WhatsApp messages cost about ₹0.99 each + GST and carry Shiprocket's name, so vendors switch
them off once their own channels are approved (docs/09).

## Phases

- **MVP**: parcel journey moved by Shiprocket tracking, or by staff for manual shipping (one by
  one or CSV bulk); this engine with rules, dedupe, delays, fallback and caps; email, WhatsApp (Meta
  Cloud API, manual setup) and SMS (MSG91); English starter templates; WhatsApp opt-in, STOP and
  the tracking page; admin settings, message timeline, resend and test send; staff alerts by email;
  the `dev-log` connector. Offer messages (moved into the MVP on 3 October 2026): offer campaigns,
  abandoned cart reminders and review requests by email and WhatsApp marketing templates, offer
  consent per channel, frequency cap, send window and one-click unsubscribe.
- **Phase 2**: COD confirmation on WhatsApp (below); a self-serve re-delivery form after a failed
  delivery; self-serve "Connect WhatsApp" (Embedded
  Signup, once the platform is a Meta Tech Provider) with coexistence; phone OTP login over SMS or
  WhatsApp (docs/05); Hindi and regional templates (`multilingual`); staff alerts on WhatsApp from a
  platform number; web push as a fourth channel (docs/13); dealer anniversary and trade scheme
  messages to trade partners; loyalty points statements.
- **Later**: a shared WhatsApp inbox for vendor staff, promotional SMS, RCS messages, and BSP
  connectors (Interakt, Gupshup...) for vendors who already pay for one.

### COD confirmation (Phase 2, flag `cod-confirmation`)

For a COD order the confirmation request replaces `order_confirmed`: a WhatsApp template with
"Confirm order" and "Cancel order" buttons. The order waits in `confirmed` with
`codConfirmation.status = pending`, and marking it packed shows a warning. A tap updates the order
(cancel releases stock). No answer after 24 hours: one reminder, then the order joins a "COD to
verify" list for staff to call, or is cancelled if the tenant chose that. Shoppers without WhatsApp
get an SMS with a link to confirm on the tracking page, since SMS can't take replies.

## Offer messages and reminders (MVP, `offer-messages`, `abandoned-cart`, `reviews`)

These are promotional, so they follow different rules from order updates:

| | Order updates (milestones above) | Offer messages |
|---|---|---|
| Consent | Legitimate use for the order (DPDP s.7(a)); WhatsApp opt-in ticked by default at checkout | Separate, **unticked** "offers" consent per channel (email, WhatsApp), from checkout, the offers sign-up, the account or the affiliate form (docs/14) |
| WhatsApp template category | `utility` (₹0.115 + GST each) | `marketing` (₹0.8631 + GST each, about ₹1.02; Meta's India rate card from 1 January 2026, unchanged on the 1 October 2026 card). Meta may also hold back marketing messages to a person who received many recently |
| SMS | Yes (fallback and out for delivery) | No. Promotional SMS needs a separate DLT promotional sender, DND scrubbing and a 10:00 to 21:00 window; it is Later |
| When | Any time, quiet hours 21:00 to 09:00 except urgent steps | Only inside the vendor's send window (default 10:00 to 20:00), never on order-update numbers' quiet hours |
| Caps | 10 per recipient per day | At most `maxPerShopperPerWeek` offer messages per shopper per store (default 2, platform cap 3), plus the 10 a day overall |
| Stop | STOP, tracking page, account | "Stop offers" quick reply on WhatsApp, one-click unsubscribe in email (with `List-Unsubscribe` headers), `/unsubscribe/<token>`, account. Stopping offers never stops order updates, and the other way round |

The offer messages:

| Key | Fired by | Email | WhatsApp | What it says |
|---|---|---|---|---|
| `offer_campaign` | an `offer-campaigns` doc the vendor schedules (often a scheme's start) | on | when `whatsapp-offers` is on for the vendor (our team switches it per vendor) and the template is approved | The offer in plain words, real end date, link to `/offers/<slug>` |
| `abandoned_cart_1` | `cart.abandoned` (no activity for `firstAfterMinutes`, default 60) | on | on, if allowed | "You left these in your cart", up to 3 items with photos, a restore link |
| `abandoned_cart_2` | 24 hours after the first, still not ordered (vendor can switch off) | on | off by default | A reminder, optionally with a single-use code from `secondCoupon` |
| `review_request` | `requestAfterDays` (default 5) after `order.delivered`, once per order | on | when `whatsapp-offers` is on and the vendor ticks WhatsApp in Reviews | Asks for a review of each item, links to `/review/<token>`; never offers a reward for a rating |

Rules:

- **Abandoned cart.** A cart qualifies when it has items, a contact (signed-in customer, or the
  checkout contact step) and offer consent for that channel, and no order followed. At most two
  reminders per cart and one reminder series per shopper per 7 days. Placing an order, emptying the
  cart or unsubscribing stops the series; an order within 7 days of a reminder counts as recovered
  (`orders.recoveredFromCart`). The restore link is `/cart/restore/<token>`; the token is random,
  stored hashed, valid 7 days.
- **Review request** is a request for feedback on an order, so the email can go to every buyer
  unless they turned off offer emails, but the WhatsApp version is a marketing template and needs
  WhatsApp offer consent.
- **Campaigns** are scheduled from the CMS (Offer messages) with an audience, channels and a send
  time inside the window. Before scheduling, the screen shows how many shoppers are eligible after
  consent, frequency caps and unsubscribes. Sending runs in batches through the same send job, so
  dedupe (`offer_campaign:<campaignId>:<recipient>:<channel>`), caps and logging apply.
- **WhatsApp offers are a platform switch.** Our team turns on `whatsapp-offers` per vendor from
  super admin (Vendor features) when the vendor asks for it (mudit, 3 October 2026); vendors can't
  switch it on themselves. Until then offers and reminders go by email only.
- **WhatsApp marketing templates** are approved by Meta per vendor like the order templates; a
  starter set (scheme launch, abandoned cart, review request) is submitted when our team switches
  WhatsApp offers on for that vendor. Each has a "Stop offers" quick reply button. Offer messages never use the
  utility templates, and order updates never carry offers.
- **Email** offer messages go from the vendor's verified domain on the platform's Resend account
  (a separate stream from order emails, so complaints about offers don't affect order email
  delivery), with the store's address in the footer.

## Emails outside the order journey

These aren't milestones (no channel choice, no WhatsApp or SMS), but they go through the same
module so logging, caps and the `dev-log` connector apply. Templates live in `src/emails/`; shopper
emails carry the store's name and domain, staff emails the platform's.

| Email | Trigger | To | Module |
|---|---|---|---|
| Login or verification code | `/auth/otp/send`, `/guest-orders/otp/send` | Shopper | identity |
| Password reset link | `/auth/password/forgot` | Shopper | identity |
| Staff invite (set your password) | `/staff/invites`, resend | Staff | identity |
| Enquiry received, with reference number | `POST /enquiries` | Shopper | enquiries |
| New enquiry | `POST /enquiries` | Assigned staff or owner | enquiries |
| New order, delivery failed, parcel lost | order and parcel events (docs/11) | `staffAlertEmails` | notifications |
| Channel broke (token, template, quality, DLT) | messaging health job | Owner | notifications |
| Import finished, with error file | import job done | Uploader | import-export |
| Export ready, expiring link | export job done | Requester | import-export |
| Low-stock digest | daily job | Catalog roles | inventory |
| Data export ready | privacy request export job | Shopper | identity |
| Subscription past due, trial ending | daily subscription check | Owner | tenancy |
| Affiliate application received, approved or rejected | affiliate status change | Applicant | affiliate |
| New affiliate application | `POST /affiliate/apply` | Owner, managers | affiliate |
| Payout statement (PDF) and "payout details changed" | statement marked paid; `PATCH /affiliate/me/payout` | Affiliate | affiliate |
| Review published, with the vendor's reply if any | review moderated | Reviewer | reviews |
| New reviews waiting (daily digest) | daily job | Review moderators | reviews |
| Scheme starts or ends today | `switch-schemes` | Owner, managers | promotions |
| Bulk coupon codes ready (CSV link) | coupon batch job | Requester | promotions |

## Adding a milestone (checklist)

1. Add the key to `MILESTONES` with its trigger event, default channel modes and variables.
2. Make sure the owning module emits that event with ids only (docs/11).
3. Write starter templates for each channel: WhatsApp utility, DLT text under 160 GSM-7
   characters, email.
4. Add the defaults to the `notification-settings` seed. The migration adds the row for existing
   tenants with every channel `off`, because their templates aren't approved yet.
5. Tests below; update the milestone table in this file.

## Testing

- Unit: variable rendering and length limits (SMS under 160 GSM-7 characters with the longest
  realistic values), dedupe keys, channel and fallback decisions, quiet hours and packed delay.
- Integration: tenant isolation for every notification collection; the same status twice sends
  once; opt-out and unapproved templates skip with a reason; a WhatsApp `failed` receipt triggers
  the SMS fallback; webhook signature and token checks; one tenant's webhook can't touch another
  tenant's logs.
- Offer messages: no offer consent on a channel -> `skipped` (`no_offer_consent`); the weekly cap and
  send window hold messages back; "Stop offers" and one-click unsubscribe stop offers but never
  order updates (and the other way round); a Resend complaint or hard bounce suppresses that email;
  an abandoned cart gets at most two reminders and none after an order; the review request goes
  once per order; `whatsapp-offers` off means no WhatsApp offer is ever queued.
- Contract tests for each messaging connector against recorded fixtures; no live calls in CI.
- E2E: a recorded Shiprocket "picked up" webhook (or staff marking a manual parcel shipped) ->
  exactly one WhatsApp message and one email reach the `dev-log` connector with the right
  variables, and the tracking link opens that order.
- `local` and `staging` use the `dev-log` connector unless real credentials are set; production
  refuses it.

Sources for the provider rules and prices above: the Sources list in `research/features.html`.
