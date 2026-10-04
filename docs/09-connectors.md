# 09 Connectors (payment, shipping, messaging)

A connector is a pluggable integration with an external provider, configured **per tenant**
with **the vendor's own credentials**. The platform never holds vendor money. Shopper WhatsApp and
SMS also go out on the vendor's own accounts, so they carry the vendor's brand (ADR 0005); email
is the exception, one platform Resend account sending in each vendor's name.

## Layout

```
src/connectors/
├─ core/
│  ├─ types.ts          # PaymentConnector, ShippingConnector, MessagingConnector interfaces
│  ├─ registry.ts       # provider key -> connector module
│  ├─ http.ts           # fetch wrapper: timeout 10s, 2 retries with jitter on 5xx/network, logging with redaction
│  ├─ secrets.ts        # encrypt/decrypt secretConfig (AES-256-GCM, key from CONNECTOR_ENC_KEY)
│  └─ getConnector.ts   # getPaymentConnector(tenantId, provider), getMessagingConnector(tenantId, channel) -> loads config, checks plan + enabled
├─ payment/razorpay/   payment/cod/
├─ shipping/manual/    shipping/shiprocket/
└─ messaging/email-resend/   messaging/whatsapp-meta/   messaging/sms-msg91/   messaging/dev-log/
```

Each connector folder: `index.ts` (implements interface), `config.ts` (zod schemas for
`publicConfig` and `secretConfig`, also used to render the admin form), `webhook.ts`,
`README.md` (provider docs links, test credentials source, quirks).

## Interfaces (shape, not final code)

```ts
interface PaymentConnector {
  key: 'razorpay' | 'cod' | string
  capabilities: { refunds: boolean; partialRefunds: boolean; upi: boolean; emi: boolean }
  createPayment(ctx, input: { order, amountMinor, currency, customer }): Promise<{ providerOrderId: string; clientParams: Record<string, unknown> }>
  verifyClientCallback?(ctx, payload): Promise<{ ok: boolean; providerPaymentId?: string }>
  handleWebhook(ctx, req): Promise<PaymentEvent[]>        // verified + normalized events
  refund(ctx, input: { transaction, amountMinor, reason }): Promise<{ providerRefundId: string; status: string }>
  testCredentials(ctx): Promise<{ ok: boolean; message?: string }>
}

interface ShippingConnector {
  key: 'manual' | 'shiprocket' | string
  checkServiceability(ctx, { fromPincode, toPincode, weightGrams, cod }): Promise<{ serviceable: boolean; codAvailable: boolean; etaDays?: [number, number]; rateMinor?: number }>
  createShipment(ctx, { order, packages }): Promise<{ awb?: string; trackingUrl?: string; labelUrl?: string; providerShipmentId?: string }>
  cancelShipment?(ctx, shipment): Promise<void>
  track?(ctx, shipment): Promise<ShipmentEvent[]>
  handleWebhook?(ctx, req): Promise<ShipmentEvent[]>
}

type Channel = 'email' | 'whatsapp' | 'sms'

interface MessagingConnector {
  key: 'resend' | 'meta-whatsapp' | 'msg91' | 'dev-log' | string
  channels: Channel[]
  capabilities: { deliveryReceipts: boolean; readReceipts: boolean; inbound: boolean; templateApi: boolean }
  send(ctx, input: {
    channel: Channel
    to: string                    // E.164 phone, or an email address
    template: TemplateRef         // approved provider template (WhatsApp name + language, MSG91/DLT ids) or rendered email
    variables: string[]           // rendered and sanitised, in template order
    buttonParams?: string[]       // WhatsApp URL button suffixes
    reference: string             // our notification-logs id; echoed in receipts where the provider supports it
  }): Promise<{ providerMessageId: string }>
  handleWebhook?(ctx, req): Promise<MessagingEvent[]>       // verified + normalized
  submitTemplate?(ctx, template): Promise<{ providerTemplateId: string; status: TemplateStatus }>
  listTemplates?(ctx): Promise<{ name: string; language: string; status: TemplateStatus; reason?: string }[]>
  testCredentials(ctx): Promise<{ ok: boolean; message?: string }>
}

type MessagingEvent =
  | { type: 'status'; providerMessageId: string; status: 'sent' | 'delivered' | 'read' | 'failed'; at: Date; error?: { code: string; message: string } }
  | { type: 'inbound'; from: string; text?: string; buttonPayload?: string; replyToProviderMessageId?: string; at: Date }
  | { type: 'template'; name: string; language: string; status: TemplateStatus; reason?: string }
```

`ctx` = `{ tenantId, config: { public, secret }, logger, payload }`.

Only the `notifications` module calls messaging connectors (docs/18). `getMessagingConnector`
returns the tenant's enabled connector for that channel, lowest `priority` first; for email it is
the platform's Resend connector with the tenant's sender name and verified domain (until the
domain verifies, a platform address in the store's name, docs/18 onboarding). Offer emails go out on a
separate Resend sending stream (its own subdomain, e.g. `news.<vendor-domain>`) with
`List-Unsubscribe` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers, and Resend's
webhook (`/api/webhooks/resend`) reports bounces and complaints back to `contact-preferences`.

## Razorpay (MVP)

Razorpay is our own `PaymentConnector` (ADR 0006: no ecommerce plugin, so no plugin adapter). A community `payload-razorpay` plugin exists but is
not production ready; read it for reference only.

Flow (Standard Checkout):

1. `POST /checkout` creates our order (`pending`) and calls Razorpay Orders API
   (`amount` in paise, `receipt` = our orderNumber, `notes.tenantId`, `notes.orderId`).
2. Browser opens Razorpay Checkout with `key_id` (public config) and `order_id`.
3. On success the browser posts the 3 values to `/payments/razorpay/verify`; we verify the HMAC
   signature `order_id|payment_id` with the key secret and mark `authorized/paid` optimistically.
4. Webhook `payment.captured` / `order.paid` is the source of truth: verify signature with the
   webhook secret, dedupe event id, mark order paid, emit `order.paid`.
5. Reconciliation job every 15 min: for orders `pending` > 30 min, fetch Razorpay order payments
   and settle or expire (releases reserved stock).

Config: `publicConfig { keyId }`, `secretConfig { keySecret, webhookSecret }`, `mode`
(`test|live`). Auto-capture on. Vendor sets the webhook URL
`https://admin.<platform>/api/webhooks/razorpay/<tenantId>` in their Razorpay dashboard (shown
in our admin with a copy button).

## COD (MVP)

A payment connector with no provider: `createPayment` returns immediately; order goes to
`confirmed` with `paymentStatus: pending`. It has no `connector-configs` row and isn't in
`plan.allowedConnectors`: it is offered when the `cod` feature flag is on (platform, capped by the
plan) and the vendor's `site-settings.checkout.codEnabled` is on. Rules from site-settings:
min/max order value, COD fee, serviceable pincodes (`shipping-zones.codAllowed`). Phase 2: COD confirmation on WhatsApp before
dispatch (`cod-confirmation`, docs/18), which reduces parcels returned to origin (RTO).

## Manual shipping (MVP)

For vendors who deliver with their own vans or courier contracts, or haven't finished Shiprocket
KYC yet. Serviceability and rates from `shipping-zones` / `shipping-rates`. Staff move each parcel
through the journey in docs/11 (packed, shipped with courier + tracking number, out for delivery,
delivered or delivery failed), one order at a time or in bulk from a CSV. Each step messages the
shopper per docs/18.

## Shiprocket (MVP)

Key `shiprocket`, folder `shipping/shiprocket/`. Moved from Phase 2 into the MVP on 2 October 2026
for post-order handling. The vendor's own Shiprocket account: its KYC, wallet, courier contracts
and pickup address. Shiprocket charges the vendor's wallet and remits COD cash to the vendor's
bank; the platform never touches either.

Config: `publicConfig { pickupLocation (the pickup nickname in Shiprocket), pickupPincode, courierMode (auto|choose), defaultBox { lengthMm, breadthMm, heightMm } }`,
`secretConfig { apiEmail, apiPassword, webhookToken }`. The API user is created in the vendor's
Shiprocket panel (Settings > API) with an email different from the panel login. Its login returns
a token valid for 240 hours: cache it encrypted, refresh after 9 days or on a 401.

| Step | Our side | Shiprocket API |
|---|---|---|
| Pincode check (product page, checkout) | Serviceable? COD possible? ETA? Cached 24 h per pincode, COD and weight band | Courier serviceability |
| Pack (one order or bulk) | Parcel `packed` with box size and weight, plus the e-way bill number above ₹50,000 | Create order, assign AWB (courier picked by the vendor's Shiprocket priority, or chosen by staff from the list with price and ETA), generate label, request pickup |
| Print | Labels merged with our GST invoices, and the manifest for the pickup person | Label, manifest |
| Cancel before pickup | Parcel `cancelled` | Cancel order |
| Tracking | Parcel moves through the journey; shopper messages per docs/18 | Tracking webhook, track by AWB |
| Failed delivery (NDR) | "Action needed" list: re-attempt (new date, address line, phone) or return to the vendor | NDR action `re-attempt` or `return` |
| Return pickup | An approved return books a reverse pickup from the shopper to the vendor | Return order |

- **Shopper delivery charge** still comes from the vendor's own `shipping-rates` (flat, by weight
  or value, free above an amount). Shiprocket's courier rates are used only when booking a parcel.
  Shipping zones stay a vendor policy (block pincodes or COD) and the fallback when Shiprocket's API
  is down: a pincode is serviceable only when both say yes.
- **Units and money at the edge.** Shiprocket takes kg, cm and rupees; convert from our grams, mm
  and paise inside the connector only. The COD amount to collect is the order's grand total, and
  COD orders ship as one parcel in the MVP because Shiprocket collects COD per shipment.
- **E-way bill.** A parcel worth more than ₹50,000 needs an e-way bill number before pickup
  (generated on the government portal in the MVP; automation through a GSP is Later). Shiprocket
  prints it on the label.
- **Webhook.** `https://admin.<platform>/api/webhooks/courier/<tenantId>`, saved in the vendor's
  Shiprocket panel with our per-tenant token. Shiprocket refuses webhook URLs containing
  "shiprocket", "kartrocket", "sr" or "kr", hence `courier`; the platform domain must avoid them
  too. It sends the token as `x-api-key` and expects a 200: answer 200 at once, ignore and log a
  wrong token, process in a job. There is no event id, so dedupe on AWB + status + scan time, and
  re-read the AWB's tracking from the API before changing state, so a leaked token or a late event
  can't move a parcel.
- **Status map** (`shipping/shiprocket/statusMap.ts`, built from Shiprocket's status list): picked
  up -> `shipped`; in transit, reached hub -> `in_transit`; out for delivery; undelivered ->
  `delivery_failed` with its reason; delivered; RTO initiated or in transit -> `rto_initiated`; RTO
  delivered -> `rto_delivered`; cancelled; lost, damaged or destroyed -> `lost`. Pickup exceptions
  and reschedules keep the parcel `packed` and alert staff. Unknown statuses are logged and ignored.
- **Missed webhooks.** Every 3 hours, parcels in flight with no update for 24 hours are re-tracked
  by AWB.
- **Shiprocket's own buyer messages.** Shiprocket can message buyers itself under its own name
  (WhatsApp at about ₹0.99 per message + GST, plus SMS and email). A vendor may keep them on until
  its own WhatsApp and SMS are approved (docs/18), then switches them off so shoppers don't get
  every update twice.

## WhatsApp: Meta Cloud API (MVP)

Key `meta-whatsapp`, folder `messaging/whatsapp-meta/`. The vendor's own WhatsApp Business
account, number and display name on Meta's Cloud API. No BSP in between, so no markup or monthly
fee; Meta bills the vendor's own payment method.

| Setup mode | Phase | How credentials arrive | Webhook |
|---|---|---|---|
| `manual` | MVP | Platform team creates a system user token in the vendor's Meta Business portfolio and enters it | Vendor's Meta app -> `/api/webhooks/whatsapp/<tenantId>`, verified with that app's secret |
| `embedded-signup` | Phase 2 | Vendor owner clicks "Connect WhatsApp"; Meta's Embedded Signup creates or links their account and number (including their existing WhatsApp Business app number, through coexistence) and returns a business token | Platform's Meta app -> `/api/webhooks/whatsapp`, tenant found from `phone_number_id`, verified with `META_APP_SECRET` |

Embedded Signup needs the platform to be a Meta **Tech Provider**: business verification, then app
review for advanced access to `whatsapp_business_messaging` and `whatsapp_business_management`.
Apply during the MVP so Phase 2 isn't waiting on Meta. With coexistence, messages sent through the
API also appear in the vendor's WhatsApp Business app, and the number is capped at 20 messages a
second (plenty at our volumes).

Config: `publicConfig { phoneNumberId, wabaId, displayPhone, setupMode }`,
`secretConfig { accessToken, appSecret, webhookVerifyToken }` (the last two in manual mode only).
`phoneNumberId` is unique across all tenants because it routes platform-app webhooks to a tenant.

- **Send**: `POST /<version>/<phoneNumberId>/messages` with `type: 'template'`, the template name,
  language code, body parameters and the URL button suffix. Graph API version pinned in
  `META_GRAPH_API_VERSION`. The returned message id (`wamid`) is the `providerMessageId`.
- **Webhook**: answer the GET handshake (`hub.verify_token`); on every POST verify
  `X-Hub-Signature-256` (HMAC-SHA256 of the raw body with the app secret), dedupe, enqueue, return
  200 fast. Fields used: message `statuses` (sent, delivered, read, failed with error code),
  inbound `messages` (text and button replies) and `message_template_status_update`.
- **Templates**: submitted with `POST /<wabaId>/message_templates` from Settings > Notifications:
  category `UTILITY` for order updates, `MARKETING` for offer messages (scheme launch, abandoned
  cart, review request on WhatsApp, docs/18) with a "Stop offers" quick reply button. Status
  arrives by webhook and a daily sync. If Meta recategorises a utility template as marketing, the
  template is disabled for order updates and the owner is told, since order updates must stay
  utility.
- **Marketing delivery**: Meta can refuse to deliver a marketing message to a person who has
  received many recently (error `131049`); the log is `failed` with that reason, there is no SMS
  fallback for offers, and the shopper isn't retried that week.
- **Limits and health**: messaging limits are per business portfolio (250 customers a day before
  business verification, 2,000 after, then automatic increases while quality stays good). A daily
  job checks the token, the number's quality rating and its messaging limit. An invalid token, a
  paused template or low quality switches that channel to fallback and emails the vendor owner.
- **Errors**: "not a WhatsApp user" or undeliverable -> `failed`, SMS fallback; template paused or
  disabled -> `failed` + owner alert; rate limits -> retry with backoff.

## SMS: MSG91 with DLT (MVP)

Key `msg91`, folder `messaging/sms-msg91/`. The vendor's own MSG91 account, linked to the vendor's
DLT registration (entity ID, sender ID and templates are registered by the vendor; we supply the
template text, docs/18).

Config: `publicConfig { senderId, dltEntityId }`, `secretConfig { authKey, webhookToken }`. The
MSG91 template ID and DLT template ID for each milestone live on its `notification-templates` row.

- **Send**: MSG91's template (Flow) API with the template ID, the number and the variables (MSG91
  writes them `##var##`, DLT writes `{#var#}`). Pass our notification-logs id as the custom
  reference (`CRQID`) so delivery reports match.
- **Delivery reports**: MSG91 webhook "On Report Received" ->
  `/api/webhooks/msg91/<tenantId>?token=<webhookToken>`, sent once the operator returns a final
  status. Check the per-tenant token, match the reference, update the log.
- Alphanumeric sender IDs are one-way: SMS can't receive replies, so SMS opt-out goes through the
  tracking page or account settings.

## Dev log (local and staging)

Key `dev-log`, folder `messaging/dev-log/`. Implements every channel without calling a provider:
writes the rendered message to the server log and reports it delivered a second later, so journeys
can be tested before Meta or DLT approval. On by default in `local` and `staging`; refused in
production.

## Adding a connector (checklist)

1. Folder under the right kind; implement the interface; zod config schemas.
2. Register in `core/registry.ts` with `kind`, `label`, `logo`, `docsUrl`.
3. Add the provider key to plans that allow it.
4. Webhook endpoint: verify signature (or a per-tenant secret token when the provider doesn't
   sign), dedupe, enqueue, return 200 within 2 s.
5. `testCredentials` used by the "Test connection" button in admin.
6. Tests with recorded fixtures (no live calls in CI); contract test against the interface.
7. Never log secrets; `http.ts` redacts `authorization`, `key_secret`, `password`, `token`.
