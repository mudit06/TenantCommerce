# TenantEcom

Multi-tenant e-commerce SaaS for Indian manufacturers: each vendor gets its own branded PWA store
and CMS on one shared codebase (Next.js 16 + Payload CMS 3 + MongoDB).

**Status:** the super admin (platform panel) is about 80% built; the vendor CMS and the storefront
are next. Screen-by-screen status: **`docs/progress.md`**. Open questions: `docs/open-items.md`.
Nothing is deployed yet.

## Start here

- `docs/progress.md`: what is built and what is left, per screen
- `CLAUDE.md`: rules and docs map for AI coding assistants (and a good summary for humans)
- `docs/00-overview.md`: decisions, glossary, phases
- `docs/01-architecture.md`: modular monolith, request flow, module map
- `research/features.html`: competitor feature research (open in a browser)
- `docs/wireframes/`: clickable wireframes of the super admin, vendor CMS and storefront (see its README)

## Run it locally

You need **Node.js 22**, **pnpm 10** (`corepack enable` turns it on) and **Docker Desktop** running
(for MongoDB). No cloud accounts are needed to run locally.

```bash
pnpm install
pnpm setup:local                                          # creates .env, generates the secrets, prints your login
docker compose -f docker/docker-compose.yml up -d mongo   # MongoDB replica set on port 27017
pnpm seed                                                 # plans, first super admin, 2 demo stores
pnpm dev                                                  # http://localhost:3000/admin
```

Sign in at http://localhost:3000/admin with the email and password `pnpm setup:local` printed
(they are also in `.env` as `SEED_SUPER_ADMIN_EMAIL` and `SEED_SUPER_ADMIN_PASSWORD`).

What else to know:

- `.env` is never committed (it holds secrets). `pnpm setup:local` never overwrites an existing
  `.env`; every variable is explained in `.env.example`.
- Emails (staff invites, password resets) are printed in the `pnpm dev` terminal while
  `RESEND_API_KEY` is empty, so you can open invite links locally. `pnpm seed` also prints the demo
  store owners' set-password links.
- Running `pnpm seed` again is safe: it skips what already exists.
- To start from an empty database: `docker compose -f docker/docker-compose.yml down -v`, then
  `up -d mongo` and `pnpm seed` again.

### Troubleshooting

| Problem | Fix |
|---|---|
| `Invalid environment variables` on start | Run `pnpm setup:local`; it lists what is still empty in `.env` |
| `MongoServerSelectionError` / `ECONNREFUSED 27017` | Start Docker Desktop, then `docker compose -f docker/docker-compose.yml up -d mongo` and wait about 10 seconds |
| Port 3000 or 27017 already in use | Stop the other app, or change the port mapping in `docker/docker-compose.yml` and `DATABASE_URI` |
| Signed in, but saving fails or the page loops back to login | Open the admin at `ADMIN_URL` from `.env` (default `http://localhost:3000`). Locally `localhost`, `127.0.0.1` and `admin.localhost` on port 3000 all work; any other address must be set as `ADMIN_URL` |

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | Run the app with hot reload |
| `pnpm verify` | Local CI (docs/16): typecheck, lint, unit + integration tests, production build |
| `pnpm test:unit` / `pnpm test:int` | Vitest. Integration tests use `MONGODB_TEST_URI` (any replica set, for example `mongodb://localhost:27017/x?replicaSet=rs0&directConnection=true`) or download an in-memory MongoDB |
| `pnpm create-tenant tenant.json` | Onboard a vendor from a script, same steps as the New vendor screen (example: `tests/fixtures/new-tenant.example.json`) |
| `pnpm generate:types` / `pnpm generate:importmap` | After changing collections / admin components |
| `docker compose -f docker/docker-compose.yml --profile app up --build` | Run the production image locally |

## Plans

Interim plans (3 October 2026, to be revised; prices plus 18% GST):

| Plan | Price | Products | Starting offer |
|---|---|---|---|
| Starter | ₹3,499 a month | up to 500 | ₹9,999 for the first 3 months, then monthly |
| Enterprise | ₹6,999 a month | up to 10,000 | none |

Change them any time in the admin under Billing, Plans (the starting offer is the "Introductory
offer" field), or in `scripts/seedData.ts` for new setups. A database seeded before this change
keeps its old plans: edit them in the admin, or reset the database (see above) and seed again.

## Code map

- `src/modules/<module>/`: domain modules (tenancy, identity, audit so far), each with a public
  `index.ts` (docs/01, docs/03)
- `src/admin/`: shared admin shell (logo, nav, dashboard switch, UI primitives)
- `src/access/`, `src/fields/`, `src/lib/`: access rules, reusable fields, cross-cutting helpers
- `scripts/`: seed, create-tenant, local setup
- `tests/unit`, `tests/integration`: Vitest
