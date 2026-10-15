import type { StoreContext } from '@/storefront/context'
import {
  MenuIcon,
  PhoneIcon,
  PinIcon,
  SearchIcon,
  TagIcon,
  UserIcon,
  WhatsAppIcon,
} from '@/storefront/kit/icons'
import Link from '@/storefront/kit/IntentLink'
import { MegaMenu, MegaPanel, MobileMenuList } from '@/storefront/kit/layout/MegaMenu'
import { categoryColumns, headerItems, storeAnnouncement } from '@/storefront/kit/layout/nav'
import { SearchBox } from '@/storefront/kit/listing/SearchBox'
import { Img } from '@/storefront/kit/media'
import { CartLink } from '@/storefront/kit/shop/CartLink'
import { WishlistLink } from '@/storefront/kit/shop/WishlistLink'
import { buttonClass, Container } from '@/storefront/kit/ui'
import { storeWhatsApp } from '@/storefront/kit/whatsapp'

/**
 * Home Orbit's header: a light utility line (dealers, the live offer, phone and WhatsApp), the
 * logo with a wide model-number search, and a category bar with "All categories" and the store's
 * menu with its large dropdowns (docs/screens storefront layout rules, Menus rule 2). Menu items,
 * columns and dropdown pictures come from the CMS Menus screen; the category list from Categories.
 */
export async function Header({ ctx }: { ctx: StoreContext }) {
  const settings = ctx.settings
  const name = settings?.storeName ?? ctx.store.name
  const items = headerItems(ctx)
  const allCategories = categoryColumns(ctx)
  const phone = settings?.contact?.phone
  const whatsapp = storeWhatsApp(settings?.contact?.whatsapp, `Hello ${name}, I have a question.`)
  const { text: announcement, href: announcementHref } = await storeAnnouncement(ctx)
  const selling = ctx.selling.selling
  const offers = ctx.hasFeature('schemes') || ctx.hasFeature('coupons')
  const dealers = ctx.hasFeature('dealer-locator')

  return (
    <>
      <div className="border-b border-line bg-surface-alt text-xs text-ink-soft">
        <Container className="flex min-h-9 items-center justify-center gap-4 sm:justify-between">
          <div className="hidden items-center gap-4 sm:flex">
            {dealers ? (
              <Link className="inline-flex items-center gap-1.5 hover:text-ink" href="/dealers">
                <PinIcon height={14} width={14} /> Find a dealer
              </Link>
            ) : (
              <span>{ctx.ui.tagline}</span>
            )}
          </div>
          <p className="truncate text-center font-medium text-ink">
            {announcement ? (
              announcementHref ? (
                <Link className="underline-offset-2 hover:underline" href={announcementHref}>
                  {announcement}
                </Link>
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
                className="inline-flex items-center gap-1.5 hover:text-ink"
                href={`tel:${phone.replace(/\s+/g, '')}`}
              >
                <PhoneIcon height={14} width={14} /> {phone}
              </a>
            ) : null}
            {whatsapp ? (
              <a
                className="inline-flex items-center gap-1.5 hover:text-ink"
                href={whatsapp}
                rel="noopener noreferrer"
                target="_blank"
              >
                <WhatsAppIcon height={14} width={14} /> WhatsApp
              </a>
            ) : null}
            {selling ? (
              <Link className="hover:text-ink" href="/account">
                Track order
              </Link>
            ) : (
              <Link className="hover:text-ink" href="/contact">
                Contact us
              </Link>
            )}
          </div>
        </Container>
      </div>

      <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
        <Container className="relative flex h-16 items-center gap-2 sm:gap-4 lg:h-[84px] lg:gap-8">
          <details className="group lg:hidden">
            <summary
              aria-label="Menu"
              className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full hover:bg-surface-alt [&::-webkit-details-marker]:hidden"
            >
              <MenuIcon />
            </summary>
            <nav
              aria-label="Menu"
              className="drop-in absolute inset-x-0 top-full z-50 max-h-[calc(100dvh-6.5rem)] overflow-y-auto border-t border-line bg-white px-4 pb-24 shadow-xl"
            >
              <div className="py-3 md:hidden">
                <SearchBox variant="page" />
              </div>
              <MobileMenuList items={items} />
              <ul className="divide-y divide-line border-t border-line text-sm">
                {offers ? (
                  <li>
                    <Link className="flex min-h-12 items-center gap-2" href="/offers">
                      <TagIcon height={16} width={16} /> Offers
                    </Link>
                  </li>
                ) : null}
                {selling ? (
                  <li>
                    <Link className="flex min-h-12 items-center" href="/account">
                      My account and orders
                    </Link>
                  </li>
                ) : null}
                {selling && ctx.hasFeature('wishlist') ? (
                  <li>
                    <Link className="flex min-h-12 items-center" href="/wishlist">
                      Wishlist
                    </Link>
                  </li>
                ) : null}
                {items.some((item) => item.href === '/contact') ? null : (
                  <li>
                    <Link className="flex min-h-12 items-center" href="/contact">
                      Contact us
                    </Link>
                  </li>
                )}
                {phone ? (
                  <li>
                    <a
                      className="flex min-h-12 items-center gap-2"
                      href={`tel:${phone.replace(/\s+/g, '')}`}
                    >
                      <PhoneIcon height={16} width={16} /> {phone}
                    </a>
                  </li>
                ) : null}
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

          <div className="hidden min-w-0 flex-1 md:block">
            <div className="mx-auto max-w-2xl">
              <SearchBox variant="bar" />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-1 sm:gap-2 md:ml-0">
            <Link
              aria-label="Search"
              className="flex size-11 items-center justify-center rounded-full hover:bg-surface-alt md:hidden"
              href="/search"
            >
              <SearchIcon />
            </Link>
            {phone ? (
              <a
                className="hidden items-center gap-2.5 pr-2 xl:flex"
                href={`tel:${phone.replace(/\s+/g, '')}`}
              >
                <span className="flex size-11 items-center justify-center rounded-full border border-line">
                  <PhoneIcon />
                </span>
                <span className="leading-tight">
                  <span className="block text-[11px] text-ink-soft">Call us</span>
                  <span className="block text-sm font-semibold">{phone}</span>
                </span>
              </a>
            ) : null}
            {selling ? (
              <>
                <Link
                  aria-label="My account"
                  className="hidden size-11 items-center justify-center rounded-full hover:bg-surface-alt sm:flex"
                  href="/account"
                >
                  <UserIcon />
                </Link>
                {ctx.hasFeature('wishlist') ? (
                  <WishlistLink className="hidden sm:flex" look="plain" />
                ) : null}
                <CartLink look="plain" />
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

        <div className="hidden border-t border-line lg:block">
          <Container className="relative flex h-12 items-center gap-2">
            {allCategories.length ? (
              <div className="group/all">
                <Link
                  aria-haspopup="true"
                  className="flex h-10 items-center gap-2 rounded-card bg-dark px-4 text-sm font-semibold text-white hover:bg-black"
                  href="/c"
                >
                  <MenuIcon height={18} width={18} /> All categories
                </Link>
                <MegaPanel
                  columns={allCategories}
                  featured={null}
                  hoverGroup="all"
                  shopAll={{ label: 'See every category', href: '/c' }}
                />
              </div>
            ) : null}
            <nav aria-label="Main" className="min-w-0 flex-1">
              <MegaMenu
                itemClassName="px-3 text-sm font-semibold text-ink hover:text-accent"
                items={items}
              />
            </nav>
            {offers ? (
              <Link
                className="inline-flex min-h-11 items-center gap-1.5 px-2 text-sm font-semibold text-accent hover:underline"
                href="/offers"
              >
                <TagIcon height={16} width={16} /> Offers
              </Link>
            ) : null}
          </Container>
        </div>
      </header>
    </>
  )
}
