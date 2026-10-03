import Link from 'next/link'

import { buttonClass, Container } from '@/storefront/kit/ui'

export default function NotFound() {
  return (
    <Container className="py-24 text-center">
      <h1 className="font-heading text-3xl font-bold">Page not found</h1>
      <p className="mt-3 text-ink-soft">
        The page may have moved. Try searching by product name or model number.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link className={buttonClass('primary')} href="/">
          Go to the home page
        </Link>
        <Link className={buttonClass('outline')} href="/search">
          Search
        </Link>
      </div>
    </Container>
  )
}
