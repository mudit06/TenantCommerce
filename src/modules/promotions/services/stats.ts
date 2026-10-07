import type { Payload, PayloadRequest } from 'payload'

// A scheme's results (docs/screens Schemes rule 3): orders, sales and discount given while it
// was live, from the orders that carry it in `appliedOffers`.

export async function refreshSchemeStats(
  payload: Payload,
  tenantId: string,
  schemeId: string,
  req?: PayloadRequest,
) {
  const { docs } = await payload.find({
    collection: 'orders',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { 'appliedOffers.ref': { equals: schemeId } },
        { status: { not_in: ['pending', 'cancelled'] } },
      ],
    },
    depth: 0,
    pagination: false,
    overrideAccess: true,
    select: { totals: true, appliedOffers: true },
    req,
  })
  const stats = {
    orders: docs.length,
    salesMinor: docs.reduce((sum, o) => sum + (o.totals?.grandTotalMinor ?? 0), 0),
    discountMinor: docs.reduce(
      (sum, o) =>
        sum +
        (o.appliedOffers ?? [])
          .filter((offer) => offer.ref === schemeId)
          .reduce((s, offer) => s + (offer.discountMinor ?? 0), 0),
      0,
    ),
    updatedAt: new Date().toISOString(),
  }
  await payload.update({
    collection: 'schemes',
    id: schemeId,
    data: { stats },
    overrideAccess: true,
    context: { schemeSwitch: true },
    req,
  })
  return stats
}
