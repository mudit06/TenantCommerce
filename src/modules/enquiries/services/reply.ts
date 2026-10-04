// Reply links for the enquiries inbox. MVP replies go from the staff member's own email or
// WhatsApp (docs/screens Enquiries rule 2): no messaging API, nothing stored or sent by us.

/**
 * Digits wa.me accepts (country code, no +) for an Indian or international number, or null.
 * "98250 12345", "098250 12345" and "+91 98250 12345" all give 919825012345.
 */
export function whatsappNumber(phone: string | null | undefined): string | null {
  if (!phone) return null
  const international = phone.trim().startsWith('+')
  let digits = phone.replace(/\D/g, '')
  if (!international) {
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1)
    if (digits.length === 10) digits = `91${digits}`
  }
  return digits.length >= 11 && digits.length <= 15 ? digits : null
}

export function whatsappLink(phone: string | null | undefined, text: string): string | null {
  const number = whatsappNumber(phone)
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : null
}

export function mailtoLink(
  email: string | null | undefined,
  subject: string,
  body: string,
): string | null {
  if (!email || !email.includes('@')) return null
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export function replyText(input: {
  name?: string | null
  referenceNumber?: string | null
  storeName?: string | null
}) {
  const name = input.name?.trim().split(/\s+/)[0]
  const ref = input.referenceNumber ? ` (${input.referenceNumber})` : ''
  return {
    subject: `Your enquiry${ref}${input.storeName ? ` · ${input.storeName}` : ''}`,
    body: `Hello${name ? ` ${name}` : ''},\n\nThank you for your enquiry${ref}.\n\n`,
  }
}
