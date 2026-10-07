import { allocate, formatINR, percentOf } from '@/lib/money'

// The promotions engine's rules (docs/11 "Promotions engine"), pure so every case is unit
// tested: which scheme each cart line gets, how group offers (spend tiers, buy X get Y) spread,
// and whether the coupon applies or a scheme that doesn't combine with coupons wins. No database
// here: services/engine.ts loads the live schemes and the coupon and calls `computePromotions`.

export const SCHEME_TYPES = [
  { value: 'percent', label: 'Percent off' },
  { value: 'fixed', label: 'Flat off each item' },
  { value: 'tiered', label: 'Spend tiers' },
  { value: 'buy-x-get-y', label: 'Buy X get Y' },
  { value: 'free-shipping', label: 'Free delivery' },
  { value: 'special-price', label: 'Special price' },
] as const
export type SchemeType = (typeof SCHEME_TYPES)[number]['value']

export const COUPON_TYPES = [
  { value: 'percent', label: 'Percent off' },
  { value: 'fixed', label: 'Amount off' },
  { value: 'free-shipping', label: 'Free delivery' },
] as const
export type CouponType = (typeof COUPON_TYPES)[number]['value']

export type Coverage = {
  mode: 'all' | 'categories' | 'products'
  categoryIds: string[]
  productIds: string[]
  excludeProductIds: string[]
}

export type SchemeRule = {
  id: string
  name: string
  badge: string | null
  type: SchemeType
  percent: number
  amountMinor: number
  tiers: { minOrderMinor: number; discountMinor: number }[]
  buyQty: number
  getQty: number
  getDiscountPercent: number
  maxDiscountMinor: number | null
  minOrderMinor: number | null
  /** special-price: price of one piece, by variant id (or product id for a product without) */
  specialPrices: Record<string, number>
  /** special-price: each product with a launch price and its lowest one, for cards ("from") */
  specialByProduct?: Record<string, number>
  covers: Coverage
  combinesWithCoupons: boolean
  prepaidOnly: boolean
  priority: number
  endsAt: string
}

export type CouponRule = {
  id: string
  code: string
  type: CouponType
  percent: number
  amountMinor: number
  maxDiscountMinor: number | null
  minOrderMinor: number | null
  covers: Coverage
  paymentMethods: string[]
  affiliateId: string | null
}

export type PromoLine = {
  key: string
  productId: string
  variantId: string | null
  /** The product's categories and every category above them */
  categoryIds: string[]
  qty: number
  unitMinor: number
}

export type AppliedOffer = {
  kind: 'scheme' | 'coupon'
  ref: string
  code?: string
  name: string
  discountMinor: number
}

export type PromotionsResult = {
  /** Discount per cart line key, GST included */
  lineDiscounts: Record<string, number>
  freeShipping: boolean
  appliedOffers: AppliedOffer[]
  /** Why the typed coupon wasn't applied, for the cart */
  couponProblem: string | null
  /** The coupon that applied: written to coupon-redemptions when the order is placed */
  coupon: { id: string; code: string; affiliateId: string | null } | null
  /** A scheme kept instead of the coupon, or the coupon kept instead of a scheme */
  note: string | null
}

export const covers = (coverage: Coverage, line: Pick<PromoLine, 'productId' | 'categoryIds'>) => {
  if (coverage.excludeProductIds.includes(line.productId)) return false
  if (coverage.mode === 'all') return true
  if (coverage.mode === 'products') return coverage.productIds.includes(line.productId)
  return line.categoryIds.some((id) => coverage.categoryIds.includes(id))
}

const gross = (line: PromoLine) => line.unitMinor * line.qty

/** Spreads `total` over lines by value; a line never gets more than its value. */
function spread(total: number, lines: PromoLine[], values: number[]): Record<string, number> {
  const out: Record<string, number> = {}
  const sum = values.reduce((a, b) => a + b, 0)
  if (total <= 0 || sum <= 0) return out
  const parts = allocate(Math.min(total, sum), values)
  lines.forEach((line, i) => {
    if (parts[i]) out[line.key] = (out[line.key] ?? 0) + parts[i]!
  })
  return out
}

const total = (byLine: Record<string, number>) => Object.values(byLine).reduce((a, b) => a + b, 0)

/**
 * What one scheme takes off `lines` (only the lines it covers), before the order cap is
 * compared with other schemes. `cartSubtotalMinor` decides its minimum order.
 */
export function schemeDiscounts(
  scheme: SchemeRule,
  lines: PromoLine[],
  cartSubtotalMinor: number,
): Record<string, number> {
  const eligible = lines.filter((line) => covers(scheme.covers, line))
  if (!eligible.length) return {}
  if (scheme.minOrderMinor && cartSubtotalMinor < scheme.minOrderMinor) return {}
  let byLine: Record<string, number> = {}
  switch (scheme.type) {
    case 'percent':
      for (const line of eligible) {
        const off = percentOf(gross(line), scheme.percent)
        if (off > 0) byLine[line.key] = Math.min(off, gross(line))
      }
      break
    case 'fixed':
      for (const line of eligible) {
        const off = Math.min(scheme.amountMinor, line.unitMinor) * line.qty
        if (off > 0) byLine[line.key] = off
      }
      break
    case 'special-price':
      for (const line of eligible) {
        const special =
          scheme.specialPrices[line.variantId ?? ''] ??
          scheme.specialPrices[line.productId] ??
          // A card shows the product without a finish chosen: its lowest launch price
          (line.variantId === null && line.key === 'one'
            ? scheme.specialByProduct?.[line.productId]
            : undefined)
        if (special !== undefined && special < line.unitMinor) {
          byLine[line.key] = (line.unitMinor - special) * line.qty
        }
      }
      break
    case 'tiered': {
      const value = eligible.reduce((sum, line) => sum + gross(line), 0)
      const tier = [...scheme.tiers]
        .filter((t) => value >= t.minOrderMinor)
        .sort((a, b) => b.minOrderMinor - a.minOrderMinor)[0]
      if (tier) byLine = spread(tier.discountMinor, eligible, eligible.map(gross))
      break
    }
    case 'buy-x-get-y': {
      const group = scheme.buyQty + scheme.getQty
      if (scheme.buyQty < 1 || scheme.getQty < 1) break
      // Units from dearest to cheapest; in each full group the cheapest getQty units are off
      const units = eligible
        .flatMap((line) => Array.from({ length: line.qty }, () => line))
        .sort((a, b) => b.unitMinor - a.unitMinor)
      const groups = Math.floor(units.length / group)
      for (let g = 0; g < groups; g++) {
        const slice = units.slice(g * group, (g + 1) * group)
        for (const unit of slice.slice(scheme.buyQty)) {
          byLine[unit.key] =
            (byLine[unit.key] ?? 0) + percentOf(unit.unitMinor, scheme.getDiscountPercent)
        }
      }
      break
    }
    case 'free-shipping':
      return {}
  }
  const sum = total(byLine)
  if (scheme.maxDiscountMinor && sum > scheme.maxDiscountMinor) {
    const keys = Object.keys(byLine)
    const capped = allocate(
      scheme.maxDiscountMinor,
      keys.map((k) => byLine[k]!),
    )
    byLine = Object.fromEntries(keys.map((k, i) => [k, capped[i]!]))
  }
  return byLine
}

type SchemePick = { lineDiscounts: Record<string, number>; applied: AppliedOffer[] }

/**
 * Each line gets at most one scheme: the one that takes most off that line (ties: higher
 * priority, then the scheme ending first). Group offers are worked out again on the lines they
 * won, so a tier is only reached with the lines that really count toward it.
 */
export function pickSchemes(
  schemes: SchemeRule[],
  lines: PromoLine[],
  context: { paymentMethod?: string | null },
): SchemePick {
  const usable = schemes.filter(
    (s) => s.type !== 'free-shipping' && !(s.prepaidOnly && context.paymentMethod === 'cod'),
  )
  const subtotal = lines.reduce((sum, line) => sum + gross(line), 0)
  const first = new Map(usable.map((s) => [s.id, schemeDiscounts(s, lines, subtotal)]))
  const winner = new Map<string, SchemeRule>()
  for (const line of lines) {
    let best: SchemeRule | null = null
    let bestOff = 0
    for (const scheme of usable) {
      const off = first.get(scheme.id)?.[line.key] ?? 0
      if (off <= 0) continue
      const better =
        off > bestOff ||
        (off === bestOff &&
          best !== null &&
          (scheme.priority > best.priority ||
            (scheme.priority === best.priority && scheme.endsAt < best.endsAt)))
      if (!best || better) {
        best = scheme
        bestOff = off
      }
    }
    if (best) winner.set(line.key, best)
  }
  const lineDiscounts: Record<string, number> = {}
  const applied: AppliedOffer[] = []
  for (const scheme of usable) {
    const won = lines.filter((line) => winner.get(line.key)?.id === scheme.id)
    if (!won.length) continue
    const byLine = schemeDiscounts(scheme, won, subtotal)
    const sum = total(byLine)
    if (sum <= 0) continue
    for (const [key, value] of Object.entries(byLine)) lineDiscounts[key] = value
    applied.push({ kind: 'scheme', ref: scheme.id, name: scheme.name, discountMinor: sum })
  }
  return { lineDiscounts, applied }
}

/** What the coupon takes off the lines it covers, after scheme discounts. */
export function couponDiscounts(
  coupon: CouponRule,
  lines: PromoLine[],
  schemeDiscounts: Record<string, number>,
): Record<string, number> {
  if (coupon.type === 'free-shipping') return {}
  const eligible = lines.filter((line) => covers(coupon.covers, line))
  const values = eligible.map((line) => Math.max(0, gross(line) - (schemeDiscounts[line.key] ?? 0)))
  const base = values.reduce((a, b) => a + b, 0)
  if (base <= 0) return {}
  let off = coupon.type === 'percent' ? percentOf(base, coupon.percent) : coupon.amountMinor
  if (coupon.maxDiscountMinor) off = Math.min(off, coupon.maxDiscountMinor)
  return spread(Math.min(off, base), eligible, values)
}

export type CouponCheck = { ok: true; coupon: CouponRule } | { ok: false; problem: string }

/**
 * Puts it all together: schemes first, then at most one coupon. When a live scheme that doesn't
 * combine with coupons is on the cart, the shopper gets whichever saves more, and the cart says
 * which was kept (docs/screens Coupons rule 3).
 */
export function computePromotions(
  lines: PromoLine[],
  schemes: SchemeRule[],
  couponCheck: CouponCheck | null,
  context: { paymentMethod?: string | null },
): PromotionsResult {
  const subtotal = lines.reduce((sum, line) => sum + gross(line), 0)
  const shipping = (list: SchemeRule[], afterDiscount: number) =>
    list.some(
      (s) =>
        s.type === 'free-shipping' &&
        !(s.prepaidOnly && context.paymentMethod === 'cod') &&
        lines.some((line) => covers(s.covers, line)) &&
        afterDiscount >= (s.minOrderMinor ?? 0),
    )
  const withSchemes = (list: SchemeRule[]) => {
    const pick = pickSchemes(list, lines, context)
    return { ...pick, discount: total(pick.lineDiscounts) }
  }
  const all = withSchemes(schemes)
  const result = (
    pick: ReturnType<typeof withSchemes>,
    list: SchemeRule[],
    extra: Partial<PromotionsResult> = {},
  ): PromotionsResult => {
    const freeShippingScheme = shipping(list, subtotal - pick.discount)
    return {
      lineDiscounts: pick.lineDiscounts,
      freeShipping: freeShippingScheme,
      appliedOffers: [
        ...pick.applied,
        ...list
          .filter(
            (s) =>
              s.type === 'free-shipping' &&
              freeShippingScheme &&
              lines.some((line) => covers(s.covers, line)),
          )
          .slice(0, 1)
          .map((s) => ({
            kind: 'scheme' as const,
            ref: s.id,
            name: s.name,
            discountMinor: 0,
          })),
      ],
      couponProblem: null,
      coupon: null,
      note: null,
      ...extra,
    }
  }
  if (!couponCheck) return result(all, schemes)
  if (!couponCheck.ok) return result(all, schemes, { couponProblem: couponCheck.problem })

  const coupon = couponCheck.coupon
  if (
    coupon.paymentMethods.length &&
    context.paymentMethod &&
    !coupon.paymentMethods.includes(context.paymentMethod)
  ) {
    return result(all, schemes, {
      couponProblem: `${coupon.code} is for orders paid online.`,
    })
  }
  const blocking = schemes.filter(
    (s) => !s.combinesWithCoupons && all.applied.some((a) => a.ref === s.id),
  )
  const combine = (pick: ReturnType<typeof withSchemes>, list: SchemeRule[]) => {
    const subtotalAfter = subtotal - pick.discount
    if (coupon.minOrderMinor && subtotalAfter < coupon.minOrderMinor) {
      return {
        problem: `Add ${formatINR(coupon.minOrderMinor - subtotalAfter)} more to use ${coupon.code}.`,
      }
    }
    const off = couponDiscounts(coupon, lines, pick.lineDiscounts)
    const free = coupon.type === 'free-shipping'
    if (!free && total(off) <= 0) {
      return { problem: `${coupon.code} doesn’t cover the items in your cart.` }
    }
    const lineDiscounts = { ...pick.lineDiscounts }
    for (const [key, value] of Object.entries(off)) {
      lineDiscounts[key] = (lineDiscounts[key] ?? 0) + value
    }
    const base = result(pick, list)
    return {
      value: total(off),
      result: {
        ...base,
        lineDiscounts,
        freeShipping: base.freeShipping || free,
        appliedOffers: [
          ...base.appliedOffers,
          {
            kind: 'coupon' as const,
            ref: coupon.id,
            code: coupon.code,
            name: coupon.code,
            discountMinor: total(off),
          },
        ],
        coupon: { id: coupon.id, code: coupon.code, affiliateId: coupon.affiliateId },
      } satisfies PromotionsResult,
    }
  }

  if (!blocking.length) {
    const withCoupon = combine(all, schemes)
    if ('problem' in withCoupon) return result(all, schemes, { couponProblem: withCoupon.problem! })
    return withCoupon.result
  }
  // Either the blocking schemes or the coupon: the one that saves the shopper more
  const without = schemes.filter((s) => !blocking.includes(s))
  const alt = withSchemes(without)
  const withCoupon = combine(alt, without)
  const names = blocking.map((s) => s.name).join(' and ')
  if ('problem' in withCoupon) return result(all, schemes, { couponProblem: withCoupon.problem! })
  const couponTotal = alt.discount + withCoupon.value
  if (couponTotal > all.discount) {
    return {
      ...withCoupon.result,
      note: `${coupon.code} saves you more than ${names}, so we used the coupon.`,
    }
  }
  return result(all, schemes, {
    couponProblem: `${coupon.code} can’t be used with ${names}. ${names} saves you more, so we kept it.`,
  })
}

// ---- Display ----------------------------------------------------------------------------

/**
 * One piece's price on product cards and pages (docs/11 "Display"): percent, flat and special
 * price show a price; spend tiers, buy X get Y and free delivery show only their label.
 */
export function schemeUnitPrice(
  schemes: SchemeRule[],
  line: Omit<PromoLine, 'key' | 'qty'>,
): { priceMinor: number; scheme: SchemeRule } | null {
  let best: { priceMinor: number; scheme: SchemeRule } | null = null
  for (const scheme of schemes) {
    if (!['percent', 'fixed', 'special-price'].includes(scheme.type)) continue
    if (scheme.minOrderMinor && scheme.minOrderMinor > line.unitMinor) continue
    const off = schemeDiscounts(scheme, [{ ...line, key: 'one', qty: 1 }], line.unitMinor).one ?? 0
    if (off <= 0) continue
    const price = line.unitMinor - off
    if (
      !best ||
      price < best.priceMinor ||
      (price === best.priceMinor && scheme.priority > best.scheme.priority)
    ) {
      best = { priceMinor: price, scheme }
    }
  }
  return best
}

/** A scheme's offer in words, for lists, the Offers page and messages. */
export function describeScheme(
  scheme: Pick<
    SchemeRule,
    | 'type'
    | 'percent'
    | 'amountMinor'
    | 'tiers'
    | 'buyQty'
    | 'getQty'
    | 'getDiscountPercent'
    | 'maxDiscountMinor'
    | 'minOrderMinor'
  >,
): string {
  const extra = [
    scheme.maxDiscountMinor ? `up to ${formatINR(scheme.maxDiscountMinor)}` : null,
    scheme.minOrderMinor ? `orders above ${formatINR(scheme.minOrderMinor)}` : null,
  ].filter(Boolean)
  const tail = extra.length ? `, ${extra.join(', ')}` : ''
  switch (scheme.type) {
    case 'percent':
      return `${scheme.percent}% off${tail}`
    case 'fixed':
      return `${formatINR(scheme.amountMinor)} off each item${tail}`
    case 'tiered':
      return (
        [...scheme.tiers]
          .sort((a, b) => a.minOrderMinor - b.minOrderMinor)
          .map((t) => `Spend ${formatINR(t.minOrderMinor)} get ${formatINR(t.discountMinor)} off`)
          .join('; ') || 'Spend tiers'
      )
    case 'buy-x-get-y':
      return `Buy ${scheme.buyQty}, get ${scheme.getQty} ${
        scheme.getDiscountPercent >= 100 ? 'free' : `at ${scheme.getDiscountPercent}% off`
      }`
    case 'free-shipping':
      return scheme.minOrderMinor
        ? `Free delivery on orders above ${formatINR(scheme.minOrderMinor)}`
        : 'Free delivery'
    case 'special-price':
      return 'Launch price'
  }
}

export function describeCoupon(
  coupon: Pick<CouponRule, 'type' | 'percent' | 'amountMinor' | 'maxDiscountMinor'>,
): string {
  if (coupon.type === 'free-shipping') return 'Free delivery'
  if (coupon.type === 'percent') {
    return `${coupon.percent}% off${coupon.maxDiscountMinor ? `, up to ${formatINR(coupon.maxDiscountMinor)}` : ''}`
  }
  return `${formatINR(coupon.amountMinor)} off`
}

/** Codes match whatever case the shopper types (docs/screens Coupons rule 1). */
export const normalizeCode = (code: string) => code.trim().toUpperCase().replace(/\s+/g, '')
