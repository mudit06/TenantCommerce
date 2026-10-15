/**
 * pnpm qa:storefront-setup [store-slug]   (QA database only)
 *
 * Part A of docs/qa/storefront-e2e-chrome.md for a store that already has `pnpm seed`,
 * `pnpm seed:<store>` and `pnpm demo:selling <store>`: moves it to the Enterprise plan and
 * switches on affiliates, adds the public coupon HOME200 (₹200 off above ₹1,000), a live
 * "Diwali 2026" scheme (10% off Door hardware, at most ₹1,500, not with coupons), an upcoming
 * "Winter launch" scheme shown before it starts, and a sample installation PDF on the Downloads
 * page linked to HOPH-504, and test contact details where the store has none. Safe to run again:
 * it keeps what is already there.
 */
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import config from '@payload-config'
import { createLocalReq, getPayload, type Where } from 'payload'

// The Coupons and Schemes screens' own actions (not in the module's public API; a QA tool only)
import { saveCoupon } from '@/modules/promotions/services/coupons'
import { changeSchemeStatus } from '@/modules/promotions/services/schemes'
import { changeSubscriptionPlan, setFeature } from '@/modules/tenancy'

const dbName = new URL(process.env.DATABASE_URI ?? 'mongodb://x/').pathname.slice(1)
if (process.env.NODE_ENV === 'production' || !/qa/i.test(dbName)) {
  console.error(
    `qa:storefront-setup changes plans and adds sample offers. It only runs on a QA database (DATABASE_URI is "${dbName}").`,
  )
  process.exit(1)
}
const slug = process.argv.slice(2).find((arg) => !arg.startsWith('-')) ?? 'home-orbit'

const payload = await getPayload({ config })
const req = await createLocalReq({}, payload)
const one = async <T>(promise: Promise<{ docs: T[] }>) => (await promise).docs[0]

const tenant = await one(
  payload.find({
    collection: 'tenants',
    where: { slug: { equals: slug } },
    limit: 1,
    overrideAccess: true,
  }),
)
if (!tenant) {
  console.error(`No store "${slug}"`)
  process.exit(1)
}
const tenantId = String(tenant.id)
const scoped = (extra: Where): Where => ({ and: [{ tenant: { equals: tenantId } }, extra] })

// 1. Enterprise plan, so the affiliate program can be switched on (SF-17)
const sub = await one(
  payload.find({
    collection: 'subscriptions',
    where: { tenant: { equals: tenantId } },
    limit: 1,
    overrideAccess: true,
    depth: 0,
  }),
)
const enterprise = await one(
  payload.find({
    collection: 'plans',
    where: { code: { equals: 'enterprise' } },
    limit: 1,
    overrideAccess: true,
  }),
)
if (sub && enterprise && String(sub.plan) !== String(enterprise.id)) {
  await changeSubscriptionPlan(req, {
    subscriptionId: String(sub.id),
    planId: String(enterprise.id),
  })
  console.log('plan: Enterprise')
} else console.log('plan: already Enterprise')
await setFeature(req, { tenantId, key: 'affiliate', enabled: true, cascade: true })
console.log('feature: affiliate on')

// Test contact details, only where the store has none, so the top line, footer and contact page
// have a phone, WhatsApp, email and address to show (SF-01-002, SF-01-008, SF-16-001)
const settings = await one(
  payload.find({
    collection: 'site-settings',
    where: { tenant: { equals: tenantId } },
    limit: 1,
    overrideAccess: true,
  }),
)
if (settings) {
  const sample = {
    phone: '+91 98765 00000',
    whatsapp: '+91 98765 00000',
    email: `hello@${slug}.example`,
    address: 'Shop 1, Baner Road\nPune 411045, Maharashtra',
  }
  const contact = Object.fromEntries(
    Object.entries(sample).map(([key, value]) => [
      key,
      settings.contact?.[key as keyof typeof sample] || value,
    ]),
  )
  await payload.update({
    collection: 'site-settings',
    id: settings.id,
    data: { contact },
    overrideAccess: true,
    req,
  })
  console.log('contact: phone, WhatsApp, email and address filled where empty')
}

// 2. HOME200
const coupon = await one(
  payload.find({
    collection: 'coupons',
    where: scoped({ codeNormalized: { equals: 'HOME200' } }),
    limit: 1,
    overrideAccess: true,
  }),
)
if (!coupon) {
  await saveCoupon(req, tenantId, {
    code: 'HOME200',
    description: 'QA: ₹200 off above ₹1,000',
    type: 'fixed',
    amountMinor: 20_000,
    minOrderMinor: 1_00_000,
    perCustomerLimit: 20,
    visibility: 'public',
  })
  console.log('coupon: HOME200 added')
} else console.log('coupon: HOME200 already there')

// 3. Schemes: one live on Door hardware, one coming up
const doorHardware = await one(
  payload.find({
    collection: 'categories',
    where: scoped({ slug: { equals: 'door-hardware' } }),
    limit: 1,
    overrideAccess: true,
  }),
)
const day = 86_400_000
const schemes = [
  {
    name: 'Diwali 2026',
    occasion: 'diwali',
    startsAt: new Date(Date.now() - day),
    endsAt: new Date(Date.now() + 20 * day),
    offer: { type: 'percent', percent: 10, maxDiscountMinor: 1_50_000 },
    appliesTo: doorHardware
      ? { mode: 'categories', categories: [doorHardware.id] }
      : { mode: 'all' },
    display: {
      badgeText: 'Diwali offer',
      announcementText: 'Diwali offer: 10% off door hardware',
      showBeforeStart: true,
      showCountdown: true,
    },
  },
  {
    name: 'Winter launch',
    occasion: 'custom',
    startsAt: new Date(Date.now() + 10 * day),
    endsAt: new Date(Date.now() + 30 * day),
    offer: { type: 'percent', percent: 5 },
    appliesTo: { mode: 'all' },
    display: { badgeText: 'Winter launch', showBeforeStart: true, showCountdown: true },
  },
]
for (const s of schemes) {
  let doc = await one(
    payload.find({
      collection: 'schemes',
      where: scoped({ name: { equals: s.name } }),
      limit: 1,
      overrideAccess: true,
    }),
  )
  if (!doc) {
    doc = await payload.create({
      collection: 'schemes',
      data: {
        tenant: tenantId,
        name: s.name,
        occasion: s.occasion as never,
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
        status: 'draft',
        offer: s.offer as never,
        appliesTo: s.appliesTo as never,
        rules: { combinesWithCoupons: false, prepaidOnly: false, priority: 0 },
        display: s.display,
      },
      overrideAccess: true,
      req,
    })
  }
  if (doc.status === 'draft')
    doc = await changeSchemeStatus(req, tenantId, String(doc.id), 'schedule')
  console.log(`scheme: ${s.name} is ${doc.status} (/offers/${doc.slug})`)
}

// 4. A sample installation PDF on the Downloads page, linked to HOPH-504
const title = 'Feather pull handle, installation guide (QA sample)'
let document = await one(
  payload.find({
    collection: 'product-documents',
    where: scoped({ title: { equals: title } }),
    limit: 1,
    overrideAccess: true,
  }),
)
if (!document) {
  let media = await one(
    payload.find({
      collection: 'media',
      where: scoped({ alt: { equals: title } }),
      limit: 1,
      overrideAccess: true,
    }),
  )
  if (!media) {
    const file = path.join(tmpdir(), 'hoph-504-installation-guide.pdf')
    writeFileSync(file, samplePdf('HOPH-504 installation guide (QA sample)'))
    media = await payload.create({
      collection: 'media',
      data: { tenant: tenantId, alt: title },
      filePath: file,
      overrideAccess: true,
      req,
    })
  }
  document = await payload.create({
    collection: 'product-documents',
    data: {
      tenant: tenantId,
      title,
      type: 'installation-manual',
      file: media.id,
      showOnDownloadsPage: true,
    },
    overrideAccess: true,
    req,
  })
}
const product = await one(
  payload.find({
    collection: 'products',
    where: scoped({ slug: { equals: 'feather-stainless-steel-pull-handle-hoph-504' } }),
    limit: 1,
    depth: 0,
    overrideAccess: true,
  }),
)
if (product) {
  const linked = (product.documents ?? []).map(String)
  if (!linked.includes(String(document.id))) {
    await payload.update({
      collection: 'products',
      id: product.id,
      data: { documents: [...linked, document.id] },
      overrideAccess: true,
      req,
    })
  }
  console.log('document: installation PDF on /downloads and on HOPH-504')
} else console.log('document: added to /downloads (HOPH-504 not found to link it)')

process.exit(0)

/** A one-page PDF with a line of text, so the Downloads page has a real file to serve. */
function samplePdf(text: string): Buffer {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${`BT /F1 18 Tf 72 760 Td (${text}) Tj ET`.length} >>\nstream\nBT /F1 18 Tf 72 760 Td (${text}) Tj ET\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let body = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((obj, i) => {
    offsets.push(body.length)
    body += `${i + 1} 0 obj\n${obj}\nendobj\n`
  })
  const xref = body.length
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  body += offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return Buffer.from(body, 'latin1')
}
