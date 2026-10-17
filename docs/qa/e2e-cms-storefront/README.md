# End-to-end test: vendor CMS ↔ storefront, local (Claude in Chrome)

One test suite in four phases. It checks the **vendor CMS** and the **storefront** together: each
CMS change is followed to the store, and each shopper action to the CMS. It covers parity (both
sides show the same thing), how quickly changes reach the store, behaviour at each screen width,
and the full selling flow. Written 15 October 2026 against the code on
`claude/adoring-cori-we1zlg` (commit 27d6805), run on **your own machine** with the local QA
database `tenantecom_qa`. Part A in every phase file is already filled in with that database's
real values (store addresses, products, pincodes, scheme, coupon, COD rules).

| Where | Address |
|---|---|
| Admin (vendor CMS) | http://localhost:3000/admin, signed in as `owner@homeorbit.example` |
| Store under test | http://home-orbit.localhost:3000 (Home Orbit, live, its own vendor UI) |
| Second store (isolation) | http://demo-sanitary.localhost:3000 (Demo Sanitary, default look) |

## Why one suite in four phases

- Most cases are **round trips**: save in the CMS, check the store, change it back. A CMS-only
  script can't see the store and a storefront-only script can't change data, so splitting by
  portal would lose the parity checks.
- Each phase file is **self-contained** (values, rules, stop rules, report format), so you paste
  one file per Claude in Chrome conversation and its context stays small.
- Phases run **in order** and pass values forward (QA product slug, order numbers) in the
  report's "Values created" block, which you paste into the next phase as `VALUES_IN`.

| Phase | File | Changes data? | Cases | Time |
|---|---|---|---|---|
| 1 · Baseline: read-only parity, responsiveness, SEO, access | `phase-1-baseline-parity.md` | No | 67 | 60–90 min |
| 2 · Data changes: catalogue and content, CMS → store, with cache timings | `phase-2-data-changes.md` | Yes (QA records; settings restored) | 45 | ~90 min |
| 3 · Selling: cart, coupons, schemes, COD checkout, pack, invoice, ship, deliver, cancel, return, refund | `phase-3-selling-orders.md` | Yes (QA orders) | 58 | 90–120 min |
| 4 · Accounts, wishlist, reviews, enquiries, offers, affiliates, security and isolation, **clean-up** | `phase-4-accounts-security-cleanup.md` | Yes, then removes it | 48 | ~90 min |

Case IDs are `P<phase>-<module>-<nnn>`; they don't clash with the SA, VC, E2E and SF suites.

## Before each run (about 10 minutes)

1. **Mongo** running in Docker (`docker compose -f docker/docker-compose.yml up -d mongo`).
2. **Start the QA app** from the code checkout (`TenantCommerce`, branch `claude/adoring-cori-we1zlg`):
   in Claude Code start the **`app-qa`** launch entry, or in a terminal:

   ```bash
   DATABASE_URI="mongodb://localhost:27017/tenantecom_qa?replicaSet=rs0&directConnection=true" pnpm dev:fresh
   ```

   Wait until http://home-orbit.localhost:3000 answers (the first page compiles for up to a minute).
3. **Optional fresh data** (same `DATABASE_URI`): `pnpm seed`, `pnpm seed:home-orbit`,
   `pnpm demo:selling home-orbit`, `pnpm demo:orders home-orbit`. Part A's values match this data.
4. **Keep the `pnpm dev` terminal visible.** Nothing is really emailed or sent on WhatsApp:
   shopper login codes, order emails, review, unsubscribe and cart-reminder links are printed
   there as `[dev-log email]` / `[dev-log whatsapp]`. Claude in Chrome can't read the terminal, so
   it asks you to paste them.
5. **Chrome** with the Claude extension. Sign in to the CMS yourself as `owner@homeorbit.example`
   when Claude asks (or paste that local test account's password in the chat). The password is
   not stored in these files.
6. **New `QA_TAG` per run.** Change `QA-E2E-1015` in Part A to today's MMDD if you run the suite
   again, so new QA records don't clash with old ones.
7. Close heavy apps: the dev server and Chrome together need several GB of memory.

## How to run a phase

1. Open a new Claude in Chrome conversation.
2. Paste the whole phase file. From Phase 2 on, first replace `VALUES_IN = none` in Part A with the
   previous report's "Values created" block.
3. Send the run prompt at the end of the file, e.g.:
   > Run Phase 1 of this script: every case in Part C, in order, using the values in Part A.
   > Follow Part B's rules. Don't change any data in this phase. Report in the Part B format.
4. Answer when Claude asks for a sign-in, a code or a link from the terminal; say "skip" to block
   that case.
5. **Paste the final report back into this Claude Code session.** I'll check each failure
   against the code, separate real bugs from setup issues, and fix or raise them.

## If something goes wrong mid-run (Part B, "Stop or continue")

- **A case fails:** recorded, the run carries on.
- **A record a later case needs isn't created** (QA category, product, page, coupon, scheme,
  order): the later cases are marked Blocked; Claude never uses a real record instead.
- **Claude stops at once** when the app is down (3 pages in a row), when it changed something
  that isn't QA data or can't put a setting back (maintenance mode), or on a Critical security
  finding. It sends the report so far.
- **Checkpoints:** after each module Claude posts a one-line checkpoint with the values so far.
  If the dev server crashes or the conversation fills up, restart the app and say
  "resume from <next case ID>" with the last checkpoint's values (in a new conversation, paste the
  phase file first).

## What the code says the store must do (where the expectations come from)

- **Cache.** Storefront pages are cached per store. Saving a product, variant, category,
  attribute set, brand, document, media, page, redirect, menu, banner, dealer, store setting,
  scheme or coupon clears that store's cache straight away (`src/hooks/revalidateStorefront.ts`,
  the wrapped collections in `src/payload.config.ts`), so the change must show **on the first
  reload**. Payment and COD switches are cached for 60 s (`getSellingInfo`). Schemes that start or
  end by their own dates and scheduled pages are switched by jobs that run every minute. Anything
  slower is logged as a stale-cache defect.
- **The live Diwali 2026 scheme** takes 10% off all Door hardware (up to ₹1,500) and doesn't work
  with coupons. That's why PRODUCT_A shows an offer price and the QA category goes under
  Bathroom accessories (no scheme), and why Phase 3 has exact expected totals for both cases.
- **Money** shows in ₹ with Indian digit grouping. Totals, GST (CGST+SGST for Maharashtra
  pincodes, IGST for others), coupons and schemes are worked out on the server. Phase 3 tries to
  tamper with totals from the browser.
- **The admin only answers on the admin host** (`src/proxy.ts`). Phase 1 also checks that
  `/admin` on `home-orbit.localhost:3000` doesn't give a working admin: the proxy's matcher skips
  `/admin` paths.

## Not covered locally

- Razorpay (not connected in the QA database): only cash on delivery is tested.
- Production-only behaviour: HTTPS and HSTS, the service worker and offline page, "coming soon"
  for draft stores, real email and WhatsApp delivery, Shiprocket booking.
- Speed: dev-server timings are recorded for comparison only. For Lighthouse (target 90+ mobile on
  product and listing pages), use a production build: `pnpm build`, then `pnpm start`.
- Human checks: reduced motion, the PWA install prompt on a real phone, email rendering.
