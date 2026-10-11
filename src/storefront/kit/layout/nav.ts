import { getStoreOffers, runningSchemes } from '@/lib/data/offers'
import type { Media } from '@/payload-types'

import type { StoreContext } from '../../context'
import { linkHref } from '../links'

export type NavLink = { label: string; href: string; image: Media | null }
export type NavColumn = { heading: string | null; links: NavLink[] }
export type NavItem = {
  label: string
  href: string | null
  /** The large dropdown (docs/screens Menus rule 2): up to four columns and a featured image */
  columns: NavColumn[]
  featuredImage: Media | null
}

const asMedia = (value: unknown): Media | null =>
  value && typeof value === 'object' && 'url' in value ? (value as Media) : null

/**
 * The header menu: the store's own (Menus), or its category tree until it builds one. A link to
 * a category carries that category's photo, for dropdowns that show pictures.
 */
export function navItems(ctx: StoreContext): NavItem[] {
  const fromMenu = (ctx.navigation?.header ?? []).map((item) => ({
    label: item.label,
    href: linkHref(item.link)?.href ?? null,
    featuredImage: asMedia(item.featuredImage),
    columns: (item.columns ?? [])
      .map((column) => ({
        heading: column.heading || null,
        links: (column.links ?? []).flatMap((link) => {
          const target = linkHref(link.link)
          const category = link.link?.type === 'category' ? link.link.category : null
          return target
            ? [
                {
                  label: link.label,
                  href: target.href,
                  image: category && typeof category === 'object' ? asMedia(category.image) : null,
                },
              ]
            : []
        }),
      }))
      .filter((column) => column.links.length > 0),
  }))
  if (fromMenu.length > 0) return fromMenu
  return ctx.categories.roots.map((root) => ({
    label: root.name,
    href: root.path,
    featuredImage: null,
    columns: root.children.length
      ? [
          {
            heading: null,
            links: root.children.map((child) => ({
              label: child.name,
              href: child.path,
              image: asMedia(child.image),
            })),
          },
        ]
      : [],
  }))
}

/** The menu plus the store links the wireframe puts in it: Find a dealer (dealer locator). */
export function headerItems(ctx: StoreContext): NavItem[] {
  const items = navItems(ctx)
  const linked = new Set(items.map((item) => item.href))
  if (ctx.hasFeature('dealer-locator') && !linked.has('/dealers')) {
    items.push({ label: 'Find a dealer', href: '/dealers', columns: [], featuredImage: null })
  }
  return items
}

/** Every category as dropdown columns: one column per top category, its children below. */
export function categoryColumns(ctx: StoreContext): (NavColumn & { href: string })[] {
  return ctx.categories.roots.map((root) => ({
    heading: root.name,
    href: root.path,
    links: root.children.map((child) => ({
      label: child.name,
      href: child.path,
      image: asMedia(child.image),
    })),
  }))
}

/**
 * The line above the header: a live scheme's announcement first while it runs (docs/screens
 * Scheme editor "On the store"), linking to its page; otherwise the store's own announcement bar.
 */
export async function storeAnnouncement(
  ctx: StoreContext,
): Promise<{ text: string | null; href: string | null }> {
  const settings = ctx.settings
  const offer = runningSchemes(await getStoreOffers(ctx.store.tenantId)).find(
    (s) => s.announcementText,
  )
  if (offer?.announcementText) {
    return { text: offer.announcementText, href: offer.slug ? `/offers/${offer.slug}` : '/offers' }
  }
  if (settings?.announcementBar?.enabled && settings.announcementBar.text) {
    return { text: settings.announcementBar.text, href: settings.announcementBar.linkUrl ?? null }
  }
  return { text: null, href: null }
}
