# ADR 0003: Shopper accounts as a plain collection with our own store-scoped sessions

- Status: **accepted** (built 7 October 2026 for M7, shopper accounts). docs/05, 06 and 07
  updated.
- Context: docs/05 "Why a custom strategy". Shoppers belong to one store, so the same email must
  exist once per store. Payload's local auth strategy makes `email` unique across the whole
  collection, and its JWT cookie is set for the admin's domain, not each vendor's domain. The
  storefront already talks to the server through server actions (cart, checkout, the tracking
  page switch), not Payload's REST auth routes.
- Options: (a) `customers` as a Payload auth collection with `disableLocalStrategy` and a custom
  strategy; (b) `loginWithUsername` with an internal `tenantId:email` username; (c) `customers`
  as an ordinary tenant-scoped collection, with sign-in, codes and sessions written in our own
  `customers` module.
- Decision: (c).
- Why: (a) and (b) still put shoppers next to staff in Payload's auth machinery (its `/api/customers/login`,
  `/me` and password-reset routes would need closing one by one), and neither knows about the
  store's domain. (c) gives us exactly the rules in docs/05 with little code:
  - Email code sign-in: 6 digits, kept as an HMAC, 10 minutes, 5 tries, rate limited per email
    and per IP, the same answer whether or not an account exists. The code creates the account,
    so every account has a proven email.
  - Password as an option, set from the profile: scrypt (Node's built-in, no new dependency),
    with a per-email lockout of 5 tries in 15 minutes.
  - Sessions: a random 32-byte token in an HTTP-only, SameSite=Lax cookie on the store's own
    domain, stored as a SHA-256 hash in `customer-sessions` with the store, device and expiry
    (30 days, sliding). Every read checks the session's store equals the request's store, so a
    session from store A is useless on store B.
  - "Log out" revokes this session; "Log out of all devices" revokes every session of the
    account.
- Why not a short JWT plus refresh token (docs/05's first sketch): an opaque token costs one
  indexed read per signed-in page, which the account pages and checkout do anyway, and it can be
  revoked at once. Nothing outside our server reads the token, so a self-contained JWT buys
  nothing.
- Consequences: the shopper's account pages (`/account`, `/account/orders/<number>`) and the
  checkout read the session in server code only. Staff see accounts on the Customers screen;
  the `customers` collection has no create or password access through the API. Phone OTP
  (Phase 2) and Google sign-in (later) add methods to the same module.
