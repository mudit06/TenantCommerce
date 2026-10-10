/**
 * pnpm demo:orders <store-slug> [count]   (local and staging only)
 *
 * Places sample cash-on-delivery orders in a store that sells (run `pnpm demo:selling` first),
 * spread over the last 14 days, and moves them along like a real fortnight: the oldest
 * delivered (cash collected, so they count as sales), then shipped, packed, and the newest still
 * to pack. Fills the dashboards, Orders, Reports and the platform's GMV for trying the screens.
 * Every order goes through the real checkout and parcel services; only the dates are moved back.
 */
import config from '@payload-config'
import { createLocalReq, getPayload } from 'payload'

import { withTransaction } from '@/lib/db/transaction'
import { moveParcel, packParcel, placeOrder, placeOrderSchema } from '@/modules/orders'
import type { User } from '@/payload-types'

if (process.env.NODE_ENV === 'production') {
  console.error('demo:orders places sample orders. It never runs in production.')
  process.exit(1)
}
const [slug, countArg] = process.argv
  .slice(2)
  .map(String)
  .filter((arg) => !arg.startsWith('-'))
if (!slug) {
  console.error('Usage: pnpm demo:orders <store-slug> [count]   (for example home-orbit 24)')
  process.exit(1)
}
const count = Math.min(Math.max(Number(countArg) || 24, 1), 200)

const payload = await getPayload({ config })
const { docs: tenants } = await payload.find({
  collection: 'tenants',
  where: { slug: { equals: slug } },
  limit: 1,
  overrideAccess: true,
})
const tenant = tenants[0]
if (!tenant) {
  console.error(`No store "${slug}"`)
  process.exit(1)
}
const tenantId = String(tenant.id)

// Parcels are moved as our team managing the store (the same check as the CMS buttons)
const { docs: admins } = await payload.find({
  collection: 'users',
  where: { platformRole: { equals: 'super-admin' } },
  limit: 1,
  overrideAccess: true,
})
if (!admins[0]) {
  console.error('No super admin to act as. Run pnpm seed first.')
  process.exit(1)
}
const staff = {
  ...admins[0],
  collection: 'users',
  storeSession: {
    tenant: tenantId,
    mode: 'manage',
    reason: 'pnpm demo:orders',
    startedAt: new Date().toISOString(),
    endsAt: new Date(Date.now() + 3_600_000).toISOString(),
  },
} as User & { collection: 'users' }

const { docs: products } = await payload.find({
  collection: 'products',
  where: {
    and: [
      { tenant: { equals: tenantId } },
      { status: { equals: 'active' } },
      { 'price.amountMinor': { greater_than: 0 } },
    ],
  },
  limit: 40,
  depth: 0,
  overrideAccess: true,
  select: { title: true },
})
if (products.length === 0) {
  console.error(`"${slug}" has no priced products. Run pnpm demo:selling ${slug} first.`)
  process.exit(1)
}

const SHOPPERS = [
  ['Rahul Kulkarni', 'Pune', '27', '411045'],
  ['Sneha Reddy', 'Hyderabad', '36', '500081'],
  ['Vikram Singh', 'Jaipur', '08', '302001'],
  ['Ananya Iyer', 'Chennai', '33', '600020'],
  ['Imran Sheikh', 'Mumbai', '27', '400053'],
  ['Kavya Rao', 'Bengaluru', '29', '560038'],
  ['Arjun Mehta', 'Ahmedabad', '24', '380054'],
  ['Priya Nair', 'Kochi', '32', '682016'],
] as const

const DAY = 86_400_000
let placed = 0
for (let i = 0; i < count; i += 1) {
  const [name, city, stateCode, pincode] = SHOPPERS[i % SHOPPERS.length]!
  const product = products[(i * 7) % products.length]!
  const daysAgo = Math.floor(((count - 1 - i) / Math.max(count - 1, 1)) * 13)
  const input = placeOrderSchema.parse({
    contact: {
      name,
      email: `${name.split(' ')[0]!.toLowerCase()}.${i}@example.com`,
      phone: `+91 98${String(76543210 + i * 1111).slice(0, 8)}`,
    },
    shippingAddress: {
      name,
      phone: `98${String(76543210 + i * 1111).slice(0, 8)}`,
      line1: `House ${10 + i}, Main Road`,
      city,
      stateCode,
      pincode,
    },
    billingSameAsShipping: true,
    paymentMethod: 'cod',
    whatsappOptIn: i % 2 === 0,
  })
  const shopperReq = await createLocalReq({}, payload)
  let orderId: string
  try {
    const { order } = await withTransaction(shopperReq, () =>
      placeOrder(shopperReq, tenantId, {
        lines: [{ productId: String(product.id), qty: 1 + (i % 3) }],
        input,
      }),
    )
    orderId = String(order.id)
  } catch (error) {
    console.warn(`  skipped an order: ${(error as Error).message}`)
    continue
  }

  // Older orders are further along, as they would be after a fortnight of trading
  const act = async <T>(work: (req: Awaited<ReturnType<typeof createLocalReq>>) => Promise<T>) => {
    const req = await createLocalReq({ user: staff }, payload)
    return withTransaction(req, () => work(req))
  }
  if (daysAgo >= 2) {
    const parcel = await act((req) => packParcel(req, orderId))
    if (daysAgo >= 4) {
      await act((req) =>
        moveParcel(req, String(parcel.id), {
          to: 'shipped',
          carrier: 'Delhivery',
          trackingNumber: `1490221${String(10000 + i)}`,
        }),
      )
      if (daysAgo >= 6) {
        await act((req) => moveParcel(req, String(parcel.id), { to: 'out_for_delivery' }))
        await act((req) => moveParcel(req, String(parcel.id), { to: 'delivered' }))
      }
    }
  }

  // Move the dates back (placed that day; cash collected the day after for delivered ones)
  const placedAt = new Date(Date.now() - daysAgo * DAY - (i % 5) * 3_600_000)
  const fresh = await payload.findByID({ collection: 'orders', id: orderId, overrideAccess: true })
  await payload.update({
    collection: 'orders',
    id: orderId,
    data: {
      placedAt: placedAt.toISOString(),
      ...(fresh.paidAt
        ? { paidAt: new Date(Math.min(Date.now(), placedAt.getTime() + DAY)).toISOString() }
        : {}),
    },
    overrideAccess: true,
    context: { skipNotifications: true },
  })
  placed += 1
}

console.log(`${slug}: ${placed} sample COD orders over the last 14 days`)
process.exit(0)
