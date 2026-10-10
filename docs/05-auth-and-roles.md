# 05 Auth and roles

There are two separate auth collections with different security needs.

| Collection | Who | Login surface | Strategy |
|---|---|---|---|
| `users` | Platform admins and vendor staff | `admin.<platform-domain>/admin` | Payload built-in local auth (email + password), 2FA (TOTP) required for platform admins, recommended for vendor owners |
| `customers` | Shoppers, affiliates (MVP) and trade partners (Phase 2) | Vendor storefront domain | Custom Payload auth strategy, scoped per tenant |

## users (staff)

- Fields: `email`, `name`, `platformRole` (`super-admin` | `support` | none),
  `tenants[]: { tenant, roles: ('owner'|'manager'|'catalog-editor'|'order-manager'|'content-editor'|'support')[] }`
  (array provided by the multi-tenant plugin), `twoFactor`, `lastLoginAt`, `status`.
- Created only by platform admins (MVP) or by a tenant `owner` for their own tenant, always by
  **invite**: the user is created with `status: invited` and gets an email with a single-use link
  (token stored hashed, valid 72 h, resend allowed) to set a password; platform roles also set up
  two-step login before the first sign-in completes. Endpoints in docs/07 (`/staff/invites`).
  **As built (Sprint 1):** `inviteStaff` in `src/modules/identity` creates the user with an unusable
  random password and reuses Payload's reset-password token as the invite (72 h, single use, a
  resend replaces it); the link opens Payload's own `/admin/reset/<token>` page, and setting the
  password flips `status` to `active`. Payload stores that token unhashed, which differs from the
  line above: see docs/open-items. Inviting an email that already has an account adds the store to
  that account instead. The plan's staff limit is checked on every invite.
- Two-step login (TOTP, authenticator app): Payload's built-in auth has none, so the Sprint 1 auth
  spike picks a Payload 3 plugin (for example `payload-totp`) or writes it; secrets encrypted with
  `CONNECTOR_ENC_KEY`'s scheme; platform admins can reset it, which writes an audit log entry.
  **Two-step sign-in, as built (10 October 2026, mudit asked for the wireframes in full):** our
  own TOTP (`src/lib/auth/totp.ts`, RFC 6238, 6 digits, 30 s, one step of drift either way) and
  `src/modules/identity/services/twoStep.ts`. The secret is sealed with the connector key scheme
  in `users.twoFactorSecret`, which no API can read or write. Our sign-in page
  (`/admin/login`, replacing Payload's view) asks for the password, then the code; the Users
  `beforeLogin` hook refuses an account with two-step on unless the code came with it, so
  Payload's own `/api/users/login` can't skip it, and a password reset drops the session it
  creates for such an account. Five wrong codes lock two-step for 15 minutes; a code is never
  accepted twice. Our team (platform roles) must set it up: until they do, the admin shows only
  the setup screen. Vendor staff turn it on or off from their own account page (off needs a
  current code). Super admins reset it for a lost phone (Team and access, a vendor's Staff tab,
  or the person's page), audited as `two_factor_reset`.
- Password policy: min 10 chars (a `beforeOperation` hook on create, update and reset, since
  Payload's own minimum is 3), breached-password check (k-anonymity HIBP) optional, lockout after
  5 failed attempts for 15 minutes (`auth.maxLoginAttempts`, `lockTime`). Disabled accounts get the
  same "email or password is incorrect" message as a wrong password.
- Session: Payload JWT in an HTTP-only, Secure, SameSite=Lax cookie on the admin domain. 8 h expiry.

**Owners manage their staff (as built, 3 October 2026).** The Staff and roles screen
(`/admin/staff`) lets a store owner invite, change roles and remove colleagues; the same
service backs the super admin's vendor Staff tab. Membership rows are never edited through the
users collection by store staff (the plugin's array field is super-admin only); the endpoints in
docs/07 check the owner role in that store and refuse to leave a store without an owner.

**Writes check the target store.** On create and update Payload accepts any query result from an
access function, so `tenantRoleOrPlatform` and `featureGatedAccess` also compare the incoming
`tenant` with the stores where the user holds the role. A catalog editor in store A who is a
content editor in store B can't create a category in B.

### Staff permission matrix

| Capability | super-admin | support | owner | manager | catalog-editor | order-manager | content-editor | support (tenant) |
|---|---|---|---|---|---|---|---|---|
| Tenants, plans, subscriptions, feature flags (incl. each vendor's WhatsApp offers switch) | ✓ | read | read own | - | - | - | - | - |
| Settings of a switched-on feature (`feature-flags.config` on the feature's own screen; not `enabled`, not fields marked platform in docs/08) | ✓ | read | ✓ | ✓ | - | - | - | - |
| Manage a vendor's store (full edit in its CMS, audited) | ✓ | - | - | - | - | - | - | - |
| View a vendor's store as support (read-only, audited) | ✓ | ✓ | - | - | - | - | - | - |
| Enable connectors allowed by plan / set keys | ✓ | - | ✓ | - | - | - | - | - |
| Staff users of tenant | ✓ | read | ✓ | - | - | - | - | - |
| Products, categories, attributes, CSV import | ✓ | read | ✓ | ✓ | ✓ | read | - | read |
| Pages, menus, banners | ✓ | read | ✓ | ✓ | - | - | ✓ | - |
| Media library (upload, alt text) | ✓ | read | ✓ | ✓ | ✓ | - | ✓ | - |
| Dealers | ✓ | read | ✓ | ✓ | - | - | - | - |
| Orders, refunds, invoices, shipments | ✓ | read | ✓ | ✓ | - | ✓ | - | read |
| Customers | ✓ | read | ✓ | ✓ | - | read | - | read |
| Enquiries, warranty, service requests | ✓ | read | ✓ | ✓ | - | ✓ | - | ✓ |
| Store settings (GST, shipping, policies) | ✓ | - | ✓ | ✓ | - | - | - | - |
| Schemes and coupons | ✓ | read | ✓ | ✓ | read | read | read | read |
| Offer messages (campaigns) | ✓ | read | ✓ | ✓ | - | - | ✓ | - |
| Abandoned carts (list and reminder settings) | ✓ | read | ✓ | ✓ | - | - | - | - |
| Reviews (approve, reject, reply) | ✓ | read | ✓ | ✓ | - | - | ✓ | ✓ |
| Affiliates (approve, set commission) | ✓ | read | ✓ | ✓ | - | read | - | - |
| Record affiliate payouts, see payout details | ✓ | - | ✓ | - | - | - | - | - |
| Trade accounts (Phase 2) | ✓ | read | ✓ | ✓ | - | read | - | read |
| Shopper notification settings and templates | ✓ | read | ✓ | ✓ | - | read | - | - |
| Resend a message to a shopper | ✓ | - | ✓ | ✓ | - | ✓ | - | - |
| Reports | ✓ | read | ✓ | ✓ | - | ✓ | - | - |

### Platform admins inside a vendor's store

"Super admin" means our team only (mudit, 3 October 2026), and it has complete control of every
store. The platform panel holds what is ours (vendors, plans, billing, features, connectors,
domains, staff); everything inside a store is done in that store's CMS, so there is one set of
screens and one set of rules:

- **Manage store** (super-admin only): opens the vendor's CMS with full edit rights on every
  collection in the matrix above, including owner-only actions (payment keys, staff, payouts). The
  admin gives a reason once per session (for example "Vendor asked us to set up Diwali scheme");
  the session is time-boxed to 2 hours, a banner on every CMS page says "You are managing
  Aquaverde as platform admin", and every write goes to `audit-logs` with the admin, the reason and
  the change. The vendor owner sees these entries in the store's recent changes.
- **View as support** (support and super-admin): the same CMS read-only, also logged with a reason.
- Super admins can't see decrypted secrets either (connector keys stay "Saved · hidden"), and
  shopper data is used only to run the vendor's store, as the vendor's processor (docs/14).

Implement both as a platform-admin session scoped to one tenant (`actingTenant` in the session),
so every access check and query still filters on that one tenant.

**As built (4 October 2026).** The session is `users.storeSession` (store, mode, reason, start,
end), opened from the vendor overview ("Manage store", "View as support") through
`POST /api/admin/v1/platform/store-session` and ended from the banner. The admin is split into
two workspaces (`src/admin/workspace.ts`, `src/access/storeSession.ts`):

- **Platform panel**: what our team sees without a session. Only platform screens (vendors,
  plans, subscriptions, team, staff users); store screens are hidden and their addresses answer
  "not found". Access gives platform staff **no store data at all** outside a session, except
  feature switches (platform data kept per store, `platformOutsideStore`). Platform services keep
  using the Local API with `overrideAccess`, so onboarding, billing and the vendor tabs are
  unchanged.
- **Store CMS**: what a store's staff see, and our team during a session: the same menu, screens
  and feature switches as that store's own staff, with the platform screens hidden. Access is
  scoped to the session's store (`tenantRoleOrPlatform`, `featureGatedAccess`); `view` is
  read-only. Every create, update and delete during `manage` writes `store_managed_change` to
  `audit-logs` with the session's reason (`src/hooks/storeSessionAudit.ts`); opening and ending
  write `support_access`. Pages and products also show "(platform team)" as their last editor.
- The session is per account, not per browser tab: opening a store switches every tab of that
  login to it, and "End session" (or the 2 hours running out) brings them all back to the
  platform panel. Opening a second store ends the first.
- Known limit: a scheduled publish runs as the person who scheduled it. If our team scheduled it
  during a session that has ended by then, the job is refused; staff of the store should
  schedule, or the admin re-schedules from a new session.

Implement as functions in `src/access/` (`isPlatformAdmin`, `hasTenantRole(roles)`,
`tenantRoleOrPlatform(roles)`), composed per collection. Never inline role strings in collections;
import from `src/access/roles.ts`.

## customers (shoppers)

**As built (7 October 2026):** ADR 0003. Shoppers sign in on the store's own domain with an
email code (which also creates the account) or an optional password; the session is a random
token in an HTTP-only cookie, stored hashed per store, 30 days, revoked by "Log out" or "Log out
of all devices". Guests reach an order's details by signing in with the order's email: the code
brings their guest orders into the account, so there is no separate guest-order code. The
sections below are the original design notes.

### Why a custom strategy

Payload's local strategy makes `email` unique across the whole collection, but our shoppers are
separate per store, so the same email must be able to exist once per tenant. Use
`auth: { disableLocalStrategy: true, strategies: [customerStrategy] }` (or `loginWithUsername`
with an internal `tenantId:email` username; pick one in a spike and record ADR 0003). Unique index
`(tenant, email)` and `(tenant, phone)`.

### Login methods

| Method | Phase | Notes |
|---|---|---|
| Email + password | MVP | Argon2id or bcrypt (cost 12) hash |
| Email OTP (passwordless) | MVP | 6 digits, 10 min expiry, 5 attempts, hashed in DB, rate-limited per email + IP |
| Phone OTP (SMS/WhatsApp) | Phase 2 | Most Indian shoppers expect it. Uses the vendor's own SMS and WhatsApp connectors (docs/09): a DLT-registered OTP template, or a WhatsApp authentication template |
| Google sign-in | Later | Per tenant OAuth client, optional |
| Guest checkout | MVP | Order holds email/phone; see "Guest access to an order" below |

### Guest access to an order

Order numbers are sequential (`AQV-10482`), so a number alone never opens an order.

- **Right after checkout**: `POST /checkout` sets an HTTP-only, signed `order_access` cookie on the
  store's domain naming that order (24 h). The confirmation page and the invoice download check it.
- **Later**: the `/t/<code>` tracking page (random 10-character code) shows the parcel journey only.
  Address, contact details and the invoice need a 6-digit code sent to the order's email
  (`/guest-orders/otp/*`, docs/07), which grants a 30-minute cookie for that order.
- **Creating an account** (offered on the confirmation page) with the same email attaches earlier
  guest orders placed with that email, after the email code proves ownership.

### Session

- Access token: short JWT (15 min) + refresh token (30 days, rotated, stored hashed in
  `customer-sessions` with device info) in HTTP-only Secure cookies on the vendor's domain.
- Each token carries `tenantId`; every customer endpoint checks it equals the host's tenant.
  A token from store A is useless on store B.
- Logout revokes the refresh token. "Log out everywhere" revokes all.

### Account recovery and verification

Password reset by emailed link (single-use token, 30 min). Email verification required before
saving addresses for B2B accounts; optional for retail.

## Affiliates (MVP) and trade partners (Phase 2)

They are `customers` with an approval status, not another auth collection. They sign in on the
vendor's store like any shopper (email code or password) and can also shop as retail customers.

- **Affiliates (MVP)**: `customers.roles` includes `affiliate` once the vendor approves their
  application (docs/06 `affiliates`). The affiliate dashboard (`/affiliate/dashboard`) needs a
  signed-in customer with an approved affiliate record in the same tenant. Payout details (UPI ID
  or bank account, PAN) are encrypted like connector secrets and shown masked; only the vendor
  owner sees them in full, and only when recording a payout.
- **Trade partners (Phase 2)**: `customers.roles` includes `trade`, linked to a `trade-accounts`
  record whose `type` is `dealer`, `retailer`, `wholesaler` or `designer` (company, GSTIN, price
  list, credit terms). Vendor staff approve each application. Email verification is required
  before trade prices show.

`customers.roles` replaces the earlier `accountType` field: every customer can shop, and roles add
what else the account may do, so one person can be a shopper, an affiliate and (Phase 2) a
designer at the same store.

## API authentication summary

| Caller | Auth |
|---|---|
| Admin UI / staff REST | Payload JWT cookie (users) |
| Storefront browser | Customer JWT cookie; anonymous allowed for catalog and cart (cart id cookie) |
| Webhooks | Provider signature (HMAC) with the tenant's webhook secret |
| Server-to-server / scripts | Payload API keys on a dedicated `users` record with minimal role (`useAPIKey: true`) |
| Vendor public API (Later) | Per-tenant API keys with scopes, hashed in DB |

## Security checklist for auth code

CSRF: Payload's `csrf` allow-list includes platform and tenant domains; custom POST endpoints
check `Origin`. Rate limits on login, OTP send, OTP verify, password reset. Never reveal whether an
email exists ("If an account exists, we sent a code"). Log auth events (success, failure,
lockout) without passwords or OTPs. Support access to a vendor's CMS, two-step resets and role
changes also write `audit-logs` (docs/06), with the reason for support access.
