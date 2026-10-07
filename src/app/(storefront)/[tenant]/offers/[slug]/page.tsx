import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

import { getProductsFor } from '@/lib/data/catalog'
import { getSchemeBySlug, getStoreOffers } from '@/lib/data/offers'
import { getStoreContext } from '@/storefront/context'
import { ProductGrid } from '@/storefront/kit/product/ProductCard'
import { buttonClass, Container } from '@/storefront/kit/ui'

type Props = { params: Promise<{ tenant: string; slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tenant, slug } = await params
  const ctx = await getStoreContext(tenant)
  const scheme = await getSchemeBySlug(ctx.store.tenantId, slug)
  return { title: scheme?.name ?? 'Offer' }
}

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  })

const isPast = (iso: string) => new Date(iso).getTime() <= Date.now()

/**
 * One offer's page, /offers/<slug> (docs/screens Offers page rule 3): the products it covers
 * with their offer prices. After it ends the page stays and says so, so shared links work.
 */
export default async function OfferPage({ params }: Props) {
  const { tenant, slug } = await params
  const ctx = await getStoreContext(tenant)
  const offers = await getStoreOffers(ctx.store.tenantId)
  if (!offers.schemesOn) notFound()
  const scheme = await getSchemeBySlug(ctx.store.tenantId, slug)
  if (!scheme) notFound()
  // A vendor's own landing page takes over when the scheme has one
  if (scheme.landingPageSlug) redirect(`/pages/${scheme.landingPageSlug}`)
  const ended = scheme.status === 'ended' || isPast(scheme.endsAt)
  const started = isPast(scheme.startsAt)
  const covers = scheme.covers
  const specialIds = Object.keys(scheme.specialByProduct ?? {})
  const products = ended
    ? []
    : await getProductsFor(ctx.store.tenantId, {
        productIds:
          scheme.type === 'special-price'
            ? specialIds
            : covers.mode === 'products'
              ? covers.productIds
              : undefined,
        categoryIds: covers.mode === 'categories' ? covers.categoryIds : undefined,
        excludeIds: covers.excludeProductIds,
      })
  const shown = products

  return (
    <Container className="space-y-6 py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-soft">
        <Link className="hover:underline" href="/offers">
          Offers
        </Link>{' '}
        › <span className="text-ink">{scheme.name}</span>
      </nav>
      <header className="space-y-2">
        {scheme.badge ? (
          <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-white">
            {scheme.badge}
          </span>
        ) : null}
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">{scheme.name}</h1>
        <p>{scheme.description}</p>
        <p className="text-sm text-ink-soft">
          {ended
            ? `This offer ended ${when(scheme.endsAt)}.`
            : started
              ? `Ends ${when(scheme.endsAt)}`
              : `Starts ${when(scheme.startsAt)} · prices change when it starts`}
          {!ended && !scheme.combinesWithCoupons ? ' · not with coupons' : ''}
        </p>
      </header>
      {ended ? (
        <div className="rounded-card bg-surface-alt p-5">
          <p>This offer has ended. See what’s on now.</p>
          <Link className={buttonClass('dark', 'mt-4')} href="/offers">
            See offers
          </Link>
        </div>
      ) : shown.length ? (
        <ProductGrid headingLevel={2} products={shown} />
      ) : (
        <p className="text-ink-soft">The products in this offer will show here.</p>
      )}
    </Container>
  )
}
