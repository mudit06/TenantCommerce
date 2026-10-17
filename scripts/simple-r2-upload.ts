import 'dotenv/config'
import { MongoClient, ObjectId } from 'mongodb'
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ---------------------------------------------------------------------------
// Configuration
//
// This migration mirrors exactly what the running app does (src/payload.config.ts,
// @payloadcms/storage-s3). The app stores each store's files under
//   media/<store id>/<filename>
// and, when MEDIA_PUBLIC_URL is set, builds public URLs as
//   <MEDIA_PUBLIC_URL>/media/<store id>/<filename>
// (collection prefix 'media' + the per-record `prefix` field, which holds the tenant id).
//
// We read the SAME env variables the app validates in src/lib/env.ts, so there is a
// single source of truth and nothing to keep in sync.
// ---------------------------------------------------------------------------
const MEDIA_PATH = path.join(__dirname, '..', 'media')

// Collection prefix used by the s3Storage plugin for the media collection.
const COLLECTION_PREFIX = 'media'

const BUCKET = required('S3_BUCKET', process.env.S3_BUCKET)
const ENDPOINT = required('S3_ENDPOINT', process.env.S3_ENDPOINT)
const REGION = process.env.S3_REGION || 'auto'
const ACCESS_KEY_ID = required('S3_ACCESS_KEY_ID', process.env.S3_ACCESS_KEY_ID)
const SECRET_ACCESS_KEY = required('S3_SECRET_ACCESS_KEY', process.env.S3_SECRET_ACCESS_KEY)
// CDN domain, for example https://media.tenantecom.in . Links point here and skip the app server.
const PUBLIC_URL = required('MEDIA_PUBLIC_URL', process.env.MEDIA_PUBLIC_URL).replace(/\/$/, '')
const DATABASE_URI = required('DATABASE_URI', process.env.DATABASE_URI)

function required(name: string, value: string | undefined): string {
  if (!value || !value.trim()) {
    console.error(`\u274c Missing required env variable: ${name}`)
    console.error('   Check your .env (see .env.example). This script uses the SAME variables as the app.')
    process.exit(1)
  }
  return value
}

// Initialize S3/R2 client (R2 is S3-compatible)
const s3 = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: { accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET_ACCESS_KEY },
})

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
}

// Stats
const stats = {
  recordsFound: 0,
  filesConsidered: 0,
  uploaded: 0,
  skipped: 0,
  missingLocal: 0,
  failed: 0,
  recordsUpdated: 0,
  recordsWithoutTenant: 0,
}

/**
 * Resolve the store/tenant id for a media record, matching the app:
 * the record's `prefix` field is the store folder; fall back to the `tenant` relation.
 */
function storeIdOf(record: Record<string, unknown>): string | null {
  const prefix = record.prefix
  if (typeof prefix === 'string' && prefix.trim()) return prefix.trim()
  const tenant = record.tenant
  if (tenant instanceof ObjectId) return tenant.toHexString()
  if (typeof tenant === 'string' && tenant.trim()) return tenant.trim()
  if (tenant && typeof tenant === 'object' && 'toString' in tenant) {
    const s = String(tenant)
    if (s && s !== '[object Object]') return s
  }
  return null
}

/** Build the R2 object key exactly as the app's s3Storage plugin does: media/<store id>/<filename> */
function objectKey(storeId: string, filename: string): string {
  return [COLLECTION_PREFIX, storeId, filename].filter(Boolean).join('/')
}

/** Build the public CDN URL exactly as the app's generateFileURL does. */
function publicUrl(storeId: string, filename: string): string {
  return [PUBLIC_URL, COLLECTION_PREFIX, storeId, filename].filter(Boolean).join('/')
}

/** Upload one local file to R2 under the given key, skipping if it already exists. */
async function uploadOne(localPath: string, key: string): Promise<boolean> {
  stats.filesConsidered++

  if (!fs.existsSync(localPath)) {
    console.log(`   \u26a0\ufe0f  Local file missing, URL will still be set: ${path.basename(localPath)}`)
    stats.missingLocal++
    return false
  }

  // Already in the bucket?
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }))
    console.log(`   \u23ed\ufe0f  Skipped (exists): ${key}`)
    stats.skipped++
    return true
  } catch (err: any) {
    const code = err?.name || err?.Code
    if (code !== 'NotFound' && code !== 'NoSuchKey' && err?.$metadata?.httpStatusCode !== 404) {
      // Unexpected error (auth, network): surface it
      if (code !== 'NotFound') throw err
    }
  }

  const content = fs.readFileSync(localPath)
  const ext = path.extname(localPath).toLowerCase()
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: content,
      ContentType: CONTENT_TYPES[ext] || 'application/octet-stream',
    }),
  )
  const sizeKB = (content.length / 1024).toFixed(2)
  console.log(`   \u2705 Uploaded: ${key} (${sizeKB} KB)`)
  stats.uploaded++
  return true
}

async function main() {
  console.log('============================================================')
  console.log('\ud83d\ude80 Cloudflare R2 / S3 media migration (multi-tenant)')
  console.log('============================================================\n')

  console.log('\ud83d\udccb Configuration:')
  console.log(`   Bucket:        ${BUCKET}`)
  console.log(`   Endpoint:      ${ENDPOINT}`)
  console.log(`   Public CDN:    ${PUBLIC_URL}`)
  console.log(`   Key pattern:   ${COLLECTION_PREFIX}/<store id>/<filename>`)
  console.log(`   Media path:    ${MEDIA_PATH}\n`)

  if (!fs.existsSync(MEDIA_PATH)) {
    console.warn(`\u26a0\ufe0f  Local media folder not found (${MEDIA_PATH}). Files already in the bucket will still have their URLs fixed.`)
  }

  const client = new MongoClient(DATABASE_URI)
  await client.connect()
  console.log('\u2705 Connected to MongoDB')

  const db = client.db()
  const media = db.collection('media')

  const records = await media.find({}).toArray()
  stats.recordsFound = records.length
  console.log(`   Found ${records.length} media records\n`)

  console.log('\ud83d\udce4 Uploading files and updating URLs (per tenant)...\n')

  for (let i = 0; i < records.length; i++) {
    const record = records[i] as Record<string, any>
    const filename = typeof record.filename === 'string' ? record.filename : null
    if (!filename) continue

    const storeId = storeIdOf(record)
    if (!storeId) {
      console.warn(`   \u26a0\ufe0f  [${i + 1}/${records.length}] No tenant/prefix for ${filename} \u2014 skipping`)
      stats.recordsWithoutTenant++
      continue
    }

    console.log(`\ud83d\udcc4 [${i + 1}/${records.length}] store ${storeId}`)

    // 1) Upload the original file
    await safeUpload(path.join(MEDIA_PATH, filename), objectKey(storeId, filename))

    // 2) Upload every generated size variant (thumb, card, detail, ...)
    const sizes = (record.sizes && typeof record.sizes === 'object' ? record.sizes : {}) as Record<
      string,
      any
    >
    for (const size of Object.values(sizes)) {
      const sizeFilename = size && typeof size.filename === 'string' ? size.filename : null
      if (sizeFilename) {
        await safeUpload(path.join(MEDIA_PATH, sizeFilename), objectKey(storeId, sizeFilename))
      }
    }

    // 3) Rewrite the DB URLs (main + every size) to the CDN
    const update: Record<string, string> = { url: publicUrl(storeId, filename) }
    for (const [sizeName, size] of Object.entries(sizes)) {
      const sizeFilename = size && typeof size.filename === 'string' ? size.filename : null
      if (sizeFilename) update[`sizes.${sizeName}.url`] = publicUrl(storeId, sizeFilename)
    }

    await media.updateOne({ _id: record._id }, { $set: update })
    stats.recordsUpdated++
  }

  await client.close()

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('\ud83d\udcca Migration summary')
  console.log('='.repeat(60))
  console.log(`Media records:        ${stats.recordsFound}`)
  console.log(`Files considered:     ${stats.filesConsidered}`)
  console.log(`\u2705 Uploaded:          ${stats.uploaded}`)
  console.log(`\u23ed\ufe0f  Skipped (exists):  ${stats.skipped}`)
  console.log(`\u26a0\ufe0f  Local missing:     ${stats.missingLocal}`)
  console.log(`\u274c Failed:            ${stats.failed}`)
  console.log(`\ud83d\udcdd Records updated:    ${stats.recordsUpdated}`)
  console.log(`\u26a0\ufe0f  No tenant/prefix:  ${stats.recordsWithoutTenant}`)
  console.log('='.repeat(60))
  console.log('\n\u2705 Migration complete!')
  console.log(`\ud83c\udf89 Files are served from: ${PUBLIC_URL}/${COLLECTION_PREFIX}/<store id>/<filename>\n`)
}

/** Wrap uploadOne so one bad file does not abort the whole migration. */
async function safeUpload(localPath: string, key: string): Promise<void> {
  try {
    await uploadOne(localPath, key)
  } catch (error: any) {
    console.error(`   \u274c Failed: ${key} - ${error?.message ?? error}`)
    stats.failed++
  }
}

main().catch((err) => {
  console.error('\n\u274c Migration aborted:', err)
  process.exit(1)
})
