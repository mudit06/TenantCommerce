import { getCategoryTree, getProductsInCategories } from '@/lib/data/catalog'
import { getPublishedPagePaths } from '@/lib/data/content'
import { getStoreByHost } from '@/lib/data/store'
import { storeOriginForHost } from '@/lib/storeOrigin'
import { productHref } from '@/storefront/kit/links'

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;')

export const dynamic = 'force-dynamic'

/** Per-store sitemap: home, categories, live products and published pages (docs/13). */
export async function GET(_request: Request, { params }: { params: Promise<{ tenant: string }> }) {
  const host = decodeURIComponent((await params).tenant)
  const store = await getStoreByHost(host)
  if (!store || store.status !== 'active') return new Response('Not found', { status: 404 })
  // The store's own address, as its pages' canonical links use (http for a *.localhost store)
  const origin = storeOriginForHost(host)!
  const tree = await getCategoryTree(store.tenantId)
  const [products, pages] = await Promise.all([
    getProductsInCategories(
      store.tenantId,
      tree.all.map((c) => String(c.id)),
    ),
    getPublishedPagePaths(store.tenantId),
  ])
  const urls = [
    { loc: '/', lastmod: undefined as string | undefined },
    ...tree.all.map((category) => ({ loc: category.path, lastmod: category.updatedAt })),
    ...products.map((product) => ({ loc: productHref(product), lastmod: product.createdAt })),
    ...pages.map((page) => ({ loc: page.path, lastmod: page.updatedAt })),
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
      // Read from the store's data cache, which every catalogue change clears: browsers ask again
      // each time, so a product just put live is listed on the next fetch
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}
