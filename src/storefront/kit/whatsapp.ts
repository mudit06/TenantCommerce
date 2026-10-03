import { whatsappLink } from '@/modules/enquiries'

/** wa.me link to the store's WhatsApp with a ready message, or null when it has no number. */
export const storeWhatsApp = (number: string | null | undefined, text: string) =>
  whatsappLink(number, text)
