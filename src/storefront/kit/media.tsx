/* eslint-disable @next/next/no-img-element -- our media already has WebP sizes on a CDN; next/image would resize them again */
import { preload } from 'react-dom'

import type { Media } from '@/payload-types'

type MediaLike = Media | string | null | undefined

const ADMIN_ORIGIN = (() => {
  try {
    return new URL(process.env.ADMIN_URL ?? '').origin
  } catch {
    return ''
  }
})()

/**
 * A media URL usable on a store's own domain: local files are served by this app at
 * /api/media/file/..., so the admin origin is dropped; CDN URLs (MEDIA_PUBLIC_URL) stay absolute.
 */
export function mediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined
  if (ADMIN_ORIGIN && url.startsWith(ADMIN_ORIGIN)) return url.slice(ADMIN_ORIGIN.length)
  return url
}

const asMedia = (media: MediaLike): Media | null =>
  media && typeof media === 'object' ? media : null

/** Responsive image from our WebP sizes (thumb 200, card 600, detail 1200, original ≤2000). */
export function Img({
  media,
  sizes = '(min-width: 1024px) 25vw, 50vw',
  className,
  priority = false,
  alt,
}: {
  media: MediaLike
  sizes?: string
  className?: string
  priority?: boolean
  alt?: string
}) {
  const item = asMedia(media)
  if (!item?.url) return <div aria-hidden className={`bg-surface-alt ${className ?? ''}`} />
  const candidates = [
    item.sizes?.thumb,
    item.sizes?.card,
    item.sizes?.detail,
    { url: item.url, width: item.width },
  ].filter((size): size is { url: string; width: number } => Boolean(size?.url && size.width))
  const srcSet = candidates.map((size) => `${mediaUrl(size.url)} ${size.width}w`).join(', ')
  const fallback = item.sizes?.card?.url ?? item.url
  // The page's main image (LCP): announce it in <head> so it downloads before scripts and fonts
  if (priority) {
    preload(mediaUrl(fallback)!, {
      as: 'image',
      imageSrcSet: srcSet || undefined,
      imageSizes: sizes,
      fetchPriority: 'high',
    })
  }
  return (
    <img
      alt={alt ?? item.alt ?? ''}
      className={className}
      decoding="async"
      fetchPriority={priority ? 'high' : undefined}
      height={item.height ?? undefined}
      loading={priority ? 'eager' : 'lazy'}
      sizes={sizes}
      src={mediaUrl(fallback)}
      srcSet={srcSet || undefined}
      width={item.width ?? undefined}
    />
  )
}
