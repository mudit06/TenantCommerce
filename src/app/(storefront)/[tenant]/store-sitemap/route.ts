import { getCategoryTree, getProductsInCategories } from '@/lib/data/catalog'
import { getStoreByHost } from '@/lib/data/store'
import { PUBLIC_PROTOCOL } from '@/storefront/constants'
import { productHref } from '@/storefront/kit/links'

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;')

export const dynamic = 'force-dynamic'

/** Per-store sitemap: home, categories and live products (docs/13). */
export async function GET(request: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const host = decodeURIComponent((await params).tenant)
  const store = await getStoreByHost(host)
  if (!store || store.status !== 'active') return new Response('Not found', { status: 404 })
  const origin = `${PUBLIC_PROTOCOL}://${request.headers.get('host') ?? host}`
  const tree = await getCategoryTree(store.tenantId)
  const products = await getProductsInCategories(
    store.tenantId,
    tree.all.map((c) => String(c.id)),
  )
  const urls = [
    { loc: '/', lastmod: undefined as string | undefined },
    ...tree.all.map((category) => ({ loc: category.path, lastmod: category.updatedAt })),
    ...products.map((product) => ({ loc: productHref(product), lastmod: product.createdAt })),
  ]
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map(
      (url) =>
        `  <url><loc>${escape(origin + url.loc)}</loc>${url.lastmod ? `<lastmod>${url.lastmod.slice(0, 10)}</lastmod>` : ''}</url>`,
    )
    .join('\n')}\n</urlset>\n`
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
