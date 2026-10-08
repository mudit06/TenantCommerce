import { z } from 'zod'

import { TDS_PERCENT_WITH_PAN, TDS_PERCENT_WITHOUT_PAN, TDS_THRESHOLD_MINOR } from './constants'

// Pure affiliate rules (no database, no environment): the financial year, TDS on a payout, and
// how PAN and payout details are checked and masked (docs/11 "Payout and TDS", docs/14).

/** The Indian financial year (April to March, India time): { long: '2026-27', short: '26-27' } */
export function financialYear(at: Date) {
  const ist = new Date(at.getTime() + 330 * 60_000)
  const y = ist.getUTCMonth() >= 3 ? ist.getUTCFullYear() : ist.getUTCFullYear() - 1
  const next = String((y + 1) % 100).padStart(2, '0')
  return { long: `${y}-${next}`, short: `${String(y % 100).padStart(2, '0')}-${next}` }
}

/**
 * TDS on this payout: once the year's commission passes ₹20,000, 2% (20% without a PAN) on the
 * whole year's amount, less what was already deducted this year.
 */
export function tdsFor(input: {
  grossMinor: number
  earlierGrossMinor: number
  earlierTdsMinor: number
  hasPan: boolean
}) {
  const year = input.earlierGrossMinor + input.grossMinor
  if (year <= TDS_THRESHOLD_MINOR) return { tdsMinor: 0, percent: 0 }
  const percent = input.hasPan ? TDS_PERCENT_WITH_PAN : TDS_PERCENT_WITHOUT_PAN
  const due = Math.round((year * percent) / 100) - input.earlierTdsMinor
  return { tdsMinor: Math.max(0, Math.min(input.grossMinor, due)), percent }
}

export const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/

export const panSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(PAN_PATTERN, 'A PAN looks like ABCDE1234F')

export const payoutDetailsSchema = z.discriminatedUnion('method', [
  z.object({
    method: z.literal('upi'),
    upiId: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9._-]{2,64}@[a-z]{2,32}$/, 'A UPI ID looks like name@okaxis'),
  }),
  z.object({
    method: z.literal('bank'),
    accountName: z.string().trim().min(2, 'Name on the account').max(80),
    accountNumber: z
      .string()
      .trim()
      .regex(/^\d{9,18}$/, 'Account number: 9 to 18 digits'),
    ifsc: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'IFSC looks like HDFC0001234'),
  }),
])
export type PayoutDetails = z.infer<typeof payoutDetailsSchema>

export const maskPan = (pan: string) => `${pan.slice(0, 5)}••••${pan.slice(-1)}`

export function maskPayout(details: PayoutDetails): string {
  if (details.method === 'upi') {
    const [name = '', bank = ''] = details.upiId.split('@')
    return `UPI ${name.slice(0, 2)}••••@${bank}`
  }
  return `Bank ••••${details.accountNumber.slice(-4)} · ${details.ifsc.slice(0, 4)}`
}

/** The payout details in words, for the owner while paying */
export const payoutInFull = (details: PayoutDetails) =>
  details.method === 'upi'
    ? `UPI ${details.upiId}`
    : `${details.accountName} · A/c ${details.accountNumber} · IFSC ${details.ifsc}`
