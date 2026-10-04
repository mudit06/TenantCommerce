import type { ReactNode } from 'react'

import { Icon, type IconName } from './icons'

// Small presentational building blocks for our custom admin screens. Plain markup styled by
// src/app/(payload)/custom.scss (te-* classes, theme tokens in "Look and feel",
// docs/screens/vendor-cms.md). Safe in both server and client components.

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

export function Pill({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`te-pill te-pill--${tone}`}>{children}</span>
}

export function Card({
  title,
  actions,
  children,
  className,
}: {
  title?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={['te-card', className].filter(Boolean).join(' ')}>
      {title || actions ? (
        <header className="te-card__header">
          {title ? <h3 className="te-card__title">{title}</h3> : <span />}
          {actions ? <div className="te-card__actions">{actions}</div> : null}
        </header>
      ) : null}
      <div className="te-card__body">{children}</div>
    </section>
  )
}

export function Figure({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: Tone
}) {
  return (
    <div className={`te-figure${tone ? ` te-figure--${tone}` : ''}`}>
      <div className="te-figure__label">{label}</div>
      <div className="te-figure__value">{value}</div>
      {hint ? <div className="te-figure__hint">{hint}</div> : null}
    </div>
  )
}

export function UsageBar({
  label,
  used,
  limit,
  format = (n: number) => n.toLocaleString('en-IN'),
}: {
  label: string
  used: number
  limit: number | null | undefined
  format?: (n: number) => string
}) {
  const ratio = limit ? Math.min(used / limit, 1) : 0
  const tone = !limit ? 'neutral' : ratio >= 1 ? 'danger' : ratio >= 0.9 ? 'warning' : 'success'
  return (
    <div className="te-usage">
      <div className="te-usage__row">
        <span>{label}</span>
        <span className="te-usage__numbers">
          {format(used)} / {limit ? format(limit) : 'No limit'}
          {limit && ratio >= 0.9 ? ` · ${Math.round((used / limit) * 100)}% used` : ''}
        </span>
      </div>
      <div
        aria-label={label}
        aria-valuemax={limit ?? undefined}
        aria-valuemin={0}
        aria-valuenow={used}
        className="te-usage__track"
        role="progressbar"
      >
        <div
          className={`te-usage__fill te-usage__fill--${tone}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  )
}

export function Rows({ children }: { children: ReactNode }) {
  return <ul className="te-rows">{children}</ul>
}

export function Row({
  primary,
  secondary,
  aside,
  href,
}: {
  primary: ReactNode
  secondary?: ReactNode
  aside?: ReactNode
  href?: string
}) {
  const body = (
    <>
      <div className="te-rows__main">
        <div className="te-rows__primary">{primary}</div>
        {secondary ? <div className="te-rows__secondary">{secondary}</div> : null}
      </div>
      {aside ? <div className="te-rows__aside">{aside}</div> : null}
    </>
  )
  return (
    <li className="te-rows__item">
      {href ? (
        <a className="te-rows__link" href={href}>
          {body}
        </a>
      ) : (
        body
      )}
    </li>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="te-empty">{children}</p>
}

export function Notice({ tone = 'info', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div className={`te-notice te-notice--${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      {children}
    </div>
  )
}

// ---- Design system additions (docs/screens/vendor-cms.md "Look and feel") ------------------

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
}: {
  title: ReactNode
  subtitle?: ReactNode
  /** A small line above the title, for example the store name */
  eyebrow?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="te-page__header">
      <div className="te-page__heading">
        {eyebrow ? <p className="te-page__eyebrow">{eyebrow}</p> : null}
        <h1 className="te-page__title">{title}</h1>
        {subtitle ? <p className="te-page__subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="te-page__actions">{actions}</div> : null}
    </header>
  )
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

/** A link that looks like a button (navigation, never an action with side effects). */
export function ButtonLink({
  href,
  children,
  variant = 'secondary',
  icon,
  size = 'medium',
  external,
}: {
  href: string
  children: ReactNode
  variant?: ButtonVariant
  icon?: IconName
  size?: 'small' | 'medium'
  external?: boolean
}) {
  return (
    <a
      className={`te-button te-button--${variant} te-button--${size}`}
      href={href}
      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
    >
      {icon ? <Icon name={icon} size={16} /> : null}
      <span>{children}</span>
    </a>
  )
}

export function EmptyState({
  icon = 'info',
  title,
  children,
  action,
}: {
  icon?: IconName
  title: ReactNode
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="te-empty-state">
      <span aria-hidden className="te-empty-state__icon">
        <Icon name={icon} size={22} />
      </span>
      <p className="te-empty-state__title">{title}</p>
      {children ? <p className="te-empty-state__body">{children}</p> : null}
      {action ? <div className="te-empty-state__action">{action}</div> : null}
    </div>
  )
}

/** Grey placeholder lines while a part of the screen loads (Suspense fallbacks). */
export function Skeleton({ lines = 3, label = 'Loading' }: { lines?: number; label?: string }) {
  return (
    <div aria-busy="true" aria-label={label} className="te-skeleton" role="status">
      {Array.from({ length: lines }, (_, index) => (
        <span className="te-skeleton__line" key={index} />
      ))}
    </div>
  )
}

/** Lifecycle of a page or product, always as icon + words, never colour alone. */
export type ContentStatus = 'draft' | 'published' | 'scheduled' | 'changed'

const STATUS_BADGE: Record<ContentStatus, { tone: Tone; icon: IconName; label: string }> = {
  draft: { tone: 'neutral', icon: 'draft', label: 'Draft' },
  published: { tone: 'success', icon: 'checkCircle', label: 'Published' },
  scheduled: { tone: 'info', icon: 'calendar', label: 'Scheduled' },
  changed: { tone: 'warning', icon: 'edit', label: 'Unpublished changes' },
}

export function StatusBadge({ status, detail }: { status: ContentStatus; detail?: ReactNode }) {
  const badge = STATUS_BADGE[status]
  return (
    <span className={`te-badge te-badge--${badge.tone}`}>
      <Icon name={badge.icon} size={13} />
      <span>{badge.label}</span>
      {detail ? <span className="te-badge__detail">{detail}</span> : null}
    </span>
  )
}

/** Page templates: the page's structure, not the vendor's look (docs/10). */
export const PAGE_TEMPLATES = {
  default: {
    label: 'Default',
    icon: 'pages',
    summary: 'Title and breadcrumbs above your blocks',
    use: 'About us, company story, care guides',
  },
  landing: {
    label: 'Landing',
    icon: 'layout',
    summary: 'Blocks only, full width, no title bar',
    use: 'Home page, festive offers, collections',
  },
  policy: {
    label: 'Policy',
    icon: 'legal',
    summary: 'Legal text with the title on top, linked from the footer and checkout',
    use: 'Shipping, returns, privacy, terms, warranty',
  },
} as const satisfies Record<string, { label: string; icon: IconName; summary: string; use: string }>

export type PageTemplate = keyof typeof PAGE_TEMPLATES

export function TemplateBadge({ template }: { template: string | null | undefined }) {
  const key = (template && template in PAGE_TEMPLATES ? template : 'default') as PageTemplate
  const info = PAGE_TEMPLATES[key]
  return (
    <span className={`te-template te-template--${key}`}>
      <Icon name={info.icon} size={13} />
      {info.label}
    </span>
  )
}
