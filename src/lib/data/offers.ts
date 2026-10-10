import { unstable_cache } from 'next/cache'
import { cache } from 'react'

import { idOf } from '@/access'
import { storefrontTag } from '@/hooks/revalidateStorefront'
import { tenantTag } from '@/lib/cache'
import {
  couponRule,
  covers,
  describeCoupon,
  describeScheme,
  schemeRule,
  schemeUnitPrice,
  type SchemeRule,
} from '@/modules/promotions'
import { getTenantFeatures } from '@/modules/tenancy'
import type { Scheme } from '@/payload-types'

import { getPayloadClient } from './payload'

// The store's offers for pages (docs/screens storefront Offers page, product cards): live and
// coming-up schemes and public coupon codes. Cached a minute per store and cleared when a scheme
// or coupon changes; the dates are checked when the page renders, and checkout prices again.

export type StoreScheme = SchemeRule & {
  slug: string | null
  occasion: string | null
  startsAt: string
  status: string
  description: string
  announcementText: string | null
  showBeforeStart: boolean
  showCountdown: boolean
  landingPageSlug: string | null
  bannerId: string | null
}

export type PublicCoupon = {
  code: string
  gives: string
  minOrderMinor: number | null
  endsAt: string | null
  onlineOnly: boolean
  firstOrderOnly: boolean
  perCustomerLimit: number | null
  /** What the code applies to, for "Offers for you" on a product page */
  covers: SchemeRule['covers']
}

export type StoreOffers = {
  schemesOn: boolean
  couponsOn: boolean
  offerMessagesOn: boolean
  whatsappOffersOn: boolean
  wishlistOn: boolean
  /** Reviews on and shown on product pages (the store's setting) */
  reviewsShown: boolean
  schemes: StoreScheme[]
  coupons: PublicCoupon[]
  /** Each category with the ones above it, for "covers Faucets" */
  ancestors: Record<string, string[]>
}

const load = (tenantId: string) =>
  unstable_cache(
    async (): Promise<StoreOffers> => {
      const payload = await getPayloadClient()
      const { enabled, states } = await getTenantFeatures(payload, tenantId)
      const reviewsConfig = states.find((f) => f.key === 'reviews')?.config as
        { showOnProductPages?: boolean } | null | undefined
      const schemesOn = enabled.has('schemes')
      const couponsOn = enabled.has('coupons')
      const now = new Date().toISOString()
      const [schemeDocs, couponDocs, categories] = await Promise.all([
        schemesOn
          ? payload.find({
              collection: 'schemes',
              where: {
                and: [
                  { tenant: { equals: tenantId } },
                  { status: { in: ['scheduled', 'live'] } },
                  { endsAt: { greater_than: now } },
                ],
              },
              sort: 'startsAt',
              depth: 1,
              limit: 100,
              pagination: false,
              overrideAccess: true,
            })
          : { docs: [] as Scheme[] },
        couponsOn
          ? payload.find({
              collection: 'coupons',
              where: {
                and: [
                  { tenant: { equals: tenantId } },
                  { visibility: { equals: 'public' } },
                  { status: { equals: 'active' } },
                ],
              },
              sort: 'minOrderMinor',
              depth: 0,
              limit: 50,
              pagination: false,
              overrideAccess: true,
            })
          : { docs: [] },
        payload.find({
          collection: 'categories',
          where: { tenant: { equals: tenantId } },
          depth: 0,
          limit: 2000,
          pagination: false,
          overrideAccess: true,
          select: { parent: true },
        }),
      ])
      const parentOf = new Map(categories.docs.map((c) => [String(c.id), idOf(c.parent)]))
      const ancestors: Record<string, string[]> = {}
      for (const id of parentOf.keys()) {
        const chain: string[] = []
        let current: string | null | undefined = id
        while (current && !chain.includes(current) && chain.length < 10) {
          chain.push(current)
          current = parentOf.get(current)
        }
        ancestors[id] = chain
      }
      return {
        schemesOn,
        couponsOn,
        offerMessagesOn: enabled.has('offer-messages'),
        whatsappOffersOn: enabled.has('whatsapp-offers'),
        wishlistOn: enabled.has('wishlist'),
        reviewsShown: enabled.has('reviews') && reviewsConfig?.showOnProductPages !== false,
        schemes: schemeDocs.docs.map((doc) => {
          // depth 1 for the landing page and banner; the rule wants plain ids
          const rule = schemeRule(doc)
          const page = doc.display?.landingPage
          return {
            ...rule,
            slug: doc.slug ?? null,
            occasion: doc.occasion ?? null,
            startsAt: doc.startsAt,
            status: doc.status,
            description: describeScheme(rule),
            announcementText: doc.display?.announcementText || null,
            showBeforeStart: doc.display?.showBeforeStart !== false,
            showCountdown: doc.display?.showCountdown !== false,
            landingPageSlug: page && typeof page === 'object' ? (page.slug ?? null) : null,
            bannerId: idOf(doc.display?.banner),
          }
        }),
        coupons: couponDocs.docs
          .filter((c) => !c.endsAt || c.endsAt > now)
          .filter((c) => !c.usageLimit || (c.usedCount ?? 0) < c.usageLimit)
          .map((c) => ({
            code: c.code,
            gives: describeCoupon(couponRule(c)),
            covers: couponRule(c).covers,
            minOrderMinor: c.minOrderMinor ?? null,
            endsAt: c.endsAt ?? null,
            onlineOnly: c.paymentMethods?.length === 1 && c.paymentMethods[0] === 'razorpay',
            firstOrderOnly: Boolean(c.firstOrderOnly),
            perCustomerLimit: c.perCustomerLimit ?? null,
          })),
        ancestors,
      }
    },
    ['offers', tenantId],
    { tags: [storefrontTag(tenantId), tenantTag(tenantId, 'features')], revalidate: 60 },
  )()

/** The store's offers, once per request. */
export const getStoreOffers = cache((tenantId: string) => load(tenantId))

/** Schemes running at `at`: started, not ended (the cache may hold ones about to start). */
export const runningSchemes = (offers: StoreOffers, at = new Date()) =>
  offers.schemes.filter((s) => s.startsAt <= at.toISOString() && s.endsAt > at.toISOString())

export type CardOffer = {
  /** One piece's offer price, when the scheme gives one (percent, flat, launch price) */
  priceMinor: number | null
  badge: string | null
  /** "until 9 Nov", only when the scheme shows its real end */
  until: string | null
}

const untilText = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  })

/**
 * The offer a product card or page shows for one piece (docs/11 "Display"): the best scheme
 * price with its badge, or the badge of a cart-level offer (spend tiers, buy X get Y).
 */
export function offerForProduct(
  offers: StoreOffers,
  product: {
    id: string | number
    variantId?: string | null
    categoryIds: string[]
    priceMinor: number | null
    purchaseMode?: string | null
  },
  at = new Date(),
): CardOffer | null {
  if (!offers.schemesOn || !product.priceMinor || product.purchaseMode === 'enquire') return null
  const live = runningSchemes(offers, at)
  if (!live.length) return null
  const line = {
    productId: String(product.id),
    variantId: product.variantId ?? null,
    categoryIds: [...new Set(product.categoryIds.flatMap((id) => offers.ancestors[id] ?? [id]))],
    unitMinor: product.priceMinor,
  }
  const best = schemeUnitPrice(live, line)
  if (best) {
    const scheme = live.find((s) => s.id === best.scheme.id)!
    return {
      priceMinor: best.priceMinor,
      badge: scheme.badge,
      until: scheme.showCountdown ? untilText(scheme.endsAt) : null,
    }
  }
  const covering = live.find(
    (s) =>
      ['tiered', 'buy-x-get-y'].includes(s.type) &&
      (s.covers.mode === 'all' ||
        (s.covers.mode === 'products' && s.covers.productIds.includes(line.productId)) ||
        (s.covers.mode === 'categories' &&
          line.categoryIds.some((c) => s.covers.categoryIds.includes(c)))) &&
      !s.covers.excludeProductIds.includes(line.productId),
  )
  return covering
    ? {
        priceMinor: null,
        badge: covering.badge ?? covering.description,
        until: covering.showCountdown ? untilText(covering.endsAt) : null,
      }
    : null
}

/** One scheme by its landing address, ended ones too, so shared links never break. */
export const getSchemeBySlug = (tenantId: string, slug: string) =>
  unstable_cache(
    async () => {
      const payload = await getPayloadClient()
      const { docs } = await payload.find({
        collection: 'schemes',
        where: {
          and: [
            { tenant: { equals: tenantId } },
            { slug: { equals: slug } },
            { status: { not_equals: 'draft' } },
          ],
        },
        limit: 1,
        depth: 1,
        pagination: false,
        overrideAccess: true,
      })
      const doc = docs[0]
      if (!doc) return null
      const rule = schemeRule(doc)
      const page = doc.display?.landingPage
      return {
        ...rule,
        slug: doc.slug ?? null,
        occasion: doc.occasion ?? null,
        startsAt: doc.startsAt,
        status: doc.status,
        description: describeScheme(rule),
        showCountdown: doc.display?.showCountdown !== false,
        landingPageSlug: page && typeof page === 'object' ? (page.slug ?? null) : null,
      }
    },
    ['scheme', tenantId, slug],
    { tags: [storefrontTag(tenantId)], revalidate: 300 },
  )()

/**
 * "Offers for you" on a product page (docs/screens storefront `st-product` rule 10): public codes
 * that cover this product, and the next scheme covering it that shows before it starts.
 */
export function offersForProduct(
  offers: StoreOffers,
  product: { id: string | number; categoryIds: string[] },
  at = new Date(),
): { coupons: PublicCoupon[]; nextScheme: StoreScheme | null } {
  const line = {
    productId: String(product.id),
    categoryIds: [...new Set(product.categoryIds.flatMap((id) => offers.ancestors[id] ?? [id]))],
  }
  const now = at.toISOString()
  return {
    coupons: offers.couponsOn
      ? offers.coupons.filter((coupon) => covers(coupon.covers, line)).slice(0, 3)
      : [],
    nextScheme: offers.schemesOn
      ? (offers.schemes.find(
          (scheme) => scheme.startsAt > now && scheme.showBeforeStart && covers(scheme.covers, line),
        ) ?? null)
      : null,
  }
}
