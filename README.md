# TenantEcom

Multi-tenant e-commerce SaaS for Indian manufacturers: each vendor gets its own branded PWA store
and CMS on one shared codebase (Next.js 16 + Payload CMS 3 + MongoDB).

**Status:** planning. Docs and empty folder skeleton only; no application code yet.

## Start here

- `CLAUDE.md`: rules and docs map for AI coding assistants (and a good summary for humans)
- `docs/00-overview.md`: decisions, glossary, phases
- `docs/01-architecture.md`: modular monolith, request flow, module map
- `research/features.html`: competitor feature research (open in a browser)
- `docs/wireframes/`: clickable wireframes of the super admin, vendor CMS and storefront (see its README)

## Planned quick start (once code exists)

```bash
cp .env.example .env
docker compose -f docker/docker-compose.yml up -d   # Mongo replica set
pnpm install
pnpm seed                                            # 2 demo tenants
pnpm dev                                             # http://admin.localhost:3000/admin, http://demo-sanitary.localhost:3000
```
