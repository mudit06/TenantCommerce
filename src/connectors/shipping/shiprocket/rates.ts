import type { Payload } from 'payload'

import { loadConnector } from '../../core/service'
import { checkServiceability } from './index'

// Live delivery rates for the pincode check and checkout (mudit, 6 October 2026: shoppers pay
// Shiprocket's live rate). Answers are cached for a day per store, pincode, COD and half-kilo
// band (docs/09 table "Pincode check"), and a slow or failing Shiprocket falls back to the
// vendor's rate card (the caller treats null as "no answer").

type LiveAnswer = {
  serviceable: boolean
  codAvailable: boolean
  feeMinor: number
  etaMinDays: number | null
  etaMaxDays: number | null
  courierName: string | null
}

type LiveInput = {
  pincode: string
  weightGrams: number
  subtotalMinor: number
  cod: boolean
}

const DAY = 86_400_000
const cache = new Map<string, { answer: LiveAnswer; expires: number }>()

/** The store's live-rate source, or null when Shiprocket isn't connected and allowed. */
export async function shiprocketRateSource(
  payload: Payload,
  tenantId: string,
  fetchImpl?: typeof fetch,
): Promise<((input: LiveInput) => Promise<LiveAnswer | null>) | null> {
  const ctx = await loadConnector(payload, tenantId, 'shiprocket').catch(() => null)
  if (!ctx?.secret.apiEmail || !ctx.public.pickupPincode) return null
  return async ({ pincode, weightGrams, subtotalMinor, cod }) => {
    const band = Math.max(1, Math.ceil(weightGrams / 500))
    const key = `${tenantId}:${pincode}:${cod ? 1 : 0}:${band}`
    const hit = cache.get(key)
    if (hit && hit.expires > Date.now()) return hit.answer
    try {
      const result = await checkServiceability(
        { ...ctx, fetchImpl },
        {
          toPincode: pincode,
          weightGrams: band * 500,
          cod,
          declaredValueMinor: subtotalMinor,
        },
      )
      const answer: LiveAnswer = {
        serviceable: result.serviceable,
        codAvailable: result.codAvailable,
        feeMinor: result.best?.rateMinor ?? 0,
        etaMinDays: result.best?.etaDays ?? null,
        etaMaxDays: result.best?.etaDays ?? null,
        courierName: result.best?.name ?? null,
      }
      cache.set(key, { answer, expires: Date.now() + DAY })
      if (cache.size > 5000) for (const [k, v] of cache) if (v.expires < Date.now()) cache.delete(k)
      return answer
    } catch {
      return null
    }
  }
}
