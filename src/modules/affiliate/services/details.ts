import type { PayloadRequest } from 'payload'
import { z } from 'zod'

import { AppError } from '@/lib/errors'
import type { Affiliate } from '@/payload-types'

import { maskPan, maskPayout, panSchema, payoutDetailsSchema } from '../rules'
import { sealPan, sealPayout } from './private'
import { emailAffiliate } from './program'

export const detailsSchema = z.object({
  payout: payoutDetailsSchema,
  pan: z.union([z.literal(''), panSchema]).optional(),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^(\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z])?$/, 'A GSTIN has 15 characters')
    .optional(),
})

/**
 * The affiliate's own payout details and PAN (Affiliate dashboard rule 4): encrypted, shown
 * masked; a change is emailed to them so a stolen session can't quietly redirect payouts.
 */
export async function savePayoutDetails(
  req: PayloadRequest,
  tenantId: string,
  affiliate: Affiliate,
  input: z.input<typeof detailsSchema>,
) {
  const data = detailsSchema.parse(input)
  if (affiliate.status === 'rejected') throw new AppError('FORBIDDEN', 'Not an affiliate', 403)
  const updated = await req.payload.update({
    collection: 'affiliates',
    id: affiliate.id,
    data: {
      payoutSealed: sealPayout(data.payout),
      payoutMasked: maskPayout(data.payout),
      ...(data.pan ? { panSealed: sealPan(data.pan), panMasked: maskPan(data.pan) } : {}),
      ...(data.gstin !== undefined ? { gstin: data.gstin || null } : {}),
    },
    overrideAccess: true,
    req,
  })
  await emailAffiliate(req, tenantId, updated, {
    key: `details:${Date.now()}`,
    subject: 'Your payout details changed',
    heading: 'Payout details changed',
    paragraphs: [
      `Your commission will now be paid to ${updated.payoutMasked}.`,
      'If you didn’t make this change, reply to this email straight away.',
    ],
  })
  return updated
}
