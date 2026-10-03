# ADR 0005: Each vendor sends WhatsApp and SMS from its own accounts

- Status: accepted (2 October 2026)
- Context: shoppers get order updates on WhatsApp and SMS (docs/18). Each vendor is a separate
  brand on its own domain, and shoppers never see the platform's name. On WhatsApp the sender
  name shoppers see is the display name of the sending WhatsApp Business account; on SMS it is
  the sender ID registered on DLT by the sending company. WhatsApp quality rating and messaging
  limits belong to the sending number and business portfolio.
- Options: (a) one platform WhatsApp number and SMS sender for every vendor; (b) each vendor's own
  WhatsApp Business account and DLT registration, connected per tenant like Razorpay.
- Decision: (b). Shopper messages go out from the vendor's own WhatsApp number (Meta Cloud API)
  and SMS sender ID (MSG91 + DLT), on accounts the vendor owns and pays for. The platform keeps a
  sender of its own only for alerts to vendor staff (Phase 2), where the platform is the brand.
  Email is unchanged: one platform Resend account sends in each vendor's name.
- Why not (a): messages would carry a name shoppers don't know; one vendor's blocks and reports
  would lower the shared quality rating and throttle every vendor; Meta's opt-in must name the
  business the shopper hears from, and DLT sender IDs and templates belong to the registered
  entity; the platform would pay for every message and re-bill vendors, while it never holds
  vendor money today.
- Consequences: every vendor needs Meta and DLT paperwork at onboarding, done by the platform team
  and taking days; until it's approved that vendor's shoppers get email only. Costs land on the
  vendor's own bills (about ₹1 per order with default rules). One vendor's channel problem never
  affects another. Phase 2 needs the platform to become a Meta Tech Provider for self-serve
  "Connect WhatsApp".
