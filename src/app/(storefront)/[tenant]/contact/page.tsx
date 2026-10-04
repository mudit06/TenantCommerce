import type { Metadata } from 'next'

import { getStoreContext } from '@/storefront/context'
import { MailIcon, PhoneIcon, PinIcon, WhatsAppIcon } from '@/storefront/kit/icons'
import { QuoteForm } from '@/storefront/kit/product/QuoteForm'
import { Container } from '@/storefront/kit/ui'
import { storeWhatsApp } from '@/storefront/kit/whatsapp'

type Props = { params: Promise<{ tenant: string }> }

export const metadata: Metadata = { title: 'Contact us' }

/** Contact and quote request, with the grievance officer (docs/screens storefront `st-contact`). */
export default async function ContactPage({ params }: Props) {
  const ctx = await getStoreContext((await params).tenant)
  const settings = ctx.settings
  const name = settings?.storeName ?? ctx.store.name
  const contact = settings?.contact
  const whatsapp = storeWhatsApp(contact?.whatsapp, `Hello ${name}, I have a question.`)
  const grievance = settings?.grievanceOfficer
  return (
    <Container className="py-10">
      <h1 className="font-heading text-3xl font-bold [text-transform:var(--heading-transform)]">
        Contact us
      </h1>
      <p className="mt-2 max-w-2xl text-ink-soft">
        For prices, bulk orders and dealer enquiries, send us a message or reach us on WhatsApp.
      </p>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        <section aria-label="Send a message" className="rounded-card border border-line p-5 sm:p-8">
          {ctx.hasFeature('enquiries') ? (
            <QuoteForm storeName={name} submitLabel="Send message" type="general" />
          ) : (
            <p className="text-ink-soft">Please call or WhatsApp us.</p>
          )}
        </section>
        <aside className="space-y-6 text-sm">
          <ul className="space-y-4">
            {contact?.phone ? (
              <li className="flex gap-3">
                <PhoneIcon className="mt-0.5 shrink-0 text-accent" />
                <a
                  className="font-semibold hover:underline"
                  href={`tel:${contact.phone.replace(/\s+/g, '')}`}
                >
                  {contact.phone}
                </a>
              </li>
            ) : null}
            {whatsapp ? (
              <li className="flex gap-3">
                <WhatsAppIcon className="mt-0.5 shrink-0 text-[#1F7A3E]" />
                <a
                  className="font-semibold hover:underline"
                  href={whatsapp}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Chat on WhatsApp
                </a>
              </li>
            ) : null}
            {contact?.email ? (
              <li className="flex gap-3">
                <MailIcon className="mt-0.5 shrink-0 text-accent" />
                <a className="font-semibold hover:underline" href={`mailto:${contact.email}`}>
                  {contact.email}
                </a>
              </li>
            ) : null}
            {contact?.address ? (
              <li className="flex gap-3">
                <PinIcon className="mt-0.5 shrink-0 text-accent" />
                <span className="whitespace-pre-line">{contact.address}</span>
              </li>
            ) : null}
          </ul>
          {grievance?.name ? (
            <div className="rounded-card bg-surface-alt p-4">
              <h2 className="font-semibold">Grievance officer</h2>
              <p className="mt-1 text-ink-soft">
                {grievance.name}
                {grievance.designation ? `, ${grievance.designation}` : ''}
                {grievance.email ? (
                  <>
                    <br />
                    {grievance.email}
                  </>
                ) : null}
                {grievance.phone ? (
                  <>
                    <br />
                    {grievance.phone}
                  </>
                ) : null}
              </p>
            </div>
          ) : null}
        </aside>
      </div>
    </Container>
  )
}
