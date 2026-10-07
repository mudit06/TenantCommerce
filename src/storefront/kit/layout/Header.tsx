import Link from 'next/link'

import type { StoreContext } from '../../context'
import { MenuIcon, PhoneIcon, SearchIcon, UserIcon, WhatsAppIcon } from '../icons'
import { linkHref } from '../links'
import { Img } from '../media'
import { CartLink } from '../shop/CartLink'
import { buttonClass, Container } from '../ui'
import { storeWhatsApp } from '../whatsapp'

type NavItem = { label: string; href: string | null; children: { label: string; href: string }[] }

/** Menu items: the store's own header menu, or its category tree until it builds one. */
function navItems(ctx: StoreContext): NavItem[] {
  const fromMenu = (ctx.navigation?.header ?? []).map((item) => ({
    label: item.label,
    href: linkHref(item.link)?.href ?? null,
    children: (item.columns ?? []).flatMap((column) =>
      (column.links ?? []).flatMap((link) => {
        const target = linkHref(link.link)
        return target ? [{ label: link.label, href: target.href }] : []
      }),
    ),
  }))
  if (fromMenu.length > 0) return fromMenu
  return ctx.categories.roots.map((root) => ({
    label: root.name,
    href: root.path,
    children: root.children.map((child) => ({ label: child.name, href: child.path })),
  }))
}

export function Header({ ctx }: { ctx: StoreContext }) {
  const settings = ctx.settings
  const name = settings?.storeName ?? ctx.store.name
  const items = navItems(ctx)
  const phone = settings?.contact?.phone
  const whatsapp = storeWhatsApp(settings?.contact?.whatsapp, `Hello ${name}, I have a question.`)
  const announcement = settings?.announcementBar?.enabled ? settings.announcementBar.text : null
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="bg-dark text-xs text-white/90">
        <Container className="flex min-h-9 items-center justify-between gap-4">
          <p className="truncate">
            {announcement ? (
              settings?.announcementBar?.linkUrl ? (
                <a
                  className="underline-offset-2 hover:underline"
                  href={settings.announcementBar.linkUrl}
                >
                  {announcement}
                </a>
              ) : (
                announcement
              )
            ) : (
              ctx.ui.tagline
            )}
          </p>
          <div className="hidden items-center gap-4 sm:flex">
            {phone ? (
              <a
                className="inline-flex items-center gap-1.5 hover:text-white"
                href={`tel:${phone.replace(/\s+/g, '')}`}
              >
                <PhoneIcon height={14} width={14} /> {phone}
              </a>
            ) : null}
            {whatsapp ? (
              <a
                className="inline-flex items-center gap-1.5 hover:text-white"
                href={whatsapp}
                rel="noopener noreferrer"
                target="_blank"
              >
                <WhatsAppIcon height={14} width={14} /> WhatsApp
              </a>
            ) : null}
          </div>
        </Container>
      </div>
      <Container className="flex h-16 items-center gap-4 lg:h-20">
        <details className="group relative lg:hidden">
          <summary
            aria-label="Menu"
            className="flex size-11 cursor-pointer list-none items-center justify-center rounded-card border border-line [&::-webkit-details-marker]:hidden"
          >
            <MenuIcon />
          </summary>
          <nav
            aria-label="Menu"
            className="fixed inset-x-0 top-[6.25rem] z-50 max-h-[calc(100dvh-6.25rem)] overflow-y-auto border-t border-line bg-white px-4 pb-8 shadow-xl"
          >
            <ul className="divide-y divide-line">
              {items.map((item) => (
                <li className="py-3" key={item.label}>
                  {item.href ? (
                    <Link
                      className="font-heading text-base font-semibold [text-transform:var(--heading-transform)]"
                      href={item.href}
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span className="font-heading font-semibold">{item.label}</span>
                  )}
                  {item.children.length > 0 ? (
                    <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <Link className="block py-1.5 text-sm text-ink-soft" href={child.href}>
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
              {ctx.selling.selling ? (
                <li className="py-3">
                  <Link className="text-sm" href="/account">
                    My account
                  </Link>
                </li>
              ) : null}
              <li className="py-3">
                <Link className="text-sm" href="/contact">
                  Contact us
                </Link>
              </li>
            </ul>
          </nav>
        </details>

        <Link aria-label={`${name} home`} className="flex shrink-0 items-center" href="/">
          {settings?.logo && typeof settings.logo === 'object' ? (
            <Img
              alt={name}
              className="h-9 w-auto lg:h-12"
              media={settings.logo}
              priority
              sizes="240px"
            />
          ) : (
            <span className="font-heading text-xl font-bold">{name}</span>
          )}
        </Link>

        <nav aria-label="Main" className="ml-6 hidden flex-1 lg:block">
          <ul className="flex items-center gap-1">
            {items.map((item) => (
              <li className="group relative" key={item.label}>
                {item.href ? (
                  <Link
                    className="block rounded-card px-3 py-2 text-sm font-semibold text-ink hover:text-accent"
                    href={item.href}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="block px-3 py-2 text-sm font-semibold">{item.label}</span>
                )}
                {item.children.length > 0 ? (
                  <div className="invisible absolute left-0 top-full min-w-56 translate-y-1 rounded-card border border-line bg-white p-2 opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                    <ul>
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            className="block rounded px-3 py-2 text-sm text-ink-soft hover:bg-surface-alt hover:text-ink"
                            href={child.href}
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <form action="/search" className="hidden md:block" role="search">
            <label className="sr-only" htmlFor="header-search">
              Search products
            </label>
            <div className="flex items-center rounded-card border border-line bg-surface-alt px-3 focus-within:border-ink/40">
              <SearchIcon className="text-ink-soft" />
              <input
                className="h-10 w-44 bg-transparent px-2 text-sm outline-none placeholder:text-ink-soft xl:w-56"
                id="header-search"
                name="q"
                placeholder="Search or model no."
                type="search"
              />
            </div>
          </form>
          <Link
            aria-label="Search"
            className="flex size-11 items-center justify-center rounded-card border border-line md:hidden"
            href="/search"
          >
            <SearchIcon />
          </Link>
          {ctx.selling.selling ? (
            <>
              <Link
                aria-label="My account"
                className="hidden size-11 items-center sm:flex justify-center rounded-card border border-line hover:border-ink/40"
                href="/account"
              >
                <UserIcon />
              </Link>
              <CartLink />
            </>
          ) : (
            <span className="hidden sm:block">
              <Link className={buttonClass('primary')} href="/contact">
                Get a quote
              </Link>
            </span>
          )}
        </div>
      </Container>
    </header>
  )
}
