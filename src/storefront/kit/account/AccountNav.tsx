import Link from 'next/link'

import { LogOutButtons } from './LogOutButtons'

type Item = { label: string; href: string }

/** The account's side menu on desktop and its list on phones (docs/screens My account). */
export function AccountNav({ items, active }: { items: Item[]; active?: string }) {
  return (
    <>
      <aside className="hidden md:block">
        <nav aria-label="Account" className="space-y-0.5">
          {items.map((item) => (
            <Link
              aria-current={active === item.href ? 'page' : undefined}
              className={`block rounded-md px-3 py-2 text-sm ${active === item.href ? 'bg-surface-alt font-semibold' : 'hover:bg-surface-alt'}`}
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <LogOutButtons className="mt-3 border-t border-line pt-3" />
      </aside>
      <nav
        aria-label="Account"
        className="divide-y divide-line rounded-card border border-line bg-white md:hidden"
      >
        {items.map((item) => (
          <Link
            className="flex items-center justify-between px-4 py-3 text-sm"
            href={item.href}
            key={item.href}
          >
            {item.label}
            <span aria-hidden>›</span>
          </Link>
        ))}
      </nav>
    </>
  )
}
