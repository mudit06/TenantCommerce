'use client'

import { useTenantSelection } from '@payloadcms/plugin-multi-tenant/client'
import { Hamburger, Link, useNav } from '@payloadcms/ui'
import { usePathname } from 'next/navigation'
import { useEffect, useSyncExternalStore } from 'react'

import { ADMIN } from '@/admin/paths'
import { Icon } from '@/admin/ui/icons'

import { type BadgeKey, isActive, type NavSection } from './menu'

export type NavBadges = Partial<Record<BadgeKey, { count: number; label: string }>>

export type NavIdentity = {
  workspace: 'platform' | 'store'
  store: {
    id: string
    name: string
    status: string
    planName?: string
    storeUrl?: string
    maxProducts?: number | null
    productsCount?: number
  } | null
  session: { mode: 'manage' | 'view' } | null
  person: { name: string; email: string; role: string }
  canSwitchStore: boolean
}

const RAIL_KEY = 'te-nav-rail'
const DESKTOP = '(min-width: 1025px)'

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?'

const RAIL_EVENT = 'te-nav-rail'

const readRail = () => {
  try {
    return window.localStorage.getItem(RAIL_KEY) === '1'
  } catch {
    // Private windows may refuse storage: the menu simply starts open
    return false
  }
}

const subscribeRail = (onChange: () => void) => {
  window.addEventListener(RAIL_EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(RAIL_EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

/** Collapses the menu to an icon rail on desktop; remembered per browser. */
function useRail() {
  const rail = useSyncExternalStore(subscribeRail, readRail, () => false)
  useEffect(() => {
    document.documentElement.dataset.teNav = rail ? 'rail' : 'full'
  }, [rail])
  const setRail = (next: boolean) => {
    try {
      window.localStorage.setItem(RAIL_KEY, next ? '1' : '0')
    } catch {
      // ignore: the choice just isn't remembered
    }
    window.dispatchEvent(new Event(RAIL_EVENT))
  }
  return [rail, setRail] as const
}

function StoreSwitcher({ currentId }: { currentId: string }) {
  const { options, setTenant } = useTenantSelection()
  if (options.length < 2) return null
  return (
    <label className="te-nav__switcher">
      <span className="te-visually-hidden">Switch store</span>
      <select
        onChange={(event) => setTenant({ id: event.target.value, refresh: true })}
        value={currentId}
      >
        {options.map((option) => (
          <option key={String(option.value)} value={String(option.value)}>
            {String(option.label)}
          </option>
        ))}
      </select>
      <Icon name="chevronDown" size={14} />
    </label>
  )
}

function Brand({ identity }: { identity: NavIdentity }) {
  const { store, session, workspace } = identity
  if (workspace === 'platform' || !store) {
    return (
      <div className="te-nav__brand">
        <span aria-hidden className="te-nav__mark">
          TE
        </span>
        <span className="te-nav__brand-text">
          <span className="te-nav__brand-name">TenantEcom</span>
          <span className="te-nav__brand-sub">Platform admin</span>
        </span>
      </div>
    )
  }
  return (
    <div className="te-nav__brand">
      <span aria-hidden className="te-nav__mark te-nav__mark--store">
        {initials(store.name)}
      </span>
      <span className="te-nav__brand-text">
        <span className="te-nav__brand-name" title={store.name}>
          {store.name}
        </span>
        <span className="te-nav__brand-sub">
          {session
            ? session.mode === 'manage'
              ? 'Managing as platform'
              : 'Viewing as support'
            : 'Store admin'}
        </span>
      </span>
      {identity.canSwitchStore ? <StoreSwitcher currentId={store.id} /> : null}
    </div>
  )
}

/** The plan's product allowance at the foot of a store's menu (wireframe Design view). */
function PlanMeter({ store }: { store: NonNullable<NavIdentity['store']> }) {
  const used = store.productsCount ?? 0
  const max = store.maxProducts
  const ratio = max ? Math.min(1, used / max) : 0
  return (
    <div className="te-nav__plan">
      {max ? (
        <>
          <div className="te-nav__plan-row">
            <span>Products</span>
            <span className="te-nav__plan-numbers">
              {used.toLocaleString('en-IN')} / {max.toLocaleString('en-IN')}
            </span>
          </div>
          <div
            aria-label="Products used on your plan"
            aria-valuemax={max}
            aria-valuemin={0}
            aria-valuenow={used}
            className={`te-nav__plan-track${ratio >= 0.9 ? ' te-nav__plan-track--hot' : ''}`}
            role="progressbar"
          >
            <i style={{ width: `${ratio * 100}%` }} />
          </div>
        </>
      ) : null}
      <span className="te-nav__plan-name">
        {store.planName ? `${store.planName} plan` : 'No plan'}
      </span>
    </div>
  )
}

/** The menu itself; data comes from AppNav on the server. */
export function AppNavClient({
  sections,
  badges,
  identity,
}: {
  sections: NavSection[]
  badges: NavBadges
  identity: NavIdentity
}) {
  const pathname = usePathname()
  const { hydrated, navOpen, navRef, setNavOpen, shouldAnimate } = useNav()
  const [rail, setRail] = useRail()

  // On desktop the menu is always there (full or as a rail); phones open it from the header
  useEffect(() => {
    if (window.matchMedia(DESKTOP).matches && !navOpen) setNavOpen(true)
  }, [navOpen, setNavOpen])

  // The deepest matching entry is the active one (Pages and its type chooser, not Dashboard)
  const activeKey = sections
    .flatMap((section) => section.items)
    .filter((item) => isActive(item, pathname))
    .sort((a, b) => b.href.length - a.href.length)[0]?.key

  const className = [
    'nav',
    'te-nav',
    navOpen && 'nav--nav-open',
    shouldAnimate && 'nav--nav-animate',
    hydrated && 'nav--nav-hydrated',
    rail && 'te-nav--rail',
    identity.workspace === 'store' && 'te-nav--store',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <aside className={className} inert={!navOpen ? true : undefined}>
      <div className="te-nav__scroll" ref={navRef}>
        <div className="te-nav__top">
          <Brand identity={identity} />
          <button
            aria-label="Close menu"
            className="te-nav__mobile-close"
            onClick={() => setNavOpen(false)}
            type="button"
          >
            <Hamburger isActive />
          </button>
        </div>

        <nav
          aria-label={identity.workspace === 'platform' ? 'Platform admin' : 'Store CMS'}
          className="te-nav__sections"
        >
          {sections.map((section) => (
            <div className="te-nav__section" key={section.key}>
              {section.label ? <div className="te-nav__section-label">{section.label}</div> : null}
              <ul className="te-nav__list">
                {section.items.map((item) => {
                  if (item.soon) {
                    return (
                      <li key={item.key}>
                        <span
                          aria-disabled="true"
                          className="te-nav__link te-nav__link--soon"
                          data-tooltip={`${item.label} (coming soon)`}
                        >
                          <Icon className="te-nav__icon" name={item.icon} />
                          <span className="te-nav__label">{item.label}</span>
                          <span className="te-nav__soon">Soon</span>
                        </span>
                      </li>
                    )
                  }
                  const active = item.key === activeKey
                  const badge = item.badge ? badges[item.badge] : undefined
                  return (
                    <li key={item.key}>
                      <Link
                        aria-current={active ? 'page' : undefined}
                        className={`te-nav__link${active ? ' te-nav__link--active' : ''}`}
                        data-tooltip={item.label}
                        href={item.href}
                        prefetch={false}
                      >
                        <Icon className="te-nav__icon" name={item.icon} />
                        <span className="te-nav__label">{item.label}</span>
                        {badge ? (
                          <span
                            aria-label={`${badge.count} ${badge.label}`}
                            className="te-nav__badge"
                          >
                            {badge.count > 99 ? '99+' : badge.count}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {identity.store ? <PlanMeter store={identity.store} /> : null}

        <div className="te-nav__footer">
          {identity.workspace === 'platform' ? (
            <a className="te-nav__person" data-tooltip="Your account" href={`${ADMIN}/account`}>
              <span aria-hidden className="te-nav__avatar">
                {initials(identity.person.name)}
              </span>
              <span className="te-nav__person-text">
                <span className="te-nav__person-name">{identity.person.name}</span>
                <span className="te-nav__person-role">{identity.person.role}</span>
              </span>
            </a>
          ) : (
            // In a store the person sits in the top bar, as in the wireframe
            <span className="te-nav__footer-spacer" />
          )}
          <div className="te-nav__footer-actions">
            <button
              aria-label={rail ? 'Expand menu' : 'Collapse menu'}
              aria-pressed={rail}
              className="te-nav__icon-button te-nav__rail-toggle"
              data-tooltip={rail ? 'Expand menu' : 'Collapse menu'}
              onClick={() => setRail(!rail)}
              type="button"
            >
              <Icon name={rail ? 'expand' : 'collapse'} />
            </button>
            <a
              aria-label="Sign out"
              className="te-nav__icon-button"
              data-tooltip="Sign out"
              href={`${ADMIN}/logout`}
            >
              <Icon name="logout" />
            </a>
          </div>
        </div>
      </div>
    </aside>
  )
}
