# 02 Tech stack

Versions checked 2 October 2026. Pin exact versions in `package.json` and upgrade deliberately.

## Core

| Layer | Choice | Notes |
|---|---|---|
| Runtime | Node.js 22 LTS (24 when Payload 4 lands) | Same version locally, in Docker and on Vercel |
| Language | TypeScript, `strict: true` | Generated Payload types in `src/payload-types.ts` |
| Framework | Next.js 16.2.x (App Router) | Payload 3 supports 15.2.9+ in specific minor ranges and 16.2.6+. Use 16.2.6+ |
| CMS / backend | Payload 3.x (latest stable 3.9x) | Runs inside Next.js. Gives admin UI, REST, GraphQL, Local API, auth, jobs |
| Database | MongoDB Atlas, `@payloadcms/db-mongodb` | Replica set required for transactions |
| Package manager | pnpm | Workspace-ready if we split packages later |

Payload 4 is in canary (needs Node 24, Next 16.2.6+, TS 6). Stay on 3.x; plan the upgrade once 4.0 is stable.

## Payload plugins

| Plugin | Use |
|---|---|
| `@payloadcms/plugin-multi-tenant` | `tenant` field, tenant-scoped admin, tenant selector, per-tenant users |
| `@payloadcms/plugin-ecommerce` | Products, variants, carts, orders, transactions, addresses, multi-currency, payment adapter pattern. Ships only a Stripe adapter, so we write a Razorpay adapter (docs/09-connectors.md). Verify current feature set in a spike before building on it |
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
| PWA | Serwist (`@serwist/next`) |
| Maps (dealer locator) | Leaflet + OpenStreetMap tiles (free) or Google Maps if a vendor pays |
| Analytics | GA4 / Meta Pixel per tenant (IDs in tenant settings), loaded with consent |

## Services

| Need | Choice | Phase |
|---|---|---|
| Hosting | Vercel (app), MongoDB Atlas (M10+ in prod, Mumbai region `ap-south-1`) | MVP |
| Media storage + CDN | Cloudflare R2 or AWS S3 + CloudFront, or Cloudinary | MVP |
| Search | MongoDB Atlas Search (tenant filter in every query) | MVP |
| Email | Resend + React Email | MVP |
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

ESLint (next + typescript-eslint), Prettier, Vitest (unit), Playwright (e2e), Testcontainers or
`mongodb-memory-server` (integration), Husky + lint-staged, Docker Compose (Mongo replica set +
app). Local and staging email goes to the `dev-log` connector (docs/09); preview email templates
with React Email's own preview server.

## Adding a dependency

Prefer: already in the stack > official Payload plugin > well-maintained (commits in last 6 months,
>1k weekly downloads, MIT/Apache) > writing it ourselves. Never add a second library for something
the stack already does (no axios, no moment, no lodash full import, no second UI kit).
