import Link from 'next/link'

import { ChevronIcon } from './icons'

/** Breadcrumb trail with BreadcrumbList markup (docs/13). */
export function Breadcrumbs({
  items,
  origin,
}: {
  items: { label: string; href: string }[]
  origin?: string
}) {
  const schema = origin
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: item.label,
          item: `${origin}${item.href}`,
        })),
      }
    : null
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-ink-soft">
        {items.map((item, i) => (
          <li className="inline-flex items-center gap-1" key={item.href + i}>
            {i > 0 ? <ChevronIcon height={12} width={12} /> : null}
            {i === items.length - 1 ? (
              <span aria-current="page" className="text-ink">
                {item.label}
              </span>
            ) : (
              <Link className="hover:text-ink hover:underline" href={item.href}>
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
      {schema ? (
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
          type="application/ld+json"
        />
      ) : null}
    </nav>
  )
}
