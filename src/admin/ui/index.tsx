import type { ReactNode } from 'react'

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
