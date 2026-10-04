import { getStoreByHost } from '@/lib/data/store'
import { PUBLIC_PROTOCOL } from '@/storefront/constants'

export const dynamic = 'force-dynamic'

/** Per-store robots.txt; stores that aren't live ask not to be indexed (docs/13). */
export async function GET(request: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const host = decodeURIComponent((await params).tenant)
  const store = await getStoreByHost(host)
  const origin = `${PUBLIC_PROTOCOL}://${request.headers.get('host') ?? host}`
  const body =
    store?.status === 'active'
      ? `User-agent: *\nAllow: /\nDisallow: /search\nDisallow: /api/\nDisallow: /admin\n\nSitemap: ${origin}/sitemap.xml\n`
      : 'User-agent: *\nDisallow: /\n'
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
