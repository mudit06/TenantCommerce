import sharp from 'sharp'

import { getStoreContext } from '@/storefront/context'

type Context = { params: Promise<{ tenant: string; size: string }> }

const SIZES = new Set([180, 192, 512])

const escapeXml = (text: string) => text.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`)

/**
 * The store's app icon at 180 (iPhone), 192 or 512 px: its "App icon" from store settings (else
 * its logo) on white, or its initials on its colour when it has neither. `?maskable=1` leaves the
 * safe margin Android's round and squircle masks need.
 */
export async function GET(request: Request, { params }: Context) {
  const { tenant, size: sizeParam } = await params
  const size = Number(sizeParam)
  if (!SIZES.has(size)) return new Response('Not found', { status: 404 })
  const ctx = await getStoreContext(tenant)
  const maskable = new URL(request.url).searchParams.get('maskable') === '1'
  const name = ctx.settings?.storeName ?? ctx.store.name
  const color = ctx.settings?.themeColor || ctx.ui.theme.brand
  const media = [ctx.settings?.pwaIcon, ctx.settings?.logo].find(
    (m) => typeof m === 'object' && m?.url,
  ) as { url: string } | undefined
  const inner = Math.round(size * (maskable ? 0.7 : 0.86))

  let art: Buffer | null = null
  if (media) {
    try {
      const source = new URL(media.url, request.url)
      const response = await fetch(source)
      if (response.ok) {
        art = await sharp(Buffer.from(await response.arrayBuffer()))
          .resize(inner, inner, { fit: 'contain', background: '#ffffff' })
          .png()
          .toBuffer()
      }
    } catch {
      art = null
    }
  }
  const png = art
    ? await sharp({
        create: { width: size, height: size, channels: 4, background: '#ffffff' },
      })
        .composite([{ input: art, gravity: 'center' }])
        .png()
        .toBuffer()
    : await sharp(
        Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="100%" height="100%" fill="${escapeXml(color)}"/><text x="50%" y="50%" dy="0.35em" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="${Math.round(size * (maskable ? 0.3 : 0.38))}" fill="#ffffff">${escapeXml(
            name
              .split(/\s+/)
              .map((w) => w[0])
              .join('')
              .slice(0, 2)
              .toUpperCase(),
          )}</text></svg>`,
        ),
      )
        .png()
        .toBuffer()
  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' },
  })
}
