import type { Payload } from 'payload'
import sharp from 'sharp'

import { withTransaction } from '@/lib/db/transaction'
import { createTenant } from '@/modules/tenancy'
import type { Plan } from '@/payload-types'

import { onboardingInput, reqAs, userByEmail, type TestUser } from './helpers'

// A store ready to sell, for checkout and order tests: a tap in two finishes with stock (18%,
// HSN 8481) and a towel without variants (5%, HSN 6302), both active and sold online.

export type Shop = Awaited<ReturnType<typeof buildShop>>

export async function buildShop(
  payload: Payload,
  {
    admin,
    plan,
    slug,
    ownerEmail,
  }: { admin: TestUser; plan: Plan; slug: string; ownerEmail: string },
) {
  const req = await reqAs(payload, admin)
  const { tenant } = await withTransaction(req, () =>
    createTenant(req, onboardingInput(slug, { planId: String(plan.id), ownerEmail })),
  )
  const tenantId = String(tenant.id)
  const owner = await userByEmail(payload, ownerEmail)
  const set = await payload.create({
    collection: 'attribute-sets',
    data: {
      tenant: tenantId,
      name: 'Taps',
      attributes: [
        {
          label: 'Finish',
          type: 'select',
          isVariantAxis: true,
          options: [{ label: 'Chrome' }, { label: 'Black matt' }],
        },
      ],
    },
  })
  const category = await payload.create({
    collection: 'categories',
    data: { tenant: tenantId, name: `Bathroom ${slug}`, attributeSet: set.id },
  })
  const png = await sharp({ create: { width: 32, height: 32, channels: 3, background: '#888' } })
    .png()
    .toBuffer()
  const photo = await payload.create({
    collection: 'media',
    data: { tenant: tenantId, alt: 'Tap' },
    file: { data: png, mimetype: 'image/png', name: `${slug}-tap.png`, size: png.length },
  })
  const legal = {
    genericName: 'Basin mixer',
    netQuantity: '1 piece',
    countryOfOrigin: 'IN',
    madeBy: 'manufacturer' as const,
    madeByName: `${slug} Pvt Ltd`,
    madeByAddress: 'Mumbai',
  }
  const money = (amountMinor: number) => ({ amountMinor, currency: 'INR' as const })
  const tap = await payload.create({
    collection: 'products',
    data: {
      tenant: tenantId,
      title: 'Aria basin mixer',
      modelNumber: 'AV-BM-1120',
      primaryCategory: category.id,
      status: 'active',
      purchaseMode: 'buy',
      attributes: { finish: ['chrome', 'black-matt'] },
      gallery: [photo.id],
      legal,
      price: money(5_19_000),
      compareAtPrice: money(6_00_000),
      gstRate: '18',
      hsnCode: '8481',
      weightGrams: 1200,
    },
  })
  const chrome = await payload.create({
    collection: 'variants',
    data: {
      tenant: tenantId,
      product: tap.id,
      options: { finish: 'chrome' },
      sku: 'AV-BM-1120-CH',
      status: 'active',
      stockQty: 3,
    },
  })
  const black = await payload.create({
    collection: 'variants',
    data: {
      tenant: tenantId,
      product: tap.id,
      options: { finish: 'black-matt' },
      sku: 'AV-BM-1120-MB',
      status: 'active',
      price: money(5_49_000),
      stockQty: 1,
    },
  })
  const linen = await payload.create({
    collection: 'categories',
    data: { tenant: tenantId, name: `Linen ${slug}` },
  })
  const towel = await payload.create({
    collection: 'products',
    data: {
      tenant: tenantId,
      title: 'Cotton bath towel',
      modelNumber: 'TW-01',
      primaryCategory: linen.id,
      status: 'active',
      purchaseMode: 'both',
      attributes: {},
      gallery: [photo.id],
      legal: { ...legal, genericName: 'Bath towel' },
      price: money(1_05_000),
      gstRate: '5',
      hsnCode: '6302',
      weightGrams: 400,
    },
  })
  return {
    tenant,
    tenantId,
    owner,
    photoId: String(photo.id),
    tap: String(tap.id),
    chrome: String(chrome.id),
    black: String(black.id),
    towel: String(towel.id),
  }
}

export const sampleAddress = (overrides: Record<string, string> = {}) => ({
  name: 'Rahul Kulkarni',
  phone: '98765 43210',
  line1: 'Flat 12, Shanti Kunj, Baner Road',
  line2: '',
  landmark: '',
  city: 'Pune',
  stateCode: '27',
  pincode: '411045',
  ...overrides,
})

export const sampleOrderInput = (overrides: Record<string, unknown> = {}) => ({
  contact: { name: 'Rahul Kulkarni', email: 'rahul.k@example.com', phone: '+91 98765 43210' },
  shippingAddress: sampleAddress(),
  billingSameAsShipping: true,
  paymentMethod: 'cod' as const,
  whatsappOptIn: true,
  ...overrides,
})
