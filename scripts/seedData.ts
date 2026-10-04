import type { RequiredDataFromCollectionSlug } from 'payload'

import type { FeatureKey } from '@/modules/features'
import type { OnboardingInput } from '@/modules/tenancy'

// Interim plans (mudit, 3 October 2026; to be revised): Starter ₹3,499 a month for up to 500
// products, Enterprise ₹6,999 a month for up to 10,000. New Starter vendors pay ₹9,999 for their
// first 3 months, then monthly. Prices are paise, before GST. Staff, storage and order limits are
// still placeholders.
const MVP_CORE: FeatureKey[] = [
  'guest-checkout',
  'cod',
  'pincode-check',
  'enquiries',
  'enquire-only-products',
  'dealer-locator',
  'downloads',
  'product-videos',
  'whatsapp-button',
  'size-guide',
  'schemes',
  'coupons',
  'wishlist',
  'reviews',
  'offer-messages',
  'whatsapp-offers',
  'abandoned-cart',
]
const ENTERPRISE_EXTRA: FeatureKey[] = [
  'affiliate',
  'warranty',
  'service-requests',
  'installation-booking',
  'spare-parts',
  'compare',
  'loyalty',
  'multilingual',
  'b2b',
  'trade-schemes',
]
const ALL_CONNECTORS = ['razorpay', 'manual', 'shiprocket', 'meta-whatsapp', 'msg91'] as const
const inr = (amountMinor: number) => ({ amountMinor, currency: 'INR' as const })
const noOffer = { price: { currency: 'INR' as const }, months: null }
// No yearly price yet: a yearly subscription is 12 x the monthly price until one is set
const noYearlyPrice = { currency: 'INR' as const }

export const PLANS: RequiredDataFromCollectionSlug<'plans'>[] = [
  {
    code: 'starter',
    name: 'Starter',
    sortOrder: 10,
    priceMonthly: inr(3_499_00),
    priceYearly: noYearlyPrice,
    introOffer: { price: inr(9_999_00), months: 3 },
    limits: { maxProducts: 500, maxStaffUsers: 3, maxStorageGB: 5, maxOrdersPerMonth: 1_000 },
    allowedModules: MVP_CORE,
    allowedConnectors: [...ALL_CONNECTORS],
  },
  {
    code: 'enterprise',
    name: 'Enterprise',
    sortOrder: 20,
    priceMonthly: inr(6_999_00),
    priceYearly: noYearlyPrice,
    introOffer: noOffer,
    limits: { maxProducts: 10_000, maxStaffUsers: 30, maxStorageGB: 100, maxOrdersPerMonth: null },
    allowedModules: [...MVP_CORE, ...ENTERPRISE_EXTRA],
    allowedConnectors: [...ALL_CONNECTORS],
  },
]

/** The two demo stores the README promises (docs/15: one sanitary, one clothing). */
export const DEMO_TENANTS: (Omit<OnboardingInput, 'plan'> & {
  planCode: string
  trialDays: number
})[] = [
  {
    planCode: 'enterprise',
    trialDays: 0,
    business: {
      name: 'Demo Sanitary',
      legalName: 'Aquaverde Ceramics Pvt Ltd',
      gstin: '24AAQCA4821K1ZI',
      registeredAddress: {
        line1: 'Survey 112, National Highway 8-A',
        city: 'Morbi',
        pincode: '363642',
      },
      industry: ['sanitary'],
      supportEmail: 'care@demo-sanitary.example',
      supportPhone: '+91 90000 00000',
    },
    store: { slug: 'demo-sanitary' },
    owner: { name: 'Priya Shah', email: 'owner@demo-sanitary.example', sendInvite: false },
  },
  {
    planCode: 'starter',
    trialDays: 14,
    business: {
      name: 'Demo Clothing',
      legalName: 'Loomhouse Apparel LLP',
      gstin: '27AALCL5532M1Z0',
      registeredAddress: { line1: 'Unit 7, Lower Parel', city: 'Mumbai', pincode: '400013' },
      industry: ['clothing'],
      supportEmail: 'care@demo-clothing.example',
    },
    store: { slug: 'demo-clothing' },
    owner: { name: 'Rahul Mehta', email: 'owner@demo-clothing.example', sendInvite: false },
  },
]
