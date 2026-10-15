import Link from '@/storefront/kit/IntentLink'

import type { StoreContext } from '../../context'
import { MenuIcon, PhoneIcon, SearchIcon, UserIcon, WhatsAppIcon } from '../icons'
import { SearchBox } from '../listing/SearchBox'
import { Img } from '../media'

import { CartLink } from '../shop/CartLink'
import { WishlistLink } from '../shop/WishlistLink'
import { buttonClass, Container } from '../ui'
import { storeWhatsApp } from '../whatsapp'
import { MegaMenu, MobileMenuList } from './MegaMenu'
import { headerItems, storeAnnouncement } from './nav'

export async function Header({ ctx }: { ctx: StoreContext }) {
  const settings = ctx.settings
  const name = settings?.storeName ?? ctx.store.name
  const items = headerItems(ctx)
  const phone = settings?.contact?.phone
  const whatsapp = storeWhatsApp(settings?.contact?.whatsapp, `Hello ${name}, I have a question.`)
  const { text: announcement, href: announcementHref } = await storeAnnouncement(ctx)
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <div className="bg-dark text-xs text-white/90">
        <Container className="flex min-h-9 items-center justify-between gap-4">
          <p className="truncate">
            {announcement ? (
              announcementHref ? (
                <a className="underline-offset-2 hover:underline" href={announcementHref}>
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
      <Container className="relative flex h-16 items-center gap-2 sm:gap-4 lg:h-20">
        <details className="group relative lg:hidden">
          <summary
            aria-label="Menu"
            className="flex size-11 cursor-pointer list-none items-center justify-center rounded-card border border-line [&::-webkit-details-marker]:hidden"
          >
            <MenuIcon />
          </summary>
          <nav
            aria-label="Menu"
            className="drop-in fixed inset-x-0 top-[6.25rem] z-50 max-h-[calc(100dvh-6.25rem)] overflow-y-auto border-t border-line bg-white px-4 pb-8 shadow-xl"
          >
            <MobileMenuList items={items} />
            <ul className="divide-y divide-line border-t border-line">
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
              className="h-9 w-auto max-w-[9.5rem] object-contain sm:max-w-none lg:h-12"
              media={settings.logo}
              priority
              sizes="240px"
            />
          ) : (
            <span className="font-heading text-xl font-bold">{name}</span>
          )}
        </Link>

        <nav aria-label="Main" className="ml-2 hidden min-w-0 flex-1 lg:block xl:ml-6">
          <MegaMenu
            itemClassName="rounded-card px-2 text-sm font-semibold text-ink hover:text-accent xl:px-3"
            items={items}
          />
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {/* Full box on tablets and wide screens; an icon where the menu needs the room */}
          <div className="hidden md:block lg:hidden xl:block">
            <SearchBox />
          </div>
          <Link
            aria-label="Search"
            className="flex size-11 items-center justify-center rounded-card border border-line md:hidden lg:flex xl:hidden"
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
              {ctx.hasFeature('wishlist') ? <WishlistLink className="hidden sm:flex" /> : null}
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
