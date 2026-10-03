'use client'

import { Link, NavGroup, useAuth } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'

import { adminUrl } from '@/admin/paths'
import type { User } from '@/payload-types'

/** Platform panel menu entries that are custom views, not collections (docs/screens menu). */
export function PlatformNavLinks() {
  const { user } = useAuth<User>()
  const pathname = usePathname()
  if (!user?.platformRole) return null
  const links = [
    ...(user.platformRole === 'super-admin'
      ? [{ href: adminUrl.newVendor, label: 'New vendor' }]
      : []),
    { href: adminUrl.team, label: 'Team and access' },
  ]
  return (
    <NavGroup label="Shortcuts">
      {links.map((link) => {
        const active = pathname === link.href
        return (
          <Link className="nav__link" href={link.href} key={link.href} prefetch={false}>
            {active ? <div className="nav__link-indicator" /> : null}
            <span className="nav__link-label">{link.label}</span>
          </Link>
        )
      })}
    </NavGroup>
  )
}
