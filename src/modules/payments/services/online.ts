import type { Payload, PayloadRequest, Where } from 'payload'

import { idOf } from '@/access'
import {
  loadConnector,
  razorpayApi,
  recordWebhookHealth,
  type ConnectorContext,
} from '@/connectors'
import { AppError } from '@/lib/errors'
import { cancelOrder, loadOrder, markOrderPaid, recordPaymentFailure } from '@/modules/orders'
import type { Transaction } from '@/payload-types'

// Online payment with Razorpay Standard Checkout (docs/09 "Razorpay", docs/11 "Idempotency"):
// 1. start: a Razorpay order for our pending order; 2. the browser pays in Razorpay's window;
// 3. its callback is verified (HMAC) and settles the order at once; 4. the webhook is the source
// of truth and settles it if the browser never came back; 5. a job reconciles what is left.

export type OnlinePaymentStart = {
  keyId: string
  razorpayOrderId: string
  amountMinor: number
  currency: 'INR'
  mode: 'test' | 'live'
}

type Fetch = typeof fetch | undefined

async function razorpayFor(payload: Payload, tenantId: string, fetchImpl?: Fetch) {
  const ctx = await loadConnector(payload, tenantId, 'razorpay', { requireAllowed: false })
  if (!ctx?.public.keyId || !ctx.secret.keySecret) return null
  return { ...ctx, fetchImpl } satisfies ConnectorContext
}

async function transactionFor(
  payload: Payload,
  tenantId: string,
  where: Where,
  req?: PayloadRequest,
): Promise<Transaction | null> {
  const { docs } = await payload.find({
    collection: 'transactions',
    where: { and: [{ tenant: { equals: tenantId } }, { provider: { equals: 'razorpay' } }, where] },
    sort: '-createdAt',
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  return docs[0] ?? null
}

/** Opens (or reopens, when the shopper retries) the Razorpay order for a pending online order. */
export async function startOnlinePayment(
  req: PayloadRequest,
  tenantId: string,
  orderId: string,
  fetchImpl?: Fetch,
): Promise<OnlinePaymentStart> {
  const order = await loadOrder(req, orderId)
  if (idOf(order.tenant) !== tenantId) throw new AppError('NOT_FOUND', 'Order not found', 404)
  if (order.paymentMethod !== 'razorpay' || order.status !== 'pending') {
    throw new AppError('BUSINESS_RULE', 'This order isn’t waiting for an online payment.', 409)
  }
  const ctx = await razorpayFor(req.payload, tenantId, fetchImpl)
  if (!ctx) throw new AppError('BUSINESS_RULE', 'Online payment isn’t available right now.', 422)
  const amountMinor = order.totals?.grandTotalMinor ?? 0
  const existing = await transactionFor(req.payload, tenantId, { order: { equals: orderId } }, req)
  if (existing && existing.status === 'created' && existing.amountMinor === amountMinor) {
    return {
      keyId: ctx.public.keyId!,
      razorpayOrderId: existing.providerOrderId,
      amountMinor,
      currency: 'INR',
      mode: ctx.mode,
    }
  }
  const razorpayOrder = await razorpayApi.createOrder(ctx, {
    amountMinor,
    receipt: order.orderNumber,
    notes: { tenantId, orderId: String(order.id), orderNumber: order.orderNumber },
  })
  await req.payload.create({
    collection: 'transactions',
    data: {
      tenant: tenantId,
      order: orderId,
      provider: 'razorpay',
      mode: ctx.mode,
      providerOrderId: razorpayOrder.id,
      amountMinor,
      status: 'created',
    },
    overrideAccess: true,
    req,
  })
  return {
    keyId: ctx.public.keyId!,
    razorpayOrderId: razorpayOrder.id,
    amountMinor,
    currency: 'INR',
    mode: ctx.mode,
  }
}

/** Card and contact details never reach our database (docs/14) */
const safePayment = (payment: razorpayApi.RazorpayPayment) => ({
  id: payment.id,
  order_id: payment.order_id,
  amount: payment.amount,
  status: payment.status,
  method: payment.method,
  bank: payment.bank,
  wallet: payment.wallet,
  card: payment.card ? { network: payment.card.network, type: payment.card.type } : undefined,
})

/** Records a captured payment on its transaction and marks the order paid (idempotent). */
async function settle(
  req: PayloadRequest,
  transaction: Transaction,
  payment: razorpayApi.RazorpayPayment,
  eventId?: string,
): Promise<void> {
  const orderId = idOf(transaction.order)!
  const captured = payment.status === 'captured' || payment.status === 'authorized'
  if (!captured) return
  if (payment.amount !== transaction.amountMinor) {
    // Never mark paid for a different amount; staff see it on the order (docs/11)
    await recordPaymentFailure(
      req,
      orderId,
      `Razorpay reported ₹${payment.amount / 100} for an order of ₹${transaction.amountMinor / 100}. Check it in Razorpay.`,
    )
    return
  }
  const methodLabel = razorpayApi.describeMethod(payment)
  await req.payload.update({
    collection: 'transactions',
    id: transaction.id,
    data: {
      status: payment.status === 'captured' ? 'captured' : 'authorized',
      providerPaymentId: payment.id,
      method: payment.method,
      methodDetail: methodLabel,
      capturedAt: transaction.capturedAt ?? new Date().toISOString(),
      raw: safePayment(payment),
      ...(eventId
        ? { processedEventIds: [...(transaction.processedEventIds ?? []), eventId] }
        : {}),
    },
    overrideAccess: true,
    req,
  })
  await markOrderPaid(req, orderId, {
    amountMinor: payment.amount,
    methodLabel,
    byLabel: 'Razorpay',
  })
}

/**
 * Step 3: the browser's success callback. The signature proves Razorpay issued this payment for
 * this order; the order is settled without waiting for the webhook.
 */
export async function completeOnlinePayment(
  req: PayloadRequest,
  tenantId: string,
  input: { razorpayOrderId: string; razorpayPaymentId: string; signature: string },
  fetchImpl?: Fetch,
): Promise<{ orderId: string }> {
  const ctx = await razorpayFor(req.payload, tenantId, fetchImpl)
  const transaction = await transactionFor(
    req.payload,
    tenantId,
    { providerOrderId: { equals: input.razorpayOrderId } },
    req,
  )
  if (!ctx || !transaction) throw new AppError('NOT_FOUND', 'Payment not found', 404)
  if (!razorpayApi.verifyPaymentSignature(ctx.secret.keySecret ?? '', input)) {
    throw new AppError(
      'FORBIDDEN',
      'This payment couldn’t be verified. If money left your account, contact the store.',
      403,
    )
  }
  // The signature is enough to trust it; the method is a nicety, so a slow API doesn't block
  const payment = await razorpayApi
    .fetchPayment(ctx, input.razorpayPaymentId)
    .catch((): razorpayApi.RazorpayPayment => ({
      id: input.razorpayPaymentId,
      order_id: input.razorpayOrderId,
      amount: transaction.amountMinor,
      status: 'captured',
    }))
  await settle(req, transaction, payment)
  return { orderId: idOf(transaction.order)! }
}

type WebhookEvent = {
  event?: string
  payload?: {
    payment?: { entity?: razorpayApi.RazorpayPayment }
    order?: { entity?: { id?: string } }
    refund?: { entity?: { id?: string; payment_id?: string; amount?: number; status?: string } }
  }
}

export type WebhookOutcome =
  'processed' | 'duplicate' | 'ignored' | 'bad-signature' | 'not-configured'

/**
 * Step 4: Razorpay's webhook (docs/07 "Webhooks in"). Verified with the store's webhook secret,
 * handled once per event id, and kept as the connector's health.
 */
export async function handleRazorpayWebhook(
  req: PayloadRequest,
  tenantId: string,
  {
    rawBody,
    signature,
    eventId,
  }: { rawBody: string; signature: string | null; eventId: string | null },
): Promise<WebhookOutcome> {
  const ctx = await loadConnector(req.payload, tenantId, 'razorpay', { requireAllowed: false })
  if (!ctx) return 'not-configured'
  if (!razorpayApi.verifyWebhookSignature(ctx.secret.webhookSecret ?? '', rawBody, signature)) {
    await recordWebhookHealth(req.payload, tenantId, 'razorpay', {
      ok: false,
      error: 'signature mismatch: the webhook secret saved here doesn’t match Razorpay’s',
    })
    return 'bad-signature'
  }
  await recordWebhookHealth(req.payload, tenantId, 'razorpay', { ok: true })
  let event: WebhookEvent
  try {
    event = JSON.parse(rawBody) as WebhookEvent
  } catch {
    return 'ignored'
  }
  const payment = event.payload?.payment?.entity
  const razorpayOrderId = payment?.order_id ?? event.payload?.order?.entity?.id
  if (!razorpayOrderId) return 'ignored'
  const transaction = await transactionFor(
    req.payload,
    tenantId,
    { providerOrderId: { equals: razorpayOrderId } },
    req,
  )
  if (!transaction) return 'ignored'
  if (eventId && (transaction.processedEventIds ?? []).includes(eventId)) return 'duplicate'

  switch (event.event) {
    case 'payment.captured':
    case 'payment.authorized':
    case 'order.paid':
      if (payment) await settle(req, transaction, payment, eventId ?? undefined)
      return 'processed'
    case 'payment.failed': {
      if (transaction.status !== 'captured') {
        await req.payload.update({
          collection: 'transactions',
          id: transaction.id,
          data: {
            failureReason: payment?.error_description ?? 'Payment failed',
            ...(eventId
              ? { processedEventIds: [...(transaction.processedEventIds ?? []), eventId] }
              : {}),
          },
          overrideAccess: true,
          req,
        })
        await recordPaymentFailure(
          req,
          idOf(transaction.order)!,
          payment?.error_description ?? 'declined',
        )
      }
      return 'processed'
    }
    default:
      return 'ignored'
  }
}

/**
 * Step 5, every 15 minutes: unpaid online orders past their 30 minutes are checked with Razorpay
 * once more. Paid ones are settled (a webhook was missed); the rest are cancelled and their stock
 * released.
 */
export async function reconcileOnlinePayments(
  req: PayloadRequest,
  { now = new Date(), fetchImpl }: { now?: Date; fetchImpl?: Fetch } = {},
): Promise<{ settled: number; cancelled: number }> {
  const { docs: orders } = await req.payload.find({
    collection: 'orders',
    where: {
      and: [
        { status: { equals: 'pending' } },
        { paymentMethod: { equals: 'razorpay' } },
        { expiresAt: { less_than: now.toISOString() } },
      ],
    },
    limit: 200,
    depth: 0,
    pagination: false,
    overrideAccess: true,
    req,
  })
  let settled = 0
  let cancelled = 0
  for (const order of orders) {
    const tenantId = idOf(order.tenant)!
    const transaction = await transactionFor(
      req.payload,
      tenantId,
      { order: { equals: order.id } },
      req,
    )
    const ctx = transaction ? await razorpayFor(req.payload, tenantId, fetchImpl) : null
    let paid = false
    if (transaction && ctx) {
      try {
        const payments = await razorpayApi.fetchOrderPayments(ctx, transaction.providerOrderId)
        const captured = payments.find((p) => p.status === 'captured' || p.status === 'authorized')
        if (captured) {
          await settle(req, transaction, captured)
          paid = true
        }
      } catch {
        // Razorpay unreachable: try again on the next run rather than cancel a possibly paid order
        continue
      }
    }
    if (paid) settled += 1
    else {
      await cancelOrder(req, String(order.id), {
        reason: `Payment not completed within the time allowed`,
        byLabel: 'system',
      })
      cancelled += 1
    }
  }
  return { settled, cancelled }
}
