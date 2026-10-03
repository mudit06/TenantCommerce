import { WhatsAppIcon } from '../icons'

/** Round WhatsApp button, bottom right on every page (docs/10 kit: WhatsAppButton). */
export function WhatsAppFloat({ href }: { href: string | null }) {
  if (!href) return null
  return (
    <a
      aria-label="Chat with us on WhatsApp"
      className="fixed right-4 bottom-20 z-40 flex size-14 items-center justify-center rounded-full bg-[#1F7A3E] text-white shadow-lg transition hover:scale-105 lg:bottom-6"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <WhatsAppIcon height={28} width={28} />
    </a>
  )
}
