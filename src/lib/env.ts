import { z } from 'zod'

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
  return parsed.data
}

export const env = loadEnv()
