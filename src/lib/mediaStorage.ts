type MediaEnv = { NODE_ENV: string; S3_BUCKET?: string; MEDIA_PUBLIC_URL?: string }

/**
 * Media must not live on the app server in production (docs/12 "Media"). On Vercel the disk is
 * thrown away on every deploy and differs between instances, so files would vanish: that is an
 * error. Elsewhere (Docker with a volume, a local production run) it is a warning.
 */
export function mediaStorageProblems(
  values: { VERCEL?: string },
  parsed: Pick<MediaEnv, 'NODE_ENV' | 'S3_BUCKET' | 'MEDIA_PUBLIC_URL'>,
): { errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  if (parsed.NODE_ENV !== 'production') return { errors, warnings }
  if (!parsed.S3_BUCKET) {
    const message =
      'S3_BUCKET: media is on local disk. Production keeps photos and PDFs in object storage (Cloudflare R2 or S3).'
    if (values.VERCEL) errors.push(message)
    else warnings.push(message)
  } else if (!parsed.MEDIA_PUBLIC_URL) {
    warnings.push(
      'MEDIA_PUBLIC_URL: not set, so every image is streamed through the app server instead of the CDN.',
    )
  }
  return { errors, warnings }
}
