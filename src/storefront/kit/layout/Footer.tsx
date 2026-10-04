import Link from 'next/link'

import type { StoreContext } from '../../context'
import { MailIcon, PhoneIcon, PinIcon, WhatsAppIcon } from '../icons'
import { linkHref, pageHref } from '../links'
import { Img } from '../media'
import { Container } from '../ui'
import { storeWhatsApp } from '../whatsapp'

const POLICY_LABELS = {
  shipping: 'Shipping policy',
  returns: 'Returns and refunds',
  privacy: 'Privacy policy',
  terms: 'Terms of use',
  warranty: 'Warranty',
} as const

export function Footer({ ctx }: { ctx: StoreContext }) {
  const settings = ctx.settings
  const name = settings?.storeName ?? ctx.store.name
  const contact = settings?.contact
  const whatsapp = storeWhatsApp(contact?.whatsapp, `Hello ${name}, I have a question.`)
  const policies = Object.entries(POLICY_LABELS).flatMap(([key, label]) => {
    const page = settings?.policies?.[key as keyof typeof POLICY_LABELS]
    return page && typeof page === 'object' && page._status === 'published'
      ? [{ label, href: pageHref(page) }]
      : []
  })
  const menuColumns = (ctx.navigation?.footer ?? []).map((column) => ({
    heading: column.heading,
    links: (column.links ?? []).flatMap((link) => {
      const target = linkHref(link.link)
      return target ? [{ label: link.label, href: target.href }] : []
    }),
  }))
  const columns =
    menuColumns.length > 0
      ? menuColumns
      : [
          {
            heading: 'Shop',
            links: ctx.categories.roots.map((root) => ({ label: root.name, href: root.path })),
          },
          {
            heading: 'Help',
            links: [{ label: 'Contact us', href: '/contact' }, ...policies],
          },
        ]
  const grievance = settings?.grievanceOfficer
  return (
    <footer className="mt-16 bg-dark text-sm text-white/80">
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          {settings?.logo && typeof settings.logo === 'object' ? (
            <Img
              alt={name}
              className="h-10 w-auto brightness-0 invert"
              media={settings.logo}
              sizes="200px"
            />
          ) : (
            <p className="font-heading text-lg font-bold text-white">{name}</p>
          )}
          {ctx.ui.tagline ? <p className="mt-3 text-white/70">{ctx.ui.tagline}</p> : null}
        </div>
        {columns.map((column) => (
          <nav aria-label={column.heading} key={column.heading}>
            <h2 className="mb-3 font-heading text-sm font-semibold tracking-wider text-white uppercase">
              {column.heading}
            </h2>
            <ul className="space-y-2">
              {column.links.map((link) => (
                <li key={link.href + link.label}>
                  <Link className="hover:text-white" href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
        {contact?.phone || whatsapp || contact?.email || contact?.address ? (
          <div>
            <h2 className="mb-3 font-heading text-sm font-semibold tracking-wider text-white uppercase">
              Contact
            </h2>
            <ul className="space-y-2.5">
              {contact?.phone ? (
                <li>
                  <a
                    className="inline-flex items-center gap-2 hover:text-white"
                    href={`tel:${contact.phone.replace(/\s+/g, '')}`}
                  >
                    <PhoneIcon height={16} width={16} /> {contact.phone}
                  </a>
                </li>
              ) : null}
              {whatsapp ? (
                <li>
                  <a
                    className="inline-flex items-center gap-2 hover:text-white"
                    href={whatsapp}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <WhatsAppIcon height={16} width={16} /> WhatsApp us
                  </a>
                </li>
              ) : null}
              {contact?.email ? (
                <li>
                  <a
                    className="inline-flex items-center gap-2 hover:text-white"
                    href={`mailto:${contact.email}`}
                  >
                    <MailIcon height={16} width={16} /> {contact.email}
                  </a>
                </li>
              ) : null}
              {contact?.address ? (
                <li className="flex gap-2">
                  <PinIcon className="mt-0.5 shrink-0" height={16} width={16} />
                  <span className="whitespace-pre-line">{contact.address}</span>
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </Container>
      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-2 py-5 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {name}. All rights reserved.
          </p>
          {grievance?.name ? (
            <p>
              Grievance officer: {grievance.name}
              {grievance.designation ? `, ${grievance.designation}` : ''}
              {grievance.email ? ` · ${grievance.email}` : ''}
              {grievance.phone ? ` · ${grievance.phone}` : ''}
            </p>
          ) : null}
        </Container>
      </div>
    </footer>
  )
}
