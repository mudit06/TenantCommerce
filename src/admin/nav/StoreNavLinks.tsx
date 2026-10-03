'use client'

import { Link, NavGroup, useAuth } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'

import { adminUrl } from '@/admin/paths'
import type { User } from '@/payload-types'

/** Store menu entries that are custom views (docs/screens/vendor-cms.md menu): owners only. */
export function StoreNavLinks() {
  const { user } = useAuth<User>()
  const pathname = usePathname()
  const isOwner = (user?.tenants ?? []).some((row) => (row.roles ?? []).includes('owner'))
  if (!user || user.platformRole || !isOwner) return null
  const links = [{ href: adminUrl.staff, label: 'Staff and roles' }]
  return (
    <NavGroup label="Team">
      {links.map((link) => (
        <Link className="nav__link" href={link.href} key={link.href} prefetch={false}>
          {pathname === link.href ? <div className="nav__link-indicator" /> : null}
          <span className="nav__link-label">{link.label}</span>
        </Link>
      ))}
    </NavGroup>
  )
}
