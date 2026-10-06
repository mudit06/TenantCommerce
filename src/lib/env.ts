import { z } from 'zod'

import { mediaStorageProblems } from './mediaStorage'

// Config comes from env vars validated at boot (docs/01). Add every new variable here and
// to .env.example in the same change.
const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value)

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URI: z.string().min(1, 'DATABASE_URI is required'),
  PAYLOAD_SECRET: z.string().min(32, 'PAYLOAD_SECRET must be at least 32 characters'),
  ADMIN_URL: z.url().default('http://localhost:3000'),
  PLATFORM_DOMAIN: z
    .string()
    .min(1)
    .default('localhost')
    .transform((value) => value.toLowerCase()),
  RESEND_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  EMAIL_FROM_ADDRESS: z.email().default('no-reply@tenantecom.in'),
  EMAIL_FROM_NAME: z.string().default('TenantEcom'),
  // Media in object storage (S3 or Cloudflare R2). Unset locally: files go to ./media on disk.
  S3_BUCKET: z.preprocess(emptyToUndefined, z.string().optional()),
  S3_ENDPOINT: z.preprocess(emptyToUndefined, z.url().optional()),
  S3_REGION: z.preprocess(emptyToUndefined, z.string().default('auto')),
  S3_ACCESS_KEY_ID: z.preprocess(emptyToUndefined, z.string().optional()),
  S3_SECRET_ACCESS_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
  MEDIA_PUBLIC_URL: z.preprocess(emptyToUndefined, z.url().optional()),
  S3_CLIENT_UPLOADS: z.preprocess(
    (value) => value === 'true' || value === '1',
    z.boolean().default(false),
  ),
  // Connector secrets (Razorpay, WhatsApp, Shiprocket keys) are encrypted with this key,
  // AES-256-GCM, 32 bytes in base64 (docs/14). Required in production; locally a key derived
  // from PAYLOAD_SECRET is used when it is empty (src/connectors/core/secrets.ts).
  CONNECTOR_ENC_KEY: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .refine((value) => Buffer.from(value, 'base64').length === 32, {
        message: 'CONNECTOR_ENC_KEY must be 32 bytes in base64: `openssl rand -base64 32`',
      })
      .optional(),
  ),
  // Meta Graph API version for WhatsApp (docs/09), pinned so Meta's changes arrive on purpose
  META_GRAPH_API_VERSION: z.preprocess(emptyToUndefined, z.string().default('v21.0')),
})

export type Env = z.infer<typeof envSchema>

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')
    throw new Error(`Invalid environment variables (see .env.example):\n${problems}`)
  }
  // `next build` runs with NODE_ENV=production but serves no files; check when the server runs
  const building = process.env.NEXT_PHASE === 'phase-production-build'
  if (!building) {
    const { errors, warnings } = mediaStorageProblems({ VERCEL: process.env.VERCEL }, parsed.data)
    if (errors.length) {
      throw new Error(
        `Invalid environment variables (see .env.example):\n${errors.map((p) => `  - ${p}`).join('\n')}`,
      )
    }
    for (const warning of warnings) console.warn(`[env] ${warning}`)
  }
  return parsed.data
}

export const env = loadEnv()
