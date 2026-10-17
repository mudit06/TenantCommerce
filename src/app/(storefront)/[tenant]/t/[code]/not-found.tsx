import Link from '@/storefront/kit/IntentLink'
import { buttonClass, Container } from '@/storefront/kit/ui'

/** A tracking link with an unknown code (QA P3-06-006: answered 404, not 200). */
export default function TrackingNotFound() {
  return (
    <Container className="py-16 text-center">
      <h1 className="font-heading text-2xl font-bold">We can’t find this order</h1>
      <p className="mt-2 text-ink-soft">Check the link in your order email or WhatsApp message.</p>
      <Link className={buttonClass('dark', 'mt-6')} href="/">
        Continue shopping
      </Link>
    </Container>
  )
}
