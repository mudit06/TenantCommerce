import { providerFetch } from '../../core/http'
import type { ConnectorContext, ConnectorImplementation, TestResult } from '../../core/types'

// Shiprocket on the vendor's own account (docs/09 "Shiprocket"). Shiprocket takes kg, cm and
// rupees: convert from our grams, mm and paise in this folder only.

export const SHIPROCKET_API = 'https://apiv2.shiprocket.in/v1/external'

type LoginResponse = { token?: string; message?: string }
type PickupResponse = { data?: { shipping_address?: { pickup_location?: string }[] } }

export async function login(ctx: ConnectorContext): Promise<string | null> {
  const response = await providerFetch<LoginResponse>(`${SHIPROCKET_API}/auth/login`, {
    provider: 'Shiprocket',
    method: 'POST',
    body: { email: ctx.secret.apiEmail, password: ctx.secret.apiPassword },
    fetchImpl: ctx.fetchImpl,
  })
  return response.ok && response.json?.token ? response.json.token : null
}

async function testCredentials(ctx: ConnectorContext): Promise<TestResult> {
  const token = await login(ctx)
  if (!token) {
    return {
      ok: false,
      message:
        'Shiprocket refused the API user email and password. Check them under Settings, API in Shiprocket.',
    }
  }
  const pickups = await providerFetch<PickupResponse>(`${SHIPROCKET_API}/settings/company/pickup`, {
    provider: 'Shiprocket',
    headers: { Authorization: `Bearer ${token}` },
    fetchImpl: ctx.fetchImpl,
  })
  const names = (pickups.json?.data?.shipping_address ?? [])
    .map((row) => row.pickup_location)
    .filter((name): name is string => Boolean(name))
  const wanted = ctx.public.pickupLocation ?? ''
  if (pickups.ok && names.length && !names.includes(wanted)) {
    return {
      ok: false,
      message: `Signed in, but Shiprocket has no pickup location named “${wanted}”. Yours: ${names.join(', ')}.`,
    }
  }
  return { ok: true, message: 'Shiprocket accepted the API user and found the pickup location.' }
}

export const shiprocket: ConnectorImplementation = { testCredentials }
