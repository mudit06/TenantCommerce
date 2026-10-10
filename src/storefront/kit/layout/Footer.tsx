import Link from 'next/link'

import type { StoreContext } from '../../context'
import { MailIcon, PhoneIcon, PinIcon, WhatsAppIcon } from '../icons'
import { linkHref, pageHref } from '../links'
import { Img } from '../media'
import { OfferSignup } from '../shop/OfferSignup'
import { Container } from '../ui'
import { storeWhatsApp } from '../whatsapp'

const POLICY_LABELS = {
  shipping: 'Shipping policy',
  returns: 'Returns and refunds',
  warranty: 'Warranty',
  privacy: 'Privacy policy',
  terms: 'Terms of use',
} as const

type Column = { heading: string; links: { label: string; href: string }[] }

/**
 * Store footer as the wireframe (docs/screens storefront layout rules): brand, contact and the
 * offers sign-up; Shop, Help and Company columns; the legal line with GSTIN and how shoppers can
 * pay. The vendor's footer menu replaces Shop and Company; Help (orders and policies) and the
 * links of switched-on features are always there, so a menu can't hide them.
 */
export function Footer({ ctx }: { ctx: StoreContext }) {
  const settings = ctx.settings
  const name = settings?.storeName ?? ctx.store.name
  const contact = settings?.contact
  const whatsapp = storeWhatsApp(contact?.whatsapp, `Hello ${name}, I have a question.`)
  const selling = ctx.selling.selling
  const policies = Object.entries(POLICY_LABELS).flatMap(([key, label]) => {
    const page = settings?.policies?.[key as keyof typeof POLICY_LABELS]
    return page && typeof page === 'object' && page._status === 'published'
      ? [{ label, href: pageHref(page) }]
      : []
  })
  const offersLink =
    ctx.hasFeature('schemes') || ctx.hasFeature('coupons')
      ? [{ label: 'Offers', href: '/offers' }]
      : []
  const companyExtras = [
    ...(ctx.hasFeature('dealer-locator') ? [{ label: 'Find a dealer', href: '/dealers' }] : []),
    ...(ctx.hasFeature('downloads') ? [{ label: 'Downloads', href: '/downloads' }] : []),
    ...(ctx.hasFeature('enquiries') ? [{ label: 'Become a dealer', href: '/contact' }] : []),
    ...(ctx.hasFeature('affiliate') ? [{ label: 'Affiliate program', href: '/affiliate' }] : []),
  ]
  const help: Column = {
    heading: 'Help',
    links: [
      ...(selling ? [{ label: 'Track order', href: '/account' }] : []),
      ...policies,
      { label: 'Contact us', href: '/contact' },
    ],
  }

  const menuColumns: Column[] = (ctx.navigation?.footer ?? []).map((column) => ({
    heading: column.heading,
    links: (column.links ?? []).flatMap((link) => {
      const target = linkHref(link.link)
      return target ? [{ label: link.label, href: target.href }] : []
    }),
  }))
  const columns: Column[] =
    menuColumns.length > 0
      ? [...menuColumns]
      : [
          {
            heading: 'Shop',
            links: ctx.categories.roots.map((root) => ({ label: root.name, href: root.path })),
          },
          { heading: 'Company', links: [] },
        ]
  // Feature links go where the wireframe has them, unless the vendor's menu already has them
  const linked = new Set(columns.flatMap((column) => column.links.map((link) => link.href)))
  const add = (column: Column | undefined, links: Column['links']) =>
    column?.links.push(...links.filter((link) => !linked.has(link.href)))
  add(columns[0], offersLink)
  if (!columns.some((column) => column.heading.toLowerCase() === 'help')) {
    columns.splice(1, 0, {
      ...help,
      links: help.links.filter((link) => !linked.has(link.href) || link.href === '/contact'),
    })
  }
  add(columns.at(-1), companyExtras)
  const shown = columns.filter((column) => column.links.length > 0)

  const grievance = settings?.grievanceOfficer
  const legal = [
    `© ${new Date().getFullYear()} ${ctx.store.legalName || name}`,
    ctx.store.gstin ? `GSTIN ${ctx.store.gstin}` : null,
    ctx.store.city,
  ].filter(Boolean)
  const methods = [
    ...(ctx.selling.online ? ['UPI', 'Visa', 'RuPay', 'Netbanking'] : []),
    ...(ctx.selling.cod ? ['COD'] : []),
  ]
  return (
    <footer className="mt-16 bg-dark text-sm text-white/80">
      <Container className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
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
          <ul className="mt-4 space-y-2.5">
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
          {ctx.hasFeature('offer-messages') ? (
            <OfferSignup
              heading="Get our offers first"
              storeName={name}
              variant="footer"
              whatsapp={ctx.hasFeature('whatsapp-offers')}
            />
          ) : null}
        </div>
        {shown.map((column) => (
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
      </Container>
      <div className="border-t border-white/10">
        <Container className="flex flex-col gap-3 py-5 text-xs text-white/60 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p>{legal.join(' · ')}</p>
            {grievance?.name ? (
              <p>
                Grievance officer: {grievance.name}
                {grievance.designation ? `, ${grievance.designation}` : ''}
                {grievance.email ? ` · ${grievance.email}` : ''}
                {grievance.phone ? ` · ${grievance.phone}` : ''}
              </p>
            ) : null}
          </div>
          {methods.length ? (
            <ul aria-label="Ways to pay" className="flex flex-wrap gap-1.5">
              {methods.map((method) => (
                <li
                  className="rounded border border-white/20 px-2 py-0.5 text-[11px] text-white/80"
                  key={method}
                >
                  {method}
                </li>
              ))}
            </ul>
          ) : null}
        </Container>
      </div>
    </footer>
  )
}
