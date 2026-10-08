import { decryptSecret, encryptSecret } from '@/connectors'

import { payoutDetailsSchema, type PayoutDetails } from '../rules'

// Payout details and PAN (docs/screens Affiliates rule 4, docs/14): encrypted at rest with the
// connector key, shown masked; only the owner sees them in full, while recording a payout.

export const sealPayout = (details: PayoutDetails) =>
  encryptSecret(Object.fromEntries(Object.entries(details).map(([k, v]) => [k, String(v)])))

export function openPayout(sealed: string | null | undefined): PayoutDetails | null {
  const parsed = payoutDetailsSchema.safeParse(decryptSecret(sealed))
  return parsed.success ? parsed.data : null
}

export const sealPan = (pan: string) => encryptSecret({ pan })
export const openPan = (sealed: string | null | undefined) => decryptSecret(sealed).pan ?? null
