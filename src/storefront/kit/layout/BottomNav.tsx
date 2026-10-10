'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { CartIcon, GridIcon, HomeIcon, MailIcon, PinIcon, SearchIcon, UserIcon } from '../icons'
import { CART_EVENT } from '../shop/CartLink'

type Tab = 'home' | 'shop' | 'dealers' | 'search' | 'account' | 'contact' | 'cart'

const readCount = () => {
  const match = document.cookie.match(/(?:^|; )te_cart_n=(\d+)/)
  return match ? Number(match[1]) : 0
}

// Pages with their own sticky action bar (Add to cart, Checkout, Pay) hide the bottom navigation
// (docs/screens storefront layout rules)
const OWN_BAR = [/^\/products\//, /^\/cart$/, /^\/checkout/]

/**
 * Phone bottom navigation: Home, Shop, Dealers, Account, Cart. Stores that don't sell online get
 * Search and Contact in place of Account and Cart; Dealers shows with the dealer locator only.
 */
export function BottomNav({ selling, dealers }: { selling: boolean; dealers: boolean }) {
  const pathname = usePathname() ?? '/'
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!selling) return
    const update = () => setCount(readCount())
    update()
    window.addEventListener(CART_EVENT, update)
    window.addEventListener('focus', update)
    return () => {
      window.removeEventListener(CART_EVENT, update)
      window.removeEventListener('focus', update)
    }
  }, [selling])
  if (OWN_BAR.some((pattern) => pattern.test(pathname))) return null

  const tabs: { key: Tab; label: string; href: string; icon: typeof HomeIcon }[] = [
    { key: 'home', label: 'Home', href: '/', icon: HomeIcon },
    { key: 'shop', label: 'Shop', href: '/c', icon: GridIcon },
    dealers
      ? { key: 'dealers', label: 'Dealers', href: '/dealers', icon: PinIcon }
      : { key: 'search', label: 'Search', href: '/search', icon: SearchIcon },
    selling
      ? { key: 'account', label: 'Account', href: '/account', icon: UserIcon }
      : { key: 'contact', label: 'Contact', href: '/contact', icon: MailIcon },
    ...(selling ? [{ key: 'cart' as const, label: 'Cart', href: '/cart', icon: CartIcon }] : []),
  ]
  const active = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <nav
      aria-label="Bottom navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="flex">
        {tabs.map(({ key, label, href, icon: Icon }) => (
          <li className="flex-1" key={key}>
            <Link
              aria-current={active(href) ? 'page' : undefined}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${active(href) ? 'text-accent' : 'text-ink-soft'}`}
              href={href}
            >
              <Icon height={20} width={20} />
              {label}
              {key === 'cart' && count > 0 ? (
                <span
                  aria-label={`${count} in cart`}
                  className="absolute top-1.5 left-1/2 ml-2 flex min-w-4 items-center justify-center rounded-full bg-dark px-1 text-[10px] font-bold text-white"
                >
                  {count > 99 ? '99+' : count}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
