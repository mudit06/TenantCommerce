# TenantEcom

Multi-tenant e-commerce SaaS for Indian manufacturers: each vendor gets its own branded PWA store
and CMS on one shared codebase (Next.js 16 + Payload CMS 3 + MongoDB).

**Status:** Sprint 1 in progress. The super admin (platform panel) is built: onboarding vendors,
plans, manual subscriptions, per-vendor feature switches, domains, staff invites and the audit log.
Vendor CMS screens, catalog, cart, orders and the storefront come in the next sprints
(`docs/17-roadmap.md`). What is still undecided: `docs/open-items.md`.

## Start here

- `CLAUDE.md`: rules and docs map for AI coding assistants (and a good summary for humans)
- `docs/00-overview.md`: decisions, glossary, phases
- `docs/01-architecture.md`: modular monolith, request flow, module map
- `research/features.html`: competitor feature research (open in a browser)
- `docs/wireframes/`: clickable wireframes of the super admin, vendor CMS and storefront (see its README)

## Quick start

Needs Node 22, pnpm 10 and Docker (for MongoDB).

```bash
cp .env.example .env                                 # then set PAYLOAD_SECRET and SEED_SUPER_ADMIN_PASSWORD
docker compose -f docker/docker-compose.yml up -d mongo   # MongoDB replica set
pnpm install
pnpm seed                                            # placeholder plans, first super admin, 2 demo stores
pnpm dev                                             # http://admin.localhost:3000/admin
```

Sign in with `SEED_SUPER_ADMIN_EMAIL` / `SEED_SUPER_ADMIN_PASSWORD` from `.env`. Without
`RESEND_API_KEY`, emails (staff invites, password resets) are printed to the dev server log, so you
can open invite links locally. `pnpm seed` prints the demo owners' set-password links.

Other commands:

| Command | What it does |
|---|---|
| `pnpm verify` | Local CI (docs/16): typecheck, lint, unit + integration tests, production build |
| `pnpm test:unit` / `pnpm test:int` | Vitest; integration tests use `MONGODB_TEST_URI` (any replica set, e.g. the docker one) or download an in-memory MongoDB |
| `pnpm create-tenant tenant.json` | Onboard a vendor from a script, same steps as the New vendor screen (example: `tests/fixtures/new-tenant.example.json`) |
| `pnpm generate:types` / `pnpm generate:importmap` | After changing collections / admin components |
| `docker compose -f docker/docker-compose.yml --profile app up --build` | Run the production image |
