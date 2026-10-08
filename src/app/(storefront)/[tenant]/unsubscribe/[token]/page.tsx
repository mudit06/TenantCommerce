import type { Metadata } from 'next'

import { readUnsubscribeToken } from '@/modules/notifications'
import { getStoreContext } from '@/storefront/context'
import { UnsubscribeButton } from '@/storefront/kit/shop/UnsubscribeButton'
import { Container } from '@/storefront/kit/ui'

export const metadata: Metadata = { title: 'Unsubscribe', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ tenant: string; token: string }> }

/** Masks most of the address: r•••@example.com, +91 98xxx xx210 */
const mask = (value: string) =>
  value.includes('@')
    ? `${value.slice(0, 1)}•••@${value.split('@')[1]}`
    : `${value.slice(0, 5)}xxx xx${value.slice(-3)}`

/** The unsubscribe page behind every offer message (docs/screens storefront `st-offer-messages`). */
export default async function UnsubscribePage({ params }: Props) {
  const { tenant, token } = await params
  const ctx = await getStoreContext(tenant)
  const parsed = readUnsubscribeToken(decodeURIComponent(token))
  const valid = parsed && parsed.tenantId === ctx.store.tenantId
  return (
    <Container className="py-16">
      <div className="mx-auto max-w-md rounded-card border border-line bg-white p-6">
        <h1 className="mb-4 font-heading text-2xl font-bold">
          Offers from {ctx.settings?.storeName ?? ctx.store.name}
        </h1>
        {valid ? (
          <UnsubscribeButton
            address={mask(parsed.value)}
            storeName={ctx.settings?.storeName ?? ctx.store.name}
            token={decodeURIComponent(token)}
          />
        ) : (
          <p className="text-ink-soft">This link isn’t valid. Use the latest message from us.</p>
        )}
      </div>
    </Container>
  )
}
