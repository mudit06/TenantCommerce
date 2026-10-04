import { describe, expect, it } from 'vitest'

import { mediaStorageProblems } from '@/lib/mediaStorage'

// Production media storage checks (docs/12 "Media")
const parsed = (values: { S3_BUCKET?: string; MEDIA_PUBLIC_URL?: string }) => ({
  NODE_ENV: 'production',
  ...values,
})

describe('media storage in production', () => {
  it('refuses local disk on Vercel and warns elsewhere', () => {
    expect(mediaStorageProblems({ VERCEL: '1' }, parsed({})).errors).toHaveLength(1)
    const docker = mediaStorageProblems({}, parsed({}))
    expect(docker.errors).toHaveLength(0)
    expect(docker.warnings[0]).toMatch(/S3_BUCKET/)
  })

  it('warns when the bucket has no CDN address, and is quiet in development', () => {
    expect(mediaStorageProblems({}, parsed({ S3_BUCKET: 'media' })).warnings[0]).toMatch(
      /MEDIA_PUBLIC_URL/,
    )
    expect(
      mediaStorageProblems({}, parsed({ S3_BUCKET: 'media', MEDIA_PUBLIC_URL: 'https://media.x' })),
    ).toEqual({ errors: [], warnings: [] })
    expect(mediaStorageProblems({ VERCEL: '1' }, { NODE_ENV: 'development' }).errors).toEqual([])
  })
})
