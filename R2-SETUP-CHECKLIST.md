# Cloudflare R2 Setup Checklist

Quick reference checklist for setting up R2 storage.

---

## 📝 Pre-Setup

- [ ] Have a Cloudflare account (free)
- [ ] Domain `homeorbit.in` added to Cloudflare (optional, for custom domain)
- [ ] Backup existing `media/` folder locally

---

## 👉 Phase 1: Cloudflare Setup (15 minutes)

### 1.1 Create R2 Bucket
- [ ] Log in to https://dash.cloudflare.com
- [ ] Enable R2 (free tier)
- [ ] Create bucket: `tenant-commerce-images`
- [ ] Keep bucket **private** (default)

### 1.2 Generate API Token
- [ ] Go to R2 → Manage R2 API Tokens
- [ ] Create token: `tenant-commerce-api`
- [ ] Enable **Object Read & Write** permissions
- [ ] Save **Access Key ID**: `________________________`
- [ ] Save **Secret Access Key**: `________________________`

### 1.3 Get Account ID
- [ ] Copy Account ID from R2 dashboard: `________________________`

---

## 👉 Phase 2: Application Configuration (5 minutes)

### 2.1 Update `.env` File
- [ ] Open `.env` file in project root
- [ ] Set `STORAGE_PROVIDER=cloudflare-r2`
- [ ] Set `CLOUDFLARE_ACCOUNT_ID=` (from Step 1.3)
- [ ] Set `CLOUDFLARE_R2_ACCESS_KEY_ID=` (from Step 1.2)
- [ ] Set `CLOUDFLARE_R2_SECRET_ACCESS_KEY=` (from Step 1.2)
- [ ] Set `CLOUDFLARE_R2_BUCKET_NAME=tenant-commerce-images`
- [ ] Set `CLOUDFLARE_R2_PUBLIC_DOMAIN=https://images.homeorbit.in` (we'll set up domain later)

### 2.2 Install Dependencies
- [ ] Run: `pnpm install` (SDK should already be installed)

### 2.3 Restart Application
- [ ] Stop dev server (Ctrl+C)
- [ ] Run: `pnpm dev`
- [ ] Verify logs show: `✅ Storage provider: cloudflare-r2`

---

## 👉 Phase 3: Migrate Existing Images (10 minutes)

### 3.1 Run Migration Script
- [ ] Run: `pnpm tsx scripts/migrate-images-to-r2.ts`
- [ ] Wait for completion (shows summary with uploaded count)
- [ ] Verify no errors in output

### 3.2 Verify in R2 Dashboard
- [ ] Go to Cloudflare R2 dashboard
- [ ] Open bucket: `tenant-commerce-images`
- [ ] Confirm all images are present
- [ ] Check file sizes match local files

---

## 👉 Phase 4: Set Up Public Domain (15 minutes)

### Option A: Quick Test (R2.dev subdomain)
- [ ] In R2 bucket settings → **R2.dev subdomain**
- [ ] Click **"Allow Access"**
- [ ] Copy URL: `https://pub-______________.r2.dev`
- [ ] Update `.env`: `CLOUDFLARE_R2_PUBLIC_DOMAIN=https://pub-______________.r2.dev`
- [ ] Restart: `pnpm dev`

### Option B: Custom Domain (Production)
- [ ] Ensure `homeorbit.in` is on Cloudflare DNS
- [ ] In R2 bucket settings → **Custom Domains**
- [ ] Click **"Connect Domain"**
- [ ] Enter: `images.homeorbit.in`
- [ ] Cloudflare auto-creates DNS record (CNAME)
- [ ] Wait 1-2 minutes for DNS propagation
- [ ] Test: `curl https://images.homeorbit.in` (should not return 404)
- [ ] Update `.env`: `CLOUDFLARE_R2_PUBLIC_DOMAIN=https://images.homeorbit.in`
- [ ] Restart: `pnpm dev`

---

## 👉 Phase 5: Testing (10 minutes)

### 5.1 Test Upload
- [ ] Go to http://localhost:3000/admin
- [ ] Login as super admin
- [ ] Navigate to **Products** → Edit `HOAL-101`
- [ ] Upload a new product image
- [ ] Click **Save**
- [ ] Verify in R2 dashboard: new file appears

### 5.2 Test Display on Storefront
- [ ] Go to http://home-orbit.localhost:3000
- [ ] Find product: `HOAL-101`
- [ ] Verify images load correctly
- [ ] Open browser DevTools → Network tab
- [ ] Confirm images loaded from `images.homeorbit.in` (not `localhost`)

### 5.3 Check MongoDB Records
- [ ] Open MongoDB Atlas
- [ ] Query: `db.products.findOne({ sku: "HOAL-101" })`
- [ ] Verify `images[].image.url` contains R2 domain
- [ ] Verify only **key/URL stored** (not file data)

---

## ✅ Post-Setup Cleanup

- [ ] Delete local `media/` folder (after confirming R2 works)
- [ ] Remove `STORAGE_PROVIDER=local` backup from `.env`
- [ ] Document R2 credentials in password manager
- [ ] Set up monitoring for R2 storage usage (optional)

---

## 🚨 Security Checklist

- [ ] `.env` is in `.gitignore` (already done)
- [ ] R2 bucket is **private** (not publicly listable)
- [ ] API token has minimal permissions (Object Read & Write only)
- [ ] Custom domain has public access (if images should be public)
- [ ] Set token expiration (TTL) for production (optional)

---

## 📊 Monitor After Setup

- [ ] Check R2 storage usage weekly (stay under 10 GB for free)
- [ ] Monitor request count (R2.dev limited to 500/min)
- [ ] Review access logs for suspicious activity (optional)

---

## 🎯 Expected Outcome

✅ **Before Setup:**
- Images stored in `media/` folder locally
- Not accessible in production/VPS
- Lost on container rebuild

✅ **After Setup:**
- Images stored in Cloudflare R2 (cloud)
- Globally accessible via CDN
- Persistent and scalable
- Public URL: `https://images.homeorbit.in/{key}`
- MongoDB stores only image metadata + URL

---

## 🔗 Quick Links

- [Cloudflare Dashboard](https://dash.cloudflare.com)
- [R2 Overview](https://dash.cloudflare.com/?to=/:account/r2)
- [Full Setup Guide](./R2-SETUP-GUIDE.md)
- [Migration Script](./scripts/migrate-images-to-r2.ts)
- [R2 Documentation](https://developers.cloudflare.com/r2/)

---

**Estimated Total Time**: 45-60 minutes  
**Cost**: ₹0 (using free tier)  
**Difficulty**: Beginner-friendly
