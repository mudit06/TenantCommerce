import type { Category, Link, Page, Product } from '@/payload-types'

/** Store address of a page: the home page is "/". */
export const pageHref = (page: Pick<Page, 'slug'>) =>
  page.slug === 'home' ? '/' : `/pages/${page.slug}`
export const categoryHref = (category: Pick<Category, 'slug' | 'breadcrumbs'>) =>
  category.breadcrumbs?.at(-1)?.url ?? `/c/${category.slug}`
export const productHref = (product: Pick<Product, 'slug'>) => `/products/${product.slug}`

/** Where a CMS link goes (menus, buttons, banners), or null when it points nowhere. */
export function linkHref(link: Link | null | undefined): { href: string; newTab: boolean } | null {
  if (!link) return null
  if (link.type === 'page' && link.page && typeof link.page === 'object')
    return { href: pageHref(link.page), newTab: false }
  if (link.type === 'category' && link.category && typeof link.category === 'object') {
    return { href: categoryHref(link.category), newTab: false }
  }
  if (link.type === 'product' && link.product && typeof link.product === 'object') {
    return { href: productHref(link.product), newTab: false }
  }
  if (link.type === 'url' && link.url) return { href: link.url, newTab: Boolean(link.newTab) }
  return null
}
