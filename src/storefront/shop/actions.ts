'use server'

import { createHash } from 'node:crypto'

import { cookies } from 'next/headers'
import type { PayloadRequest } from 'payload'
import { createLocalReq } from 'payload'
import { ZodError } from 'zod'

import { getPayloadClient } from '@/lib/data/payload'
import { withTransaction } from '@/lib/db/transaction'
import { isAppError } from '@/lib/errors'
import { allow, LIMITS } from '@/lib/rate-limit'
import { changeLine, markCartConverted, saveCart } from '@/modules/cart'
import { completeProfileFromOrder, rememberCheckoutAddress } from '@/modules/customers'
import { placeOrder, placeOrderSchema, quoteCheckout, type PaymentMethod } from '@/modules/orders'
import {
  completeOnlinePayment,
  startOnlinePayment,
  type OnlinePaymentStart,
} from '@/modules/payments'
import { PINCODE_PATTERN } from '@/modules/shipping'
import { isFeatureEnabled } from '@/modules/tenancy'

import { signedInShopper } from './account'
import { canSeeOrder, grantOrderAccess, ORDER_COOKIE, ORDER_ACCESS_HOURS } from './orderAccess'
import { cartToken, currentCart, currentStore, setCartCount, visitorMeta } from './server'
import { arrivalText, summarize, type CheckoutSummary } from './summary'

// Cart and checkout (docs/screens storefront Cart, Checkout, Order confirmed). Every action finds
// the store from the request's host and prices from the server; the browser sends product ids,
// quantities, a pincode and the checkout form, never a price.

export type ShopResult<T> =
  { ok: true; data: T } | { ok: false; message: string; fields?: Record<string, string> }

const GENERIC = 'Something went wrong. Please try again, or call or WhatsApp the store.'
const CLOSED = 'This store isn’t taking orders at the moment.'

function failure(error: unknown): { ok: false; message: string; fields?: Record<string, string> } {
  if (error instanceof ZodError) {
    const fields: Record<string, string> = {}
    for (const issue of error.issues) fields[issue.path.join('.')] ??= issue.message
    return { ok: false, message: 'Please check the highlighted fields.', fields }
  }
  if (isAppError(error)) return { ok: false, message: error.message, fields: error.fields }
  console.error('[shop] action failed', error)
  return { ok: false, message: GENERIC }
}

type LineInput = { productId: string; variantId?: string | null; qty: number }

const cleanLine = (line: LineInput) => ({
  productId: String(line.productId),
  variantId: line.variantId ? String(line.variantId) : null,
  qty: Math.max(0, Math.min(99, Math.floor(Number(line.qty) || 0))),
})

/** Add to cart (product page, cards). Answers with the cart's piece count for the header. */
export async function addToCart(input: LineInput): Promise<ShopResult<{ count: number }>> {
  try {
    const store = await currentStore()
    if (!store) return { ok: false, message: CLOSED }
    const line = cleanLine(input)
    if (line.qty < 1) return { ok: false, message: 'Choose how many you need.' }
    const { payload, lines } = await currentCart(store.tenantId)
    const next = changeLine(lines, line)
    // Check the item is sellable now, with the quantity it would have in the cart
    const quote = await quoteCheckout(payload, store.tenantId, {
      lines: next.filter((l) => l.productId === line.productId && l.variantId === line.variantId),
    })
    const quoted = quote.lines[0]
    if (!quoted) return { ok: false, message: 'This product isn’t available.' }
    if (quoted.problem) return { ok: false, message: quoted.problem }
    const token = (await cartToken({ create: true }))!
    await saveCart(payload, store.tenantId, token, next)
    const count = next.reduce((sum, l) => sum + l.qty, 0)
    await setCartCount(count)
    return { ok: true, data: { count } }
  } catch (error) {
    return failure(error)
  }
}

/** Change a cart line's quantity; 0 removes it. */
export async function updateCartLine(input: LineInput): Promise<ShopResult<{ count: number }>> {
  try {
    const store = await currentStore()
    if (!store) return { ok: false, message: CLOSED }
    const token = await cartToken({ create: false })
    if (!token) return { ok: true, data: { count: 0 } }
    const { payload, lines } = await currentCart(store.tenantId)
    const next = changeLine(lines, cleanLine(input), { replace: true })
    await saveCart(payload, store.tenantId, token, next)
    const count = next.reduce((sum, l) => sum + l.qty, 0)
    await setCartCount(count)
    return { ok: true, data: { count } }
  } catch (error) {
    return failure(error)
  }
}

export type DeliveryCheck = {
  serviceable: boolean
  feeMinor: number
  codAvailable: boolean
  etaMinDays: number | null
  etaMaxDays: number | null
  arrivesBy: string | null
  stateName: string | null
}

/**
 * The pincode check (product page and cart): deliverable, the fee, COD, and when. With a product
 * it checks that product; otherwise the cart. The pincode is kept on the cart for checkout.
 */
export async function checkDelivery(input: {
  pincode: string
  productId?: string
  variantId?: string | null
  qty?: number
}): Promise<ShopResult<DeliveryCheck>> {
  try {
    const store = await currentStore()
    if (!store) return { ok: false, message: CLOSED }
    const pincode = String(input.pincode ?? '').trim()
    if (!PINCODE_PATTERN.test(pincode)) return { ok: false, message: 'Enter a 6-digit pincode.' }
    const { payload, lines, cart } = await currentCart(store.tenantId)
    const subject = input.productId
      ? [cleanLine({ productId: input.productId, variantId: input.variantId, qty: input.qty ?? 1 })]
      : lines
    const quote = await quoteCheckout(payload, store.tenantId, { lines: subject, pincode })
    const token = await cartToken({ create: false })
    if (cart && token) await saveCart(payload, store.tenantId, token, lines, { pincode })
    return {
      ok: true,
      data: {
        serviceable: quote.delivery?.serviceable ?? false,
        feeMinor: quote.pricing.totals.shippingMinor,
        codAvailable: quote.payment.cod.available,
        etaMinDays: quote.delivery?.etaMinDays ?? null,
        etaMaxDays: quote.delivery?.etaMaxDays ?? null,
        arrivesBy: arrivalText(quote.delivery?.etaMaxDays ?? null),
        stateName: quote.placeOfSupply?.stateName ?? null,
      },
    }
  } catch (error) {
    return failure(error)
  }
}

/** Checkout keeps its totals in step with the pincode and payment method as the shopper types. */
export async function previewCheckout(input: {
  pincode?: string
  stateCode?: string
  paymentMethod?: PaymentMethod
}): Promise<ShopResult<CheckoutSummary>> {
  try {
    const store = await currentStore()
    if (!store) return { ok: false, message: CLOSED }
    const { payload, lines } = await currentCart(store.tenantId)
    const pincode = input.pincode && PINCODE_PATTERN.test(input.pincode) ? input.pincode : null
    const quote = await quoteCheckout(payload, store.tenantId, {
      lines,
      pincode,
      stateCode: input.stateCode ?? null,
      paymentMethod: input.paymentMethod ?? null,
    })
    return { ok: true, data: summarize(quote) }
  } catch (error) {
    return failure(error)
  }
}

export type PlacedOrder = {
  orderNumber: string
  /** Present for online payment: what Razorpay's window needs */
  payment:
    | (OnlinePaymentStart & {
        storeName: string
        prefill: { name: string; email: string; contact: string }
      })
    | null
}

/** A request for the Local API with no signed-in user: the shopper acts through services only */
const storeRequest = async (): Promise<PayloadRequest> =>
  createLocalReq({}, await getPayloadClient())

/**
 * Places the order from the cart (docs/07 `POST /checkout`). The same `idempotencyKey` (one per
 * page load) returns the same order instead of placing a second one when the button is pressed
 * twice or the network retries.
 */
export async function submitCheckout(input: {
  form: unknown
  idempotencyKey: string
  /** Signed-in shoppers: keep the delivery address on the account */
  saveAddress?: boolean
}): Promise<ShopResult<PlacedOrder>> {
  try {
    const store = await currentStore()
    if (!store) return { ok: false, message: CLOSED }
    const session = await signedInShopper(store.tenantId)
    // Guest checkout is a feature switch (docs/08); without it, shoppers log in first
    if (
      !session &&
      !(await isFeatureEnabled(await getPayloadClient(), store.tenantId, 'guest-checkout'))
    ) {
      return { ok: false, message: 'Please log in to place your order.' }
    }
    const meta = await visitorMeta()
    if (!allow(`checkout:${store.tenantId}:${meta.ip ?? 'local'}`, LIMITS.checkout)) {
      return { ok: false, message: 'Too many attempts. Please wait a few minutes and try again.' }
    }
    const form = placeOrderSchema.parse(input.form)
    const { payload, lines, cart } = await currentCart(store.tenantId)
    const key = String(input.idempotencyKey ?? '').slice(0, 80)
    const requestHash = createHash('sha256').update(JSON.stringify({ form, lines })).digest('hex')

    if (key) {
      const { docs } = await payload.find({
        collection: 'idempotency-keys',
        where: { and: [{ tenant: { equals: store.tenantId } }, { key: { equals: key } }] },
        limit: 1,
        pagination: false,
        overrideAccess: true,
      })
      const seen = docs[0]
      if (seen) {
        if (seen.requestHash !== requestHash) {
          return {
            ok: false,
            message: 'Your cart or details changed. Reload the page and try again.',
          }
        }
        return seen.responseBody as ShopResult<PlacedOrder>
      }
    }

    const req = await storeRequest()
    const customerId = session ? String(session.customer.id) : null
    const { order } = await withTransaction(req, async () => {
      const placed = await placeOrder(req, store.tenantId, {
        lines,
        input: form,
        cartId: cart ? String(cart.id) : null,
        meta: { ...meta, source: 'web' },
        customerId,
      })
      if (customerId) {
        await completeProfileFromOrder(req, store.tenantId, session!.customer, form.contact)
        if (input.saveAddress) {
          await rememberCheckoutAddress(req, store.tenantId, customerId, {
            ...form.shippingAddress,
            gstin: form.buyerGstin,
            legalName: form.buyerLegalName,
          })
        }
      }
      return placed
    })
    if (cart) await markCartConverted(payload, String(cart.id), String(order.id))
    await setCartCount(0)
    const jar = await cookies()
    jar.set(ORDER_COOKIE, grantOrderAccess(jar.get(ORDER_COOKIE)?.value, String(order.id)), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: ORDER_ACCESS_HOURS * 60 * 60,
    })
    let payment: PlacedOrder['payment'] = null
    if (form.paymentMethod === 'razorpay') {
      const started = await startOnlinePayment(req, store.tenantId, String(order.id))
      payment = {
        ...started,
        storeName: store.name,
        prefill: {
          name: form.contact.name,
          email: form.contact.email,
          contact: form.contact.phone,
        },
      }
    }
    const result: ShopResult<PlacedOrder> = {
      ok: true,
      data: { orderNumber: order.orderNumber, payment },
    }
    if (key) {
      await payload.create({
        collection: 'idempotency-keys',
        data: {
          tenant: store.tenantId,
          key,
          route: 'checkout',
          requestHash,
          responseStatus: 200,
          responseBody: result as unknown as Record<string, unknown>,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
        overrideAccess: true,
      })
    }
    return result
  } catch (error) {
    return failure(error)
  }
}

async function ownOrder(orderNumber: string) {
  const store = await currentStore()
  if (!store) return null
  const { payload } = await currentCart(store.tenantId)
  const { docs } = await payload.find({
    collection: 'orders',
    where: {
      and: [
        { tenant: { equals: store.tenantId } },
        { orderNumber: { equals: String(orderNumber) } },
      ],
    },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  const order = docs[0]
  if (!order || !canSeeOrder((await cookies()).get(ORDER_COOKIE)?.value, String(order.id)))
    return null
  return { store, order, payload }
}

/** Razorpay's success callback: verified on the server, then the order is paid. */
export async function confirmPayment(input: {
  orderNumber: string
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}): Promise<ShopResult<{ orderNumber: string }>> {
  try {
    const found = await ownOrder(input.orderNumber)
    if (!found) return { ok: false, message: 'Order not found.' }
    const req = await createLocalReq({}, found.payload)
    await withTransaction(req, () =>
      completeOnlinePayment(req, found.store.tenantId, {
        razorpayOrderId: String(input.razorpay_order_id),
        razorpayPaymentId: String(input.razorpay_payment_id),
        signature: String(input.razorpay_signature),
      }),
    )
    return { ok: true, data: { orderNumber: found.order.orderNumber } }
  } catch (error) {
    return failure(error)
  }
}

/** "Pay now" again on the order page when the first attempt was closed or failed. */
export async function retryPayment(orderNumber: string): Promise<ShopResult<PlacedOrder>> {
  try {
    const found = await ownOrder(orderNumber)
    if (!found) return { ok: false, message: 'Order not found.' }
    const req = await createLocalReq({}, found.payload)
    const started = await startOnlinePayment(req, found.store.tenantId, String(found.order.id))
    const contact = found.order.contact
    return {
      ok: true,
      data: {
        orderNumber: found.order.orderNumber,
        payment: {
          ...started,
          storeName: found.store.name,
          prefill: {
            name: contact?.name ?? '',
            email: contact?.email ?? '',
            contact: contact?.phone ?? '',
          },
        },
      },
    }
  } catch (error) {
    return failure(error)
  }
}
