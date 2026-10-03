# 16 Conventions and testing

## Code style

- TypeScript strict, no `any` (use `unknown` + zod). ESLint + Prettier enforced by lint-staged.
- Functions over classes. Services are plain async functions taking `(ctx | tenantId, input)`.
- Validate at the edge (endpoints, server actions, CSV rows, webhook payloads) with zod; trust
  typed data inside.
- Errors: throw `AppError(code, message, httpStatus)` from `src/lib/errors`; endpoints map to the
  API envelope. Never leak stack traces to clients.
- Imports via `@/` alias. No relative imports climbing more than two levels.
- One component per file; colocate small helpers. Server Components by default.
- No magic strings for statuses, roles, feature keys: import the enums.
- Dates stored UTC, displayed in `Asia/Kolkata` (or tenant timezone). Use `date-fns` / `Intl`.
- Money only through `src/lib/money` (`fromRupees`, `formatINR`, `allocate`, `add`, `multiply`).
- Comments explain *why*, not what.

## Git (local repo, no remote for now)

- Branch per task: `feat/<area>-<short>`, `fix/...`, `chore/...`.
- Conventional Commits (`feat(catalog): add attribute set validation`).
- Small commits; never commit `.env`, generated `payload-types.ts` changes without the schema change.
- **CI without a remote.** Until the repo has a remote, "CI" in these docs means `pnpm verify`:
  typecheck, lint, unit and integration tests, `next build`, the Docker image build and
  `pnpm audit`. A Husky pre-push hook runs it, and it must pass before merging a branch into
  `main`. Move the same script into hosted CI when a remote exists. (As built: `pnpm verify` runs
  typecheck, lint, all tests and `next build`; the Docker build, `pnpm audit` and the Husky hook are
  still to add.) Integration tests use the replica set in `MONGODB_TEST_URI` when set, otherwise
  `mongodb-memory-server-core` downloads one; each test file gets its own database.

## Testing pyramid

| Level | Tool | Must cover |
|---|---|---|
| Unit | Vitest | money, GST split, pricing, every scheme type and coupon rule, scheme vs coupon choice, discount allocation, commission and TDS maths, CSV row validation, state transitions, slug/number formatting |
| Integration | Vitest + Payload Local API + mongodb-memory-server (replica set) | **tenant isolation for every collection** (the same coupon code in two stores resolves to each store's own), access control per role, checkout service, stock reservation races, coupon per-shopper limits under parallel checkouts, scheme start and end at the exact minute, referral attribution and reversal, verified-purchase review rule, webhook idempotency, import job, message dedupe, opt-out and SMS fallback, offer consent and frequency cap |
| E2E | Playwright | per demo tenant: browse -> search -> PDP -> pincode -> cart -> checkout (Razorpay test mode) -> order in admin -> pack and book with recorded Shiprocket fixtures, replayed tracking webhooks to delivered (messages land in the `dev-log` connector) -> invoice -> refund; the same with manual shipping; a live scheme plus a coupon through checkout with the invoice showing the discount; an order from a `/r/<code>` link through to an approved commission; an abandoned cart reminder whose link restores the cart; a review from the review email to published; vendor CSV import; staff role restrictions |
| Visual/perf | Lighthouse CI | home, listing, PDP mobile ≥ 90 |

Test data: factories in `tests/fixtures/factories.ts` that always take a tenant.

## Definition of done (every PR)

1. Typecheck, lint, unit + integration tests pass.
2. New collection/endpoint covered by tenant-isolation and access tests.
3. Docs in `docs/` updated if behaviour, schema or API changed.
4. No secrets, no `console.log`, no TODO without an issue reference.
5. Mobile layout checked at 360px width.

## Prompts for AI assistants working here

- State which docs you read and which rule applies before writing code.
- Prefer extending an existing module over creating a new one.
- If a requirement conflicts with the hard rules in CLAUDE.md, stop and ask.
- When generating a collection, also generate: access functions, indexes, isolation test, docs update.
