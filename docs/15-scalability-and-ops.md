# 15 Scalability and operations

## Capacity plan

| Stage | Tenants | Products | Orders/day (all) | Setup |
|---|---|---|---|---|
| Launch | < 50 | < 100k | < 2k | Vercel Pro, Atlas M10 (Mumbai), R2/S3 + CDN |
| Growth | 50 to 500 | < 1M | < 20k | Atlas M30+ with Search Nodes, Upstash Redis, separate jobs worker |
| Large | 500+ | > 1M | > 20k | Dedicated DB for heavy tenants, read replicas for reports, search sidecar, storefront/admin split deploys |

The app is stateless; scale it horizontally. State lives in MongoDB, object storage, Redis.

## What keeps it scalable

- Tenant-first compound indexes on every hot query; check `explain()` for new queries.
- Cache tenant config, navigation, product pages at the edge/data cache with tag revalidation.
- Heavy work in jobs (imports, PDFs, emails, image downloads, search sync, reconciliation).
- MongoDB connection reuse on serverless (one client per instance, `maxPoolSize` ~10). On Vercel
  use Fluid compute to share connections across invocations.
- Pagination everywhere (no unbounded `find`); `limit` capped at 100.
- Media never served from the app; CDN only.
- Reports via aggregation on secondary read preference, or pre-aggregated daily stats
  (`daily-stats` per tenant) when volume grows.

## Jobs (Payload jobs queue)

Queues: `default` (emails, notifications), `heavy` (imports, exports, PDFs), `scheduled` (cron).
Runner: Vercel Cron hitting `/api/payload-jobs/run?queue=...` at launch; a long-running worker
container (`node dist/worker.js`, same image) when volume grows.

Scheduled tasks: reconcile pending payments (15 min), expire carts (hourly), low-stock digest
(daily), sitemap regeneration (daily), subscription status check (daily), cleanup OTPs/sessions
(daily), WhatsApp template sync and messaging connector health (daily), Shiprocket tracking
reconciliation (every 3 hours: parcels in flight with no update for 24 hours), and for the growth
features: `promotions/switch-schemes` (every minute: start and end schemes, revalidate offer
caches), `cart/find-abandoned` (every 15 minutes: carts idle past the first reminder delay,
emits `cart.abandoned`), `reviews/request` (hourly: delivered orders past the request delay),
`affiliate/approve-commissions` (daily: return windows closed), `affiliate/monthly-statements`
(1st of the month: draft payout statements), scheme and coupon `stats` (nightly), and in Phase 2
`b2b/dealer-anniversaries` (daily) and `loyalty/earn-and-expire` (daily). Offer campaigns run as a
job per batch of 500 recipients, throttled to the vendor's WhatsApp messaging limit and Resend's
rate. Shopper messages are delayed jobs (`sendAfter`) for the packed delay and quiet hours
(docs/18); bulk packing books one parcel per job, and a bulk "mark shipped" enqueues one small job
per message.

Every job: idempotent, has `tenantId` in input, retries with backoff (max 5), logs with job id.

## Environments

`local` (Docker Compose: Mongo replica set, app; messages to the `dev-log` connector) -> `staging` (own Atlas DB, Razorpay
test keys, `*.staging.<platform>`) -> `production`. Never point staging at production data.
Seed script creates 2 demo tenants (one sanitary, one clothing) with sample catalogs.

## Deployment

- Vercel: main app. Wildcard domain `*.<platform-domain>` + custom domains attached per tenant.
- Docker: multi-stage `docker/Dockerfile` (Next `output: 'standalone'`), runs on any VM/K8s. Keep
  it building in CI so we can leave Vercel anytime.
- Step-by-step server setup (VPS with Docker and Caddy, GoDaddy notes, vendor domains): docs/19.
- Migrations: Payload migrations for data changes (`pnpm payload migrate:create`), run before
  deploy. Index creation in migrations.

## Observability

- Errors: Sentry (server + client), tagged with `tenant` and `release`.
- Logs: structured JSON with `requestId`, `tenantId`, `userId`; no PII.
- Uptime: per-tenant storefront ping + `/api/health` (DB, storage, queue lag).
- Metrics to watch: p95 page TTFB, checkout success rate, payment failure rate per tenant,
  webhook lag, job queue depth, Atlas CPU/IOPS, slow queries (Atlas profiler > 100 ms), message
  failure rate per tenant and channel, WhatsApp quality rating per vendor number, courier booking
  failures, failed-delivery and RTO rate per tenant, offer email complaint and bounce rate per
  tenant (keep complaints under 0.1%), discount given as a share of sales per scheme.
- Alerts: checkout error spike, webhook failures, queue depth > threshold, DB CPU > 70%, a tenant's
  messaging channel down (token expired, template paused, DLT rejections), SMS cap at 80%, a
  tenant's Shiprocket login failing or no tracking updates for 24 hours while parcels are in flight.

## Backups and recovery

Atlas continuous cloud backup with point-in-time restore (prod). Object storage versioning on.
Monthly restore drill to staging. Per-tenant export script (`scripts/export-tenant`) for
offboarding and targeted restores. Targets: RPO 1 h, RTO 4 h.

## Go-live checklist per tenant

Domain + SSL, Razorpay live keys + webhook tested with a ₹1 order, GST details + invoice preview,
grievance officer on the store, legal details (country of origin, net quantity, maker) on every
active product,
shipping zones, policies pages, legal entity on footer, analytics IDs, Lighthouse ≥ 90,
test order -> invoice -> refund, staff accounts with 2FA for owner, backup verified.
Shiprocket KYC done, wallet funded, pickup address verified, API user and tracking webhook set, a
test parcel booked and cancelled (docs/09). WhatsApp number and display name approved and
templates approved; DLT entity, sender ID and templates registered, store domain whitelisted,
MSG91 linked; a test order walked through every parcel step with each message received on a staff
phone (docs/18). For the growth features: a test scheme previewed and a test coupon used on a ₹1
order and refunded, offer email sending domain verified with one-click unsubscribe tested, WhatsApp
marketing templates approved if the vendor uses WhatsApp offers, affiliate program terms published
if affiliates are on, and the review request email checked.
