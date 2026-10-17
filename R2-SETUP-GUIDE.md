# Cloudflare R2 Setup Guide for Tenant Commerce

Complete step-by-step guide to configure Cloudflare R2 for product image storage.

---

## Table of Contents

1. [Why Cloudflare R2?](#why-cloudflare-r2)
2. [Phase 1: Create R2 Bucket](#phase-1-create-r2-bucket)
3. [Phase 2: Configure Application](#phase-2-configure-application)
4. [Phase 3: Migrate Existing Images](#phase-3-migrate-existing-images)
5. [Phase 4: Set Up Public Domain](#phase-4-set-up-public-domain)
6. [Phase 5: Testing](#phase-5-testing)
7. [Troubleshooting](#troubleshooting)

---

## Why Cloudflare R2?

✅ **Free tier**: 10 GB storage per month  
✅ **Zero egress fees**: Unlimited downloads at no cost  
✅ **S3-compatible**: Drop-in replacement for AWS S3  
✅ **Fast CDN**: Global edge network  
✅ **Security**: Private buckets with presigned URLs or custom domains  

**vs AWS S3**: S3 charges ₹7-8 per GB downloaded (egress). R2 is free forever.

---

## Phase 1: Create R2 Bucket

### Step 1.1: Sign Up for Cloudflare

1. Go to https://dash.cloudflare.com/sign-up
2. Create free account (no credit card required)
3. Verify your email

### Step 1.2: Enable R2

1. Log in to Cloudflare Dashboard
2. Click **R2** in left sidebar
3. Click **"Purchase R2 Plan"** if prompted
   - Select **Free tier** (10 GB storage)
   - No credit card required for free tier

### Step 1.3: Create Bucket

1. Click **"Create bucket"**
2. **Bucket name**: `tenant-commerce-images`
   - Must be globally unique
   - Lowercase, numbers, hyphens only
3. **Location hint**: 
   - Choose **"Asia Pacific (APAC)"** for India/Mumbai
   - Or leave as **"Automatic"**
4. Click **"Create bucket"**
5. ✅ Bucket created! Keep it **private** (default)

### Step 1.4: Generate API Token

1. In R2 dashboard, click **"Manage R2 API Tokens"**
2. Click **"Create API token"**
3. Configure:
   - **Token name**: `tenant-commerce-api`
   - **Permissions**: Select **"Object Read & Write"**
   - **Apply to specific buckets only** (optional): Select `tenant-commerce-images`
   - **TTL**: Forever (or set expiration)
4. Click **"Create API Token"**
5. **⚠️ IMPORTANT**: Copy and save these (shown only once):
   ```
   Access Key ID: xxxxxxxxxxxxxxxxxxxxxxxx
   Secret Access Key: yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
   ```

### Step 1.5: Get Account ID

1. In Cloudflare dashboard, navigate to **R2** overview
2. Find **Account ID** in the right sidebar
3. Copy and save it: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## Phase 2: Configure Application

### Step 2.1: Update `.env` File

Your `.env` file has been updated with R2 configuration. Replace placeholders:

```env
STORAGE_PROVIDER=cloudflare-r2
CLOUDFLARE_ACCOUNT_ID=YOUR_ACCOUNT_ID_HERE  # Replace with Step 1.5
CLOUDFLARE_R2_ACCESS_KEY_ID=YOUR_ACCESS_KEY_ID_HERE  # From Step 1.4
CLOUDFLARE_R2_SECRET_ACCESS_KEY=YOUR_SECRET_ACCESS_KEY_HERE  # From Step 1.4
CLOUDFLARE_R2_BUCKET_NAME=tenant-commerce-images
CLOUDFLARE_R2_PUBLIC_DOMAIN=https://images.homeorbit.in  # We'll set this up in Phase 4
```

**Example** (with fake credentials):
```env
STORAGE_PROVIDER=cloudflare-r2
CLOUDFLARE_ACCOUNT_ID=abc123def456ghi789jkl012mno345pq
CLOUDFLARE_R2_ACCESS_KEY_ID=a1b2c3d4e5f6g7h8i9j0
CLOUDFLARE_R2_SECRET_ACCESS_KEY=aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890AbCd
CLOUDFLARE_R2_BUCKET_NAME=tenant-commerce-images
CLOUDFLARE_R2_PUBLIC_DOMAIN=https://images.homeorbit.in
```

### Step 2.2: Install AWS SDK (if not already installed)

The application uses `@aws-sdk/client-s3` for R2 compatibility:

```bash
pnpm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### Step 2.3: Restart Application

```bash
# Stop dev server (Ctrl+C)
pnpm dev
```

You should see:
```
✅ Storage provider: cloudflare-r2
✅ R2 bucket: tenant-commerce-images
```

---

## Phase 3: Migrate Existing Images

### Step 3.1: Check Existing Images

Your product has images stored locally in `media/` folder. Let's check:

```bash
# On Windows (PowerShell)
Get-ChildItem -Recurse media

# On macOS/Linux
find media -type f
```

### Step 3.2: Run Migration Script

Use the migration script created at `scripts/migrate-images-to-r2.ts`:

```bash
pnpm tsx scripts/migrate-images-to-r2.ts
```

**What it does**:
1. ✅ Scans `media/` folder for all images
2. ✅ Uploads each to R2 (preserving folder structure)
3. ✅ Skips files already in R2 (idempotent)
4. ✅ Updates MongoDB records with R2 URLs
5. ✅ Shows migration summary

**Expected output**:
```
🚀 Starting image migration to Cloudflare R2...

✅ Connected to MongoDB

📁 Found 15 files in media folder

📤 Uploading files to R2...

📄 Processing: products/hoal-101/image1.jpg
   ✅ Uploaded: products/hoal-101/image1.jpg

📄 Processing: products/hoal-101/image2.jpg
   ✅ Uploaded: products/hoal-101/image2.jpg

...

============================================================
📊 Migration Summary
============================================================
Total files:     15
✅ Uploaded:     15
⏭️  Skipped:      0 (already existed)
❌ Failed:       0
============================================================

📝 Updating database records...
Found 15 media records in database
✅ Updated 15 media records with R2 URLs

✅ Migration complete!
```

### Step 3.3: Verify in R2 Dashboard

1. Go to Cloudflare R2 dashboard
2. Click on `tenant-commerce-images` bucket
3. Browse files - you should see all uploaded images

---

## Phase 4: Set Up Public Domain (Optional)

### Option A: Use R2.dev Subdomain (Quick, for testing)

1. In R2 bucket settings, click **"Settings"** tab
2. Find **"R2.dev subdomain"** section
3. Click **"Allow Access"**
4. Copy the URL: `https://pub-xxxxxxxxxxxxx.r2.dev`
5. Update `.env`:
   ```env
   CLOUDFLARE_R2_PUBLIC_DOMAIN=https://pub-xxxxxxxxxxxxx.r2.dev
   ```

**⚠️ Limitations**:
- URL is not branded (random subdomain)
- Rate limited (500 requests/min)
- OK for testing, not for production

### Option B: Custom Domain (Recommended for Production)

**Prerequisites**:
- Domain managed by Cloudflare DNS (e.g., `homeorbit.in`)

**Steps**:

1. **Add Custom Domain to R2 Bucket**:
   - In R2 bucket settings, go to **"Settings"** tab
   - Find **"Custom Domains"** section
   - Click **"Connect Domain"**
   - Enter: `images.homeorbit.in`
   - Click **"Continue"**

2. **Cloudflare Auto-Creates DNS Record**:
   - CNAME record created automatically:
     ```
     images.homeorbit.in  CNAME  tenant-commerce-images.xxx.r2.cloudflarestorage.com
     ```

3. **Enable Public Access** (if you want images to be publicly accessible):
   - In bucket settings, **"Public Access"** section
   - Enable **"Allow public access"** for the custom domain only
   - This makes images accessible at `https://images.homeorbit.in/{key}`

4. **Update `.env`**:
   ```env
   CLOUDFLARE_R2_PUBLIC_DOMAIN=https://images.homeorbit.in
   ```

5. **Restart application**:
   ```bash
   pnpm dev
   ```

**✅ Images now served from**: `https://images.homeorbit.in/products/hoal-101/image1.jpg`

---

## Phase 5: Testing

### Test 1: Upload New Product Image

1. Go to http://localhost:3000/admin
2. Login as super admin
3. Navigate to **Products**
4. Edit the product: `Laser-cut stainless steel aldrop HOAL-101`
5. **Upload new image** (or replace existing)
6. Click **Save**
7. ✅ Image should upload to R2

**Verify**:
- Check Cloudflare R2 dashboard - new file should appear
- Image URL in MongoDB should be: `https://images.homeorbit.in/{key}`

### Test 2: View Product on Storefront

1. Go to http://home-orbit.localhost:3000
2. Find product: **HOAL-101**
3. ✅ Product images should load from R2
4. **Check browser Network tab**:
   - Images loaded from `images.homeorbit.in` (not `localhost`)

### Test 3: Check Image Metadata in MongoDB

Query your product in MongoDB Atlas:

```javascript
db.products.findOne({ sku: "HOAL-101" })
```

**Expected `images` field**:
```json
{
  "images": [
    {
      "image": {
        "id": "...",
        "url": "https://images.homeorbit.in/products/hoal-101/image1.jpg",
        "filename": "products/hoal-101/image1.jpg",
        "mimeType": "image/jpeg",
        "filesize": 245678,
        "width": 1200,
        "height": 1200
      }
    }
  ]
}
```

**✅ Only the key/URL is stored** - actual file is in R2.

---

## Troubleshooting

### Issue 1: "Access Denied" when uploading

**Cause**: API token doesn't have write permissions

**Fix**:
1. Go to Cloudflare R2 API Tokens
2. Edit token, ensure **"Object Read & Write"** is enabled
3. Regenerate token if needed
4. Update `.env` with new secret key

### Issue 2: Images not loading (404)

**Cause**: Public domain not configured or bucket is private

**Fix**:
1. Check `CLOUDFLARE_R2_PUBLIC_DOMAIN` in `.env` matches custom domain
2. Ensure custom domain is connected in R2 bucket settings
3. Enable public access for custom domain (if images should be public)

### Issue 3: Migration script fails with "NotFound"

**Cause**: Bucket name doesn't exist

**Fix**:
1. Check `CLOUDFLARE_R2_BUCKET_NAME` in `.env` matches actual bucket name
2. Verify bucket exists in Cloudflare dashboard
3. Check for typos (bucket names are case-sensitive)

### Issue 4: "Invalid credentials"

**Cause**: Wrong access key or account ID

**Fix**:
1. Verify `CLOUDFLARE_ACCOUNT_ID` is correct (32-char hex string)
2. Regenerate API token in Cloudflare dashboard
3. Update both `CLOUDFLARE_R2_ACCESS_KEY_ID` and `CLOUDFLARE_R2_SECRET_ACCESS_KEY`

### Issue 5: Images upload but don't appear on storefront

**Cause**: MongoDB still has old local URLs

**Fix**:
1. Run migration script again: `pnpm tsx scripts/migrate-images-to-r2.ts`
2. Or manually update product in admin panel (re-upload image)
3. Check MongoDB - `url` field should have R2 domain

---

## Security Best Practices

### 1. Keep Bucket Private

- ❌ **Don't** enable "Allow public access" for the entire bucket
- ✅ **Do** use custom domain with selective public access
- ✅ **Do** use presigned URLs for temporary access to private files

### 2. Validate Uploads

- ✅ Check file size limits (prevent abuse)
- ✅ Validate MIME types (only allow images)
- ✅ Verify tenant ownership before upload
- ✅ Scan for malware (optional, for user-uploaded content)

### 3. Protect API Tokens

- ❌ **Never commit** `.env` to Git (already in `.gitignore`)
- ✅ Rotate tokens periodically
- ✅ Use different tokens for dev/staging/production
- ✅ Set token expiration (TTL) for production

### 4. Monitor Usage

- Check R2 dashboard for:
  - Storage used (stay under 10 GB for free tier)
  - Request count (500/min limit on R2.dev subdomain)
  - Bandwidth (unlimited, but monitor for abuse)

---

## Cost Analysis

### Cloudflare R2 Free Tier

| Metric | Free Tier | Your Usage | Cost |
|---|---|---|---|
| **Storage** | 10 GB/month | ~2 GB (estimated) | ₹0 |
| **Class A operations** | 1M/month | ~10K/month | ₹0 |
| **Class B operations** | 10M/month | ~100K/month | ₹0 |
| **Egress (downloads)** | Unlimited | Unlimited | ₹0 |
| **Total** | | | **₹0/month** |

### If You Exceed Free Tier

**Storage**: ₹1.5 per GB/month  
**Class A ops**: ₹0.36 per million  
**Class B ops**: ₹0.036 per million  

**Example**: 20 GB storage + 5M requests/month = **₹15/month**

Still **90% cheaper** than AWS S3 with egress fees.

---

## Next Steps

1. ✅ **Complete Phase 1-2** (Create bucket, configure app)
2. ✅ **Test upload** from admin panel
3. ✅ **Run migration** for existing images
4. ✅ **Set up custom domain** (`images.homeorbit.in`)
5. ✅ **Test on production** (once deployed to VPS)
6. 🗑️ **Delete local `media/` folder** (after verifying R2 works)

---

## Support

If you encounter issues:

1. Check this guide's **Troubleshooting** section
2. Review Cloudflare R2 docs: https://developers.cloudflare.com/r2/
3. Check application logs: `pnpm dev` output
4. Verify MongoDB records have correct URLs

---

**Last updated**: 2026-10-16  
**Application version**: 0.1.0  
**Cloudflare R2 API version**: S3-compatible v1
