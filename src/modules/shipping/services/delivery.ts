import type { Payload } from 'payload'

import type { ShippingZone } from '@/payload-types'

import { quoteFromRateCard, type DeliveryQuote } from './rateCard'

// What delivery costs a shopper and whether COD is possible (docs/09 "Shiprocket", mudit 6
// October 2026: live Shiprocket rates). With Shiprocket connected its live rate and COD answer
// are used; otherwise, or when it can't answer, the vendor's rate card. The vendor's zones stay
// its policy either way: a pincode it blocks or a zone without COD wins over Shiprocket.

export type DeliveryInput = {
  pincode: string
  stateCode: string | null
  /** Items after discounts, GST included */
  subtotalMinor: number
  weightGrams: number
}

export type StoreDeliveryQuote = DeliveryQuote & {
  source: 'shiprocket' | 'rate-card'
  courierName: string | null
}

/** A live rate source plugged in by the Shiprocket connector (M5); null when not connected. */
export type LiveRateSource = (input: DeliveryInput & { cod: boolean }) => Promise<{
  serviceable: boolean
  codAvailable: boolean
  feeMinor: number
  etaMinDays: number | null
  etaMaxDays: number | null
  courierName: string | null
} | null>

export async function storeZones(payload: Payload, tenantId: string): Promise<ShippingZone[]> {
  const { docs } = await payload.find({
    collection: 'shipping-zones',
    where: { tenant: { equals: tenantId } },
    sort: 'sortOrder',
    depth: 0,
    limit: 200,
    pagination: false,
    overrideAccess: true,
  })
  return docs
}

export async function deliveryQuote(
  payload: Payload,
  tenantId: string,
  input: DeliveryInput,
  { live, cod = false }: { live?: LiveRateSource | null; cod?: boolean } = {},
): Promise<StoreDeliveryQuote> {
  const zones = await storeZones(payload, tenantId)
  const card = quoteFromRateCard(zones, input)
  if (!card.serviceable || !live) return { ...card, source: 'rate-card', courierName: null }
  const answer = await live({ ...input, cod }).catch(() => null)
  if (!answer) return { ...card, source: 'rate-card', courierName: null }
  // Above the zone's free-delivery amount the shopper still pays nothing
  const free = card.feeMinor === 0 && zones.length > 0
  return {
    serviceable: answer.serviceable,
    codAllowed: card.codAllowed && answer.codAvailable,
    feeMinor: free ? 0 : answer.feeMinor,
    zoneName: card.zoneName,
    etaMinDays: answer.etaMinDays ?? card.etaMinDays,
    etaMaxDays: answer.etaMaxDays ?? card.etaMaxDays,
    source: 'shiprocket',
    courierName: answer.courierName,
  }
}
