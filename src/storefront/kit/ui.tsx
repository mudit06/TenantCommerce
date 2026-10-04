import Link from 'next/link'
import type { ReactNode } from 'react'

export function Container({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={`mx-auto w-full max-w-7xl px-4 sm:px-6 ${className}`}>{children}</div>
}

export function SectionHeading({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <h2 className="font-heading text-xl font-semibold tracking-wide text-ink [text-transform:var(--heading-transform)] sm:text-2xl">
        {children}
      </h2>
      {action}
    </div>
  )
}

const buttonStyles = {
  primary: 'bg-brand text-brand-ink hover:brightness-95',
  dark: 'bg-dark text-white hover:bg-black',
  outline: 'border border-ink/20 bg-white text-ink hover:border-ink/50',
  whatsapp: 'bg-[#1F7A3E] text-white hover:bg-[#186132]',
  onDark: 'border border-white/40 text-white hover:border-white',
} as const

export const buttonClass = (style: keyof typeof buttonStyles = 'primary', extra = '') =>
  `inline-flex min-h-11 items-center justify-center gap-2 rounded-card px-5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${buttonStyles[style]} ${extra}`

export function ButtonLink({
  href,
  children,
  style = 'primary',
  className = '',
  newTab = false,
}: {
  href: string
  children: ReactNode
  style?: keyof typeof buttonStyles
  className?: string
  newTab?: boolean
}) {
  const external = /^https?:|^mailto:|^tel:/.test(href)
  if (external) {
    return (
      <a
        className={buttonClass(style, className)}
        href={href}
        rel={newTab ? 'noopener noreferrer' : undefined}
        target={newTab ? '_blank' : undefined}
      >
        {children}
      </a>
    )
  }
  return (
    <Link className={buttonClass(style, className)} href={href}>
      {children}
    </Link>
  )
}
