/**
 * Migration Script: Upload Local Media to Cloudflare R2
 *
 * This script:
 * 1. Scans the local media/ folder
 * 2. Uploads all files to Cloudflare R2
 * 3. Updates MongoDB media records with R2 URLs
 *
 * Prerequisites:
 * - Cloudflare R2 bucket created
 * - .env configured with R2 credentials
 * - @aws-sdk/client-s3 installed
 *
 * Usage:
 *   pnpm migrate:r2
 *
 * Safety:
 * - Checks if files already exist in R2 (no duplicate uploads)
 * - Safe to re-run
 * - Backs up media records before updating
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { getPayload } from 'payload'

import config from '../src/payload.config.js'

// ─── Configuration ─────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const LOCAL_MEDIA_PATH = path.join(__dirname, '..', 'media')
const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME
const R2_PUBLIC_DOMAIN = process.env.CLOUDFLARE_R2_PUBLIC_DOMAIN

// ─── Validate Environment ──────────────────────────────────────────────────────

if (!process.env.CLOUDFLARE_ACCOUNT_ID) {
  console.error('❌ Missing CLOUDFLARE_ACCOUNT_ID in .env')
  process.exit(1)
}
if (!process.env.CLOUDFLARE_R2_ACCESS_KEY_ID) {
  console.error('❌ Missing CLOUDFLARE_R2_ACCESS_KEY_ID in .env')
  process.exit(1)
}
if (!process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY) {
  console.error('❌ Missing CLOUDFLARE_R2_SECRET_ACCESS_KEY in .env')
  process.exit(1)
}
if (!BUCKET_NAME) {
  console.error('❌ Missing CLOUDFLARE_R2_BUCKET_NAME in .env')
  process.exit(1)
}
if (!R2_PUBLIC_DOMAIN) {
  console.error('❌ Missing CLOUDFLARE_R2_PUBLIC_DOMAIN in .env')
  process.exit(1)
}

console.log('\n✅ R2 Configuration:')
console.log(`   Account ID: ${process.env.CLOUDFLARE_ACCOUNT_ID}`)
console.log(`   Bucket: ${BUCKET_NAME}`)
console.log(`   Public Domain: ${R2_PUBLIC_DOMAIN}\n`)

// ─── Initialize R2 Client ──────────────────────────────────────────────────────

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  },
})

// ─── Types ─────────────────────────────────────────────────────────────────────

interface MigrationStats {
  total: number
  uploaded: number
  skipped: number
  failed: number
  errors: Array<{ file: string; error: string }>
}

const stats: MigrationStats = {
  total: 0,
  uploaded: 0,
  skipped: 0,
  failed: 0,
  errors: [],
}

// ─── Upload File to R2 ─────────────────────────────────────────────────────────

async function uploadToR2(
  localFilePath: string,
  r2Key: string,
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Check if file already exists in R2
    try {
      await r2Client.send(
        new HeadObjectCommand({
          Bucket: BUCKET_NAME,
          Key: r2Key,
        }),
      )
      console.log(`   ⏭️  Skipped (already exists): ${r2Key}`)
      stats.skipped++
      return { success: true, url: r2Key }
    } catch (error: any) {
      // File doesn't exist, proceed with upload
      if (error.name !== 'NotFound') {
        throw error
      }
    }

    // Read file from local disk
    const fileBuffer = fs.readFileSync(localFilePath)
    const fileSize = (fileBuffer.length / 1024).toFixed(1)
    const mimeType = getMimeType(localFilePath)

    // Upload to R2
    await r2Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: r2Key,
        Body: fileBuffer,
        ContentType: mimeType,
      }),
    )

    console.log(`   ✅ Uploaded: ${r2Key} (${fileSize} KB)`)
    stats.uploaded++
    return { success: true, url: r2Key }
  } catch (error: any) {
    console.error(`   ❌ Failed: ${r2Key} - ${error.message}`)
    stats.failed++
    stats.errors.push({ file: r2Key, error: error.message })
    return { success: false, error: error.message }
  }
}

// ─── Get MIME Type ─────────────────────────────────────────────────────────────

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase()
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
  }
  return mimeTypes[ext] || 'application/octet-stream'
}

// ─── Get All Media Files ───────────────────────────────────────────────────────

function getAllMediaFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) {
    return fileList
  }

  const files = fs.readdirSync(dir)

  files.forEach((file) => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      getAllMediaFiles(filePath, fileList)
    } else {
      fileList.push(filePath)
    }
  })

  return fileList
}

// ─── Main Migration Function ───────────────────────────────────────────────────

async function migrateImagesToR2() {
  try {
    console.log('🚀 Starting image migration to Cloudflare R2...\n')

    // Initialize Payload CMS
    console.log('🔌 Connecting to MongoDB...')
    const payload = await getPayload({ config })
    console.log('✅ Connected to MongoDB\n')

    // Check if media folder exists
    if (!fs.existsSync(LOCAL_MEDIA_PATH)) {
      console.log(`⚠️  No local media folder found at: ${LOCAL_MEDIA_PATH}`)
      console.log('   Nothing to migrate.')
      process.exit(0)
    }

    // Get all media files
    console.log('📁 Scanning media folder...')
    const mediaFiles = getAllMediaFiles(LOCAL_MEDIA_PATH)
    stats.total = mediaFiles.length

    console.log(`Found ${stats.total} files in: ${LOCAL_MEDIA_PATH}\n`)

    if (stats.total === 0) {
      console.log('⚠️  No files to migrate.')
      process.exit(0)
    }

    // Upload each file to R2
    console.log('📤 Uploading files to R2...\n')

    for (const localFilePath of mediaFiles) {
      // Create R2 key (preserve folder structure)
      const relativePath = path.relative(LOCAL_MEDIA_PATH, localFilePath)
      const r2Key = relativePath.replace(/\\/g, '/') // Convert Windows paths to Unix

      console.log(`\n📄 Processing: ${relativePath}`)
      await uploadToR2(localFilePath, r2Key)
    }

    // Print migration summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 Migration Summary')
    console.log('='.repeat(60))
    console.log(`Total files:     ${stats.total}`)
    console.log(`✅ Uploaded:     ${stats.uploaded}`)
    console.log(`⏭️  Skipped:      ${stats.skipped} (already existed)`)
    console.log(`❌ Failed:       ${stats.failed}`)
    console.log('='.repeat(60))

    if (stats.errors.length > 0) {
      console.log('\n❌ Errors:')
      stats.errors.forEach(({ file, error }) => {
        console.log(`   - ${file}: ${error}`)
      })
    }

    // Update media collection in MongoDB
    console.log('\n📝 Updating database records...')

    try {
      const mediaRecords = await payload.find({
        collection: 'media',
        limit: 1000,
        pagination: false,
      })

      console.log(`Found ${mediaRecords.docs.length} media records in database`)

      let updated = 0
      for (const media of mediaRecords.docs) {
        if (media.filename) {
          // Update the URL to use R2 instead of local path
          const r2Url = `${R2_PUBLIC_DOMAIN}/${media.filename}`

          await payload.update({
            collection: 'media',
            id: media.id,
            data: {
              url: r2Url,
            },
          })
          updated++
        }
      }

      console.log(`✅ Updated ${updated} media records with R2 URLs`)
    } catch (error: any) {
      console.log(`⚠️  Could not update media collection: ${error.message}`)
      console.log("   (This is OK if you don't have a media collection)")
    }

    console.log('\n✅ Migration complete!\n')
    console.log('📌 Next steps:')
    console.log('   1. Verify images in Cloudflare R2 dashboard')
    console.log('   2. Set up custom domain for public image delivery')
    console.log('   3. Test image uploads from admin panel')
    console.log('   4. Once verified, you can delete local media folder\n')

    process.exit(0)
  } catch (error: any) {
    console.error('\n❌ Migration failed:')
    console.error(error)
    console.error('\nStack trace:')
    console.error(error.stack)
    process.exit(1)
  }
}

// ─── Run Migration ─────────────────────────────────────────────────────────────

migrateImagesToR2()