import { basicAuth, providerFetch } from '../../core/http'
import type { ConnectorContext, ConnectorImplementation, TestResult } from '../../core/types'

// Razorpay Standard Checkout on the vendor's own account (docs/09 "Razorpay"). Amounts go to
// Razorpay in paise, as we store them.

export const RAZORPAY_API = 'https://api.razorpay.com/v1'

type RazorpayError = { error?: { description?: string } }

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
  const response = await providerFetch<RazorpayError>(`${RAZORPAY_API}/orders?count=1`, {
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

export const razorpay: ConnectorImplementation = { testCredentials }
