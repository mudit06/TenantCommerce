/**
 * pnpm demo:selling <store-slug>   (local and staging only)
 *
 * Makes a store ready to try buying on this machine: sample prices on products that have none
 * (MRP 20% above), HSN 8302 and 18% GST where missing, stock on variants, cash on delivery
 * (₹49 fee, orders ₹299 to ₹50,000), and two delivery zones: the store's own state (₹99, free
 * above ₹999) and the rest of India (₹149, free above ₹1,999). With RAZORPAY_TEST_KEY_ID,
 * RAZORPAY_TEST_KEY_SECRET and RAZORPAY_TEST_WEBHOOK_SECRET set it also connects Razorpay in
 * test mode. Sample prices are not the vendor's: never run this against real data.
 */
import config from '@payload-config'
import { createLocalReq, getPayload } from 'payload'

import { saveConnector } from '@/connectors'
import { withTransaction } from '@/lib/db/transaction'
import { saveCodRules } from '@/modules/content'
import type { Product } from '@/payload-types'

if (process.env.NODE_ENV === 'production') {
  console.error('demo:selling puts sample prices on a store. It never runs in production.')
  process.exit(1)
}
const slug = process.argv.slice(2).find((arg) => !arg.startsWith('-'))
if (!slug) {
  console.error('Usage: pnpm demo:selling <store-slug>   (for example home-orbit)')
  process.exit(1)
}

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
const money = (amountMinor: number) => ({ amountMinor, currency: 'INR' as const })

// Prices from ₹249 to ₹2,499 by model number, so a store gets a spread of sample prices
const samplePrice = (product: Product) => {
  const seed = [...(product.modelNumber ?? product.title)].reduce(
    (sum, c) => sum + c.charCodeAt(0),
    0,
  )
  return (249 + (seed % 23) * 100) * 100
}

const { docs: products } = await payload.find({
  collection: 'products',
  where: { tenant: { equals: tenantId } },
  limit: 1000,
  depth: 0,
  pagination: false,
  overrideAccess: true,
})
let priced = 0
for (const product of products) {
  if (product.price?.amountMinor && product.hsnCode && product.purchaseMode !== 'enquire') continue
  const price = product.price?.amountMinor ?? samplePrice(product)
  await payload.update({
    collection: 'products',
    id: product.id,
    data: {
      price: money(price),
      compareAtPrice: product.compareAtPrice?.amountMinor
        ? product.compareAtPrice
        : money(Math.round((price * 1.2) / 100) * 100),
      hsnCode: product.hsnCode ?? '8302',
      gstRate: product.gstRate ?? '18',
      weightGrams: product.weightGrams ?? 400,
      purchaseMode: 'both',
    },
    overrideAccess: true,
    context: { skipRevalidation: false },
  })
  priced += 1
}

const { docs: variants } = await payload.find({
  collection: 'variants',
  where: { and: [{ tenant: { equals: tenantId } }, { stockQty: { less_than_equal: 0 } }] },
  limit: 5000,
  depth: 0,
  pagination: false,
  overrideAccess: true,
})
for (const variant of variants) {
  await payload.update({
    collection: 'variants',
    id: variant.id,
    data: { stockQty: 10 },
    overrideAccess: true,
  })
}

const { docs: admins } = await payload.find({
  collection: 'users',
  where: { platformRole: { equals: 'super-admin' } },
  limit: 1,
  overrideAccess: true,
})
const admin = admins[0]
if (!admin) throw new Error('No super admin: run `pnpm seed` first')
const managing = {
  ...admin,
  collection: 'users' as const,
  storeSession: {
    tenant: tenantId,
    mode: 'manage' as const,
    reason: 'pnpm demo:selling (local sample data)',
    startedAt: new Date().toISOString(),
    endsAt: new Date(Date.now() + 10 * 60_000).toISOString(),
  },
}
const req = await createLocalReq({ user: managing }, payload)
await withTransaction(req, () =>
  saveCodRules(req, {
    tenantId,
    codEnabled: true,
    codMinOrderMinor: 29_900,
    codMaxOrderMinor: 50_000_00,
    codFeeMinor: 4_900,
  }),
)

const { totalDocs: zones } = await payload.count({
  collection: 'shipping-zones',
  where: { tenant: { equals: tenantId } },
  overrideAccess: true,
})
if (zones === 0) {
  const home = tenant.stateCode ?? '24'
  await payload.create({
    collection: 'shipping-zones',
    data: {
      tenant: tenantId,
      name: 'Home state',
      states: [home],
      rateType: 'flat',
      fee: money(9_900),
      freeAbove: money(99_900),
      codAllowed: true,
      etaMinDays: 2,
      etaMaxDays: 3,
      sortOrder: 0,
    },
    overrideAccess: true,
  })
  const others = [
    '01',
    '02',
    '03',
    '04',
    '05',
    '06',
    '07',
    '08',
    '09',
    '10',
    '11',
    '12',
    '13',
    '14',
    '15',
    '16',
    '17',
    '18',
    '19',
    '20',
    '21',
    '22',
    '23',
    '24',
    '26',
    '27',
    '29',
    '30',
    '31',
    '32',
    '33',
    '34',
    '35',
    '36',
    '37',
    '38',
  ].filter((code) => code !== home)
  await payload.create({
    collection: 'shipping-zones',
    data: {
      tenant: tenantId,
      name: 'Rest of India',
      states: others as never,
      rateType: 'flat',
      fee: money(14_900),
      freeAbove: money(1_99_900),
      codAllowed: true,
      etaMinDays: 3,
      etaMaxDays: 6,
      sortOrder: 1,
    },
    overrideAccess: true,
  })
}

const keyId = process.env.RAZORPAY_TEST_KEY_ID
const keySecret = process.env.RAZORPAY_TEST_KEY_SECRET
if (keyId && keySecret) {
  await withTransaction(req, () =>
    saveConnector(req, 'razorpay', {
      tenantId,
      mode: 'test',
      public: { keyId },
      secrets: { keySecret, webhookSecret: process.env.RAZORPAY_TEST_WEBHOOK_SECRET ?? keySecret },
    }),
  )
}

console.log(
  `${slug}: ${priced} products priced, ${variants.length} variants stocked, COD on (₹49 fee)`,
)
console.log(
  zones === 0
    ? '  delivery zones: home state ₹99, rest of India ₹149'
    : `  kept its ${zones} delivery zones`,
)
console.log(
  keyId && keySecret
    ? '  Razorpay connected in test mode'
    : '  Razorpay not connected (set RAZORPAY_TEST_KEY_ID and RAZORPAY_TEST_KEY_SECRET to add it)',
)
process.exit(0)
