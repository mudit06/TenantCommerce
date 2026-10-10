import type { MongooseAdapter } from '@payloadcms/db-mongodb'
import type { Payload } from 'payload'

import { monthRange } from './report'

// Sales across every store for the platform dashboard (docs/screens/super-admin.md
// `sa-dashboard`). Same definition as Reports: orders paid online or cash collected, by the day
// the money came in, GST included. Worked out with MongoDB aggregations grouped by store, so the
// page reads totals rather than every order; a nightly daily-stats rollup is the next step when
// stores reach the hundreds (wireframe note 1). Platform staff only: callers check the viewer.

const SOLD = ['paid', 'partially_refunded', 'refunded']
const IST = 330 * 60_000
const DAY = 86_400_000

type StoreTotals = { tenantId: string; orders: number; salesMinor: number }

export type PlatformSales = {
  month: ReturnType<typeof monthRange>
  ordersToday: number
  gmvMinor: number
  daily: { day: number; salesMinor: number }[]
  /** This month's stores by sales, with last month's sales over the same days for "vs" */
  topStores: (StoreTotals & { previousMinor: number })[]
}

function ordersModel(payload: Payload) {
  const model = (payload.db as unknown as MongooseAdapter).collections.orders
  if (!model) throw new Error('No database model for "orders"')
  return model
}

async function totalsByStore(payload: Payload, from: Date, to: Date): Promise<StoreTotals[]> {
  const rows = await ordersModel(payload)
    .aggregate<{ _id: unknown; orders: number; salesMinor: number }>([
      { $match: { paymentStatus: { $in: SOLD }, paidAt: { $gte: from, $lt: to } } },
      {
        $group: {
          _id: '$tenant',
          orders: { $sum: 1 },
          salesMinor: { $sum: { $ifNull: ['$totals.grandTotalMinor', 0] } },
        },
      },
    ])
    .exec()
  return rows.map((row) => ({
    tenantId: String(row._id),
    orders: row.orders,
    salesMinor: row.salesMinor,
  }))
}

/** Orders placed since `from` in each store (unpaid Razorpay orders aren't orders yet). */
export async function ordersPlacedByStore(
  payload: Payload,
  from: Date,
): Promise<Map<string, number>> {
  const rows = await ordersModel(payload)
    .aggregate<{ _id: unknown; orders: number }>([
      { $match: { placedAt: { $gte: from }, status: { $ne: 'pending' } } },
      { $group: { _id: '$tenant', orders: { $sum: 1 } } },
    ])
    .exec()
  return new Map(rows.map((row) => [String(row._id), row.orders]))
}

/**
 * Orders a store took this month (India time), for the plan's "orders this month" meter and
 * limit warning. Counted from the orders themselves; nothing keeps a running counter.
 */
export async function ordersThisMonth(
  payload: Payload,
  tenantId: string,
  now = new Date(),
): Promise<number> {
  const { totalDocs } = await payload.count({
    collection: 'orders',
    where: {
      and: [
        { tenant: { equals: tenantId } },
        { placedAt: { greater_than_equal: monthRange(null, now).from.toISOString() } },
        { status: { not_equals: 'pending' } },
      ],
    },
    overrideAccess: true,
  })
  return totalDocs
}

export async function platformSales(payload: Payload, now = new Date()): Promise<PlatformSales> {
  const month = monthRange(null, now)
  const elapsed = now.getTime() - month.from.getTime()
  // Today in India time
  const local = new Date(now.getTime() + IST)
  const todayFrom = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - IST,
  )

  const [current, previous, ordersToday, days] = await Promise.all([
    totalsByStore(payload, month.from, month.to),
    // Last month up to the same point, so a store isn't "down" just because the month is young
    totalsByStore(payload, month.prevFrom, new Date(month.prevFrom.getTime() + elapsed)),
    // Orders placed today, whatever their payment (an unpaid Razorpay order isn't one yet)
    ordersModel(payload)
      .countDocuments({ placedAt: { $gte: todayFrom, $lte: now }, status: { $ne: 'pending' } })
      .exec(),
    ordersModel(payload)
      .aggregate<{ _id: number; salesMinor: number }>([
        { $match: { paymentStatus: { $in: SOLD }, paidAt: { $gte: month.from, $lt: month.to } } },
        {
          $group: {
            _id: {
              $floor: { $divide: [{ $subtract: ['$paidAt', month.from] }, DAY] },
            },
            salesMinor: { $sum: { $ifNull: ['$totals.grandTotalMinor', 0] } },
          },
        },
      ])
      .exec(),
  ])

  const daily = Array.from({ length: month.days }, (_, i) => ({ day: i + 1, salesMinor: 0 }))
  for (const row of days) {
    const day = daily[row._id]
    if (day) day.salesMinor = row.salesMinor
  }

  const before = new Map(previous.map((row) => [row.tenantId, row.salesMinor]))
  const topStores = current
    .sort((a, b) => b.salesMinor - a.salesMinor)
    .slice(0, 5)
    .map((row) => ({ ...row, previousMinor: before.get(row.tenantId) ?? 0 }))

  return {
    month,
    ordersToday,
    gmvMinor: current.reduce((sum, row) => sum + row.salesMinor, 0),
    daily,
    topStores,
  }
}
