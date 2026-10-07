import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { getStoreContext } from '@/storefront/context'
import { WishlistView } from '@/storefront/kit/shop/WishlistView'
import { Container } from '@/storefront/kit/ui'
import { signedInShopper } from '@/storefront/shop/account'

export const metadata: Metadata = {
  title: 'Your wishlist',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

type Props = { params: Promise<{ tenant: string }> }

/** Wishlist (docs/screens storefront `st-wishlist`): saved products with today's price. */
export default async function WishlistPage({ params }: Props) {
  const ctx = await getStoreContext((await params).tenant)
  if (!ctx.hasFeature('wishlist')) notFound()
  const signedIn = Boolean(await signedInShopper(ctx.store.tenantId))
  return (
    <Container className="py-8 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <WishlistView selling={ctx.selling.selling} signedIn={signedIn} />
      </div>
    </Container>
  )
}
