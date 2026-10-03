# 08 Modules and feature flags

Every optional capability is a **module** with a **feature key**. A tenant gets a module only if:

`plan.allowedModules includes key` AND `feature-flags(tenant, key).enabled === true`

Platform admins flip flags; the plan is the ceiling. Core modules (catalog, cart, orders...) are
always on and have no flag.

## Feature keys

| Key | Module | Default for new tenant | Phase | Typical industries |
|---|---|---|---|---|
| `guest-checkout` | orders | on | MVP | all (the only switch for guest checkout; vendors have no separate setting) |
| `cod` | payments | on | MVP | all (platform switch; the vendor then turns COD on and sets its rules in Payments, `site-settings.checkout`) |
| `enquiries` | enquiries | on | MVP | all except fast fashion |
| `enquire-only-products` | catalog | off | MVP | sanitary, hardware, project items |
| `dealer-locator` | dealers | off | MVP | sanitary, locks, decor |
| `downloads` | catalog | on | MVP | sanitary, locks, hardware |
| `whatsapp-button` | content | on | MVP | all |
| `pincode-check` | shipping | on | MVP | all |
| `size-guide` | catalog | off | MVP | clothing |
| `product-videos` | catalog | on | MVP | sanitary, locks, hardware |
| `schemes` | promotions | on | MVP | all (festival schemes and special launch offers; retail shoppers in MVP) |
| `coupons` | promotions | on | MVP | all |
| `wishlist` | reviews | on | MVP | all |
| `reviews` | reviews | on | MVP | all |
| `offer-messages` | notifications | on | MVP | all (offer emails) |
| `whatsapp-offers` | notifications | off | MVP | all; our team switches it on per vendor as the vendor asks (mudit, 3 October 2026). Sends offer messages and abandoned cart reminders on WhatsApp; needs `offer-messages` and the vendor's approved WhatsApp marketing templates |
| `abandoned-cart` | cart | on | MVP | all (needs `offer-messages`) |
| `affiliate` | affiliate | off | MVP | decor, clothing, hardware (commissions to affiliates) |
| `warranty` | warranty | off | Phase 2 | locks, sanitary, hardware |
| `service-requests` | warranty | off | Phase 2 | locks, sanitary |
| `spare-parts` | spare-parts | off | Phase 2 | sanitary, locks |
| `compare` | catalog | off | Phase 2 | sanitary, locks, hardware |
| `installation-booking` | warranty | off | Phase 2 | locks, sanitary |
| `b2b` | b2b | off | Phase 2 | hardware, sanitary, locks, decor (trade accounts: dealers, retailers, wholesalers, interior designers; `config.tradeTypes` picks which) |
| `trade-schemes` | promotions | off | Phase 2 | schemes for trade partners, including dealer anniversary offers (needs `b2b` and `schemes`) |
| `loyalty` | loyalty | off | Phase 2 | clothing, decor, hardware |
| `lookbook` | content | off | Phase 2 | decor, clothing, sanitary |
| `appointments` | enquiries | off | Phase 2 | sanitary, decor |
| `multilingual` | i18n | off | Phase 2 | all |
| `push-notifications` | notifications | off | Phase 2 | all |
| `cod-confirmation` | orders | off | Phase 2 | clothing, decor |
| `blog` | content | off | Phase 2 | all |
| `gift-cards` | promotions | off | Later | clothing, decor |
| `configurator`, `visualizer` | - | off | Later | lighting, decor, sanitary |
| `size-advisor` | catalog | off | Later | clothing |
| `barcode-scan` | search | off | Later | hardware, dealers |
| `visual-search` | search | off | Later | sanitary (identify a fitting for spare parts) |

Two-level features: when a vendor has its own on/off for a feature (COD), the flag is the
platform's permission and the vendor's setting is the choice; both must be on.

Connectors (Razorpay, Shiprocket, WhatsApp, SMS...) are not flags: they are enabled per tenant in
`connector-configs`, limited by `plan.allowedConnectors` (docs/09-connectors.md). Order updates on
WhatsApp and SMS need no flag either: they start once the vendor's messaging connectors are on and
its templates are approved (docs/18-notifications.md).

## Industry presets

When the platform team creates a tenant, `tenants.industry` pre-selects flags (still capped by the
plan). Presets live in `src/modules/tenancy/presets.ts`; the research behind them is in
`research/features.html`.

| Industry | Preset flags (on top of the defaults above) |
|---|---|
| sanitary | `downloads`, `product-videos`, `enquire-only-products`, `dealer-locator` (+ Phase 2: `warranty`, `service-requests`, `spare-parts`, `compare`, `appointments`, `b2b` with dealers and designers) |
| locks | `downloads`, `product-videos`, `dealer-locator` (+ Phase 2: `installation-booking`, `warranty`, `service-requests`, `compare`, `blog`, `b2b` with dealers) |
| hardware | `downloads`, `enquire-only-products`, `dealer-locator`, `affiliate` (+ Phase 2: `b2b` with all four trade types, `trade-schemes`, `loyalty`, `compare`) |
| decor | `dealer-locator`, `affiliate` (+ Phase 2: `lookbook`, `appointments`, `blog`, `cod-confirmation`, `loyalty`, `b2b` with designers) |
| clothing | `size-guide`, `dealer-locator`, `affiliate` (+ Phase 2: `cod-confirmation`, `loyalty`); `enquiries` and `product-videos` off |

`schemes`, `coupons`, `wishlist`, `reviews`, `offer-messages` and `abandoned-cart` are on by
default for every industry; a vendor that doesn't want one has it switched off.

## Checking a flag

```ts
// server only
import { isFeatureEnabled, requireFeature } from '@/modules/tenancy'

if (await isFeatureEnabled(payload, tenantId, 'b2b')) { ... }   // branch
await requireFeature(payload, tenantId, 'warranty')               // throws 404 FEATURE_DISABLED in endpoints
```

- A feature is enabled when the plan allows it, its switch is on, its phase has shipped and every
  feature it depends on is enabled (`effectiveFeatures`). Phase 2 switches stay locked until their
  module exists (`AVAILABLE_PHASES` in `src/modules/features.ts`).
- `isFeatureEnabled` reads the database today; the per-tenant cache (tag `t:<id>:features`) comes
  with the storefront, and the tag is already revalidated on every flag change.
- The storefront receives the enabled list from `GET /store` to show/hide UI, but every endpoint
  and server action still checks on the server.
- Admin: collections of a disabled module are hidden for that tenant
  (`admin.hidden: ({ user }) => !featureEnabledForCurrentTenant(...)`) and their access returns false.

## Module config

A module may need per-tenant settings (e.g. affiliate commission %, B2B min order value). Store in
`feature-flags.config`, validated by the module's zod schema in `feature.ts`:

```ts
export const feature = defineFeature({
  key: 'affiliate',
  label: 'Affiliate program',
  phase: 1,
  configSchema: z.object({
    defaultCommissionPercent: z.number().min(0).max(50).default(5),
    cookieDays: z.number().int().min(1).max(90).default(30),
    minPayoutMinor: z.number().int().default(50000),         // ₹500
    autoApproveApplications: z.boolean().default(false),
  }),
  dependsOn: [],          // e.g. 'service-requests' dependsOn 'warranty'
})
```

Configs of the Phase 1 growth features (defaults in brackets). Vendor owners and managers edit them
(field-level access: `config` only, never `enabled`, docs/05) on the feature's own CMS screen (Schemes, Coupons, Reviews, Offer messages, Abandoned carts,
Affiliates); platform admins can also edit them from the vendor's Features tab, and the caps
marked "platform" are theirs only:

| Key | Config |
|---|---|
| `schemes` | `maxLiveSchemes` (10), `showCountdown` (true: only ever counts down to the scheme's real end) |
| `coupons` | `showPublicCodesAtCart` (true), `maxCodesPerBulkRun` (5,000) |
| `reviews` | `holdForApproval` (true), `showOnProductPages` (true), `requestAfterDays` (5), `requestChannels` (email; WhatsApp only with `whatsapp-offers`), `allowPhotos` (true, up to 4) |
| `offer-messages` | `maxPerShopperPerWeek` (2; platform cap 3), `sendWindow` (10:00 to 20:00), `maxRecipientsPerCampaign` (platform, 20,000). WhatsApp offers are the separate `whatsapp-offers` flag, which only platform admins switch |
| `abandoned-cart` | `firstAfterMinutes` (60), `secondAfterHours` (24, or off), `secondCoupon` (optional coupon id), `channels` (email, WhatsApp) |
| `b2b` (Phase 2) | `tradeTypes` (`dealer`, `retailer`, `wholesaler`, `designer`), `minOrderMinor` per type, `creditTypes` |
| `loyalty` (Phase 2) | `pointsPer100` (1), `pointValueMinor` (100 = ₹1), `maxRedeemPercent` (20), `expiryMonths` (12) |

Dependencies: `abandoned-cart` and `whatsapp-offers` need `offer-messages`; `trade-schemes` needs `b2b` and `schemes`;
`service-requests` needs `warranty`.

## Adding a module (checklist)

1. Create `src/modules/<name>/` with the standard layout (03-folder-structure.md).
2. Write `feature.ts` with key, label, phase, config schema, dependencies.
3. Add its `feature.ts` to the feature registry `src/modules/features.ts` (the one file allowed to
   import another module's `feature.ts`, which holds data only), and wire its collections,
   endpoints and jobs in `src/payload.config.ts`.
4. Guard collections (admin hidden + access) and endpoints with `requireFeature`.
5. Add default kit components in `src/storefront/kit/components/<feature>/`; render them only when
   the feature is enabled.
6. Add the key to the plans that include it (seed data).
7. Tests: feature off => endpoints 404 and admin hidden; feature on => happy path; tenant isolation.
8. Update the table above and docs/17-roadmap.md.
