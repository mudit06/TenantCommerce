# 19 Hosting and domains

How to put the app on a server, what it needs, whether GoDaddy works, and how each vendor's store
address and CMS address reach the right store. Written 4 October 2026; nothing is deployed yet
(docs/progress.md).

Examples use `tenantecom.in` as the platform domain, `203.0.113.10` as the server's IP address and
Home Orbit (slug `home-orbit`) with an own domain `homeorbit.in`. Swap in the real values.

## What the app needs

One Next.js + Payload app serves every store, the vendor CMS and the platform panel (docs/01). It
needs:

| Need | What exactly | Notes |
|---|---|---|
| Node.js | 22.12 or later, below 23 (`package.json` engines) | The Docker image brings its own |
| Memory | About 1 GB for the running app; about 4 GB while building | Build somewhere else, or add swap on a small server |
| MongoDB | A **replica set** (Payload uses transactions) | MongoDB Atlas, Mumbai region: M10 for production, the free M0 is fine for a trial |
| Object storage | An S3-compatible bucket + a public CDN address | Cloudflare R2 recommended (docs/12). Needed on a server too: a container's disk is replaced on every update (the app only warns at boot outside Vercel, `src/lib/mediaStorage.ts`) |
| Email | Resend API key with the sending domain verified | Staff invites and password resets |
| Domain | A platform domain you control | Must not contain "sr", "kr" or "shiprocket" (docs/open-items) |
| HTTPS | A certificate for the admin address, every store subdomain and every vendor domain | Caddy (below) gets and renews them automatically |
| Reverse proxy | Something in front of the app on ports 80/443 that **passes the original `Host` header** | The app picks the store from that header |
| Always-on process | The app runs background jobs on a timer (`jobs.autoRun` in `src/payload.config.ts`) | Fine on a VPS; serverless hosts need a cron instead |

Environment variables are all in `.env.example`. For production:

```bash
NODE_ENV=production
DATABASE_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/tenantecom?retryWrites=true&w=majority
PAYLOAD_SECRET=<openssl rand -hex 32>
ADMIN_URL=https://admin.tenantecom.in
PLATFORM_DOMAIN=tenantecom.in
RESEND_API_KEY=<from Resend>
EMAIL_FROM_ADDRESS=no-reply@tenantecom.in
EMAIL_FROM_NAME=TenantEcom
S3_BUCKET=tenantecom-media
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_ACCESS_KEY_ID=<R2 token id>
S3_SECRET_ACCESS_KEY=<R2 token secret>
MEDIA_PUBLIC_URL=https://media.tenantecom.in
S3_CLIENT_UPLOADS=false
```

No quotes around values (Docker's `--env-file` keeps quotes as part of the value).

## Where to host it

| Option | Verdict |
|---|---|
| Vercel + Atlas | The recorded decision (docs/00, docs/02). Least work to run; custom domains get SSL automatically. Short notes at the end of this file |
| **A Linux VPS** (GoDaddy VPS, AWS Lightsail Mumbai, DigitalOcean Bangalore, any other) + Atlas | Works, using the Docker image we already keep building (docs/15). Step by step below |
| GoDaddy shared hosting (cPanel "Setup Node.js App") | **Not suitable.** See the next section |

If the team picks a VPS over Vercel for production, record that in docs/00 "Decisions" (CLAUDE.md:
the stack does not change without a recorded decision).

## Can it run on GoDaddy?

**GoDaddy shared hosting / cPanel Node.js: no.** Those plans run small Node apps through Phusion
Passenger with tight limits, and this app does not fit:

- The build needs about 4 GB of memory; shared plans cap a process at around 1 GB or less.
- The Node versions on offer may not include Node 22, which this app requires.
- Passenger starts and stops the app on demand, so the background jobs (scheduled publishing,
  subscription checks, later payments and parcel jobs) would not run reliably.
- No root and no Docker; each vendor's own domain would have to be added as an "addon domain",
  limited per plan, and pointed at the same app by hand.
- MongoDB is not included (Atlas would still be needed).

**GoDaddy VPS: yes.** A self-managed GoDaddy VPS is an ordinary Linux server with root access, so
the steps below work as written. Pick:

- Ubuntu 24.04 LTS
- 2 vCPU and 4 GB RAM at least (8 GB if you build on the same server without swap)
- 40 GB+ disk
- The data centre closest to India that GoDaddy offers. The database sits in Atlas Mumbai, and
  every page makes database calls, so the server should be close to Mumbai. If GoDaddy has no
  nearby location, a Mumbai or Bangalore VPS from another provider is the better choice; the steps
  are the same.

Buying the domain from GoDaddy is fine with any of the options; only the DNS records matter.

## Step by step: a Linux VPS

### 1. Accounts to create first

1. **Platform domain** (for example `tenantecom.in`).
2. **MongoDB Atlas**: create a cluster in AWS Mumbai (`ap-south-1`). Add a database user. Under
   Network Access add the server's IP address (and your own, for step 7). Copy the `mongodb+srv://`
   connection string into `DATABASE_URI`.
3. **Cloudflare R2**: create a bucket (for example `tenantecom-media`), an API token with read and
   write on it, and connect a custom domain to the bucket (for example `media.tenantecom.in`) for
   `MEDIA_PUBLIC_URL`.
4. **Resend**: verify the sending domain, create an API key.

### 2. DNS for the platform domain

In GoDaddy (Domain, DNS, Manage DNS) for `tenantecom.in`:

| Type | Name | Value | Why |
|---|---|---|---|
| A | `admin` | `203.0.113.10` | Platform panel and every vendor's CMS |
| A | `*` | `203.0.113.10` | Every store subdomain (`home-orbit.tenantecom.in`, ...) without a DNS change per vendor |
| A | `@` | `203.0.113.10` | The bare domain (redirected to the admin for now, see step 6) |

`media` is set up by Cloudflare when you connect the R2 custom domain (the domain's DNS must be on
Cloudflare for that; otherwise use R2's public `r2.dev` address or put a CDN in front).

### 3. Prepare the server

```bash
ssh root@203.0.113.10
adduser deploy && usermod -aG sudo deploy        # work as this user from now on
apt update && apt upgrade -y
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw enable

# Swap, so building on a 4 GB server does not run out of memory
fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy
```

Log in again as `deploy`.

### 4. Get the code and the settings

```bash
sudo mkdir -p /opt/tenantecom && sudo chown deploy /opt/tenantecom
cd /opt/tenantecom
git clone https://github.com/mudit06/tenantcommerce.git app   # a deploy key or token for a private repo
nano /opt/tenantecom/.env.production                          # the variables from the top of this file
chmod 600 /opt/tenantecom/.env.production
```

The settings file lives outside the git checkout and is never committed (CLAUDE.md rule 9).

### 5. Build and start the app

```bash
cd /opt/tenantecom/app
docker build -f docker/Dockerfile -t tenantecom:latest .
docker run -d --name tenantecom --restart unless-stopped \
  --env-file /opt/tenantecom/.env.production \
  -p 127.0.0.1:3000:3000 \
  tenantecom:latest
docker logs -f tenantecom        # wait for "Ready", then Ctrl+C
```

`127.0.0.1:3000` keeps the app reachable only through Caddy, never directly from the internet.

### 6. HTTPS and the `Host` header: Caddy

Caddy terminates HTTPS, gets a free Let's Encrypt certificate for every address it lists, renews
them, and passes the original `Host` header to the app (which is how the app knows the store).

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

`/etc/caddy/Caddyfile`:

```caddyfile
{
	email ops@tenantecom.in
}

(app) {
	reverse_proxy 127.0.0.1:3000
}

# Platform panel and every vendor's CMS
admin.tenantecom.in {
	import app
}

# Bare platform domain: no marketing site yet
tenantecom.in, www.tenantecom.in {
	redir https://admin.tenantecom.in/admin 302
}

# ---- Stores: one block per store ----
# Home Orbit: platform subdomain and its own domain
home-orbit.tenantecom.in, homeorbit.in {
	import app
}
www.homeorbit.in {
	redir https://homeorbit.in{uri} 301
}
cms.homeorbit.in {
	redir https://admin.tenantecom.in/admin 302
}
```

```bash
sudo systemctl reload caddy
```

Caddy needs each address to already point at the server (DNS) and ports 80 and 443 open before it
can get the certificate. `journalctl -u caddy -f` shows progress.

If you use nginx instead of Caddy, keep `proxy_set_header Host $host;` and raise
`client_max_body_size` to 50m (catalogue PDFs, `MAX_UPLOAD_BYTES` in `src/payload.config.ts`).

### 7. First data

The production image holds only the built app, not the seed scripts, so run the seed once from a
developer machine (a full checkout with `pnpm install`) pointed at the production database. Copy
the production values into a git-ignored file, for example `.env.production.local`, add
`SEED_SUPER_ADMIN_EMAIL` and a strong `SEED_SUPER_ADMIN_PASSWORD`, then:

```bash
set -a && source .env.production.local && set +a
NODE_ENV=development pnpm seed            # plans, the first super admin, 2 demo stores (draft)
NODE_ENV=development pnpm seed:home-orbit # only if Home Orbit's catalogue should be loaded
```

Variables already in the shell win over `.env`, so this writes to Atlas and R2, not to your local
setup. `PLATFORM_DOMAIN` must be the real one here, because new stores get
`<slug>.<PLATFORM_DOMAIN>` as their first address. The demo stores stay in draft and show "coming
soon" in production; archive them from the platform panel if you don't want them.

### 8. Check it

1. `https://admin.tenantecom.in` opens the admin login; sign in as the super admin and change the
   password.
2. `https://home-orbit.tenantecom.in` shows "Home Orbit is coming soon" while the store is in
   draft. Go live from the platform panel (vendor overview, Go live) and reload.
3. Upload an image in the CMS and check its address starts with `MEDIA_PUBLIC_URL`.
4. Walk docs/manual-testing.md against the live addresses.

### 9. Updates

```bash
cd /opt/tenantecom/app && git pull
docker build -f docker/Dockerfile -t tenantecom:latest .
docker rm -f tenantecom && docker run -d --name tenantecom --restart unless-stopped \
  --env-file /opt/tenantecom/.env.production -p 127.0.0.1:3000:3000 tenantecom:latest
```

The store is down for the few seconds between `rm` and `run`. When that matters, build the image in
CI, push it to a registry, and switch between two containers behind Caddy. Run Payload migrations
(docs/15) before starting a new version once there are any. Backups are Atlas's (docs/15).

### Without Docker (Node + PM2)

Works too; Docker is preferred because CI keeps the image building (docs/15).

```bash
# Node 22 from NodeSource, then pnpm through corepack
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
sudo corepack enable && sudo npm install -g pm2

cd /opt/tenantecom/app && pnpm install --frozen-lockfile
set -a && source /opt/tenantecom/.env.production && set +a && pnpm build
cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/
PORT=3000 HOSTNAME=127.0.0.1 pm2 start .next/standalone/server.js --name tenantecom \
  --node-args="--env-file=/opt/tenantecom/.env.production"
pm2 save && pm2 startup        # restart on reboot
```

Caddy (step 6) stays the same.

## How vendor addresses reach the right store

There is no per-vendor server and nothing redirects a shopper between stores. Every address
points at the **same app**, and the app reads which address was asked for:

```
 shopper -> https://homeorbit.in/products/basin-mixer
     DNS: homeorbit.in -> 203.0.113.10 (our server)
     Caddy: HTTPS, passes Host: homeorbit.in to the app
     src/proxy.ts: host is not the admin host -> rewrite (not redirect) to /homeorbit.in/products/basin-mixer
     src/lib/data/store.ts getStoreByHost('homeorbit.in'): tenant-domains -> Home Orbit
     src/app/(storefront)/[tenant]: Home Orbit's pages, its data only, its look from
       src/storefront/vendors/home-orbit/

 vendor staff -> https://admin.tenantecom.in/admin
     src/proxy.ts: admin host -> Payload admin
     signed in as Home Orbit staff -> only Home Orbit's CMS (workspaces and access, docs/05)
```

| Address | What it shows | Where it is set |
|---|---|---|
| `admin.tenantecom.in` | Platform panel for our team; the store's CMS for vendor staff | `ADMIN_URL` |
| `<slug>.tenantecom.in` | That vendor's store | Created automatically when the vendor is onboarded (`tenant-domains`, primary) |
| Vendor's own domain | That vendor's store | Added by a super admin in `tenant-domains` (below) |
| Any other address | 404 page | |

The address-to-store map is cached for up to 5 minutes and cleared whenever a domain changes
(docs/04).

### A new vendor's store subdomain

Nothing to do in DNS (the `*` record covers it). Onboard the vendor (New vendor screen or
`pnpm create-tenant`); the store answers on `<slug>.tenantecom.in`. On a VPS add the address to
the Caddyfile so it gets a certificate, then `sudo systemctl reload caddy`.

### A vendor's own domain (for example `homeorbit.in`)

1. **Vendor's DNS** (at their registrar; GoDaddy shown):

   | Type | Name | Value |
   |---|---|---|
   | A | `@` | `203.0.113.10` |
   | CNAME | `www` | `home-orbit.tenantecom.in` |

   GoDaddy can't put a CNAME on the bare domain, so `@` is an A record to the server's IP. If the
   server's IP ever changes, every vendor's `@` record has to change too; a fixed IP for the
   server avoids that.

2. **Tell the app the domain belongs to the store.** Custom domains have no form yet (the
   Domains tab marks it Phase 2). A super admin, in the platform panel (no store session open),
   opens `https://admin.tenantecom.in/admin/collections/tenant-domains/create` and adds `homeorbit.in`:
   tenant Home Orbit, type Custom, Primary ticked (making it primary unticks the subdomain). Add
   `www.homeorbit.in` the same way, not primary, if the store should also answer there instead of
   Caddy redirecting it.

3. **Certificate and routing**: add the domain to the Caddyfile (step 6) and reload Caddy.

4. **One address for search engines**: links, the sitemap and robots.txt use whichever address
   the shopper opened. The stored "redirect to primary" flag is not acted on yet
   (docs/open-items "Primary domain redirect"), so redirect the other addresses in Caddy:
   `www.homeorbit.in` to `homeorbit.in` as above, and, once the vendor's domain is live, the
   subdomain too:

   ```caddyfile
   homeorbit.in {
   	import app
   }
   home-orbit.tenantecom.in, www.homeorbit.in {
   	redir https://homeorbit.in{uri} 301
   }
   ```

### The vendor CMS address

Every vendor signs in at the one admin address, `https://admin.tenantecom.in/admin`. The account
decides what opens: a store's staff get that store's CMS and never see another store; our team
gets the platform panel and reaches a store's CMS only through "Manage store" or "View as support"
(docs/05 "As built"). In production
the admin works only on `ADMIN_URL` (`src/proxy.ts`, CSRF list in
`src/payload.config.ts`).

A vendor who wants a CMS address on their own domain can have a **redirect**: `cms.homeorbit.in`
to `https://admin.tenantecom.in/admin` (the Caddy block above; the vendor adds an A record for
`cms` pointing to the server). Serving the admin itself on each vendor's domain (white-label CMS)
would need code changes (admin host list, CSRF list, sign-in cookies per domain) and is not
planned; raise it in docs/open-items before building it.

## Notes for Vercel instead

- Import the GitHub repo as a Vercel project and set the environment variables, plus
  `S3_CLIENT_UPLOADS=true` (Vercel caps request bodies at 4.5 MB; the bucket needs a CORS rule
  allowing PUT from the admin address).
- Wildcard subdomains (`*.tenantecom.in`) on Vercel need the domain's nameservers moved to Vercel.
- Each vendor domain is added to the project (Settings, Domains); Vercel shows the DNS records and
  issues the certificate. Add the same host to `tenant-domains` as above.
- Background jobs don't run on a timer there: a Vercel Cron for `/api/payload-jobs/run` is still
  to be configured (docs/progress.md, Platform foundations).
- Pick the Mumbai (`bom1`) function region, next to Atlas.

## Troubleshooting

| Problem | Likely cause |
|---|---|
| A store address shows the 404 page | The host is not in `tenant-domains` (check `www.` too), or the store is archived |
| "coming soon" on a store | The store is still in draft: Go live in the platform panel |
| Admin sign-in loops back to the login page | The address in the browser is not exactly `ADMIN_URL`, or `ADMIN_URL` is `http://` while the site is on HTTPS |
| Caddy can't get a certificate | DNS for that address does not point at the server yet, or port 80/443 is closed |
| Uploads fail | `S3_*` variables missing or wrong; the container can't store files on its own disk |
| `MongoServerSelectionError` in `docker logs` | The server's IP is not in Atlas Network Access, or `DATABASE_URI` is wrong |
| The app stops on a small server during build | Not enough memory: add swap (step 3) or build the image elsewhere |
