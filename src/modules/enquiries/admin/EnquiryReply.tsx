import type { UIFieldServerComponent } from 'payload'

import { idOf } from '@/access'

import { mailtoLink, replyText, whatsappLink } from '../services/reply'

type EnquiryData = {
  tenant?: unknown
  name?: string | null
  email?: string | null
  phone?: string | null
  referenceNumber?: string | null
}

/** Reply by email or on WhatsApp from the staff member's own app (no messaging API in MVP). */
export const EnquiryReply: UIFieldServerComponent = async ({ data, req }) => {
  const enquiry = (data ?? {}) as EnquiryData
  if (!enquiry.referenceNumber) return null
  const tenantId = idOf(enquiry.tenant)
  const settings = tenantId
    ? await req.payload
        .find({
          collection: 'site-settings',
          where: { tenant: { equals: tenantId } },
          depth: 0,
          limit: 1,
          overrideAccess: true,
          select: { storeName: true },
          req,
        })
        .then((result) => result.docs[0])
        .catch(() => undefined)
    : undefined
  const text = replyText({ ...enquiry, storeName: settings?.storeName })
  const email = mailtoLink(enquiry.email, text.subject, text.body)
  const whatsapp = whatsappLink(enquiry.phone, text.body.trim())
  if (!email && !whatsapp) return null
  return (
    <div className="te-button-row" style={{ margin: '0 0 24px' }}>
      {email ? (
        <a className="btn btn--style-secondary btn--size-small" href={email}>
          Reply by email
        </a>
      ) : null}
      {whatsapp ? (
        <a
          className="btn btn--style-secondary btn--size-small"
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
        >
          Reply on WhatsApp
        </a>
      ) : null}
    </div>
  )
}
