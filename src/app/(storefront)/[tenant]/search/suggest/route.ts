import { searchProducts } from '@/lib/data/catalog'
import { getStoreOffers, offerForProduct } from '@/lib/data/offers'
import { formatINR } from '@/lib/money'
import { matchCategories } from '@/lib/search'
import { getStoreContext } from '@/storefront/context'
import { productHref } from '@/storefront/kit/links'
import { mediaUrl } from '@/storefront/kit/media'

type Context = { params: Promise<{ tenant: string }> }

export type Suggestions = {
  products: {
    title: string
    modelNumber: string
    href: string
    image: string | null
    price: string | null
  }[]
  categories: { name: string; href: string }[]
}

/**
 * Instant search under the search box (docs/screens storefront `st-search`): the best products,
 * model numbers first, and matching categories. Prices are the ones the cards show: a live
 * scheme's price, and "From" the lowest finish when finishes cost different amounts.
 */
export async function GET(request: Request, { params }: Context) {
  const ctx = await getStoreContext((await params).tenant)
  const q = (new URL(request.url).searchParams.get('q') ?? '').trim().slice(0, 80)
  const body: Suggestions = { products: [], categories: [] }
  if (q.length >= 2) {
    const [products, offers] = await Promise.all([
      searchProducts(ctx.store.tenantId, q, 6),
      getStoreOffers(ctx.store.tenantId),
    ])
    body.products = products.map((product) => {
      const photo = product.gallery?.[0]
      const image =
        photo && typeof photo === 'object'
          ? (mediaUrl(photo.sizes?.thumb?.url ?? photo.url) ?? null)
          : null
      const listMinor =
        ctx.selling.selling && product.purchaseMode !== 'enquire'
          ? (product.price?.amountMinor ?? null)
          : null
      const offer = listMinor
        ? offerForProduct(offers, {
            id: product.id,
            categoryIds: product.categoryIds,
            priceMinor: listMinor,
            purchaseMode: product.purchaseMode,
          })
        : null
      const priced = offer?.priceMinor ?? listMinor
      return {
        title: product.title,
        modelNumber: product.modelNumber,
        href: productHref(product),
        image,
        price: priced ? `${product.buy.priceRange ? 'From ' : ''}${formatINR(priced)}` : null,
      }
    })
    body.categories = matchCategories(ctx.categories.all, q)
      .slice(0, 4)
      .map((category) => ({ name: category.name, href: category.path }))
  }
  return Response.json(body, { headers: { 'Cache-Control': 'private, max-age=30' } })
}
