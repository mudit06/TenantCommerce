# 02 Tech stack

Versions checked 2 October 2026. Pin exact versions in `package.json` and upgrade deliberately.

## Core

| Layer | Choice | Notes |
|---|---|---|
| Runtime | Node.js 22 LTS (24 when Payload 4 lands) | Same version locally, in Docker and on Vercel |
| Language | TypeScript 5.9, `strict: true` | Generated Payload types in `src/payload-types.ts`. TypeScript 6 and 7 are out, but Payload 3 is built and tested on 5.x; move with Payload 4 |
| Framework | Next.js 16.3.x (App Router), pinned 16.3.8 | `@payloadcms/next` 3.90 needs Next 16.3.3 or later (checked 3 October 2026). `agentRules: false` in `next.config.ts` stops `next dev` from appending its own block to CLAUDE.md |
| CMS / backend | Payload 3.x, pinned 3.90.2 | Runs inside Next.js. Gives admin UI, REST, GraphQL, Local API, auth, jobs |
| Database | MongoDB Atlas, `@payloadcms/db-mongodb` | Replica set required for transactions |
| Package manager | pnpm | Workspace-ready if we split packages later |

Payload 4 is in canary (needs Node 24, Next 16.2.6+, TS 6). Stay on 3.x; plan the upgrade once 4.0 is stable.

## Payload plugins

| Plugin | Use |
|---|---|
| `@payloadcms/plugin-multi-tenant` | `tenant` field, tenant-scoped admin, tenant selector, per-tenant users |
| ~~`@payloadcms/plugin-ecommerce`~~ | Not used (ADR 0006): products, variants, carts, orders and transactions are our own collections in the `catalog`, `cart`, `orders` and `payments` modules |
| `@payloadcms/plugin-seo` | Meta title/description/OG image on products, categories, pages |
| `@payloadcms/plugin-form-builder` | Contact, enquiry and custom forms built by vendors |
| `@payloadcms/plugin-redirects` | Old-URL redirects when vendors migrate from a previous site |
| `@payloadcms/plugin-nested-docs` | Category trees |
| `@payloadcms/plugin-import-export` | Base for CSV export; import uses our own job (docs/12) |
| `@payloadcms/plugin-sentry` | Error tracking |
| `@payloadcms/storage-s3` (or Cloudinary adapter) | Media in object storage behind a CDN |
| `@payloadcms/richtext-lexical` | Rich text |
| Two-step login plugin (TOTP) | Payload has none built in. Pick one in the Sprint 1 auth spike (for example `payload-totp`), or write it (docs/05) |

## Frontend

| Need | Choice |
|---|---|
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui (copied into `src/storefront/kit/ui`), Radix primitives |
| Icons | lucide-react |
| Forms | react-hook-form + zod (schemas shared with API in `src/lib/validation`) |
| Client state | Zustand for cart drawer/UI state only; server state through RSC + server actions or `fetch` |
| Data fetching on client | TanStack Query for search autocomplete, cart, account pages |
| Images | `next/image` with a CDN loader |
| Carousel | Embla |
| PWA | A hand-written service worker (`public/sw.js`, ADR 0007; Serwist's Next plugin needs webpack) |
| Maps (dealer locator) | Leaflet + OpenStreetMap tiles (free) or Google Maps if a vendor pays |
| Analytics | GA4 / Meta Pixel per tenant (IDs in tenant settings), loaded with consent |

## Services

| Need | Choice | Phase |
|---|---|---|
| Hosting | Vercel (app), MongoDB Atlas (M10+ in prod, Mumbai region `ap-south-1`) | MVP |
| Media storage + CDN | Cloudflare R2 or AWS S3 + CloudFront, or Cloudinary | MVP |
| Search | MongoDB Atlas Search (tenant filter in every query) | MVP |
| Email | Resend + React Email. Staff emails (invites, password resets) go through Payload's email adapter: `@payloadcms/email-resend` when `RESEND_API_KEY` is set, otherwise `src/lib/email/devLog.ts` prints them to the server log | MVP |
| Payments | Razorpay (vendor's own keys) | MVP |
| PDF invoices | `@react-pdf/renderer` in a job | MVP |
| Error tracking | Sentry | MVP |
| Logs | Vercel logs + structured JSON (pino) shipped to Better Stack/Axiom | MVP |
| Rate limiting / cache | Upstash Redis (when needed) | MVP+ |
| Shipping | Shiprocket connector on the vendor's own account (manual shipping as the fallback) | MVP |
| WhatsApp order updates | Meta WhatsApp Cloud API on the vendor's own WhatsApp Business account (no BSP markup); BSP connectors such as Interakt or Gupshup only for a vendor who already pays for one (Later) | MVP |
| SMS order updates (phone OTP in Phase 2) | MSG91 on the vendor's own account, DLT-registered sender ID and templates | MVP |
| Custom domains + SSL | Vercel Domains API | Phase 2 |
| Platform billing | Razorpay Subscriptions | Phase 2 |

## Dev tooling

ESLint 9 (next + typescript-eslint), Prettier, Vitest 5 (unit; it resolves the `@/` alias natively), Playwright (e2e),
`mongodb-memory-server-core` or any replica set in `MONGODB_TEST_URI` (integration), Husky + lint-staged, Docker Compose (Mongo replica set +
app). Local and staging email goes to the `dev-log` connector (docs/09); preview email templates
with React Email's own preview server.

## Adding a dependency

Prefer: already in the stack > official Payload plugin > well-maintained (commits in last 6 months,
>1k weekly downloads, MIT/Apache) > writing it ourselves. Never add a second library for something
the stack already does (no axios, no moment, no lodash full import, no second UI kit).
