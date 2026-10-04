import { notFound } from 'next/navigation'

/** Any other address on a store: its own "page not found", inside the store's layout. */
export default function UnknownPage() {
  notFound()
}
