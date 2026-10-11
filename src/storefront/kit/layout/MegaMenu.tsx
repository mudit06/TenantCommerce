import Link from 'next/link'

import { ChevronIcon } from '../icons'
import { Img } from '../media'
import { Container } from '../ui'
import type { NavColumn, NavItem } from './nav'

/**
 * The header's large dropdowns (docs/screens Menus rule 2): up to four columns, each with a
 * heading and links (with the category's photo when the link is a category), and the item's
 * featured image. Opens on hover and keyboard focus without any script. The panel spans the
 * header, so the element it sits in must be `relative`.
 */
export function MegaMenu({
  items,
  itemClassName = '',
}: {
  items: NavItem[]
  /** Look of the top-level links */
  itemClassName?: string
}) {
  return (
    <ul className="flex items-center">
      {items.map((item) => {
        const hasPanel = item.columns.length > 0
        return (
          <li className="group/item" key={item.label}>
            {item.href ? (
              <Link
                aria-haspopup={hasPanel ? 'true' : undefined}
                className={`flex min-h-11 items-center gap-1 whitespace-nowrap ${itemClassName}`}
                href={item.href}
              >
                {item.label}
                {hasPanel ? (
                  <ChevronIcon
                    className="rotate-90 opacity-60 transition group-hover/item:-rotate-90"
                    height={14}
                    width={14}
                  />
                ) : null}
              </Link>
            ) : (
              <span className={`flex min-h-11 items-center whitespace-nowrap ${itemClassName}`}>
                {item.label}
              </span>
            )}
            {hasPanel ? (
              <MegaPanel
                columns={item.columns}
                featured={
                  item.featuredImage
                    ? { image: item.featuredImage, label: item.label, href: item.href }
                    : null
                }
                shopAll={
                  item.href
                    ? { label: `Shop all ${item.label.toLowerCase()}`, href: item.href }
                    : null
                }
              />
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

/** A dropdown panel: columns of links, then a featured picture. */
export function MegaPanel({
  columns,
  featured,
  shopAll,
  hoverGroup = 'item',
}: {
  columns: (NavColumn & { href?: string })[]
  featured: { image: NavItem['featuredImage']; label: string; href: string | null } | null
  shopAll: { label: string; href: string } | null
  /** The Tailwind group whose hover or focus opens the panel */
  hoverGroup?: 'item' | 'all'
}) {
  // display:none until opened, so the panel's photos load only when someone opens it
  const open =
    hoverGroup === 'all'
      ? 'group-hover/all:block group-focus-within/all:block'
      : 'group-hover/item:block group-focus-within/item:block'
  const shown = columns.slice(0, featured ? 3 : 4)
  return (
    <div
      className={`absolute inset-x-0 top-full z-50 hidden border-t border-line bg-white shadow-xl ${open}`}
    >
      <Container className="grid gap-8 py-7 lg:grid-cols-4">
        <div
          className={`grid gap-8 ${featured ? 'lg:col-span-3' : 'lg:col-span-4'}`}
          style={{ gridTemplateColumns: `repeat(${Math.max(1, shown.length)}, minmax(0, 1fr))` }}
        >
          {shown.map((column, i) => (
            <div key={column.heading ?? i}>
              {column.heading ? (
                column.href ? (
                  <Link
                    className="mb-3 block text-xs font-bold tracking-[0.16em] text-ink uppercase hover:text-accent"
                    href={column.href}
                  >
                    {column.heading}
                  </Link>
                ) : (
                  <p className="mb-3 text-xs font-bold tracking-[0.16em] text-ink uppercase">
                    {column.heading}
                  </p>
                )
              ) : null}
              <ul
                className={
                  shown.length === 1
                    ? 'grid grid-cols-2 gap-x-6 gap-y-1 xl:grid-cols-4'
                    : 'space-y-1'
                }
              >
                {column.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      className="-mx-2 flex min-h-10 items-center gap-3 rounded-card px-2 py-1 text-sm text-ink-soft hover:bg-surface-alt hover:text-ink"
                      href={link.href}
                    >
                      {/* Photos only when the whole column has them, so the list stays even */}
                      {link.image && column.links.every((l) => l.image) ? (
                        <span className="size-9 shrink-0 overflow-hidden rounded-[calc(var(--radius)*0.6)] bg-surface-alt">
                          <Img className="size-full object-cover" media={link.image} sizes="40px" />
                        </span>
                      ) : null}
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {featured ? (
          <Link
            className="group/feat relative hidden aspect-[4/3] overflow-hidden rounded-card bg-surface-alt lg:block"
            href={featured.href ?? '#'}
          >
            <Img
              className="size-full object-cover transition duration-500 group-hover/feat:scale-105"
              media={featured.image}
              sizes="320px"
            />
            <span className="absolute inset-x-3 bottom-3 rounded-card bg-white/95 px-3 py-2 text-sm font-semibold text-ink shadow">
              {featured.label} →
            </span>
          </Link>
        ) : null}
        {shopAll ? (
          <div className="border-t border-line pt-4 lg:col-span-4">
            <Link
              className="text-sm font-semibold text-accent underline-offset-4 hover:underline"
              href={shopAll.href}
            >
              {shopAll.label} →
            </Link>
          </div>
        ) : null}
      </Container>
    </div>
  )
}

/** The phone menu: each item opens to its columns; works without script. */
export function MobileMenuList({ items }: { items: NavItem[] }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((item) =>
        item.columns.length > 0 ? (
          <li key={item.label}>
            <details className="group/acc">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between py-2 font-heading text-base font-semibold [text-transform:var(--heading-transform)] [&::-webkit-details-marker]:hidden">
                {item.label}
                <ChevronIcon className="rotate-90 transition group-open/acc:-rotate-90" />
              </summary>
              <div className="space-y-4 pb-4">
                {item.columns.map((column, i) => (
                  <div key={column.heading ?? i}>
                    {column.heading ? (
                      <p className="mb-1 text-[11px] font-bold tracking-[0.16em] text-ink-soft uppercase">
                        {column.heading}
                      </p>
                    ) : null}
                    <ul className="grid grid-cols-2 gap-x-3">
                      {column.links.map((link) => (
                        <li key={link.href + link.label}>
                          <Link
                            className="flex min-h-11 items-center gap-2 text-sm text-ink"
                            href={link.href}
                          >
                            {link.image ? (
                              <span className="size-8 shrink-0 overflow-hidden rounded bg-surface-alt">
                                <Img
                                  className="size-full object-cover"
                                  media={link.image}
                                  sizes="32px"
                                />
                              </span>
                            ) : null}
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {item.href ? (
                  <Link className="inline-block text-sm font-semibold text-accent" href={item.href}>
                    Shop all {item.label.toLowerCase()} →
                  </Link>
                ) : null}
              </div>
            </details>
          </li>
        ) : (
          <li key={item.label}>
            {item.href ? (
              <Link
                className="flex min-h-12 items-center py-2 font-heading text-base font-semibold [text-transform:var(--heading-transform)]"
                href={item.href}
              >
                {item.label}
              </Link>
            ) : (
              <span className="flex min-h-12 items-center py-2 font-heading font-semibold">
                {item.label}
              </span>
            )}
          </li>
        ),
      )}
    </ul>
  )
}
