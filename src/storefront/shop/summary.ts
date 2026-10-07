import type { CheckoutQuote } from '@/modules/orders'

import { mediaUrl } from '../kit/media'

// What the cart and checkout pages show, from the server's quote. Plain data, safe for the
// browser: prices and totals are the server's, never recomputed in the page.

export type SummaryLine = {
  key: string
  productId: string
  variantId: string | null
  title: string
  options: string | null
  sku: string | null
  href: string
  image: { url: string; alt: string } | null
  qty: number
  unitMinor: number
  mrpMinor: number | null
  lineMinor: number
  discountMinor: number
  available: number | null
  problem: string | null
}

export type CheckoutSummary = {
  lines: SummaryLine[]
  count: number
  totals: {
    itemsMinor: number
    discountMinor: number
    shippingMinor: number
    codFeeMinor: number
    taxMinor: number
    grandTotalMinor: number
    savingsMinor: number
  }
  delivery: {
    known: boolean
    serviceable: boolean
    feeMinor: number
    etaMinDays: number | null
    etaMaxDays: number | null
    /** "Wed, 7 Oct", worked out on the server so every page agrees */
    arrivesBy: string | null
    source: 'shiprocket' | 'rate-card' | null
  }
  placeOfSupply: { stateCode: string; stateName: string } | null
  payment: {
    online: { available: boolean; testMode: boolean }
    cod: { available: boolean; reason: string | null; feeMinor: number }
  }
  offers: { name: string; discountMinor: number; kind: 'scheme' | 'coupon' }[]
  /** The coupon on the cart, when it applies */
  coupon: string | null
  couponProblem: string | null
  /** Which of a scheme and the coupon was kept, when they don't combine */
  offerNote: string | null
  problems: string[]
}

export function summarize(quote: CheckoutQuote): CheckoutSummary {
  const priced = new Map(quote.pricing.lines.map((line) => [line.key, line]))
  const lines = quote.lines.map((line): SummaryLine => {
    const p = priced.get(line.key)
    return {
      key: line.key,
      productId: line.productId,
      variantId: line.variantId,
      title: line.title,
      options: line.options,
      sku: line.sku,
      href: `/products/${line.slug}`,
      image: line.image
        ? { url: mediaUrl(line.image.url) ?? line.image.url, alt: line.image.alt }
        : null,
      qty: line.qty,
      unitMinor: line.unitMinor,
      mrpMinor: line.mrpMinor,
      lineMinor: p?.netMinor ?? line.unitMinor * line.qty,
      discountMinor: p?.discountMinor ?? 0,
      available: line.available,
      problem: line.problem,
    }
  })
  const t = quote.pricing.totals
  return {
    lines,
    count: lines.reduce((sum, line) => sum + line.qty, 0),
    totals: {
      itemsMinor: t.itemsMinor,
      discountMinor: t.discountMinor,
      shippingMinor: t.shippingMinor,
      codFeeMinor: t.codFeeMinor,
      taxMinor: t.taxMinor,
      grandTotalMinor: t.grandTotalMinor,
      savingsMinor: t.savingsMinor,
    },
    delivery: {
      known: Boolean(quote.delivery),
      serviceable: quote.delivery?.serviceable ?? true,
      feeMinor: quote.delivery ? t.shippingMinor : 0,
      etaMinDays: quote.delivery?.etaMinDays ?? null,
      etaMaxDays: quote.delivery?.etaMaxDays ?? null,
      arrivesBy: quote.delivery?.serviceable
        ? arrivalText(quote.delivery.etaMaxDays ?? null)
        : null,
      source: quote.delivery?.source ?? null,
    },
    placeOfSupply: quote.placeOfSupply
      ? { stateCode: quote.placeOfSupply.stateCode, stateName: quote.placeOfSupply.stateName }
      : null,
    payment: {
      online: {
        available: quote.payment.razorpay.available,
        testMode: quote.payment.razorpay.mode === 'test',
      },
      cod: quote.payment.cod,
    },
    offers: quote.promotions.appliedOffers.map((offer) => ({
      name: offer.kind === 'coupon' ? `Coupon ${offer.code ?? offer.name}` : offer.name,
      discountMinor: offer.discountMinor,
      kind: offer.kind,
    })),
    coupon: quote.promotions.coupon?.code ?? null,
    couponProblem: quote.promotions.couponProblem,
    offerNote: quote.promotions.note,
    problems: quote.problems,
  }
}

/** "by Wed, 7 Oct" from today plus the slowest delivery days. */
export function arrivalText(maxDays: number | null, now = new Date()): string | null {
  if (maxDays === null) return null
  const date = new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000)
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  })
}
