import type { Payload, PayloadRequest } from 'payload'
import { z } from 'zod'

import { idOf } from '@/access'
import { loadConnector } from '@/connectors'
import { emit } from '@/lib/events'
import { AppError } from '@/lib/errors'
import { GST_STATES, isGstStateCode, parseGstin, type GstStateCode } from '@/lib/gst/gstin'
import { formatINR } from '@/lib/money'
import { priceCart, type PricingResult } from '@/modules/cart'
import { getCodRules } from '@/modules/content'
import { applyPromotions, type PromotionsResult } from '@/modules/promotions'
import {
  deliveryQuote,
  lookupPincode,
  PINCODE_PATTERN,
  type LiveRateSource,
  type StoreDeliveryQuote,
} from '@/modules/shipping'
import type { Media, Order, Product, SiteSetting, Tenant, Variant } from '@/payload-types'

import { PENDING_PAYMENT_MINUTES, type PaymentMethod } from '../constants'
import { newTrackingCode, nextOrderNumber } from './numbers'
import { addOrderEvent } from './timeline'
import { confirmOrder, holdStockForOrder } from './transition'

// Checkout (docs/11, docs/07 `POST /checkout`). `quoteCheckout` prices what is in the cart from
// the catalogue, the promotions engine, the delivery rate and the COD rules; `placeOrder` runs
// the very same quote and turns it into an order. Nothing the browser sends is a price.

// ---- Input ------------------------------------------------------------------------------

/** "98765 43210", "+91 98765-43210", "098765 43210" -> "+919876543210" */
export function normalizeIndianMobile(value: string): string | null {
  const digits = value.replace(/[^0-9]/g, '')
  const ten =
    digits.length === 12 && digits.startsWith('91')
      ? digits.slice(2)
      : digits.length === 11 && digits.startsWith('0')
        ? digits.slice(1)
        : digits
  return /^[6-9][0-9]{9}$/.test(ten) ? `+91${ten}` : null
}

const mobile = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const normalized = normalizeIndianMobile(value)
    if (!normalized)
      ctx.addIssue({ code: 'custom', message: 'Enter a 10-digit Indian mobile number' })
    return normalized ?? value
  })

const text = (min: number, max: number, message: string) =>
  z.string().trim().min(min, message).max(max)

export const checkoutAddressSchema = z.object({
  name: text(2, 80, 'Enter the name of the person receiving it'),
  phone: mobile,
  line1: text(3, 120, 'Enter the house or building and street'),
  line2: z.string().trim().max(120).optional().default(''),
  landmark: z.string().trim().max(80).optional().default(''),
  city: text(2, 60, 'Enter the city or town'),
  stateCode: z.string().refine(isGstStateCode, 'Choose the state'),
  pincode: z.string().trim().regex(PINCODE_PATTERN, 'A pincode has 6 digits'),
})
export type CheckoutAddress = z.infer<typeof checkoutAddressSchema>

export const placeOrderSchema = z
  .object({
    contact: z.object({
      name: text(2, 80, 'Enter your name'),
      email: z.email('Enter an email for the order confirmation').trim().toLowerCase(),
      phone: mobile,
    }),
    shippingAddress: checkoutAddressSchema,
    billingSameAsShipping: z.boolean().default(true),
    billingAddress: checkoutAddressSchema.optional(),
    buyerGstin: z
      .string()
      .trim()
      .toUpperCase()
      .optional()
      .refine((value) => !value || parseGstin(value).valid, 'This GSTIN isn’t valid'),
    buyerLegalName: z.string().trim().max(120).optional(),
    paymentMethod: z.enum(['razorpay', 'cod']),
    couponCode: z.string().trim().max(40).optional(),
    notes: z.string().trim().max(500).optional(),
    whatsappOptIn: z.boolean().default(false),
  })
  .refine((input) => input.billingSameAsShipping || input.billingAddress, {
    path: ['billingAddress'],
    message: 'Enter the billing address',
  })
  .refine((input) => !input.buyerGstin || input.buyerLegalName, {
    path: ['buyerLegalName'],
    message: 'Enter the business name registered with this GSTIN',
  })
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>

export type CartLineInput = { productId: string; variantId?: string | null; qty: number }

// ---- Quote ------------------------------------------------------------------------------

export type QuotedLine = {
  key: string
  productId: string
  variantId: string | null
  title: string
  options: string | null
  sku: string | null
  slug: string
  image: { url: string; alt: string } | null
  qty: number
  unitMinor: number
  mrpMinor: number | null
  hsnCode: string | null
  gstRatePercent: number
  weightGrams: number
  /** Pieces that can still be bought (stock minus holds), or null when not tracked */
  available: number | null
  /** Why this line can't be bought as it is */
  problem: string | null
}

export type CheckoutQuote = {
  tenant: Pick<Tenant, 'id' | 'name' | 'slug' | 'stateCode'>
  lines: QuotedLine[]
  pricing: PricingResult
  promotions: PromotionsResult
  delivery: StoreDeliveryQuote | null
  placeOfSupply: {
    stateCode: GstStateCode
    stateName: string
    source: 'directory' | 'prefix' | 'address'
  } | null
  payment: {
    razorpay: { available: boolean; mode: 'test' | 'live' | null; keyId: string | null }
    cod: { available: boolean; reason: string | null; feeMinor: number }
  }
  minOrderMinor: number | null
  /** Problems that stop checkout, in words for the shopper */
  problems: string[]
}

const lineKey = (productId: string, variantId: string | null) => `${productId}:${variantId ?? '-'}`

const firstImage = (images: unknown): { url: string; alt: string } | null => {
  const list = Array.isArray(images) ? images : []
  const media = list.find((item): item is Media => Boolean(item) && typeof item === 'object')
  const url = media?.sizes?.thumb?.url ?? media?.url
  return media && url ? { url, alt: media.alt ?? '' } : null
}

const optionsText = (options: unknown): string | null => {
  if (!options || typeof options !== 'object') return null
  const values = Object.values(options as Record<string, unknown>).filter(
    (value) => typeof value === 'string',
  )
  return values.length ? values.join(' · ') : null
}

async function loadCatalog(payload: Payload, tenantId: string, lines: readonly CartLineInput[]) {
  const productIds = [...new Set(lines.map((line) => line.productId))]
  if (!productIds.length)
    return {
      products: new Map<string, Product>(),
      variants: new Map<string, Variant>(),
      variantCount: new Map<string, number>(),
    }
  const [{ docs: products }, { docs: variants }] = await Promise.all([
    payload.find({
      collection: 'products',
      where: { and: [{ tenant: { equals: tenantId } }, { id: { in: productIds } }] },
      depth: 1,
      limit: productIds.length,
      pagination: false,
      overrideAccess: true,
    }),
    payload.find({
      collection: 'variants',
      where: {
        and: [
          { tenant: { equals: tenantId } },
          { product: { in: productIds } },
          { status: { equals: 'active' } },
        ],
      },
      depth: 1,
      limit: 1000,
      pagination: false,
      overrideAccess: true,
    }),
  ])
  const variantCount = new Map<string, number>()
  for (const variant of variants) {
    const productId = idOf(variant.product)!
    variantCount.set(productId, (variantCount.get(productId) ?? 0) + 1)
  }
  return {
    products: new Map(products.map((product) => [String(product.id), product])),
    variants: new Map(variants.map((variant) => [String(variant.id), variant])),
    variantCount,
  }
}

function quoteLine(
  line: CartLineInput,
  catalog: Awaited<ReturnType<typeof loadCatalog>>,
): QuotedLine | null {
  const product = catalog.products.get(line.productId)
  if (!product) return null
  const variant = line.variantId ? (catalog.variants.get(line.variantId) ?? null) : null
  if (line.variantId && (!variant || idOf(variant.product) !== line.productId)) return null
  const unitMinor = variant?.price?.amountMinor ?? product.price?.amountMinor ?? null
  const reserved = variant ? (variant.reservedQty ?? 0) : 0
  const available = variant ? Math.max(0, (variant.stockQty ?? 0) - reserved) : null
  let problem: string | null = null
  if (product.status !== 'active') problem = 'This product is no longer sold.'
  else if (product.purchaseMode === 'enquire')
    problem = 'This product is sold on request. Ask for a quote instead.'
  else if (!variant && (catalog.variantCount.get(line.productId) ?? 0) > 0)
    problem = 'Choose a finish or size.'
  else if (unitMinor === null || unitMinor <= 0)
    problem = 'This product has no online price yet. Ask for a quote instead.'
  else if (!product.hsnCode)
    problem = 'This product can’t be sold online yet. Ask for a quote instead.'
  else if (variant && !variant.allowBackorder && available !== null && line.qty > available) {
    problem = available === 0 ? 'Out of stock.' : `Only ${available} left.`
  }
  return {
    key: lineKey(line.productId, variant ? String(variant.id) : null),
    productId: line.productId,
    variantId: variant ? String(variant.id) : null,
    title: product.title,
    options: variant ? (variant.title ?? optionsText(variant.options)) : null,
    sku: variant?.sku ?? product.modelNumber ?? null,
    slug: product.slug ?? '',
    image: firstImage(variant?.images?.length ? variant.images : product.gallery),
    qty: line.qty,
    unitMinor: unitMinor ?? 0,
    mrpMinor: variant?.compareAtPrice?.amountMinor ?? product.compareAtPrice?.amountMinor ?? null,
    hsnCode: product.hsnCode ?? null,
    gstRatePercent: Number(product.gstRate ?? 18),
    weightGrams: (variant?.weightGrams ?? product.weightGrams ?? 0) * line.qty,
    available: variant && !variant.allowBackorder ? available : null,
    problem,
  }
}

async function siteSettingsOf(payload: Payload, tenantId: string): Promise<SiteSetting | null> {
  const { docs } = await payload.find({
    collection: 'site-settings',
    where: { tenant: { equals: tenantId } },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  return docs[0] ?? null
}

export async function quoteCheckout(
  payload: Payload,
  tenantId: string,
  input: {
    lines: readonly CartLineInput[]
    pincode?: string | null
    /** The state the shopper chose, used where the pincode doesn't settle it */
    stateCode?: string | null
    paymentMethod?: PaymentMethod | null
    couponCode?: string | null
    contact?: { email?: string | null; phone?: string | null }
    live?: LiveRateSource | null
    now?: Date
  },
): Promise<CheckoutQuote> {
  const tenant = await payload.findByID({
    collection: 'tenants',
    id: tenantId,
    depth: 0,
    overrideAccess: true,
  })
  const [catalog, settings, codRules, razorpay] = await Promise.all([
    loadCatalog(payload, tenantId, input.lines),
    siteSettingsOf(payload, tenantId),
    getCodRules(payload, tenantId),
    loadConnector(payload, tenantId, 'razorpay'),
  ])
  const lines = input.lines
    .map((line) => quoteLine(line, catalog))
    .filter((line): line is QuotedLine => line !== null)
  const buyable = lines.filter((line) => !line.problem)
  const problems: string[] = []
  if (lines.length === 0) problems.push('Your cart is empty.')
  if (lines.some((line) => line.problem))
    problems.push('Some items can’t be bought as they are. Check them in your cart.')

  // Place of supply: the pincode directory, else the pincode's first digits, else the state chosen
  let placeOfSupply: CheckoutQuote['placeOfSupply'] = null
  if (input.pincode && PINCODE_PATTERN.test(input.pincode)) {
    const info = await lookupPincode(payload, input.pincode)
    const stateCode =
      info.stateCode ??
      (input.stateCode && isGstStateCode(input.stateCode) ? input.stateCode : null)
    if (stateCode) {
      placeOfSupply = {
        stateCode,
        stateName: GST_STATES[stateCode as keyof typeof GST_STATES],
        source: info.stateCode ? (info.source as 'directory' | 'prefix') : 'address',
      }
    }
  }

  const now = input.now ?? new Date()
  const itemsMinor = buyable.reduce((sum, line) => sum + line.unitMinor * line.qty, 0)
  const promotions = await applyPromotions(
    payload,
    buyable.map((line) => ({
      key: line.key,
      productId: line.productId,
      variantId: line.variantId,
      categoryIds: ((catalog.products.get(line.productId)?.categories ?? []) as unknown[])
        .map((c) => idOf(c))
        .filter((c): c is string => Boolean(c)),
      qty: line.qty,
      unitMinor: line.unitMinor,
    })),
    {
      tenantId,
      couponCode: input.couponCode,
      paymentMethod: input.paymentMethod,
      contact: input.contact,
      subtotalMinor: itemsMinor,
      at: now,
    },
  )
  const discountMinor = Object.values(promotions.lineDiscounts).reduce(
    (sum, value) => sum + value,
    0,
  )
  const subtotalMinor = itemsMinor - discountMinor
  const weightGrams = buyable.reduce((sum, line) => sum + line.weightGrams, 0)

  const delivery =
    input.pincode && PINCODE_PATTERN.test(input.pincode)
      ? await deliveryQuote(
          payload,
          tenantId,
          {
            pincode: input.pincode,
            stateCode: placeOfSupply?.stateCode ?? null,
            subtotalMinor,
            weightGrams,
          },
          { live: input.live, cod: input.paymentMethod === 'cod' },
        )
      : null
  if (delivery && !delivery.serviceable) problems.push('We don’t deliver to this pincode yet.')

  const minOrderMinor = settings?.checkout?.minOrderValue?.amountMinor ?? null
  if (minOrderMinor && subtotalMinor < minOrderMinor && buyable.length) {
    problems.push(`The minimum order is ${formatINR(minOrderMinor)}.`)
  }

  // Cash on delivery: our switch, the vendor's rules, the zone, the order value (docs/09)
  const codFeature = (tenant.enabledFeatures ?? []).includes('cod')
  let codReason: string | null = null
  if (!codFeature || !codRules.codEnabled)
    codReason = 'Cash on delivery isn’t offered by this store.'
  else if (delivery && !delivery.codAllowed)
    codReason = 'Cash on delivery isn’t available at this pincode.'
  else if (codRules.codMinOrderMinor && subtotalMinor < codRules.codMinOrderMinor)
    codReason = `Cash on delivery is for orders of ${formatINR(codRules.codMinOrderMinor)} or more.`
  else if (codRules.codMaxOrderMinor && subtotalMinor > codRules.codMaxOrderMinor)
    codReason = `Cash on delivery is for orders up to ${formatINR(codRules.codMaxOrderMinor)}.`
  const codAvailable = codReason === null
  const codFeeMinor = codAvailable ? (codRules.codFeeMinor ?? 0) : 0

  const razorpayReady = Boolean(razorpay?.public.keyId && razorpay.secret.keySecret)
  if (!razorpayReady && !codAvailable && buyable.length)
    problems.push('This store isn’t taking orders online yet.')

  const shippingMinor = promotions.freeShipping ? 0 : (delivery?.feeMinor ?? 0)
  const pricing = priceCart({
    sellerStateCode: tenant.stateCode ?? '',
    placeOfSupplyStateCode: placeOfSupply?.stateCode ?? null,
    shippingMinor,
    codFeeMinor: input.paymentMethod === 'cod' ? codFeeMinor : 0,
    lines: buyable.map((line) => ({
      key: line.key,
      qty: line.qty,
      unitMinor: line.unitMinor,
      mrpMinor: line.mrpMinor,
      gstRatePercent: line.gstRatePercent,
      discountMinor: promotions.lineDiscounts[line.key] ?? 0,
    })),
  })

  return {
    tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, stateCode: tenant.stateCode },
    lines,
    pricing,
    promotions,
    delivery,
    placeOfSupply,
    payment: {
      razorpay: {
        available: razorpayReady,
        mode: razorpay?.mode ?? null,
        keyId: razorpayReady ? (razorpay?.public.keyId ?? null) : null,
      },
      cod: { available: codAvailable, reason: codReason, feeMinor: codFeeMinor },
    },
    minOrderMinor,
    problems,
  }
}

// ---- Place ------------------------------------------------------------------------------

const addressData = (address: CheckoutAddress) => ({
  ...address,
  stateCode: address.stateCode as GstStateCode,
  country: 'IN',
})

/**
 * Turns the cart into an order, inside the caller's transaction: prices it again, holds the
 * stock, and confirms it straight away for cash on delivery. An online order waits for Razorpay
 * (`markOrderPaid`) and is cancelled after PENDING_PAYMENT_MINUTES without payment.
 */
export async function placeOrder(
  req: PayloadRequest,
  tenantId: string,
  {
    lines,
    input,
    cartId,
    meta,
    live,
  }: {
    lines: readonly CartLineInput[]
    input: PlaceOrderInput
    cartId?: string | null
    meta?: { ip?: string | null; userAgent?: string | null; source?: 'web' | 'pwa' }
    live?: LiveRateSource | null
  },
): Promise<{ order: Order; quote: CheckoutQuote }> {
  const quote = await quoteCheckout(req.payload, tenantId, {
    lines,
    pincode: input.shippingAddress.pincode,
    stateCode: input.shippingAddress.stateCode,
    paymentMethod: input.paymentMethod,
    couponCode: input.couponCode,
    contact: input.contact,
    live,
  })
  const badLine = quote.lines.find((line) => line.problem)
  if (badLine) throw new AppError('BUSINESS_RULE', `${badLine.title}: ${badLine.problem}`, 422)
  if (quote.problems.length) throw new AppError('BUSINESS_RULE', quote.problems[0]!, 422)
  if (!quote.placeOfSupply)
    throw new AppError('VALIDATION_FAILED', 'Choose the delivery state', 400, {
      'shippingAddress.stateCode': 'Choose the state',
    })
  if (input.paymentMethod === 'cod' && !quote.payment.cod.available) {
    throw new AppError(
      'BUSINESS_RULE',
      quote.payment.cod.reason ?? 'Cash on delivery isn’t available',
      422,
    )
  }
  if (input.paymentMethod === 'razorpay' && !quote.payment.razorpay.available) {
    throw new AppError(
      'BUSINESS_RULE',
      'Online payment isn’t available in this store right now.',
      422,
    )
  }
  if (input.couponCode && quote.promotions.couponProblem) {
    throw new AppError('BUSINESS_RULE', quote.promotions.couponProblem, 422, {
      couponCode: quote.promotions.couponProblem,
    })
  }

  const settings = await siteSettingsOf(req.payload, tenantId)
  const prefix = settings?.orderPrefix ?? 'ORD'
  const pricedByKey = new Map(quote.pricing.lines.map((line) => [line.key, line]))
  const now = new Date()
  const online = input.paymentMethod === 'razorpay'
  // A shopper's typed state can't override what the pincode says (docs/11 place of supply)
  const shippingAddress = {
    ...addressData(input.shippingAddress),
    stateCode: quote.placeOfSupply.stateCode,
  }

  const order = await req.payload.create({
    collection: 'orders',
    data: {
      tenant: tenantId,
      orderNumber: await nextOrderNumber(req, tenantId, prefix),
      trackingCode: newTrackingCode(),
      status: 'pending',
      paymentStatus: 'pending',
      fulfillmentStatus: 'unfulfilled',
      contact: input.contact,
      items: quote.lines.map((line) => {
        const priced = pricedByKey.get(line.key)!
        return {
          productId: line.productId,
          variantId: line.variantId ?? undefined,
          imageUrl: line.image?.url,
          sku: line.sku ?? undefined,
          title: line.title,
          options: line.options ?? undefined,
          qty: line.qty,
          unitMinor: line.unitMinor,
          mrpMinor: line.mrpMinor ?? line.unitMinor,
          discountMinor: priced.discountMinor,
          hsnCode: line.hsnCode ?? undefined,
          gstRate: priced.gstRatePercent,
          taxableMinor: priced.taxableMinor,
          cgstMinor: priced.cgstMinor,
          sgstMinor: priced.sgstMinor,
          igstMinor: priced.igstMinor,
          lineTotalMinor: priced.netMinor,
          weightGrams: line.weightGrams,
        }
      }),
      charges: quote.pricing.charges,
      totals: {
        itemsMinor: quote.pricing.totals.itemsMinor,
        discountMinor: quote.pricing.totals.discountMinor,
        subtotalMinor: quote.pricing.totals.subtotalMinor,
        shippingMinor: quote.pricing.totals.shippingMinor,
        codFeeMinor: quote.pricing.totals.codFeeMinor,
        taxableMinor: quote.pricing.totals.taxableMinor,
        taxMinor: quote.pricing.totals.taxMinor,
        cgstMinor: quote.pricing.totals.cgstMinor,
        sgstMinor: quote.pricing.totals.sgstMinor,
        igstMinor: quote.pricing.totals.igstMinor,
        roundOffMinor: quote.pricing.totals.roundOffMinor,
        grandTotalMinor: quote.pricing.totals.grandTotalMinor,
        paidMinor: 0,
        refundedMinor: 0,
      },
      shippingAddress,
      billingSameAsShipping: input.billingSameAsShipping,
      billingAddress:
        input.billingSameAsShipping || !input.billingAddress
          ? undefined
          : addressData(input.billingAddress),
      buyerGstin: input.buyerGstin || undefined,
      buyerLegalName: input.buyerLegalName || undefined,
      sellerStateCode: quote.tenant.stateCode ?? undefined,
      placeOfSupplyStateCode: quote.placeOfSupply.stateCode,
      paymentMethod: input.paymentMethod,
      paymentMode: online ? (quote.payment.razorpay.mode ?? 'live') : undefined,
      shippingMethod: quote.delivery
        ? {
            source: quote.delivery.source,
            zoneName: quote.delivery.zoneName ?? undefined,
            courierName: quote.delivery.courierName ?? undefined,
            etaMinDays: quote.delivery.etaMinDays ?? undefined,
            etaMaxDays: quote.delivery.etaMaxDays ?? undefined,
          }
        : undefined,
      appliedOffers: quote.promotions.appliedOffers,
      couponCode: input.couponCode || undefined,
      whatsappOptIn: input.whatsappOptIn,
      notes: input.notes || undefined,
      source: meta?.source ?? 'web',
      cartId: cartId ?? undefined,
      placedAt: now.toISOString(),
      expiresAt: online
        ? new Date(now.getTime() + PENDING_PAYMENT_MINUTES * 60_000).toISOString()
        : undefined,
      ip: meta?.ip ?? undefined,
      userAgent: meta?.userAgent?.slice(0, 300) ?? undefined,
    },
    overrideAccess: true,
    req,
  })
  await addOrderEvent(req, {
    tenantId,
    orderId: String(order.id),
    type: 'created',
    text: `Order placed on the online store · ${online ? 'paying online' : 'cash on delivery'}`,
    byLabel: 'shopper',
  })
  let placed = await holdStockForOrder(req, order)
  await emit('order.placed', { tenantId, orderId: String(order.id) }, { req })
  if (!online)
    placed = await confirmOrder(req, String(order.id), {
      byLabel: 'system',
      reason: 'Cash on delivery order confirmed',
    })
  return { order: placed, quote }
}
