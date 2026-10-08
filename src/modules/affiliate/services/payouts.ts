import type { Payload, PayloadRequest } from 'payload'
import { z } from 'zod'

import { AppError } from '@/lib/errors'
import { formatINR } from '@/lib/money'
import { recordAudit } from '@/modules/audit'
import { nextNumber } from '@/modules/tax-invoicing'
import type { Affiliate, AffiliatePayout, Referral } from '@/payload-types'

import { PAYOUT_METHODS } from '../constants'
import { financialYear, payoutInFull, tdsFor } from '../rules'
import { ownAffiliate, programConfig } from './access'
import { openPayout } from './private'
import { emailAffiliate } from './program'

// Payout statements (docs/11 "Payout and TDS", docs/screens Affiliates "Record payout"): the
// vendor pays approved commission itself and records it; the statement shows gross, TDS and net.

export type PayoutPreview = {
  referrals: Referral[]
  grossMinor: number
  tdsMinor: number
  tdsPercent: number
  netMinor: number
  yearGrossMinor: number
  financialYear: string
  minPayoutMinor: number
}

export async function payoutPreview(
  payload: Payload,
  tenantId: string,
  affiliate: Affiliate,
  now = new Date(),
  req?: PayloadRequest,
): Promise<PayoutPreview> {
  const fy = financialYear(now)
  const [{ docs: referrals }, { docs: earlier }, config] = await Promise.all([
    payload.find({
      collection: 'referrals',
      where: {
        and: [
          { tenant: { equals: tenantId } },
          { affiliate: { equals: String(affiliate.id) } },
          { status: { equals: 'approved' } },
        ],
      },
      sort: 'approvedAt',
      depth: 0,
      pagination: false,
      overrideAccess: true,
      req,
    }),
    payload.find({
      collection: 'affiliate-payouts',
      where: {
        and: [
          { tenant: { equals: tenantId } },
          { affiliate: { equals: String(affiliate.id) } },
          { financialYear: { equals: fy.long } },
        ],
      },
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { grossMinor: true, tdsMinor: true },
      req,
    }),
    programConfig(payload, tenantId, req),
  ])
  const grossMinor = referrals.reduce((sum, r) => sum + r.commissionMinor, 0)
  const earlierGrossMinor = earlier.reduce((sum, p) => sum + p.grossMinor, 0)
  const tds = tdsFor({
    grossMinor,
    earlierGrossMinor,
    earlierTdsMinor: earlier.reduce((sum, p) => sum + p.tdsMinor, 0),
    hasPan: Boolean(affiliate.panSealed),
  })
  return {
    referrals,
    grossMinor,
    tdsMinor: tds.tdsMinor,
    tdsPercent: tds.percent,
    netMinor: grossMinor - tds.tdsMinor,
    yearGrossMinor: earlierGrossMinor + grossMinor,
    financialYear: fy.long,
    minPayoutMinor: config?.minPayoutMinor ?? 50_000,
  }
}

/** The owner sees where to pay, in full, only while recording a payout (rule 4). */
export const payoutDestination = (affiliate: Affiliate) => {
  const details = openPayout(affiliate.payoutSealed)
  return details ? payoutInFull(details) : null
}

export const recordPayoutSchema = z.object({
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'The date it was paid'),
  method: z.enum(PAYOUT_METHODS.map((m) => m.value) as ['upi', 'neft', 'imps']),
  reference: z.string().trim().min(4, 'The UTR or reference').max(40),
})

/** Records a payout the owner made: the approved commission becomes paid, the statement is sent. */
export async function recordPayout(
  req: PayloadRequest,
  tenantId: string,
  affiliateId: string,
  input: z.infer<typeof recordPayoutSchema>,
): Promise<AffiliatePayout> {
  const data = recordPayoutSchema.parse(input)
  const affiliate = await ownAffiliate(req.payload, tenantId, affiliateId, req)
  const paidOn = new Date(`${data.paidOn}T12:00:00+05:30`)
  if (paidOn.getTime() > Date.now() + 86_400_000) {
    throw new AppError('VALIDATION_FAILED', 'The payment date can’t be in the future', 400, {
      paidOn: 'Not in the future',
    })
  }
  const preview = await payoutPreview(req.payload, tenantId, affiliate, paidOn, req)
  if (!preview.referrals.length || preview.grossMinor <= 0) {
    throw new AppError('BUSINESS_RULE', 'Nothing approved to pay yet', 422)
  }
  if (preview.grossMinor < preview.minPayoutMinor) {
    throw new AppError(
      'BUSINESS_RULE',
      `Below the minimum payout of ${formatINR(preview.minPayoutMinor)}`,
      422,
    )
  }
  const fy = financialYear(paidOn)
  const n = await nextNumber(req, tenantId, `payout:${fy.long}`)
  const payout = await req.payload.create({
    collection: 'affiliate-payouts',
    data: {
      tenant: tenantId,
      number: `PAY/${fy.short}/${String(n).padStart(4, '0')}`,
      affiliate: String(affiliate.id),
      referrals: preview.referrals.map((r) => String(r.id)),
      grossMinor: preview.grossMinor,
      tdsMinor: preview.tdsMinor,
      tdsPercent: preview.tdsPercent,
      netMinor: preview.netMinor,
      financialYear: fy.long,
      status: 'paid',
      paidOn: paidOn.toISOString(),
      method: data.method,
      reference: data.reference,
      recordedBy: String(req.user?.id ?? ''),
    },
    overrideAccess: true,
    req,
  })
  for (const referral of preview.referrals) {
    await req.payload.update({
      collection: 'referrals',
      id: referral.id,
      data: { status: 'paid', payout: String(payout.id) },
      overrideAccess: true,
      req,
    })
  }
  await recordAudit(req, {
    action: 'affiliate_payout',
    tenant: tenantId,
    summary: `${payout.number}: paid ${formatINR(preview.netMinor)} to affiliate ${affiliate.code} (TDS ${formatINR(preview.tdsMinor)})`,
    collectionSlug: 'affiliate-payouts',
    docId: String(payout.id),
    diff: {
      grossMinor: preview.grossMinor,
      tdsMinor: preview.tdsMinor,
      netMinor: preview.netMinor,
      method: data.method,
    },
  })
  const ref = data.reference.slice(-4)
  await emailAffiliate(req, tenantId, affiliate, {
    key: `statement:${payout.id}`,
    subject: `Payout ${payout.number}: ${formatINR(preview.netMinor)}`,
    heading: `Statement ${payout.number}`,
    paragraphs: [
      `We paid your commission on ${paidOn.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })} by ${data.method.toUpperCase()}, reference ending ${ref}.`,
      `Gross commission: ${formatINR(preview.grossMinor, { decimals: 'always' })} on ${preview.referrals.length} order${preview.referrals.length === 1 ? '' : 's'}.`,
      `TDS: ${formatINR(preview.tdsMinor, { decimals: 'always' })}${preview.tdsPercent ? ` (${preview.tdsPercent}%)` : ''}.`,
      `Paid to you: ${formatINR(preview.netMinor, { decimals: 'always' })}.`,
    ],
    button: { label: 'See your statements', path: 'affiliate/dashboard' },
  })
  return payout
}
