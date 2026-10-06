import { createHmac, timingSafeEqual } from 'node:crypto'

import { basicAuth, providerFetch } from '../../core/http'
import type { ConnectorContext, ConnectorImplementation, TestResult } from '../../core/types'

// Razorpay Standard Checkout on the vendor's own account (docs/09 "Razorpay"). Amounts go to
// Razorpay in paise, as we store them. Signatures are compared in constant time.

export const RAZORPAY_API = 'https://api.razorpay.com/v1'

type RazorpayErrorBody = { error?: { description?: string; code?: string } }

export const authHeader = (ctx: ConnectorContext) =>
  basicAuth(ctx.public.keyId ?? '', ctx.secret.keySecret ?? '')

async function testCredentials(ctx: ConnectorContext): Promise<TestResult> {
  const keyId = ctx.public.keyId ?? ''
  const keyMode = keyId.startsWith('rzp_test_') ? 'test' : 'live'
  if (keyMode !== ctx.mode) {
    return {
      ok: false,
      message: `This is a ${keyMode} key ID but the store is set to ${ctx.mode} mode. Switch the mode or paste the ${ctx.mode} keys.`,
    }
  }
  // The cheapest authenticated call: list at most one order
  const response = await providerFetch<RazorpayErrorBody>(`${RAZORPAY_API}/orders?count=1`, {
    provider: 'Razorpay',
    headers: { Authorization: authHeader(ctx) },
    fetchImpl: ctx.fetchImpl,
  })
  if (response.ok) {
    return {
      ok: true,
      message: `Razorpay accepted the ${ctx.mode} keys.`,
    }
  }
  if (response.status === 401) {
    return { ok: false, message: 'Razorpay refused the key ID and key secret. Copy both again.' }
  }
  return {
    ok: false,
    message: `Razorpay answered with an error (${response.status}): ${response.json?.error?.description ?? 'no details'}`,
  }
}

export class RazorpayError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'RazorpayError'
  }
}

const fail = (response: { status: number; json: RazorpayErrorBody | null }, what: string) =>
  new RazorpayError(
    `Razorpay could not ${what}: ${response.json?.error?.description ?? `error ${response.status}`}`,
    response.status,
  )

export type RazorpayOrder = {
  id: string
  amount: number
  currency: string
  status: string
  receipt?: string
}

/** Step 1 of Standard Checkout: a Razorpay order for our order's grand total. */
export async function createOrder(
  ctx: ConnectorContext,
  input: { amountMinor: number; receipt: string; notes: Record<string, string> },
): Promise<RazorpayOrder> {
  const response = await providerFetch<RazorpayOrder & RazorpayErrorBody>(
    `${RAZORPAY_API}/orders`,
    {
      provider: 'Razorpay',
      method: 'POST',
      headers: { Authorization: authHeader(ctx) },
      body: {
        amount: input.amountMinor,
        currency: 'INR',
        receipt: input.receipt.slice(0, 40),
        notes: input.notes,
        payment_capture: 1,
      },
      fetchImpl: ctx.fetchImpl,
    },
  )
  if (!response.ok || !response.json?.id) throw fail(response, 'start the payment')
  return response.json
}

export type RazorpayPayment = {
  id: string
  order_id: string
  amount: number
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed'
  method?: string
  bank?: string | null
  wallet?: string | null
  vpa?: string | null
  card?: { network?: string; type?: string } | null
  error_description?: string | null
  amount_refunded?: number
}

/** The payments made against a Razorpay order (reconciliation, docs/09 step 5). */
export async function fetchOrderPayments(
  ctx: ConnectorContext,
  razorpayOrderId: string,
): Promise<RazorpayPayment[]> {
  const response = await providerFetch<{ items?: RazorpayPayment[] } & RazorpayErrorBody>(
    `${RAZORPAY_API}/orders/${encodeURIComponent(razorpayOrderId)}/payments`,
    { provider: 'Razorpay', headers: { Authorization: authHeader(ctx) }, fetchImpl: ctx.fetchImpl },
  )
  if (!response.ok) throw fail(response, 'read the payments')
  return response.json?.items ?? []
}

export async function fetchPayment(
  ctx: ConnectorContext,
  paymentId: string,
): Promise<RazorpayPayment> {
  const response = await providerFetch<RazorpayPayment & RazorpayErrorBody>(
    `${RAZORPAY_API}/payments/${encodeURIComponent(paymentId)}`,
    { provider: 'Razorpay', headers: { Authorization: authHeader(ctx) }, fetchImpl: ctx.fetchImpl },
  )
  if (!response.ok || !response.json?.id) throw fail(response, 'read the payment')
  return response.json
}

export type RazorpayRefund = {
  id: string
  amount: number
  status: 'pending' | 'processed' | 'failed'
}

export async function refundPayment(
  ctx: ConnectorContext,
  paymentId: string,
  input: { amountMinor: number; notes: Record<string, string> },
): Promise<RazorpayRefund> {
  const response = await providerFetch<RazorpayRefund & RazorpayErrorBody>(
    `${RAZORPAY_API}/payments/${encodeURIComponent(paymentId)}/refund`,
    {
      provider: 'Razorpay',
      method: 'POST',
      headers: { Authorization: authHeader(ctx) },
      body: { amount: input.amountMinor, notes: input.notes, speed: 'normal' },
      fetchImpl: ctx.fetchImpl,
    },
  )
  if (!response.ok || !response.json?.id) throw fail(response, 'refund the payment')
  return response.json
}

const hmac = (secret: string, payload: string | Buffer) =>
  createHmac('sha256', secret).update(payload).digest('hex')

function sameHex(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8')
  const right = Buffer.from(b, 'utf8')
  return left.length === right.length && timingSafeEqual(left, right)
}

/** Step 3: the signature Checkout returns is HMAC-SHA256(order_id|payment_id, key secret). */
export function verifyPaymentSignature(
  keySecret: string,
  input: { razorpayOrderId: string; razorpayPaymentId: string; signature: string },
): boolean {
  if (!keySecret || !input.signature) return false
  return sameHex(
    hmac(keySecret, `${input.razorpayOrderId}|${input.razorpayPaymentId}`),
    input.signature,
  )
}

/** Step 4: webhooks carry HMAC-SHA256(raw body, webhook secret) in X-Razorpay-Signature. */
export function verifyWebhookSignature(
  webhookSecret: string,
  rawBody: string,
  signature: string | null,
): boolean {
  if (!webhookSecret || !signature) return false
  return sameHex(hmac(webhookSecret, rawBody), signature)
}

/** "UPI", "Card · Visa", "Netbanking · HDFC" for the order timeline and the Payment card. */
export function describeMethod(
  payment: Pick<RazorpayPayment, 'method' | 'bank' | 'wallet' | 'card'>,
): string {
  switch (payment.method) {
    case 'upi':
      return 'UPI'
    case 'card':
      return ['Card', payment.card?.network].filter(Boolean).join(' · ')
    case 'netbanking':
      return ['Netbanking', payment.bank].filter(Boolean).join(' · ')
    case 'wallet':
      return ['Wallet', payment.wallet].filter(Boolean).join(' · ')
    case 'emi':
      return 'EMI'
    default:
      return payment.method ? payment.method.toUpperCase() : 'Online'
  }
}

export const razorpay: ConnectorImplementation = { testCredentials }
