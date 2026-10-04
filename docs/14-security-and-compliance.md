# 14 Security and compliance

## Threats we design against

| Threat | Control |
|---|---|
| Cross-tenant data leak | Three isolation layers + isolation tests (docs/04). Tenant from host only |
| Price/total tampering | Server computes all totals; client sends only ids and quantities |
| Payment spoofing | Signature verification (client callback + webhook), webhook is source of truth |
| Webhook replay | Event id dedupe; reject events older than 24 h |
| Account takeover | Rate limits, lockout, 2FA for staff, OTP expiry/attempts, generic messages |
| Secret exposure | Connector secrets AES-256-GCM encrypted with `CONNECTOR_ENC_KEY` (rotatable, key id stored with ciphertext); never returned by APIs (`hidden: true` fields + read access false) |
| XSS | React escaping; rich text rendered via Lexical serializer, no `dangerouslySetInnerHTML` with user HTML; CSP header |
| CSRF | SameSite=Lax cookies, Origin check on custom POST endpoints, Payload `csrf` allow-list |
| SSRF via CSV image URLs | Only http/https, block private IP ranges, max size 10 MB, timeout 10 s, content-type check |
| Malicious uploads | MIME sniffing, allow-list types, size limits, images re-encoded, PDFs served with `Content-Disposition` |
| Enumeration / scraping | Rate limits on search, availability, auth; robots rules |
| Spam enquiries | Honeypot field, rate limits, optional Cloudflare Turnstile per tenant |
| SMS pumping (fake COD orders or OTP requests that make us send paid messages) | `+91` mobiles only, checkout and OTP rate limits, 10 messages per recipient per day, per-store daily SMS cap with an alert (docs/18) |
| Fake message receipts or replies | WhatsApp webhooks verified with `X-Hub-Signature-256`; MSG91 reports carry a per-tenant secret token; tenant routing never trusts the body alone |
| Fake tracking updates | Shiprocket sends a per-tenant token (`x-api-key`) but no signature, so every update is re-read from Shiprocket's tracking API by AWB before a parcel moves |
| Message content injection | Shopper text never reaches a template; variables are stripped of newlines and length-capped; WhatsApp and SMS wording is fixed by Meta and DLT approval |
| Injection | Payload query builder only; never pass raw user objects into `where`; zod validation |
| Order snooping (sequential order numbers) | A number alone never opens an order: signed `order_access` cookie after checkout, email code later, random `/t/<code>` for tracking only (docs/05) |
| Coupon guessing and abuse | Apply rate limit per cart and IP; the error never lists other codes; per-shopper limits checked by phone and email at checkout, not only per account; usage counted atomically |
| Discount tampering | Discounts come only from the promotions engine on the server; a scheme that ended or a coupon that ran out is re-checked at checkout |
| Referral fraud | Signed `ref` cookie; self-referrals (same customer, phone or email) blocked; commission only after the return window; reversed on cancel or return; staff see unusual patterns (many orders from one address or device) in the affiliate report |
| Fake or bought reviews | Only delivered order items can be reviewed, one review per item; staff can approve, reject with a reason or reply, never edit; rejecting for a low rating isn't allowed (below) |
| Offer message spam and complaints | Separate offer consent per channel, frequency cap, send window, one-tap unsubscribe, complaints and hard bounces stop emails, per-store WhatsApp marketing caps (docs/18) |
| Affiliate payout details | Encrypted like connector secrets, masked everywhere, full view only for the owner while recording a payout; every payout is written to `audit-logs` |

## Headers (set in `proxy.ts` / `next.config`)

`Strict-Transport-Security`, `Content-Security-Policy` (allow Razorpay checkout, analytics IDs
from settings), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy` (geolocation only on dealer locator), `X-Frame-Options: DENY` (admin).
As built (3 October 2026): `src/proxy.ts` sets nosniff, the referrer policy, `X-Frame-Options:
SAMEORIGIN`, a permissions policy and HSTS (production) on storefront responses. The CSP needs
per-request nonces for Next's inline scripts and is still open (docs/open-items).

## Rate limits (defaults)

Login 5/min/IP+email, OTP send 3/10 min/recipient and 20/hour/IP, checkout 10/min, enquiries
5/10 min, search 60/min, availability 30/min, coupon apply 10/10 min per cart and IP, offers
sign-up 5/10 min, review submit 5/hour, review helpful and report 30/hour, `/r/<code>` 60/min. Implement with Upstash Redis (sliding window) when
running on multiple instances; in-memory fallback for dev.

## Personal data (India DPDP Act 2023 and Rules 2025)

Each vendor is the **Data Fiduciary** for its shoppers; the platform is a **Data Processor**.
Our contract with vendors covers this, including that our super admins can manage the vendor's
store and its shoppers' data on the vendor's behalf (docs/05 "Manage store"), always with a
logged reason, and never use it for anything else. The Rules' consent, notice and rights duties apply in full
from 13 May 2027; have a lawyer review the checkout and consent wording before then. The product
must let vendors comply:

- Notice and consent: clear privacy policy page per store; marketing consent is a separate,
  unticked checkbox, stored with timestamp, source and policy version. Offer messages (scheme
  announcements, abandoned cart reminders) go only to shoppers who gave it, per channel: "Send me
  offers and new launches from <Store> by email" and a separate "...on WhatsApp", because Meta's
  opt-in must name WhatsApp and the business. Withdrawing is as easy as giving: one tap in every
  offer message, the unsubscribe page, or account settings. Offer emails carry `List-Unsubscribe`
  and `List-Unsubscribe-Post` headers (one-click unsubscribe, which Gmail and Yahoo require from
  bulk senders).
- Order updates: WhatsApp and SMS go to the phone the shopper gave for that order (a legitimate
  use, s.7(a)); checkout says so, and the WhatsApp checkbox names the store as Meta requires.
  STOP, the tracking page or account settings opt out; opt-outs are kept as a hashed phone after
  account deletion. Order updates never carry marketing (docs/18).
- Purpose limitation: collect only what checkout and delivery need.
- Rights: customers can view and correct profile, download their data (JSON export), and request
  deletion (`DELETE /me`): anonymize customer; keep orders and invoices as required by GST law
  (retain 8 years) with personal fields minimized.
- Breach handling: runbook in `docs/runbooks/breach.md` (to write); notify vendor promptly.
- Retention: abandoned carts 30 days, OTPs 10 min, sessions 30 days, logs 30 to 90 days,
  notification logs 90 days, affiliate click counters 13 months, referral ledger and payout
  statements 8 years (tax records), affiliate payout details until the affiliate leaves plus the
  tax retention period.
- Affiliates are data principals too: their application, PAN and bank details are collected only
  to run the program and pay them. The affiliate dashboard shows order dates and values, never the
  shopper's name, phone or address.
- No PII in logs, URLs, analytics events or error reports (Sentry `beforeSend` scrubbing).

## Consumer protection and Legal Metrology

Each store is the vendor's own e-commerce site, so the vendor carries these duties and the product
must make them easy:

- Consumer Protection (E-Commerce) Rules 2020: legal name, address, customer care contact and a
  **grievance officer** (name, designation, contact) shown on the store (`site-settings`), with
  complaints acknowledged in 48 hours and resolved within a month; return, refund, exchange,
  warranty and delivery terms on policy pages; total price with its break-up before payment.
- Legal Metrology (Packaged Commodities) Rules, rule 6(10): each product page shows the label
  declarations (manufacturer, packer or importer name and address, country of origin, generic
  name, net quantity, MRP, consumer care); products can't go live without them (docs/06 `legal`).
  Since 1 July 2026 (rule 6(10A)), stores selling imported goods need a searchable and sortable
  country-of-origin filter (docs/12).
- CCPA's Guidelines for Prevention and Regulation of Dark Patterns, 2023 (13 listed patterns,
  including false urgency, basket sneaking, drip pricing, confirm shaming, forced action and
  subscription traps), which the CCPA asked e-commerce platforms to self-audit against in 2025.
  The kit never shows a countdown that isn't the scheme's real end, never "only 2 left" unless it is
  the real stock, never adds items or charges the shopper didn't choose (no pre-ticked add-ons or
  donations), shows the COD fee and delivery charge before payment, and never pre-ticks offer
  consent. The MRP struck through must be the product's real MRP, not a raised one for the sale.
- Reviews: publish verified-purchase reviews whatever their rating; reject only for abuse,
  personal data, spam, duplicates or text not about the product, with the reason kept; never
  write, buy or reward reviews (a review request can't offer a discount for a good rating); mark
  a review answered by the vendor as such. This follows the CCPA's fake review concerns and the
  voluntary BIS standard IS 19000:2022 on online consumer reviews.
- Affiliates who post about the store must say it is a paid partnership (ASCI's influencer
  advertising guidelines). The program terms the affiliate accepts say so; the vendor writes the
  terms, the kit shows them at application.

## Payments compliance

We never touch card data (Razorpay Checkout handles it), so PCI DSS scope is SAQ A level for
vendors. Do not build custom card forms.

## Secrets and access

`.env` never committed; `.env.example` lists every variable. Production secrets in Vercel/host
secret store. Rotate `PAYLOAD_SECRET` and `CONNECTOR_ENC_KEY` with a documented procedure.
Atlas: IP access list / private endpoint, separate DB users per environment, least privilege.
Staff 2FA mandatory for platform admins.

## Audit

MVP: `order-events`, auth logs and the `audit-logs` collection (docs/06) recording who changed
what: platform access to a vendor's CMS (manage or view, with a reason) and every change made while
managing it, feature flags, connectors, plans, staff and
roles, two-step resets, prices, refunds and store suspension. Later: a screen to browse it.

## Dependency hygiene

`pnpm audit` in CI, Renovate/Dependabot locally scheduled, pin Payload/Next versions together.
