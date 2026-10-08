import type { Payload, PayloadRequest, Where } from 'payload'

import { atomicIncrement } from '@/lib/db/atomic'
import type { Affiliate, Referral } from '@/payload-types'

// Clicks and the money per affiliate (docs/screens Affiliates table, Affiliate dashboard figures):
// worked out from the ledger when read, so they can't drift from it.

const DAY = 86_400_000

const istDate = (at: Date) => new Date(at.getTime() + 330 * 60_000).toISOString().slice(0, 10)

/** One click on /r/CODE: a daily counter, outside any transaction */
export const recordClick = (req: PayloadRequest, tenantId: string, affiliateId: string) =>
  atomicIncrement(req, {
    collection: 'affiliate-clicks',
    filter: { tenant: tenantId, affiliate: affiliateId, date: istDate(new Date()) },
    field: 'clicks',
    upsert: true,
    outsideTransaction: true,
  })

export type AffiliateFigures = {
  clicks30: number
  orders30: number
  pendingMinor: number
  approvedMinor: number
  paidMinor: number
}

const empty = (): AffiliateFigures => ({
  clicks30: 0,
  orders30: 0,
  pendingMinor: 0,
  approvedMinor: 0,
  paidMinor: 0,
})

/** Figures per affiliate id, for one affiliate or the whole store */
export async function affiliateFigures(
  payload: Payload,
  tenantId: string,
  affiliateId?: string,
  now = new Date(),
): Promise<Map<string, AffiliateFigures>> {
  const scope: Where[] = [
    { tenant: { equals: tenantId } },
    ...(affiliateId ? [{ affiliate: { equals: affiliateId } }] : []),
  ]
  const since = new Date(now.getTime() - 30 * DAY)
  const [{ docs: referrals }, { docs: clicks }] = await Promise.all([
    payload.find({
      collection: 'referrals',
      where: { and: scope },
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: {
        affiliate: true,
        status: true,
        commissionMinor: true,
        orderPlacedAt: true,
        createdAt: true,
      },
    }),
    payload.find({
      collection: 'affiliate-clicks',
      where: { and: [...scope, { date: { greater_than_equal: istDate(since) } }] },
      depth: 0,
      pagination: false,
      overrideAccess: true,
      select: { affiliate: true, clicks: true },
    }),
  ])
  const out = new Map<string, AffiliateFigures>()
  const of = (id: string) => {
    if (!out.has(id)) out.set(id, empty())
    return out.get(id)!
  }
  for (const r of referrals as Pick<
    Referral,
    'affiliate' | 'status' | 'commissionMinor' | 'orderPlacedAt' | 'createdAt'
  >[]) {
    const f = of(r.affiliate)
    if (r.status === 'pending') f.pendingMinor += r.commissionMinor
    if (r.status === 'approved') f.approvedMinor += r.commissionMinor
    if (r.status === 'paid') f.paidMinor += r.commissionMinor
    if (
      r.status !== 'reversed' &&
      new Date(r.orderPlacedAt ?? r.createdAt).getTime() >= since.getTime()
    ) {
      f.orders30 += 1
    }
  }
  for (const c of clicks) of(c.affiliate).clicks30 += c.clicks ?? 0
  return out
}

/** The rate in words: "5%, Showers 8%" */
export const rateText = (
  affiliate: Pick<Affiliate, 'commissionPercent' | 'categoryRates'>,
  fallback: number,
) =>
  [
    `${affiliate.commissionPercent ?? fallback}%`,
    ...(affiliate.categoryRates ?? []).map((r) => `${r.categoryName ?? 'Category'} ${r.percent}%`),
  ].join(', ')
