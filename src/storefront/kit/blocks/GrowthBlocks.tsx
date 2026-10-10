import Link from 'next/link'

import { getProductsFor, getStoreReviews } from '@/lib/data/catalog'
import { getStoreOffers, runningSchemes } from '@/lib/data/offers'
import { formatINR } from '@/lib/money'
import type {
  AffiliateInviteBlock,
  CouponListBlock,
  OfferStripBlock,
  OffersSignupBlock,
  ReviewsBlock,
  SchemeProductsBlock,
} from '@/payload-types'

import type { StoreContext } from '../../context'
import { ProductGrid } from '../product/ProductCard'
import { Stars } from '../reviews/Stars'
import { CopyCode } from '../shop/CopyCode'
import { OfferSignup } from '../shop/OfferSignup'
import { ButtonLink, Container, SectionHeading } from '../ui'

// The page builder's growth blocks (docs/screens Page builder rule 5, docs/10 "CMS blocks"):
// each renders only while its feature is on, and offers stay honest (docs/14): real end dates,
// countdowns only to the scheme's real end, reviews exactly as published.

const idOf = (value: unknown) =>
  value && typeof value === 'object'
    ? String((value as { id: unknown }).id)
    : value
      ? String(value)
      : null

const endText = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  })

const hasEnded = (iso: string) => new Date(iso).getTime() <= Date.now()

function timeLeft(endsAt: string) {
  const ms = new Date(endsAt).getTime() - Date.now()
  const days = Math.floor(ms / 86_400_000)
  const hours = Math.floor((ms % 86_400_000) / 3_600_000)
  return days > 0 ? `${days} d ${hours} h left` : `${Math.max(1, hours)} h left`
}

/** The live scheme in one strip; nothing at all while no scheme is live. */
export async function OfferStrip({ block, ctx }: { block: OfferStripBlock; ctx: StoreContext }) {
  const offers = await getStoreOffers(ctx.store.tenantId)
  if (!offers.schemesOn) return null
  const live = runningSchemes(offers)
  const chosen = idOf(block.scheme)
  const scheme = chosen ? live.find((s) => s.id === chosen) : live[0]
  if (!scheme) return null
  return (
    <section aria-label="Offer" className="my-8 bg-accent py-5 text-white">
      <Container className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {scheme.badge ? (
            <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">
              {scheme.badge}
            </span>
          ) : null}
          <p className="mt-1 font-heading text-lg font-bold">{scheme.name}</p>
          <p className="text-sm text-white/90">
            {scheme.description} · ends {endText(scheme.endsAt)}
            {scheme.showCountdown ? ` · ${timeLeft(scheme.endsAt)}` : ''}
          </p>
        </div>
        <ButtonLink href={scheme.slug ? `/offers/${scheme.slug}` : '/offers'} style="onDark">
          {block.buttonLabel || 'Shop the offer'}
        </ButtonLink>
      </Container>
    </section>
  )
}

/** The products a scheme covers, with their offer prices (cards work the price out). */
export async function SchemeProducts({
  block,
  ctx,
}: {
  block: SchemeProductsBlock
  ctx: StoreContext
}) {
  const offers = await getStoreOffers(ctx.store.tenantId)
  if (!offers.schemesOn) return null
  const scheme = offers.schemes.find((s) => s.id === idOf(block.scheme))
  if (!scheme || hasEnded(scheme.endsAt)) return null
  const specialIds = Object.keys(scheme.specialByProduct ?? {})
  const products = await getProductsFor(
    ctx.store.tenantId,
    {
      productIds:
        scheme.type === 'special-price'
          ? specialIds
          : scheme.covers.mode === 'products'
            ? scheme.covers.productIds
            : undefined,
      categoryIds: scheme.covers.mode === 'categories' ? scheme.covers.categoryIds : undefined,
      excludeIds: scheme.covers.excludeProductIds,
    },
    block.limit ?? 8,
  )
  if (!products.length) return null
  return (
    <Container className="my-12">
      <SectionHeading
        action={
          scheme.slug ? (
            <Link
              className="text-sm font-semibold text-accent hover:underline"
              href={`/offers/${scheme.slug}`}
            >
              View all
            </Link>
          ) : null
        }
      >
        {block.heading || scheme.name}
      </SectionHeading>
      <ProductGrid products={products} />
    </Container>
  )
}

/** Public coupon codes with Copy (only codes set to show on the Offers page). */
export async function CouponList({ block, ctx }: { block: CouponListBlock; ctx: StoreContext }) {
  const offers = await getStoreOffers(ctx.store.tenantId)
  if (!offers.couponsOn || !offers.coupons.length) return null
  const coupons = offers.coupons.slice(0, block.limit ?? 4)
  return (
    <Container className="my-12">
      <SectionHeading>{block.heading || 'Coupon codes'}</SectionHeading>
      <div className="grid gap-3 md:grid-cols-2">
        {coupons.map((c) => (
          <div
            className="flex items-center gap-3 rounded-card border border-dashed border-line bg-white p-3"
            key={c.code}
          >
            <div className="flex-1">
              <b className="font-mono">{c.code}</b>
              <p className="text-sm">
                {c.gives}
                {c.minOrderMinor ? ` on orders above ${formatINR(c.minOrderMinor)}` : ''}
                {c.onlineOnly ? ' when you pay online' : ''}
              </p>
            </div>
            <CopyCode code={c.code} />
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-soft">One coupon per order.</p>
    </Container>
  )
}

/** Published reviews from verified purchases, as written. */
export async function StoreReviews({ block, ctx }: { block: ReviewsBlock; ctx: StoreContext }) {
  const offers = await getStoreOffers(ctx.store.tenantId)
  if (!offers.reviewsShown) return null
  const reviews = await getStoreReviews(
    ctx.store.tenantId,
    Number(block.minRating ?? 4) || 1,
    block.limit ?? 6,
  )
  if (!reviews.length) return null
  return (
    <Container className="my-12">
      <SectionHeading>{block.heading || 'What our customers say'}</SectionHeading>
      <div className="grid gap-4 md:grid-cols-3">
        {reviews.map((review) => (
          <figure className="rounded-card border border-line bg-white p-5" key={review.id}>
            <Stars value={review.rating} />
            {review.title ? <p className="mt-2 font-semibold">{review.title}</p> : null}
            {review.body ? (
              <blockquote className="mt-1 line-clamp-5 text-sm text-ink-soft">
                {review.body}
              </blockquote>
            ) : null}
            <figcaption className="mt-3 text-xs text-ink-soft">
              {review.displayName} · Verified purchase
              {review.productSlug ? (
                <>
                  {' · '}
                  <Link className="hover:underline" href={`/products/${review.productSlug}`}>
                    {review.productTitle}
                  </Link>
                </>
              ) : null}
            </figcaption>
          </figure>
        ))}
      </div>
    </Container>
  )
}

/** Offer sign-up with consent per channel, unticked (docs/18). */
export async function OffersSignupSection({
  block,
  ctx,
}: {
  block: OffersSignupBlock
  ctx: StoreContext
}) {
  const offers = await getStoreOffers(ctx.store.tenantId)
  if (!offers.offerMessagesOn) return null
  return (
    <Container className="my-12 max-w-2xl">
      <OfferSignup
        heading={block.heading}
        storeName={ctx.settings?.storeName ?? ctx.store.name}
        text={block.text}
        whatsapp={offers.whatsappOffersOn}
      />
    </Container>
  )
}

/** Invites shoppers and creators to the affiliate program. */
export function AffiliateInvite({
  block,
  ctx,
}: {
  block: AffiliateInviteBlock
  ctx: StoreContext
}) {
  if (!ctx.hasFeature('affiliate')) return null
  return (
    <section className="my-14 bg-surface-alt py-12">
      <Container className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-semibold [text-transform:var(--heading-transform)]">
            {block.heading || 'Earn with us'}
          </h2>
          {block.text ? <p className="mt-2 max-w-2xl text-ink-soft">{block.text}</p> : null}
        </div>
        <ButtonLink href="/affiliate">
          {block.buttonLabel || 'Join the affiliate program'}
        </ButtonLink>
      </Container>
    </section>
  )
}
